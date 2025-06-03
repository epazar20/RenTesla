from flask import Flask, request, jsonify
from functools import wraps
import teslapy
import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from urllib.parse import urlparse, parse_qs

# Load environment variables
load_dotenv()

# Config from environment variables
TOKEN_FILE = 'token.json'
RENT_DIR = 'rents'
EMAIL = os.getenv('TESLA_EMAIL', 'your-email@example.com')
TEST_MODE = os.getenv('TEST_MODE', 'False').lower() == 'true'
PORT = int(os.getenv('PORT', 5001))
HOST = os.getenv('HOST', '0.0.0.0')
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', 'serviceAccountKey.json')

if not os.path.exists(RENT_DIR):
    os.makedirs(RENT_DIR)

# Firebase setup with error handling
firebase_connected = False
try:
    if not firebase_admin._apps:
        if os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
            cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
            firebase_admin.initialize_app(cred)
            firebase_connected = True
            print("✅ Firebase initialized successfully")
        else:
            print(f"⚠️  {FIREBASE_SERVICE_ACCOUNT_PATH} not found - Firebase auth disabled")
            TEST_MODE = True
except Exception as e:
    print(f"⚠️  Firebase initialization failed: {e}")
    firebase_connected = False

# App setup
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

print(f"🚀 Starting app in {'TEST' if TEST_MODE else 'PRODUCTION'} mode")
if not TEST_MODE and EMAIL == 'your-email@example.com':
    print("⚠️  WARNING: Please set TESLA_EMAIL environment variable!")

# Utils: Token storage

def load_token():
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'r') as f:
            return json.load(f)
    return None

def save_token(token_dict):
    with open(TOKEN_FILE, 'w') as f:
        json.dump(token_dict, f)

# Tesla staged auth state management
auth_sessions = {}

def get_tesla_instance():
    """Get Tesla instance with error handling"""
    try:
        token = load_token()
        tesla = teslapy.Tesla(EMAIL, token=token)
        if tesla.refresh_token():
            save_token(tesla.token)
        return tesla
    except Exception as e:
        print(f"❌ Tesla connection error: {e}")
        return None

# Middleware: Firebase auth

def verify_token(id_token):
    if TEST_MODE:
        # Test mode - bypass Firebase auth
        return {"uid": "test-user", "email": "test@example.com"}
    
    if not firebase_connected:
        print("❌ Firebase not connected, falling back to test mode")
        return {"uid": "test-user", "email": "test@example.com"}
    
    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return None

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if TEST_MODE:
            # Test mode - create mock user
            request.user = {"uid": "test-user", "email": "test@example.com"}
            return f(*args, **kwargs)
            
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "No token provided"}), 401

        token = auth_header.split(" ")[1]
        user = verify_token(token)
        if not user:
            return jsonify({"error": "Invalid token"}), 403

        request.user = user
        return f(*args, **kwargs)
    return wrapper

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    status = {
        "status": "healthy",
        "test_mode": TEST_MODE,
        "firebase_connected": firebase_connected,
        "tesla_token_exists": os.path.exists(TOKEN_FILE),
        "tesla_email_configured": EMAIL != 'your-email@example.com'
    }
    return jsonify(status)

