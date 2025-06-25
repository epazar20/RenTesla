import requests
import os
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import redis
import json
import time
import psutil
from flask import Flask, jsonify, request
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    get_jwt_identity, jwt_required, get_jwt
)

load_dotenv()

app = Flask(__name__)

# Production configuration
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-super-secret-jwt-key-for-testing")
jwt = JWTManager(app)

# Metrics storage
metrics = {
    "api_requests": 0,
    "tesla_commands": 0,
    "redis_operations": 0,
    "errors": 0,
    "start_time": time.time()
}

# Redis configuration with SSL support for Upstash
redis_url = os.getenv("REDIS_URL")

if redis_url:
    # Use Redis URL (Upstash format)
    try:
        redis_client = redis.from_url(redis_url, decode_responses=True)
        redis_client.ping()
        print(f"✅ Redis connected via URL")
    except Exception as e:
        print(f"⚠️ Redis URL connection failed: {e}")
        redis_client = None
else:
    # Direct connection (like user's test code)
    try:
        redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            password=os.getenv("REDIS_PASSWORD"),
            db=int(os.getenv("REDIS_DB", 0)),
            decode_responses=True
        )
        redis_client.ping()
        print(f"✅ Redis connected to {os.getenv('REDIS_HOST')}")
    except Exception as e:
        print(f"⚠️ Redis connection failed: {e}")
        redis_client = None

# Scheduler setup
scheduler = BackgroundScheduler()
scheduler.start()

# Tesla configuration
TESLA_CLIENT_ID = os.getenv("TESLA_CLIENT_ID")
TESLA_CLIENT_SECRET = os.getenv("TESLA_CLIENT_SECRET")
TEST_MODE = os.getenv("TEST_MODE", "true").lower() == "true"

print(f"🚗 Tesla Fleet Rental API Starting")
print(f"📍 Test Mode: {TEST_MODE}")
print(f"🔑 Tesla Credentials: {'✅' if TESLA_CLIENT_ID and TESLA_CLIENT_SECRET else '❌'}")

def refresh_access_token(refresh_token: str) -> dict:
    url = "https://auth.tesla.com/oauth2/v3/token"
    headers = {"Content-Type": "application/json"}
    data = {
        "grant_type": "refresh_token",
        "client_id": TESLA_CLIENT_ID,
        "client_secret": TESLA_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "scope": "openid email offline_access"
    }
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        token_data = response.json()
        return {
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token", refresh_token),
            "expires_in": token_data["expires_in"]
        }
    else:
        raise Exception(f"Failed to refresh token: {response.status_code} {response.text}")

def store_tokens(user_id: str, access_token: str, refresh_token: str, expires_in: int):
    token_data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
    }
    redis_client.set(f"token:{user_id}", json.dumps(token_data))

def refresh_all_tokens():
    for key in redis_client.scan_iter(match="token:user:*"):
        user_id = key.split(":", 1)[1]
        token_data = json.loads(redis_client.get(key))
        expires_at = datetime.fromisoformat(token_data.get("expires_at"))
        time_left = (expires_at - datetime.utcnow()).total_seconds()

        if time_left < 300:  # 5 dakika kala yenile
            refresh_token_str = token_data.get("refresh_token")
            try:
                new_tokens = refresh_access_token(refresh_token_str)
                store_tokens(user_id, new_tokens["access_token"], new_tokens["refresh_token"], new_tokens["expires_in"])
                print(f"[{datetime.utcnow()}] Access token refreshed for {user_id}")
            except Exception as e:
                print(f"[ERROR] Failed to refresh token for {user_id}: {e}")
                # Burada kullanıcı bilgilendirme eklenebilir

scheduler.add_job(
    func=refresh_all_tokens,
    trigger='cron',
    minute=0,
    id="refresh_all_tokens_job",
    replace_existing=True
)

def list_vehicles(access_token: str) -> list:
    url = "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json().get("response", [])
    else:
        raise Exception(f"Failed to fetch vehicles: {response.status_code} {response.text}")

