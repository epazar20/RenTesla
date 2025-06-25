from flask import Flask, request, jsonify
from functools import wraps
import teslapy
import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth, firestore
from urllib.parse import urlparse, parse_qs
from auth_service import AuthService
import subprocess

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
FIREBASE_WEB_API_KEY = os.getenv('FIREBASE_WEB_API_KEY', 'AIzaSyB8v4_sY7CKoT6_jJ1bE9Y6bKQYFw6o8EY')

# Tesla Vehicle Command Configuration
TESLA_VEHICLE_COMMAND_ENABLED = os.getenv('TESLA_VEHICLE_COMMAND_ENABLED', 'false').lower() == 'true'
TESLA_PRIVATE_KEY_PATH = os.getenv('TESLA_PRIVATE_KEY_PATH', './tesla_private.pem')
TESLA_GO_TOOL_PATH = os.getenv('TESLA_GO_TOOL_PATH', './tesla-control')
TESLA_COMMAND_METHOD = os.getenv('TESLA_COMMAND_METHOD', 'internet')  # internet, ble, proxy

if not os.path.exists(RENT_DIR):
    os.makedirs(RENT_DIR)

# Firebase setup with error handling
firebase_connected = False
firestore_db = None
try:
    if not firebase_admin._apps:
        if os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
            cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
            firebase_admin.initialize_app(cred)
            firestore_db = firestore.client()
            firebase_connected = True
            print("✅ Firebase initialized successfully")
            print("✅ Firestore client initialized")
        else:
            print(f"⚠️  {FIREBASE_SERVICE_ACCOUNT_PATH} not found - Firebase auth disabled")
            TEST_MODE = True
except Exception as e:
    print(f"⚠️  Firebase initialization failed: {e}")
    firebase_connected = False

# Initialize AuthService AFTER Firebase Admin SDK
auth_service = AuthService(FIREBASE_WEB_API_KEY)

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
    
    return auth_service.verify_id_token(id_token)

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
    tesla_command_check = check_tesla_command_prerequisites()
    
    status = {
        "status": "healthy",
        "test_mode": TEST_MODE,
        "firebase_connected": firebase_connected,
        "tesla_token_exists": os.path.exists(TOKEN_FILE),
        "tesla_email_configured": EMAIL != 'your-email@example.com',
        "tesla_vehicle_command": {
            "enabled": TESLA_VEHICLE_COMMAND_ENABLED,
            "ready": tesla_command_check["ready"],
            "method": TESLA_COMMAND_METHOD,
            "details": tesla_command_check
        }
    }
    return jsonify(status)

# NEW: Login endpoint
@app.route('/auth/login', methods=['POST'])
def login():
    """Email ve password ile login olup JWT token döner"""
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    # Firebase auth ile giriş yap
    auth_result = auth_service.sign_in_with_email_password(email, password)
    
    if auth_result:
        return jsonify({
            "message": "Login successful",
            "id_token": auth_result["id_token"],
            "refresh_token": auth_result["refresh_token"],
            "user_id": auth_result["user_id"],
            "email": auth_result.get("email", email),
            "expires_in": auth_result["expires_in"]
        })
    else:
        return jsonify({"error": "Invalid credentials"}), 401

# NEW: Refresh token endpoint
@app.route('/auth/refresh', methods=['POST'])
def refresh_token():
    """Refresh token ile yeni ID token alır"""
    data = request.json or {}
    refresh_token = data.get('refresh_token')
    
    if not refresh_token:
        return jsonify({"error": "Refresh token required"}), 400
    
    auth_result = auth_service.refresh_id_token(refresh_token)
    
    if auth_result:
        return jsonify({
            "message": "Token refreshed successfully",
            "id_token": auth_result["id_token"],
            "refresh_token": auth_result["refresh_token"],
            "user_id": auth_result["user_id"],
            "expires_in": auth_result["expires_in"]
        })
    else:
        return jsonify({"error": "Invalid refresh token"}), 401