# Endpoint: Tesla Auth init
@app.route('/auth/init', methods=['GET'])
def init_auth():
    if TEST_MODE:
        # Test mode - return mock auth URL
        return jsonify({
            "auth_url": "https://auth.tesla.com/oauth2/v3/authorize?mock=true", 
            "message": "Visit this URL to authorize Tesla access (TEST MODE)"
        })
    
    if EMAIL == 'your-email@example.com':
        return jsonify({"error": "TESLA_EMAIL environment variable not configured"}), 500
    
    try:
        # Staged authorization - Generate state and code_verifier
        tesla = teslapy.Tesla(EMAIL)
        state = tesla.new_state()
        code_verifier = tesla.new_code_verifier()
        
        # Store session data
        session_id = f"{state}_{code_verifier[:10]}"
        auth_sessions[session_id] = {
            "state": state,
            "code_verifier": code_verifier,
            "email": EMAIL,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Generate auth URL with state and code_verifier
        auth_url = tesla.authorization_url(state=state, code_verifier=code_verifier)
        
        print(f"🔐 Auth session created: {session_id}")
        print(f"🔗 Auth URL: {auth_url}")
        
        return jsonify({
            "auth_url": auth_url, 
            "session_id": session_id,
            "state": state,
            "message": "Visit this URL to authorize Tesla access"
        })
    except Exception as e:
        print(f"❌ Tesla auth initialization failed: {str(e)}")
        return jsonify({"error": f"Tesla auth initialization failed: {str(e)}"}), 500

# Endpoint: Tesla Auth callback
@app.route('/auth/callback', methods=['GET', 'POST'])
def auth_callback():
    if request.method == 'GET':
        # GET request - URL parametresi ile callback
        redirect_url = request.args.get('url')
    else:
        # POST request - JSON body ile callback
        data = request.json or {}
        redirect_url = data.get('url')
    
    # Debug: Gelen URL'yi kontrol et
    print(f"🔍 DEBUG: Received redirect_url: {redirect_url}")
    print(f"🔍 DEBUG: All request args: {dict(request.args)}")
    
    if not redirect_url:
        return jsonify({
            "error": "URL parameter required", 
            "help": "Copy the full URL from the 'Page Not Found' browser page and send it as 'url' parameter"
        }), 400

    if TEST_MODE:
        # Test mode - simulate token save
        mock_token = {
            "access_token": "mock_access_token",
            "refresh_token": "mock_refresh_token",
            "created_at": datetime.utcnow().isoformat()
        }
        save_token(mock_token)
        return jsonify({"message": "Tesla token successfully obtained and saved (TEST MODE)"})

    try:
        # Extract state from callback URL to find session
        parsed_url = urlparse(redirect_url)
        query_params = parse_qs(parsed_url.query)
        state_from_url = query_params.get('state', [None])[0]
        
        # Debug: URL parsing detayları
        print(f"🔍 DEBUG: Parsed URL: {parsed_url}")
        print(f"🔍 DEBUG: Query params: {query_params}")
        print(f"🔍 DEBUG: State from URL: {state_from_url}")
        print(f"🔍 DEBUG: Available sessions: {list(auth_sessions.keys())}")
        
        if not state_from_url:
            return jsonify({
                "error": "No state parameter found in callback URL",
                "debug": {
                    "received_url": redirect_url,
                    "parsed_query": query_params
                }
            }), 400
        
        # Find matching session
        session_data = None
        session_id_to_remove = None
        for session_id, session in auth_sessions.items():
            print(f"🔍 DEBUG: Checking session {session_id}, state: {session['state']}")
            if session['state'] == state_from_url:
                session_data = session
                session_id_to_remove = session_id
                break
        
        if not session_data:
            return jsonify({
                "error": "Invalid or expired session. Please restart authentication.",
                "debug": {
                    "state_from_url": state_from_url,
                    "available_states": [s['state'] for s in auth_sessions.values()]
                }
            }), 400
        
        # Use staged authorization with stored state and code_verifier
        tesla = teslapy.Tesla(EMAIL, state=session_data['state'], code_verifier=session_data['code_verifier'])
        tesla.fetch_token(authorization_response=redirect_url)
        save_token(tesla.token)
        
        # Clean up session
        auth_sessions.pop(session_id_to_remove, None)
        
        print(f"✅ Tesla token successfully saved!")
        print(f"📝 Token saved to: {TOKEN_FILE}")
        
        return jsonify({
            "message": "Tesla token successfully obtained and saved", 
            "token_file": TOKEN_FILE,
            "success": True
        })
    except Exception as e:
        print(f"❌ Token fetch failed: {str(e)}")
        return jsonify({"error": f"Token fetch failed: {str(e)}"}), 500

# Endpoint: Manual Token Input (yeni endpoint)
@app.route('/auth/manual', methods=['POST'])
def manual_auth():
    """Manuel token input için endpoint"""
    data = request.json or {}
    callback_url = data.get('callback_url')
    
    if not callback_url:
        return jsonify({
            "error": "callback_url is required",
            "help": "Send the full URL from browser (starting with https://auth.tesla.com/void/callback?code=...)"
        }), 400
        
    if TEST_MODE:
        mock_token = {
            "access_token": "mock_access_token", 
            "refresh_token": "mock_refresh_token",
            "created_at": datetime.utcnow().isoformat()
        }
        save_token(mock_token)
        return jsonify({"message": "Mock token saved (TEST MODE)", "success": True})
    
    try:
        # Extract state from callback URL to find session
        parsed_url = urlparse(callback_url)
        query_params = parse_qs(parsed_url.query)
        state_from_url = query_params.get('state', [None])[0]
        
        if not state_from_url:
            return jsonify({"error": "No state parameter found in callback URL"}), 400
        
        # Find matching session
        session_data = None
        session_id_to_remove = None
        for session_id, session in auth_sessions.items():
            if session['state'] == state_from_url:
                session_data = session
                session_id_to_remove = session_id
                break
        
        if not session_data:
            return jsonify({
                "error": "Invalid or expired session. Please restart authentication.",
                "help": "Call /auth/init first to get a new auth URL"
            }), 400
        
        # Use staged authorization with stored state and code_verifier
        tesla = teslapy.Tesla(EMAIL, state=session_data['state'], code_verifier=session_data['code_verifier'])
        tesla.fetch_token(authorization_response=callback_url)
        save_token(tesla.token)
        
        # Clean up session
        auth_sessions.pop(session_id_to_remove, None)
        
        print(f"✅ Tesla token successfully obtained and saved!")
        print(f"📝 Token details: {tesla.token}")
        
        response_data = {
            "message": "Tesla token successfully obtained and saved",
            "token_file": TOKEN_FILE,
            "success": True,
            "token_info": {
                "has_access_token": "access_token" in tesla.token,
                "has_refresh_token": "refresh_token" in tesla.token,
                "created_at": tesla.token.get("created_at")
            }
        }
        return jsonify(response_data)
    except Exception as e:
        print(f"❌ Manual token fetch failed: {str(e)}")
        return jsonify({"error": f"Manual token fetch failed: {str(e)}", "success": False}), 500

# Endpoint: Kiralama başlat
@app.route('/api/rent', methods=['POST'])
@require_auth
def start_rent():
    user = request.user
    data = request.json or {}
    duration_minutes = data.get("duration", 30)
    now = datetime.utcnow()

    rent_info = {
        "user_id": user["uid"],
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(minutes=duration_minutes)).isoformat(),
        "allowed_commands": ["unlock", "lock", "honk_horn"],
        "test_mode": TEST_MODE
    }

    try:
        with open(f"{RENT_DIR}/{user['uid']}.json", 'w') as f:
            json.dump(rent_info, f)
        
        print(f"📝 Rent started for user {user['uid']} for {duration_minutes} minutes")
        return jsonify({
            "status": "Rent started", 
            "valid_until": rent_info["end_time"],
            "allowed_commands": rent_info["allowed_commands"]
        })
    except Exception as e:
        return jsonify({"error": f"Failed to start rent: {str(e)}"}), 500