def send_vehicle_command(vehicle_id: str, access_token: str, command: str, data: dict = None) -> dict:
    url = f"https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/{vehicle_id}/{command}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    response = requests.post(url, headers=headers, json=data or {})
    return response.json()

def start_rental(user_id: str, vehicle_id: str, duration_minutes: int):
    rental_key = f"rental:{user_id}:{vehicle_id}"
    end_time = datetime.utcnow() + timedelta(minutes=duration_minutes)
    rental_data = {
        "user_id": user_id,
        "vehicle_id": vehicle_id,
        "end_time": end_time.isoformat()
    }
    redis_client.set(rental_key, json.dumps(rental_data), ex=duration_minutes*60)
    scheduler.add_job(
        func=expire_rental,
        trigger='date',
        run_date=end_time,
        args=[user_id, vehicle_id],
        id=f"rental_expire_{user_id}_{vehicle_id}",
        replace_existing=True
    )
    print(f"Rental scheduled to end at {end_time} for user {user_id} and vehicle {vehicle_id}")

def expire_rental(user_id: str, vehicle_id: str):
    rental_key = f"rental:{user_id}:{vehicle_id}"
    redis_client.delete(rental_key)
    print(f"Rental expired for user {user_id} and vehicle {vehicle_id}")

def logout_user(jti: str):
    key = f"jwt_blacklist:{jti}"
    redis_client.set(key, "revoked", ex=3600 * 24)
    print(f"Token with jti {jti} revoked.")

def is_token_revoked(jti: str) -> bool:
    key = f"jwt_blacklist:{jti}"
    return redis_client.exists(key) == 1

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    return is_token_revoked(jwt_payload["jti"])

@app.route("/login", methods=["POST"])
def login():
    username = request.json.get("username")
    user_id = f"user:{username}"
    access_token = create_access_token(identity=user_id)
    refresh_token = create_refresh_token(identity=user_id)
    store_tokens(user_id, access_token, refresh_token, expires_in=8 * 3600)
    return jsonify(access_token=access_token, refresh_token=refresh_token)

@app.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    new_token = create_access_token(identity=identity)
    return jsonify(access_token=new_token)

@app.route("/logout", methods=["DELETE"])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    logout_user(jti)
    return jsonify(msg="Access token revoked")

@app.route("/rental/start", methods=["POST"])
@jwt_required()
def api_start_rental():
    user_id = get_jwt_identity()
    data = request.json
    vehicle_id = data["vehicle_id"]
    duration = data.get("duration", 30)
    start_rental(user_id, vehicle_id, duration)
    return jsonify(msg="Rental started")

