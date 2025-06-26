from flask import Flask, request, jsonify, redirect, session
import teslapy
import os
import json
import secrets
import hashlib
import base64
import urllib.parse
from datetime import datetime, timedelta
from dotenv import load_dotenv
from database import (
    init_db_pool, test_connection, create_tables, cleanup_expired_sessions,
    save_auth_session, get_auth_session, delete_auth_session,
    save_vehicle_data, get_latest_vehicle_data,
    save_tesla_token, get_tesla_token, clear_tesla_token_cache,
    save_vehicle_info, get_all_vehicles, save_vehicle_location, get_latest_vehicle_location,
    get_recent_sync_logs, get_vehicle_update_logs, get_vehicle_update_summary,
    convert_to_turkey_time, CustomJSONEncoder, async_save_update_log
)
import time
import pytz

class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder for datetime objects"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super(DateTimeEncoder, self).default(obj)

# Load environment variables
load_dotenv()

EMAIL = os.getenv('TESLA_EMAIL', 'your-email@example.com')
PORT = int(os.getenv('PORT', 5001))
HOST = os.getenv('HOST', '0.0.0.0')
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

# Tesla OAuth URLs
TESLA_AUTH_URL = os.getenv('TESLA_AUTH_URL', 'https://auth.tesla.com/oauth2/v3/authorize')
TESLA_CALLBACK_URL = os.getenv('TESLA_CALLBACK_URL', 'https://auth.tesla.com/void/callback')

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.json_encoder = DateTimeEncoder

# Initialize database
print("🔄 Initializing database...")
if not init_db_pool():
    print("❌ Database initialization failed!")
    exit(1)

if not test_connection():
    print("❌ Database connection test failed!")
    exit(1)

print("🏗️ Creating database tables...")
if not create_tables():
    print("❌ Table creation failed!")
    exit(1)

print("🧹 Cleaning up expired sessions...")
cleanup_expired_sessions()

# Utils: Token storage

def get_tesla_instance(email=None):
    """Get Tesla instance with token from database"""
    if not email:
        email = EMAIL
    
    try:
        # Get token from database
        token = get_tesla_token(email)
        if not token:
            print(f"❌ No valid token found for {email}")
            return None
            
        tesla = teslapy.Tesla(email, token=token)
        
        # Try to refresh token if needed
        if tesla.refresh_token():
            # Save updated token back to database
            save_tesla_token(email, tesla.token)
            
        return tesla
    except Exception as e:
        print(f"❌ Tesla connection error: {e}")
        return None

@app.route('/health', methods=['GET'])
def health_check():
    token_exists = get_tesla_token(EMAIL) is not None
    status = {
        "status": "healthy",
        "tesla_token_exists": token_exists,
        "tesla_email_configured": EMAIL != 'your-email@example.com',
    }
    return jsonify(status)