# Endpoint: Komut gönderme
@app.route('/api/vehicle/command', methods=['POST'])
@require_auth
def vehicle_command():
    user = request.user
    data = request.json or {}
    command = data.get("command")
    rent_file = f"{RENT_DIR}/{user['uid']}.json"

    if not command:
        return jsonify({"error": "Command is required"}), 400

    if not os.path.exists(rent_file):
        return jsonify({"error": "No active rent"}), 403

    try:
        with open(rent_file) as f:
            rent_info = json.load(f)

        now = datetime.utcnow().isoformat()
        if now > rent_info["end_time"]:
            return jsonify({"error": "Rental period expired"}), 403

        if command not in rent_info["allowed_commands"]:
            return jsonify({"error": f"Command '{command}' not allowed. Allowed: {rent_info['allowed_commands']}"}), 403

        if TEST_MODE:
            # Test mode - simulate command execution
            print(f"🧪 TEST MODE: Simulating command '{command}' for user {user['uid']}")
            return jsonify({"status": f"{command} sent (simulated)", "test_mode": True})

        # Real Tesla command execution
        tesla = get_tesla_instance()
        if not tesla:
            return jsonify({"error": "Tesla connection failed"}), 500
            
        vehicles = tesla.vehicle_list()
        if not vehicles:
            return jsonify({"error": "No vehicles found"}), 404
            
        vehicle = vehicles[0]
        vehicle.sync_wake_up()

        if command == 'unlock':
            vehicle.unlock()
        elif command == 'lock':
            vehicle.lock()
        elif command == 'honk_horn':
            vehicle.honk_horn()

        print(f"🚗 Command '{command}' executed for user {user['uid']}")
        return jsonify({"status": f"{command} sent"})
        
    except Exception as e:
        return jsonify({"error": f"Command execution failed: {str(e)}"}), 500