# Endpoint: Firebase Authentication (Create Custom Token)
@app.route('/auth/firebase', methods=['POST'])
def firebase_auth():
    """Create Firebase custom token for testing purposes"""
    if TEST_MODE:
        # Test mode - return mock JWT token
        return jsonify({
            "token": "mock-jwt-token-for-testing",
            "uid": "test-user",
            "email": "test@example.com",
            "message": "Mock JWT token created (TEST MODE)"
        })
    
    if not firebase_connected:
        return jsonify({"error": "Firebase not connected"}), 500
    
    data = request.json or {}
    uid = data.get('uid', 'user-test')
    email = data.get('email', 'user@gmail.com')
    
    try:
        # Create custom token for the user
        custom_token = firebase_auth.create_custom_token(uid, {
            'email': email,
            'role': 'user'
        })
        
        # If user doesn't exist, create it
        try:
            firebase_auth.get_user(uid)
        except firebase_auth.UserNotFoundError:
            firebase_auth.create_user(
                uid=uid,
                email=email,
                email_verified=True
            )
            print(f"✅ Created new user: {uid} ({email})")
        
        print(f"🔐 Custom token created for user: {uid}")
        
        return jsonify({
            "custom_token": custom_token.decode('utf-8'),
            "uid": uid,
            "email": email,
            "message": "Custom token created successfully",
            "note": "Use this custom_token to sign in with Firebase Auth SDK to get ID token"
        })
        
    except Exception as e:
        print(f"❌ Firebase auth failed: {str(e)}")
        return jsonify({"error": f"Firebase auth failed: {str(e)}"}), 500

# Endpoint: Create ID Token from Custom Token (for testing)
@app.route('/auth/id-token', methods=['POST'])
def create_id_token():
    """Create ID token from custom token for testing"""
    data = request.json or {}
    uid = data.get('uid', 'user-test')
    email = data.get('email', 'user@gmail.com')
    
    if TEST_MODE:
        return jsonify({
            "id_token": "mock-id-token-for-testing",
            "uid": uid,
            "email": email,
            "message": "Mock ID token created (TEST MODE)"
        })
    
    if not firebase_connected:
        return jsonify({"error": "Firebase not connected"}), 500
    
    try:
        # Create custom claims for the token
        custom_claims = {
            'email': email,
            'role': 'user'
        }
        
        # Ensure user exists, create if not
        try:
            firebase_auth.get_user(uid)
        except firebase_auth.UserNotFoundError:
            firebase_auth.create_user(
                uid=uid,
                email=email,
                email_verified=True
            )
            print(f"✅ Created new user: {uid} ({email})")
        
        # Set custom claims for user
        firebase_auth.set_custom_user_claims(uid, custom_claims)
        
        # Create custom token
        custom_token = firebase_auth.create_custom_token(uid, custom_claims)
        
        # For testing purposes, we'll create a mock ID token
        # In real app, client would use this custom_token to get ID token
        mock_id_token = f"test-id-token-{uid}-{email.replace('@', '-at-')}-{int(datetime.utcnow().timestamp())}"
        
        return jsonify({
            "id_token": mock_id_token,
            "custom_token": custom_token.decode('utf-8'),
            "uid": uid,
            "email": email,
            "message": "Test ID token created successfully"
        })
        
    except Exception as e:
        print(f"❌ ID token creation failed: {str(e)}")
        return jsonify({"error": f"ID token creation failed: {str(e)}"}), 500

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
        # Create Tesla instance without cache to avoid authorized state issue
        tesla = teslapy.Tesla(EMAIL, cache_loader=lambda: {}, cache_dumper=lambda x: None)
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

# Endpoint: Clear Tesla Auth Token
@app.route('/auth/clear', methods=['POST'])
def clear_auth():
    """Clear Tesla authentication token to force re-authentication"""
    try:
        if os.path.exists(TOKEN_FILE):
            os.remove(TOKEN_FILE)
            print(f"🗑️ Removed token file: {TOKEN_FILE}")
            return jsonify({
                "message": "Tesla token cleared successfully",
                "success": True
            })
        else:
            return jsonify({
                "message": "No token file found to clear",
                "success": True
            })
    except Exception as e:
        print(f"❌ Token clear failed: {str(e)}")
        return jsonify({"error": f"Token clear failed: {str(e)}"}), 500

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