@app.route('/auth/init', methods=['POST'])
def init_auth():
    """Initialize Tesla OAuth authentication"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Generate state and code_verifier
        state = secrets.token_urlsafe(32)
        code_verifier = secrets.token_urlsafe(32)
        session_id = secrets.token_urlsafe(16)
        
        # Save session to database
        if not save_auth_session(session_id, state, code_verifier, email):
            return jsonify({'error': 'Failed to save auth session'}), 500
        
        # Generate code_challenge
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode().rstrip('=')
        
        # Build authorization URL
        auth_url = TESLA_AUTH_URL
        params = {
            'client_id': 'ownerapi',
            'code_challenge': code_challenge,
            'code_challenge_method': 'S256',
            'redirect_uri': TESLA_CALLBACK_URL,
            'response_type': 'code',
            'scope': 'openid email offline_access',
            'state': state,
            'login_hint': email
        }
        
        full_auth_url = f"{auth_url}?{urllib.parse.urlencode(params)}"
        
        return jsonify({
            'auth_url': full_auth_url,
            'state': state,
            'session_id': session_id
        })
        
    except Exception as e:
        print(f"❌ Auth init error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/auth/clear', methods=['POST'])
def clear_auth():
    try:
        # Clear token from database and cache
        clear_tesla_token_cache()
        
        # Remove token.json if exists
        if os.path.exists('token.json'):
            os.remove('token.json')
            
        return jsonify({"message": "Tesla token cleared successfully", "success": True})
    except Exception as e:
        print(f"❌ Token clear failed: {str(e)}")
        return jsonify({"error": f"Token clear failed: {str(e)}"}), 500

@app.route('/auth/callback', methods=['POST'])
def auth_callback():
    """Handle Tesla OAuth callback"""
    try:
        data = request.get_json()
        callback_url = data.get('callback_url')
        
        if not callback_url:
            return jsonify({'error': 'Callback URL is required'}), 400
        
        # Parse callback URL
        parsed_url = urllib.parse.urlparse(callback_url)
        query_params = urllib.parse.parse_qs(parsed_url.query)
        
        code = query_params.get('code', [None])[0]
        state = query_params.get('state', [None])[0]
        
        if not code or not state:
            return jsonify({'error': 'Missing code or state parameter'}), 400
        
        # Get session from database
        session_data = get_auth_session(state)
        if not session_data:
            return jsonify({'error': 'Invalid or expired session'}), 400
        
        # Extract session data
        session_id = session_data['session_id']
        code_verifier = session_data['code_verifier']
        email = session_data['email']
        
        try:
            # Create Tesla instance and get token
            tesla = teslapy.Tesla(email)
            
            # Convert strings to bytes for hashing
            code_verifier_bytes = code_verifier.encode('utf-8') if isinstance(code_verifier, str) else code_verifier
            
            # Get token using the authorization code
            tesla.fetch_token(authorization_response=callback_url, code_verifier=code_verifier_bytes)
            
            # Save token to database instead of file
            save_tesla_token(email, tesla.token)
            
            # Clean up session
            delete_auth_session(session_id)
            
            return jsonify({
                'success': True,
                'message': 'Authentication successful',
                'email': email
            })
            
        except Exception as tesla_error:
            print(f"❌ Tesla auth error: {tesla_error}")
            delete_auth_session(session_id)
            return jsonify({'error': f'Tesla authentication failed: {str(tesla_error)}'}), 400
            
    except Exception as e:
        print(f"❌ Auth callback error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tesla/vehicles', methods=['GET'])
def get_tesla_vehicles():
    try:
        tesla = get_tesla_instance()
        if not tesla:
            return jsonify({"error": "Tesla connection failed. Please authenticate first."}), 500
        
        vehicles = tesla.vehicle_list()
        vehicle_data = []
        
        for vehicle in vehicles:
            vehicle_info = {
                "id": vehicle.get("id"),
                "vehicle_id": vehicle.get("vehicle_id"),
                "vin": vehicle.get("vin"),
                "display_name": vehicle.get("display_name"),
                "state": vehicle.get("state"),
                "option_codes": vehicle.get("option_codes"),
                "color": vehicle.get("color"),
                "in_service": vehicle.get("in_service"),
                "api_version": vehicle.get("api_version")
            }
            vehicle_data.append(vehicle_info)
            
            # Save vehicle info to database
            save_vehicle_info(vehicle_info, EMAIL)
        
        return jsonify({"vehicles": vehicle_data, "count": len(vehicles), "success": True})
    except Exception as e:
        print(f"❌ Tesla vehicles fetch failed: {str(e)}")
        return jsonify({"error": f"Failed to fetch vehicles: {str(e)}"}), 500

@app.route('/vehicles/<int:vehicle_id>/data/<data_type>')
def get_vehicle_data_with_cache(vehicle_id, data_type):
    """Get vehicle data with database caching"""
    try:
        # Check cache first
        cached_data = get_latest_vehicle_data(vehicle_id, data_type)
        
        # If cached data is recent (less than 5 minutes), return it
        if cached_data:
            cache_time = cached_data['timestamp']
            now = datetime.now()
            if (now - cache_time).total_seconds() < 300:  # 5 minutes
                return jsonify({
                    'data': cached_data['data'],
                    'cached': True,
                    'timestamp': cache_time.isoformat()
                })
        
        # Get fresh data from Tesla API
        tesla = get_tesla_instance()
        if not tesla:
            return jsonify({'error': 'Not authenticated. Please authenticate first.'}), 401
        
        vehicles = tesla.vehicle_list()
        
        vehicle = None
        for v in vehicles:
            if v['id'] == vehicle_id:
                vehicle = tesla.vehicle(vehicle_id)
                break
        
        if not vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404
        
        # Get the requested data
        if data_type == 'vehicle_data':
            data = vehicle.get_vehicle_data()
        elif data_type == 'charge_state':
            data = vehicle.get_vehicle_data()['charge_state']
        elif data_type == 'climate_state':
            data = vehicle.get_vehicle_data()['climate_state']
        elif data_type == 'drive_state':
            data = vehicle.get_vehicle_data()['drive_state']
        elif data_type == 'vehicle_state':
            data = vehicle.get_vehicle_data()['vehicle_state']
        else:
            return jsonify({'error': 'Invalid data type'}), 400
        
        # Save to cache
        save_vehicle_data(vehicle_id, data_type, data)
        
        return jsonify({
            'data': data,
            'cached': False,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Vehicle data error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tesla/vehicle/<vehicle_id>/summary', methods=['GET'])
def get_tesla_vehicle_summary(vehicle_id):
    try:
        print(f"🔍 Getting summary for vehicle {vehicle_id}")
        
        tesla = get_tesla_instance()
        if not tesla:
            return jsonify({"error": "Tesla connection failed"}), 500
        vehicles = tesla.vehicle_list()
        target_vehicle = None
        for vehicle in vehicles:
            if str(vehicle.get("id")) == str(vehicle_id) or str(vehicle.get("vehicle_id")) == str(vehicle_id):
                target_vehicle = vehicle
                break
        if not target_vehicle:
            return jsonify({"error": f"Vehicle with ID {vehicle_id} not found"}), 404
        target_vehicle.get_vehicle_summary()
        
        # Save vehicle info to database
        vehicle_info = {
            "id": target_vehicle.get("id"),
            "vehicle_id": target_vehicle.get("vehicle_id"),
            "vin": target_vehicle.get("vin"),
            "display_name": target_vehicle.get("display_name"),
            "state": target_vehicle.get("state"),
            "option_codes": target_vehicle.get("option_codes"),
            "color": target_vehicle.get("color"),
            "in_service": target_vehicle.get("in_service"),
            "api_version": target_vehicle.get("api_version")
        }
        
        print(f"💾 Saving vehicle info: {vehicle_info}")
        save_result = save_vehicle_info(vehicle_info, EMAIL)
        print(f"💾 Save result: {save_result}")
        
        summary = {
            "id": target_vehicle.get("id"),
            "vehicle_id": target_vehicle.get("vehicle_id"),
            "display_name": target_vehicle.get("display_name"),
            "state": target_vehicle.get("state"),
            "vin": target_vehicle.get("vin"),
            "battery_level": target_vehicle.get("charge_state", {}).get("battery_level") if target_vehicle.get("charge_state") else None,
            "last_seen": target_vehicle.last_seen() if hasattr(target_vehicle, 'last_seen') else None,
            "available": target_vehicle.available() if hasattr(target_vehicle, 'available') else None
        }
        
        print(f"✅ Summary completed for vehicle {vehicle_id}")
        return jsonify({"summary": summary, "success": True})
    except Exception as e:
        print(f"❌ Tesla vehicle summary fetch failed: {str(e)}")
        return jsonify({"error": f"Failed to fetch vehicle summary: {str(e)}"}), 500

@app.route('/api/tesla/vehicle/<vehicle_id>/data', methods=['GET'])
def get_tesla_vehicle_data(vehicle_id):
    """Get complete vehicle data from Tesla API"""
    try:
        tesla = get_tesla_instance()
        if not tesla:
            return jsonify({"error": "Tesla connection failed"}), 500
        
        vehicles = tesla.vehicle_list()
        target_vehicle = None
        for vehicle in vehicles:
            if str(vehicle.get("id")) == str(vehicle_id) or str(vehicle.get("vehicle_id")) == str(vehicle_id):
                target_vehicle = vehicle
                break
                
        if not target_vehicle:
            return jsonify({"error": f"Vehicle with ID {vehicle_id} not found"}), 404
        
        # Get complete vehicle data
        vehicle_data = target_vehicle.get_vehicle_data()
        
        # Save vehicle info to database
        vehicle_info = {
            "id": target_vehicle.get("id"),
            "vehicle_id": target_vehicle.get("vehicle_id"),
            "vin": target_vehicle.get("vin"),
            "display_name": target_vehicle.get("display_name"),
            "state": target_vehicle.get("state"),
            "option_codes": target_vehicle.get("option_codes"),
            "color": target_vehicle.get("color"),
            "in_service": target_vehicle.get("in_service"),
            "api_version": target_vehicle.get("api_version")
        }
        save_vehicle_info(vehicle_info, EMAIL)
        
        # Save location data if available
        drive_state = vehicle_data.get("drive_state", {})
        if drive_state and drive_state.get("latitude"):
            location_data = {
                "latitude": drive_state.get("latitude"),
                "longitude": drive_state.get("longitude"),
                "heading": drive_state.get("heading"),
                "speed": drive_state.get("speed"),
                "gps_as_of": drive_state.get("gps_as_of"),
                "power": drive_state.get("power"),
                "shift_state": drive_state.get("shift_state")
            }
            save_vehicle_location(int(vehicle_id), location_data)
        
        # Cache the data
        save_vehicle_data(int(vehicle_id), 'vehicle_data', vehicle_data)
        
        return jsonify({
            "vehicle_data": vehicle_data,
            "success": True,
            "cached": False,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Tesla vehicle data fetch failed: {str(e)}")
        return jsonify({"error": f"Failed to fetch vehicle data: {str(e)}"}), 500

@app.route('/api/tesla/vehicle/<vehicle_id>/location', methods=['GET'])
def get_tesla_vehicle_location(vehicle_id):
    try:
        tesla = get_tesla_instance()
        if not tesla:
            return jsonify({"error": "Tesla connection failed"}), 500
        vehicles = tesla.vehicle_list()
        target_vehicle = None
        for vehicle in vehicles:
            if str(vehicle.get("id")) == str(vehicle_id) or str(vehicle.get("vehicle_id")) == str(vehicle_id):
                target_vehicle = vehicle
                break
        if not target_vehicle:
            return jsonify({"error": f"Vehicle with ID {vehicle_id} not found"}), 404
        target_vehicle.get_vehicle_location_data()
        
        # Save vehicle info to database
        vehicle_info = {
            "id": target_vehicle.get("id"),
            "vehicle_id": target_vehicle.get("vehicle_id"),
            "vin": target_vehicle.get("vin"),
            "display_name": target_vehicle.get("display_name"),
            "state": target_vehicle.get("state"),
            "option_codes": target_vehicle.get("option_codes"),
            "color": target_vehicle.get("color"),
            "in_service": target_vehicle.get("in_service"),
            "api_version": target_vehicle.get("api_version")
        }
        save_vehicle_info(vehicle_info, EMAIL)
        
        drive_state = target_vehicle.get("drive_state", {})
        location_data = {
            "latitude": drive_state.get("latitude"),
            "longitude": drive_state.get("longitude"),
            "heading": drive_state.get("heading"),
            "speed": drive_state.get("speed"),
            "gps_as_of": drive_state.get("gps_as_of"),
            "power": drive_state.get("power"),
            "shift_state": drive_state.get("shift_state")
        }
        
        # Save location to database
        save_vehicle_location(int(vehicle_id), location_data)
        
        return jsonify({"location": location_data, "success": True})
    except Exception as e:
        print(f"❌ Tesla vehicle location fetch failed: {str(e)}")
        return jsonify({"error": f"Failed to fetch vehicle location: {str(e)}"}), 500

# Database endpoints
@app.route('/api/vehicles', methods=['GET'])
def get_vehicles_from_db():
    """Get all vehicles from database"""
    try:
        vehicles = get_all_vehicles()
        
        # Convert timestamps to Turkey time in response
        for vehicle in vehicles:
            if vehicle.get('created_at'):
                vehicle['created_at'] = convert_to_turkey_time(vehicle['created_at']).isoformat()
            if vehicle.get('updated_at'):
                vehicle['updated_at'] = convert_to_turkey_time(vehicle['updated_at']).isoformat()
        
        return jsonify({"vehicles": vehicles, "count": len(vehicles), "success": True})
    except Exception as e:
        print(f"❌ Get vehicles from DB failed: {str(e)}")
        return jsonify({"error": f"Failed to get vehicles: {str(e)}"}), 500

@app.route('/api/vehicles-with-locations', methods=['GET'])
def get_vehicles_with_locations():
    """Get all vehicles with their latest locations from database, optionally refresh from Tesla API"""
    try:
        # Check if refresh parameter is provided
        refresh_from_api = request.args.get('refresh', 'false').lower() == 'true'
        
        vehicles = get_all_vehicles()
        vehicles_with_locations = []
        
        # Get Tesla instance if refresh is requested
        tesla = None
        if refresh_from_api:
            tesla = get_tesla_instance()
            if not tesla:
                print("⚠️ Tesla connection failed, using database data only")
                refresh_from_api = False
        
        for vehicle in vehicles:
            vehicle_id = vehicle.get('vehicle_id')
            latest_location = get_latest_vehicle_location(vehicle_id) if vehicle_id else None
            
            # If refresh is requested and Tesla connection is available
            if refresh_from_api and tesla and vehicle_id:
                try:
                    print(f"🔄 Refreshing location for vehicle {vehicle_id}")
                    
                    # Get vehicle from Tesla API
                    vehicles_list = tesla.vehicle_list()
                    target_vehicle = None
                    
                    for v in vehicles_list:
                        if str(v.get("vehicle_id")) == str(vehicle_id):
                            target_vehicle = v
                            break
                    
                    if target_vehicle:
                        # Get fresh location data
                        target_vehicle.get_vehicle_location_data()
                        drive_state = target_vehicle.get("drive_state", {})
                        
                        if drive_state and drive_state.get("latitude"):
                            fresh_location_data = {
                                "latitude": drive_state.get("latitude"),
                                "longitude": drive_state.get("longitude"),
                                "heading": drive_state.get("heading"),
                                "speed": drive_state.get("speed"),
                                "gps_as_of": drive_state.get("gps_as_of"),
                                "power": drive_state.get("power"),
                                "shift_state": drive_state.get("shift_state")
                            }
                            
                            # Save fresh location to database
                            if save_vehicle_location(vehicle_id, fresh_location_data):
                                print(f"✅ Updated location for vehicle {vehicle_id}")
                                # Get updated location from database
                                latest_location = get_latest_vehicle_location(vehicle_id)
                            else:
                                print(f"❌ Failed to save location for vehicle {vehicle_id}")
                        else:
                            print(f"⚠️ No location data available for vehicle {vehicle_id}")
                    else:
                        print(f"⚠️ Vehicle {vehicle_id} not found in Tesla API")
                        
                except Exception as location_error:
                    print(f"❌ Location refresh failed for vehicle {vehicle_id}: {location_error}")
                    # Continue with existing location data
            
            vehicle_data = {
                "vehicle_info": vehicle,
                "location": latest_location,
                "has_location": latest_location is not None,
                "refreshed_from_api": refresh_from_api and tesla is not None
            }
            vehicles_with_locations.append(vehicle_data)
        
        return jsonify({
            "vehicles": vehicles_with_locations, 
            "count": len(vehicles_with_locations), 
            "success": True,
            "refreshed_from_api": refresh_from_api
        })
    except Exception as e:
        print(f"❌ Get vehicles with locations failed: {str(e)}")
        return jsonify({"error": f"Failed to get vehicles with locations: {str(e)}"}), 500

@app.route('/api/vehicle/<int:vehicle_id>/location/latest', methods=['GET'])
def get_latest_location(vehicle_id):
    """Get latest location for vehicle from database"""
    try:
        location = get_latest_vehicle_location(vehicle_id)
        if not location:
            return jsonify({"error": "No location data found"}), 404
        return jsonify({"location": location, "success": True})
    except Exception as e:
        print(f"❌ Get latest location failed: {str(e)}")
        return jsonify({"error": f"Failed to get location: {str(e)}"}), 500

@app.route('/api/sync/logs', methods=['GET'])
def get_sync_logs():
    """Get recent sync logs"""
    try:
        limit = request.args.get('limit', 10, type=int)
        logs = get_recent_sync_logs(limit)
        return jsonify({"logs": logs, "count": len(logs), "success": True})
    except Exception as e:
        print(f"❌ Get sync logs failed: {str(e)}")
        return jsonify({"error": f"Failed to get sync logs: {str(e)}"}), 500

@app.route('/api/sync/trigger', methods=['POST'])
def trigger_sync():
    """Manually trigger a sync operation"""
    try:
        import subprocess
        import threading
        
        def run_sync():
            try:
                # Run sync script once
                result = subprocess.run([
                    'python', 'tesla_sync.py', '--once'
                ], capture_output=True, text=True, timeout=300)
                
                print(f"Sync output: {result.stdout}")
                if result.stderr:
                    print(f"Sync errors: {result.stderr}")
                    
            except Exception as e:
                print(f"❌ Sync execution failed: {e}")
        
        # Run sync in background thread
        sync_thread = threading.Thread(target=run_sync)
        sync_thread.daemon = True
        sync_thread.start()
        
        return jsonify({
            "message": "Sync operation triggered successfully",
            "success": True
        })
        
    except Exception as e:
        print(f"❌ Trigger sync failed: {str(e)}")
        return jsonify({"error": f"Failed to trigger sync: {str(e)}"}), 500

@app.route('/api/sync/vehicles-locations', methods=['POST'])
def sync_vehicles_locations():
    """Sync all vehicles and their locations, return complete data"""
    try:
        from datetime import datetime
        
        print(f"🔄 Starting vehicles-locations sync at {datetime.now()}")
        
        # Get Tesla instance
        tesla = get_tesla_instance()
        if not tesla:
            return jsonify({
                "error": "Tesla connection failed. Please authenticate first.",
                "success": False
            }), 401
        
        vehicles_data = []
        sync_summary = {
            "vehicles_processed": 0,
            "locations_updated": 0,
            "errors_count": 0,
            "errors": [],
            "sync_time": datetime.now().isoformat()
        }
        
        try:
            # Step 1: Fetch vehicles
            print("📋 Fetching vehicles list...")
            vehicles = tesla.vehicle_list()
            print(f"✅ Found {len(vehicles)} vehicles")
            
            for vehicle in vehicles:
                try:
                    sync_summary["vehicles_processed"] += 1
                    
                    # Save vehicle info
                    vehicle_info = {
                        "id": vehicle.get("id"),
                        "vehicle_id": vehicle.get("vehicle_id"),
                        "vin": vehicle.get("vin"),
                        "display_name": vehicle.get("display_name"),
                        "state": vehicle.get("state"),
                        "option_codes": vehicle.get("option_codes"),
                        "color": vehicle.get("color"),
                        "in_service": vehicle.get("in_service"),
                        "api_version": vehicle.get("api_version")
                    }
                    
                    # Save to database
                    save_vehicle_info(vehicle_info, EMAIL)
                    print(f"✅ Saved vehicle: {vehicle_info['display_name']} ({vehicle_info['vehicle_id']})")
                    
                    # Step 2: Fetch location for each vehicle
                    vehicle_id = vehicle.get("vehicle_id")
                    location_data = None
                    
                    if vehicle_id:
                        try:
                            print(f"📍 Fetching location for vehicle {vehicle_id}...")
                            
                            # Wake up vehicle if it's offline/asleep
                            if vehicle.get("state") in ["offline", "asleep"]:
                                print(f"😴 Vehicle {vehicle_id} is {vehicle.get('state')}, attempting to wake...")
                                try:
                                    vehicle.sync_wake_up()
                                    time.sleep(8)  # Wait for vehicle to wake up
                                except Exception as wake_error:
                                    print(f"⚠️ Could not wake vehicle {vehicle_id}: {wake_error}")
                            
                            # Get location data
                            vehicle.get_vehicle_location_data()
                            drive_state = vehicle.get("drive_state", {})
                            
                            if drive_state:
                                location_data = {
                                    "latitude": drive_state.get("latitude"),
                                    "longitude": drive_state.get("longitude"),
                                    "heading": drive_state.get("heading"),
                                    "speed": drive_state.get("speed"),
                                    "gps_as_of": drive_state.get("gps_as_of"),
                                    "power": drive_state.get("power"),
                                    "shift_state": drive_state.get("shift_state")
                                }
                                
                                # Save location to database
                                if save_vehicle_location(vehicle_id, location_data):
                                    sync_summary["locations_updated"] += 1
                                    print(f"✅ Updated location for vehicle {vehicle_id}")
                                    print(f"   📍 Lat: {location_data.get('latitude')}, Lng: {location_data.get('longitude')}")
                                else:
                                    error_msg = f"Failed to save location for vehicle {vehicle_id}"
                                    sync_summary["errors"].append(error_msg)
                                    sync_summary["errors_count"] += 1
                                    print(f"❌ {error_msg}")
                            else:
                                print(f"⚠️ No location data available for vehicle {vehicle_id}")
                                
                        except Exception as location_error:
                            error_msg = f"Location fetch failed for vehicle {vehicle_id}: {str(location_error)}"
                            sync_summary["errors"].append(error_msg)
                            sync_summary["errors_count"] += 1
                            print(f"❌ {error_msg}")
                    
                    # Get latest location from database for response
                    latest_location = get_latest_vehicle_location(vehicle_id) if vehicle_id else None
                    
                    # Prepare vehicle data for response
                    vehicle_response = {
                        "vehicle_info": vehicle_info,
                        "location": location_data if location_data else (latest_location if latest_location else None),
                        "location_source": "fresh" if location_data else ("database" if latest_location else "none"),
                        "updated_at": datetime.now().isoformat()
                    }
                    
                    vehicles_data.append(vehicle_response)
                    
                    # Small delay between vehicles to avoid rate limiting
                    time.sleep(2)
                    
                except Exception as vehicle_error:
                    error_msg = f"Vehicle processing failed: {str(vehicle_error)}"
                    sync_summary["errors"].append(error_msg)
                    sync_summary["errors_count"] += 1
                    print(f"❌ {error_msg}")
            
            # Prepare final response
            response_data = {
                "success": True,
                "message": f"Sync completed successfully",
                "summary": sync_summary,
                "vehicles": vehicles_data,
                "total_vehicles": len(vehicles_data)
            }
            
            print(f"✅ Sync completed: {sync_summary['vehicles_processed']} vehicles, {sync_summary['locations_updated']} locations")
            
            return jsonify(response_data)
            
        except Exception as api_error:
            error_msg = f"Tesla API call failed: {str(api_error)}"
            sync_summary["errors"].append(error_msg)
            sync_summary["errors_count"] += 1
            print(f"❌ {error_msg}")
            
            return jsonify({
                "success": False,
                "error": error_msg,
                "summary": sync_summary,
                "vehicles": vehicles_data
            }), 500
            
    except Exception as e:
        print(f"❌ Sync vehicles-locations failed: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Sync operation failed: {str(e)}",
            "vehicles": []
        }), 500

@app.route('/api/vehicle/<int:vehicle_id>/update-logs', methods=['GET'])
def get_vehicle_updates(vehicle_id):
    """Get update logs for a specific vehicle"""
    try:
        update_type = request.args.get('type')  # 'vehicle_info' or 'location'
        limit = request.args.get('limit', 20, type=int)
        
        logs = get_vehicle_update_logs(vehicle_id, update_type, limit)
        summary = get_vehicle_update_summary(vehicle_id)
        
        # Convert timestamps to Turkey time in response
        for log in logs:
            if log.get('created_at'):
                log['created_at'] = convert_to_turkey_time(log['created_at']).isoformat()
        
        for s in summary:
            if s.get('last_update'):
                s['last_update'] = convert_to_turkey_time(s['last_update']).isoformat()
        
        return jsonify({
            "vehicle_id": vehicle_id,
            "logs": logs,
            "summary": summary,
            "count": len(logs),
            "success": True
        })
    except Exception as e:
        print(f"❌ Get vehicle update logs failed: {str(e)}")
        return jsonify({"error": f"Failed to get update logs: {str(e)}"}), 500

@app.route('/api/update-logs', methods=['GET'])
def get_all_update_logs():
    """Get all vehicle update logs"""
    try:
        update_type = request.args.get('type')  # 'vehicle_info' or 'location'
        limit = request.args.get('limit', 50, type=int)
        
        logs = get_vehicle_update_logs(None, update_type, limit)
        
        return jsonify({
            "logs": logs,
            "count": len(logs),
            "success": True
        })
    except Exception as e:
        print(f"❌ Get all update logs failed: {str(e)}")
        return jsonify({"error": f"Failed to get update logs: {str(e)}"}), 500

if __name__ == '__main__':
    print("🔄 Initializing database...")
    if init_db_pool():
        if test_connection():
            print("🏗️ Creating database tables...")
            create_tables()
            print("🧹 Cleaning up expired sessions...")
            cleanup_expired_sessions()
            
            print("🚀 Starting Tesla Backend API...")
            app.run(host='0.0.0.0', port=8000, debug=True)
        else:
            print("❌ Database connection failed!")
    else:
        print("❌ Database initialization failed!")