@app.route("/vehicle/command", methods=["POST"])
@jwt_required()
def vehicle_command():
    metrics["api_requests"] += 1
    metrics["tesla_commands"] += 1
    
    user_id = get_jwt_identity()
    data = request.json
    vehicle_id = data.get("vehicle_id")
    command = data.get("command")
    command_data = data.get("data", {})

    rental_key = f"rental:{user_id}:{vehicle_id}"
    rental_info = redis_client.get(rental_key)
    if not rental_info:
        metrics["errors"] += 1
        return jsonify(error="Rental expired or not found."), 403

    token_data = redis_client.get(f"token:{user_id}")
    if not token_data:
        metrics["errors"] += 1
        return jsonify(error="User access token not found."), 401

    token_data = json.loads(token_data)
    try:
        result = send_vehicle_command(vehicle_id, token_data["access_token"], command, command_data)
        return jsonify(result)
    except Exception as e:
        metrics["errors"] += 1
        return jsonify(error=str(e)), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for Fly.io"""
    metrics["api_requests"] += 1
    
    redis_status = False
    redis_error = None
    
    if redis_client:
        try:
            redis_client.ping()
            redis_status = True
        except Exception as e:
            redis_error = str(e)
            metrics["errors"] += 1
    else:
        redis_error = "Redis client not initialized"
    
    status = {
        "status": "healthy",  # Always return healthy for basic functionality
        "app": "Tesla Fleet Rental API",
        "redis_connected": redis_status,
        "redis_error": redis_error if not redis_status else None,
        "test_mode": TEST_MODE,
        "tesla_credentials_configured": bool(TESLA_CLIENT_ID and TESLA_CLIENT_SECRET),
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }
    
    # Return 200 even if Redis is down for graceful degradation
    return jsonify(status), 200

@app.route("/metrics", methods=["GET"])
def metrics_endpoint():
    """Production metrics endpoint"""
    metrics["api_requests"] += 1
    
    uptime = time.time() - metrics["start_time"]
    
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        system_metrics = {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_mb": memory.available / 1024 / 1024,
            "disk_percent": disk.percent,
            "disk_free_gb": disk.free / 1024 / 1024 / 1024
        }
    except:
        system_metrics = {"error": "System metrics unavailable"}
    
    response_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": round(uptime, 2),
        "uptime_human": str(timedelta(seconds=int(uptime))),
        "api_metrics": {
            "total_requests": metrics["api_requests"],
            "tesla_commands": metrics["tesla_commands"],
            "redis_operations": metrics["redis_operations"],
            "errors": metrics["errors"],
            "requests_per_minute": round(metrics["api_requests"] / (uptime / 60), 2) if uptime > 60 else 0
        },
        "system_metrics": system_metrics,
        "redis_status": redis_client is not None,
        "tesla_credentials": bool(TESLA_CLIENT_ID and TESLA_CLIENT_SECRET)
    }
    
    return jsonify(response_data), 200

@app.route("/status", methods=["GET"])
def status_endpoint():
    """Detailed status endpoint for monitoring systems"""
    metrics["api_requests"] += 1
    
    # Test Tesla API connectivity
    tesla_api_status = False
    try:
        if TESLA_CLIENT_ID and TESLA_CLIENT_SECRET:
            # Test token endpoint
            response = requests.get("https://auth.tesla.com/.well-known/openid_configuration", timeout=5)
            tesla_api_status = response.status_code == 200
    except:
        tesla_api_status = False
    
    # Test Redis connectivity
    redis_status = False
    redis_latency = None
    if redis_client:
        try:
            start_time = time.time()
            redis_client.ping()
            redis_latency = round((time.time() - start_time) * 1000, 2)
            redis_status = True
            metrics["redis_operations"] += 1
        except:
            redis_status = False
    
    status_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "overall_status": "healthy",
        "services": {
            "api": {
                "status": "healthy",
                "uptime_seconds": round(time.time() - metrics["start_time"], 2)
            },
            "redis": {
                "status": "healthy" if redis_status else "unhealthy",
                "connected": redis_status,
                "latency_ms": redis_latency
            },
            "tesla_api": {
                "status": "healthy" if tesla_api_status else "unhealthy", 
                "reachable": tesla_api_status,
                "credentials_configured": bool(TESLA_CLIENT_ID and TESLA_CLIENT_SECRET)
            }
        },
        "configuration": {
            "test_mode": TEST_MODE,
            "debug_mode": os.getenv("DEBUG", "false").lower() == "true",
            "log_level": os.getenv("LOG_LEVEL", "INFO"),
            "domain": "rentesla.xyz",
            "public_key_endpoint": "https://rentesla.xyz/.well-known/appspecific/com.tesla.3p.public-key.pem"
        }
    }
    
    return jsonify(status_data), 200

# Tesla public key serving endpoint
@app.route("/.well-known/appspecific/com.tesla.3p.public-key.pem", methods=["GET"])
def serve_tesla_public_key():
    """Serve Tesla public key for vehicle command authentication"""
    try:
        with open("/.well-known/appspecific/com.tesla.3p.public-key.pem", "r") as f:
            public_key = f.read()
        
        response = app.response_class(
            response=public_key,
            status=200,
            mimetype='application/x-pem-file'
        )
        response.headers['Cache-Control'] = 'public, max-age=31536000'
        return response
    except FileNotFoundError:
        return "Public key not found", 404

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("DEBUG", "true").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