# Firestore helper functions
def save_rent_to_firestore(user_id, rent_info):
    """Save rent info to Firestore"""
    if TEST_MODE or not firestore_db:
        # Fallback to file system
        with open(f"{RENT_DIR}/{user_id}.json", 'w') as f:
            json.dump(rent_info, f)
        return True
    
    try:
        doc_ref = firestore_db.collection('rents').document(user_id)
        doc_ref.set(rent_info)
        return True
    except Exception as e:
        print(f"❌ Firestore save failed: {e}")
        # Fallback to file system
        with open(f"{RENT_DIR}/{user_id}.json", 'w') as f:
            json.dump(rent_info, f)
        return True

def get_rent_from_firestore(user_id):
    """Get rent info from Firestore"""
    if TEST_MODE or not firestore_db:
        # Fallback to file system
        rent_file = f"{RENT_DIR}/{user_id}.json"
        if os.path.exists(rent_file):
            with open(rent_file) as f:
                return json.load(f)
        return None
    
    try:
        doc_ref = firestore_db.collection('rents').document(user_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as e:
        print(f"❌ Firestore get failed: {e}")
        # Fallback to file system
        rent_file = f"{RENT_DIR}/{user_id}.json"
        if os.path.exists(rent_file):
            with open(rent_file) as f:
                return json.load(f)
        return None

def delete_rent_from_firestore(user_id):
    """Delete rent info from Firestore"""
    if TEST_MODE or not firestore_db:
        # Fallback to file system
        rent_file = f"{RENT_DIR}/{user_id}.json"
        if os.path.exists(rent_file):
            os.remove(rent_file)
        return True
    
    try:
        doc_ref = firestore_db.collection('rents').document(user_id)
        doc_ref.delete()
        return True
    except Exception as e:
        print(f"❌ Firestore delete failed: {e}")
        return False

# Endpoint: Kiralama başlat
@app.route('/api/rent', methods=['POST'])
@require_auth
def start_rent():
    user = request.user
    data = request.json or {}
    duration_minutes = data.get("duration", 30)
    vehicle_id = data.get("vehicle_id", "default")  # Tesla vehicle ID
    now = datetime.utcnow()

    rent_info = {
        "user_id": user["uid"],
        "user_email": user["email"],
        "vehicle_id": vehicle_id,
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(minutes=duration_minutes)).isoformat(),
        "duration_minutes": duration_minutes,
        "allowed_commands": ["unlock", "lock", "honk_horn"],
        "test_mode": TEST_MODE,
        "created_at": now.isoformat(),
        "status": "active"
    }

    try:
        save_rent_to_firestore(user["uid"], rent_info)
        
        print(f"📝 Rent started for user {user['uid']} ({user['email']}) for {duration_minutes} minutes")
        return jsonify({
            "status": "Rent started", 
            "rent_id": user["uid"],
            "vehicle_id": vehicle_id,
            "start_time": rent_info["start_time"],
            "end_time": rent_info["end_time"],
            "duration_minutes": duration_minutes,
            "allowed_commands": rent_info["allowed_commands"],
            "success": True
        })
    except Exception as e:
        print(f"❌ Rent start failed: {str(e)}")
        return jsonify({"error": f"Failed to start rent: {str(e)}"}), 500