# Endpoint: Aktif kiralamayı görüntüle
@app.route('/api/rent/status', methods=['GET'])
@require_auth
def rent_status():
    user = request.user
    rent_file = f"{RENT_DIR}/{user['uid']}.json"
    
    if not os.path.exists(rent_file):
        return jsonify({"active_rent": False})
    
    try:
        with open(rent_file) as f:
            rent_info = json.load(f)
        
        now = datetime.utcnow().isoformat()
        is_active = now <= rent_info["end_time"]
        
        return jsonify({
            "active_rent": is_active,
            "rent_info": rent_info if is_active else None,
            "current_time": now
        })
    except Exception as e:
        return jsonify({"error": f"Failed to get rent status: {str(e)}"}), 500

# Endpoint: Tesla Vehicle List
@app.route('/api/tesla/vehicles', methods=['GET'])
def get_tesla_vehicles():
    """Tesla hesabındaki araçları listele"""
    if TEST_MODE:
        return jsonify({
            "vehicles": [
                {
                    "id": "mock_vehicle_123",
                    "display_name": "Mock Tesla",
                    "state": "online",
                    "vin": "5YJ3E1MOCK123456"
                }
            ],
            "test_mode": True,
            "message": "Mock vehicle data (TEST MODE)"
        })
    
    try:
        tesla = get_tesla_instance()
        if not tesla:
            return jsonify({"error": "Tesla connection failed"}), 500
        
        vehicles = tesla.vehicle_list()
        
        # Convert Vehicle objects to dictionaries
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
        
        print(f"📊 Found {len(vehicles)} Tesla vehicle(s)")
        
        return jsonify({
            "vehicles": vehicle_data,
            "count": len(vehicles),
            "success": True
        })
        
    except Exception as e:
        print(f"❌ Tesla vehicles fetch failed: {str(e)}")
        return jsonify({"error": f"Failed to fetch vehicles: {str(e)}"}), 500

# Endpoint: Tesla Vehicle Data (Full)
@app.route('/api/tesla/vehicle/<vehicle_id>/data', methods=['GET'])
def get_tesla_vehicle_data(vehicle_id):
    """Belirli bir araç için detaylı veri al"""
    if TEST_MODE:
        return jsonify({
            "vehicle_data": {
                "id": vehicle_id,
                "display_name": "Mock Tesla",
                "state": "online",
                "charge_state": {
                    "battery_level": 85,
                    "charging_state": "Complete",
                    "charge_limit_soc": 90
                },
                "drive_state": {
                    "latitude": 41.0082,
                    "longitude": 28.9784,
                    "speed": None
                },
                "climate_state": {
                    "inside_temp": 22.0,
                    "outside_temp": 18.5,
                    "is_climate_on": False
                }
            },
            "test_mode": True
        })
    
    try:
        tesla = get_tesla_instance()
        if not tesla:
            return jsonify({"error": "Tesla connection failed"}), 500
        
        vehicles = tesla.vehicle_list()
        
        # Find vehicle by ID
        target_vehicle = None
        for vehicle in vehicles:
            if str(vehicle.get("id")) == str(vehicle_id) or str(vehicle.get("vehicle_id")) == str(vehicle_id):
                target_vehicle = vehicle
                break
        
        if not target_vehicle:
            return jsonify({"error": f"Vehicle with ID {vehicle_id} not found"}), 404
        
        # Wake up vehicle if needed and get data
        if target_vehicle.get("state") != "online":
            print(f"🔋 Waking up vehicle {vehicle_id}...")
            target_vehicle.sync_wake_up()
        
        # Get full vehicle data
        target_vehicle.get_vehicle_data()
        
        print(f"📊 Retrieved data for vehicle {target_vehicle.get('display_name')}")
        
        return jsonify({
            "vehicle_data": dict(target_vehicle),
            "success": True
        })
        
    except Exception as e:
        print(f"❌ Tesla vehicle data fetch failed: {str(e)}")
        return jsonify({"error": f"Failed to fetch vehicle data: {str(e)}"}), 500