# Endpoint: Komut gönderme
@app.route('/api/vehicle/command', methods=['POST'])
@require_auth
def vehicle_command():
    user = request.user
    data = request.json or {}
    command = data.get("command")

    if not command:
        return jsonify({"error": "Command is required"}), 400

    # Get rent info from Firestore
    rent_info = get_rent_from_firestore(user["uid"])
    if not rent_info:
        return jsonify({"error": "No active rent found"}), 403

    try:
        now = datetime.utcnow().isoformat()
        if now > rent_info["end_time"]:
            return jsonify({"error": "Rental period expired"}), 403

        if command not in rent_info["allowed_commands"]:
            return jsonify({"error": f"Command '{command}' not allowed. Allowed: {rent_info['allowed_commands']}"}), 403

        # Check Tesla Vehicle Command prerequisites
        prereq_check = check_tesla_command_prerequisites()
        
        if TEST_MODE:
            # Test mode - simulate command execution
            print(f"🧪 TEST MODE: Simulating command '{command}' for user {user['uid']}")
            return jsonify({
                "status": f"{command} sent (simulated)", 
                "test_mode": True,
                "vehicle_id": rent_info.get("vehicle_id", "mock_vehicle"),
                "user_id": user["uid"]
            })

        # Try real Tesla Vehicle Command first if enabled and ready
        if TESLA_VEHICLE_COMMAND_ENABLED and prereq_check["ready"]:
            print(f"🚗 Attempting real Tesla command '{command}' via {TESLA_COMMAND_METHOD}")
            
            # Map RenTesla commands to Tesla control commands
            tesla_command_map = {
                'honk_horn': 'honk',
                'unlock': 'unlock', 
                'lock': 'lock'
            }
            
            tesla_cmd = tesla_command_map.get(command)
            if tesla_cmd:
                # Execute real Tesla command
                result = execute_tesla_command(rent_info["vehicle_id"], tesla_cmd)
                
                if result["success"]:
                    print(f"✅ Real Tesla command '{command}' executed successfully")
                    return jsonify({
                        "status": f"{command} sent successfully (REAL)",
                        "vehicle_id": rent_info["vehicle_id"],
                        "user_id": user["uid"],
                        "real_command": True,
                        "method": result["method"],
                        "output": result.get("output", "")
                    })
                else:
                    print(f"❌ Real Tesla command failed: {result.get('error', 'Unknown error')}")
                    # Fall through to TeslaPy fallback
            else:
                print(f"⚠️ Command '{command}' not supported by Tesla Vehicle Command")
                # Fall through to TeslaPy fallback

        # Fallback to TeslaPy (will show protocol limitation for 2021+ vehicles)
        tesla = get_tesla_instance()
        if not tesla:
            return jsonify({"error": "Tesla connection failed"}), 500
            
        vehicles = tesla.vehicle_list()
        if not vehicles:
            return jsonify({"error": "No vehicles found"}), 404
            
        vehicle = vehicles[0]  # Use first vehicle for now
        
        # Try to wake up vehicle if it's asleep
        if vehicle.get('state') != 'online':
            print(f"🔋 Vehicle is {vehicle.get('state')}, attempting to wake up...")
            try:
                vehicle.sync_wake_up()
                print(f"✅ Vehicle woken up successfully")
            except Exception as wake_error:
                print(f"⚠️ Wake up failed: {wake_error}")

        # Execute command via TeslaPy
        try:
            if command == 'unlock':
                result = vehicle.command('UNLOCK')
            elif command == 'lock':
                result = vehicle.command('LOCK')
            elif command == 'honk_horn':
                result = vehicle.command('HONK_HORN')
            else:
                return jsonify({"error": f"Unknown command: {command}"}), 400

            print(f"🚗 TeslaPy command '{command}' executed for user {user['uid']} on vehicle {vehicle.get('display_name')}")
            return jsonify({
                "status": f"{command} sent successfully (TeslaPy)",
                "vehicle_id": vehicle.get("id"),
                "vehicle_name": vehicle.get("display_name"),
                "command_result": result,
                "user_id": user["uid"],
                "fallback": True
            })
            
        except Exception as cmd_error:
            error_msg = str(cmd_error)
            # Handle Tesla Vehicle Command Protocol error
            if "Tesla Vehicle Command Protocol required" in error_msg:
                print(f"⚠️ Tesla Vehicle Command Protocol required for {command}")
                return jsonify({
                    "status": f"{command} sent (protocol limitation)",
                    "vehicle_id": vehicle.get("id"),
                    "vehicle_name": vehicle.get("display_name"),
                    "message": "Tesla now requires Vehicle Command Protocol for this vehicle",
                    "simulation": True,
                    "user_id": user["uid"],
                    "prereq_check": prereq_check
                })
            else:
                raise cmd_error
        
    except Exception as e:
        print(f"❌ Command execution failed: {str(e)}")
        return jsonify({"error": f"Command execution failed: {str(e)}"}), 500

# Endpoint: Aktif kiralamayı görüntüle
@app.route('/api/rent/status', methods=['GET'])
@require_auth
def rent_status():
    user = request.user
    
    try:
        rent_info = get_rent_from_firestore(user["uid"])
        
        if not rent_info:
            return jsonify({
                "active_rent": False,
                "message": "No rent found for this user"
            })
        
        now = datetime.utcnow().isoformat()
        is_active = now <= rent_info["end_time"]
        
        if not is_active:
            # Clean up expired rent
            delete_rent_from_firestore(user["uid"])
        
        return jsonify({
            "active_rent": is_active,
            "rent_info": rent_info if is_active else None,
            "current_time": now,
            "time_remaining": rent_info["end_time"] if is_active else None
        })
        
    except Exception as e:
        print(f"❌ Rent status check failed: {str(e)}")
        return jsonify({"error": f"Failed to get rent status: {str(e)}"}), 500

# Endpoint: End Rent
@app.route('/api/rent/end', methods=['POST'])
@require_auth
def end_rent():
    """End active rent manually"""
    user = request.user
    
    try:
        rent_info = get_rent_from_firestore(user["uid"])
        
        if not rent_info:
            return jsonify({"error": "No active rent found"}), 404
        
        # Update rent status to ended
        rent_info["status"] = "ended"
        rent_info["ended_at"] = datetime.utcnow().isoformat()
        
        # Delete from active rents
        delete_rent_from_firestore(user["uid"])
        
        # Optionally save to rent history
        if firestore_db and not TEST_MODE:
            try:
                history_ref = firestore_db.collection('rent_history').document()
                history_ref.set(rent_info)
            except Exception as e:
                print(f"⚠️ Failed to save rent history: {e}")
        
        print(f"🏁 Rent ended for user {user['uid']}")
        return jsonify({
            "message": "Rent ended successfully",
            "rent_info": rent_info,
            "success": True
        })
        
    except Exception as e:
        print(f"❌ End rent failed: {str(e)}")
        return jsonify({"error": f"Failed to end rent: {str(e)}"}), 500

# Endpoint: Tesla Vehicle List
@app.route('/api/tesla/vehicles', methods=['GET'])
@require_auth
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
@require_auth
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
@require_auth
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
@require_auth
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

# Tesla Vehicle Command Integration
def execute_tesla_command(vehicle_id, command, key_file_path=None):
    """Execute real Tesla command using Go tool"""
    if not key_file_path:
        key_file_path = TESLA_PRIVATE_KEY_PATH
    
    try:
        # Tesla control command arguments
        cmd_args = [TESLA_GO_TOOL_PATH]
        
        # Add method-specific flags
        if TESLA_COMMAND_METHOD == 'ble':
            cmd_args.append('-ble')
        
        # Add VIN and key file
        cmd_args.extend([
            '-vin', str(vehicle_id),
            '-key-file', key_file_path,
            command
        ])
        
        print(f"🚗 Executing Tesla command: {' '.join(cmd_args)}")
        
        # Execute command with timeout
        result = subprocess.run(
            cmd_args, 
            capture_output=True, 
            text=True, 
            timeout=30,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        if result.returncode == 0:
            return {
                "success": True, 
                "output": result.stdout.strip(),
                "method": TESLA_COMMAND_METHOD,
                "real_command": True
            }
        else:
            return {
                "success": False, 
                "error": result.stderr.strip(),
                "output": result.stdout.strip(),
                "method": TESLA_COMMAND_METHOD
            }
            
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Command timeout (30s)", "method": TESLA_COMMAND_METHOD}
    except FileNotFoundError:
        return {"success": False, "error": f"Tesla tool not found: {TESLA_GO_TOOL_PATH}", "method": TESLA_COMMAND_METHOD}
    except Exception as e:
        return {"success": False, "error": str(e), "method": TESLA_COMMAND_METHOD}

def check_tesla_command_prerequisites():
    """Check if Tesla command execution is possible"""
    checks = {
        "tool_exists": os.path.exists(TESLA_GO_TOOL_PATH),
        "key_exists": os.path.exists(TESLA_PRIVATE_KEY_PATH),
        "tool_executable": os.access(TESLA_GO_TOOL_PATH, os.X_OK) if os.path.exists(TESLA_GO_TOOL_PATH) else False,
        "enabled": TESLA_VEHICLE_COMMAND_ENABLED
    }
    
    checks["ready"] = all([
        checks["tool_exists"],
        checks["key_exists"], 
        checks["tool_executable"]
    ])
    
    return checks

if __name__ == '__main__':
    app.run(debug=DEBUG, host=HOST, port=PORT)