# Endpoint: Tesla Vehicle Summary (Quick)
@app.route('/api/tesla/vehicle/<vehicle_id>/summary', methods=['GET'])
def get_tesla_vehicle_summary(vehicle_id):
    """Araç için hızlı özet bilgi al (uyandırmadan)"""
    if TEST_MODE:
        return jsonify({
            "summary": {
                "id": vehicle_id,
                "display_name": "Mock Tesla",
                "state": "online",
                "battery_level": 85,
                "last_seen": "2 hours ago"
            },
            "test_mode": True
        })
    
    try:
        tesla = get_tesla_instance()
        if not tesla:
            return jsonify({"error": "Tesla connection failed"}), 500
        
        vehicles = tesla.vehicle_list()
        
        # Find vehicle by ID
        target_vehicle = None
        for vehicle in vehicles:
            if str(vehicle.get("id")) == str(vehicle_id) or str(vehicle.get("vehicle_id")) == str(vehicle_id):
                target_vehicle = vehicle
                break
        
        if not target_vehicle:
            return jsonify({"error": f"Vehicle with ID {vehicle_id} not found"}), 404
        
        # Get summary without waking up
        target_vehicle.get_vehicle_summary()
        
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
        
        print(f"📊 Retrieved summary for vehicle {target_vehicle.get('display_name')}")
        
        return jsonify({
            "summary": summary,
            "success": True
        })
        
    except Exception as e:
        print(f"❌ Tesla vehicle summary fetch failed: {str(e)}")
        return jsonify({"error": f"Failed to fetch vehicle summary: {str(e)}"}), 500

# Endpoint: Tesla Vehicle Location
@app.route('/api/tesla/vehicle/<vehicle_id>/location', methods=['GET'])
def get_tesla_vehicle_location(vehicle_id):
    """Araç konum bilgisini al"""
    if TEST_MODE:
        return jsonify({
            "location": {
                "latitude": 41.0082,
                "longitude": 28.9784,
                "heading": 180,
                "speed": None,
                "address": "İstanbul, Turkey (Mock)"
            },
            "test_mode": True
        })
    
    try:
        tesla = get_tesla_instance()
        if not tesla:
            return jsonify({"error": "Tesla connection failed"}), 500
        
        vehicles = tesla.vehicle_list()
        
        # Find vehicle by ID
        target_vehicle = None
        for vehicle in vehicles:
            if str(vehicle.get("id")) == str(vehicle_id) or str(vehicle.get("vehicle_id")) == str(vehicle_id):
                target_vehicle = vehicle
                break
        
        if not target_vehicle:
            return jsonify({"error": f"Vehicle with ID {vehicle_id} not found"}), 404
        
        # Get location data (this will wake up if needed)
        target_vehicle.get_vehicle_location_data()
        
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
        
        print(f"📍 Retrieved location for vehicle {target_vehicle.get('display_name')}")
        
        return jsonify({
            "location": location_data,
            "success": True
        })
        
    except Exception as e:
        print(f"❌ Tesla vehicle location fetch failed: {str(e)}")
        return jsonify({"error": f"Failed to fetch vehicle location: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=DEBUG, host=HOST, port=PORT)
