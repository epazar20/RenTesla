import psycopg2
import psycopg2.pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os
import json
from datetime import datetime, timedelta
from contextlib import contextmanager
from decimal import Decimal
import pytz
import threading

# Load environment variables
load_dotenv()

# Database configuration
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "6543")
DB_NAME = os.getenv("DB_NAME")
DATABASE_URL = os.getenv("DATABASE_URL")

# Timezone configuration
TURKEY_TZ = pytz.timezone('Europe/Istanbul')

class CustomJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for Decimal and datetime objects"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, datetime):
            return obj.isoformat()
        return super(CustomJSONEncoder, self).default(obj)

def convert_to_turkey_time(utc_dt):
    """Convert UTC datetime to Turkey timezone"""
    if utc_dt is None:
        return None
    if utc_dt.tzinfo is None:
        utc_dt = pytz.UTC.localize(utc_dt)
    return utc_dt.astimezone(TURKEY_TZ)

# Connection pool
connection_pool = None

# Token cache
_token_cache = None
_token_cache_time = None
CACHE_DURATION = timedelta(minutes=10)  # Cache token for 10 minutes

def init_db_pool():
    """Initialize database connection pool"""
    global connection_pool
    try:
        if DATABASE_URL:
            # Use DATABASE_URL if available
            connection_pool = psycopg2.pool.SimpleConnectionPool(
                1, 20,  # min and max connections
                DATABASE_URL,
                cursor_factory=RealDictCursor
            )
        else:
            # Use individual parameters
            connection_pool = psycopg2.pool.SimpleConnectionPool(
                1, 20,  # min and max connections
                user=DB_USER,
                password=DB_PASSWORD,
                host=DB_HOST,
                port=DB_PORT,
                dbname=DB_NAME,
                cursor_factory=RealDictCursor
            )
        
        # Set timezone to Turkey for all connections
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SET timezone = 'Europe/Istanbul'")
            cursor.close()
            
        print("✅ Database connection pool initialized successfully")
        print("🇹🇷 Database timezone set to Europe/Istanbul")
        return True
    except Exception as e:
        print(f"❌ Database connection pool initialization failed: {e}")
        return False

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    connection = None
    try:
        if connection_pool is None:
            init_db_pool()
        
        connection = connection_pool.getconn()
        yield connection
        connection.commit()
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"❌ Database error: {e}")
        raise
    finally:
        if connection:
            connection_pool.putconn(connection)

def test_connection():
    """Test database connection"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT NOW(), version();")
            result = cursor.fetchone()
            cursor.close()
            print(f"✅ Database connection successful!")
            print(f"📅 Current Time: {result['now']}")
            print(f"🐘 PostgreSQL Version: {result['version']}")
            return True
    except Exception as e:
        print(f"❌ Database connection test failed: {e}")
        return False

def execute_query(query, params=None, fetch=False):
    """Execute a database query"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            
            if fetch:
                if fetch == 'one':
                    result = cursor.fetchone()
                elif fetch == 'all':
                    result = cursor.fetchall()
                else:
                    result = cursor.fetchall()
            else:
                result = cursor.rowcount
            
            cursor.close()
            return result
    except Exception as e:
        print(f"❌ Query execution failed: {e}")
        raise

def create_tables():
    """Create necessary tables for Tesla rental system"""
    tables = {
        'users': '''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                tesla_email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''',
        'tesla_tokens': '''
            CREATE TABLE IF NOT EXISTS tesla_tokens (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                token_data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            );
        ''',
        'vehicles': '''
            CREATE TABLE IF NOT EXISTS vehicles (
                id BIGINT,
                vehicle_id BIGINT PRIMARY KEY,
                vin VARCHAR(17) UNIQUE,
                display_name VARCHAR(255),
                state VARCHAR(50),
                color VARCHAR(100),
                option_codes TEXT,
                api_version INTEGER,
                in_service BOOLEAN DEFAULT FALSE,
                user_email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''',
        'vehicle_locations': '''
            CREATE TABLE IF NOT EXISTS vehicle_locations (
                id SERIAL PRIMARY KEY,
                vehicle_id BIGINT NOT NULL,
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                heading INTEGER,
                speed INTEGER,
                power INTEGER,
                shift_state VARCHAR(10),
                gps_as_of BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''',
        'auth_sessions': '''
            CREATE TABLE IF NOT EXISTS auth_sessions (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) UNIQUE NOT NULL,
                state VARCHAR(255) NOT NULL,
                code_verifier TEXT NOT NULL,
                email VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour')
            );
        ''',
        'vehicle_data_logs': '''
            CREATE TABLE IF NOT EXISTS vehicle_data_logs (
                id SERIAL PRIMARY KEY,
                vehicle_id BIGINT NOT NULL,
                data_type VARCHAR(50) NOT NULL,
                data JSONB NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''',
        'vehicle_update_logs': '''
            CREATE TABLE IF NOT EXISTS vehicle_update_logs (
                id SERIAL PRIMARY KEY,
                vehicle_id BIGINT NOT NULL,
                update_type VARCHAR(50) NOT NULL, -- 'vehicle_info' or 'location'
                old_data JSONB,
                new_data JSONB NOT NULL,
                changes JSONB, -- specific fields that changed
                updated_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''',
        'sync_logs': '''
            CREATE TABLE IF NOT EXISTS sync_logs (
                id SERIAL PRIMARY KEY,
                sync_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL,
                message TEXT,
                vehicles_processed INTEGER DEFAULT 0,
                locations_updated INTEGER DEFAULT 0,
                errors_count INTEGER DEFAULT 0,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );
        '''
    }
    
    try:
        for table_name, query in tables.items():
            execute_query(query)
            print(f"✅ Table '{table_name}' created/verified successfully")
        return True
    except Exception as e:
        print(f"❌ Table creation failed: {e}")
        return False

# Tesla Token Management
def save_tesla_token(email, token_data):
    """Save Tesla token to database"""
    global _token_cache, _token_cache_time
    try:
        # Calculate expiry time if available
        expires_at = None
        if 'expires_at' in token_data:
            expires_at = datetime.fromtimestamp(token_data['expires_at'])
        elif 'expires_in' in token_data:
            expires_at = datetime.now() + timedelta(seconds=token_data['expires_in'])
        
        query = '''
            INSERT INTO tesla_tokens (email, token_data, expires_at)
            VALUES (%s, %s, %s)
            ON CONFLICT (email) 
            DO UPDATE SET 
                token_data = EXCLUDED.token_data,
                expires_at = EXCLUDED.expires_at,
                updated_at = CURRENT_TIMESTAMP
        '''
        execute_query(query, (email, json.dumps(token_data, cls=CustomJSONEncoder), expires_at))
        
        # Update cache
        _token_cache = token_data
        _token_cache_time = datetime.now()
        
        print(f"✅ Tesla token saved for {email}")
        return True
    except Exception as e:
        print(f"❌ Save Tesla token failed: {e}")
        return False

def get_tesla_token(email):
    """Get Tesla token from cache or database"""
    global _token_cache, _token_cache_time
    
    # Check cache first
    if (_token_cache and _token_cache_time and 
        datetime.now() - _token_cache_time < CACHE_DURATION):
        return _token_cache
    
    try:
        query = '''
            SELECT token_data, expires_at 
            FROM tesla_tokens 
            WHERE email = %s 
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        '''
        result = execute_query(query, (email,), fetch='one')
        
        if result:
            token_data = result['token_data']
            # Update cache
            _token_cache = token_data
            _token_cache_time = datetime.now()
            return token_data
        
        return None
    except Exception as e:
        print(f"❌ Get Tesla token failed: {e}")
        return None

def clear_tesla_token_cache():
    """Clear token cache"""
    global _token_cache, _token_cache_time
    _token_cache = None
    _token_cache_time = None

# Vehicle Management
def save_vehicle_info(vehicle_data, user_email=None):
    """Save or update vehicle information with logging"""
    try:
        vehicle_id = vehicle_data.get('vehicle_id')
        
        # Get existing vehicle data for comparison
        existing_vehicle = None
        if vehicle_id:
            try:
                query = '''
                    SELECT id, vehicle_id, vin, display_name, state, color, 
                           option_codes, api_version, in_service, user_email
                    FROM vehicles 
                    WHERE vehicle_id = %s
                '''
                result = execute_query(query, (vehicle_id,), fetch='one')
                existing_vehicle = dict(result) if result else None
            except:
                pass
        
        # Prepare new vehicle data
        new_vehicle = {
            'id': vehicle_data.get('id'),
            'vehicle_id': vehicle_data.get('vehicle_id'),
            'vin': vehicle_data.get('vin'),
            'display_name': vehicle_data.get('display_name'),
            'state': vehicle_data.get('state'),
            'color': vehicle_data.get('color'),
            'option_codes': vehicle_data.get('option_codes'),
            'api_version': vehicle_data.get('api_version'),
            'in_service': vehicle_data.get('in_service', False),
            'user_email': user_email
        }
        
        # Use UPSERT with ON CONFLICT
        query = '''
            INSERT INTO vehicles (
                id, vehicle_id, vin, display_name, state, color, 
                option_codes, api_version, in_service, user_email, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (vehicle_id) 
            DO UPDATE SET 
                id = EXCLUDED.id,
                vin = EXCLUDED.vin,
                display_name = EXCLUDED.display_name,
                state = EXCLUDED.state,
                color = EXCLUDED.color,
                option_codes = EXCLUDED.option_codes,
                api_version = EXCLUDED.api_version,
                in_service = EXCLUDED.in_service,
                user_email = EXCLUDED.user_email,
                updated_at = %s
        '''
        
        turkey_time = get_turkey_timestamp()
        
        execute_query(query, (
            new_vehicle['id'],
            new_vehicle['vehicle_id'],
            new_vehicle['vin'],
            new_vehicle['display_name'],
            new_vehicle['state'],
            new_vehicle['color'],
            new_vehicle['option_codes'],
            new_vehicle['api_version'],
            new_vehicle['in_service'],
            new_vehicle['user_email'],
            turkey_time,  # created_at
            turkey_time,  # updated_at
            turkey_time   # for DO UPDATE SET updated_at
        ))
        
        # Log the update asynchronously
        if existing_vehicle:
            async_save_update_log(vehicle_id, 'vehicle_info', existing_vehicle, new_vehicle, user_email)
        else:
            async_save_update_log(vehicle_id, 'vehicle_info', None, new_vehicle, user_email)
        
        return True
    except Exception as e:
        print(f"❌ Save vehicle info failed: {e}")
        return False

def get_all_vehicles():
    """Get all vehicles from database"""
    try:
        query = '''
            SELECT vehicle_id, vin, display_name, state, color, 
                   option_codes, api_version, in_service, user_email,
                   created_at, updated_at
            FROM vehicles 
            ORDER BY updated_at DESC
        '''
        result = execute_query(query, fetch='all')
        
        # Convert timestamps to Turkey time
        vehicles = []
        for row in result:
            vehicle_dict = dict(row)
            vehicle_dict['created_at'] = convert_to_turkey_time(vehicle_dict['created_at'])
            vehicle_dict['updated_at'] = convert_to_turkey_time(vehicle_dict['updated_at'])
            vehicles.append(vehicle_dict)
            
        return vehicles
    except Exception as e:
        print(f"❌ Get vehicles failed: {e}")
        return []

def save_vehicle_location(vehicle_id, location_data):
    """Save or update vehicle location to database with logging"""
    try:
        # First, get existing location for comparison
        existing_location = get_latest_vehicle_location(vehicle_id)
        
        # Prepare new location data
        new_location = {
            'vehicle_id': vehicle_id,
            'latitude': location_data.get('latitude'),
            'longitude': location_data.get('longitude'),
            'heading': location_data.get('heading'),
            'speed': location_data.get('speed'),
            'power': location_data.get('power'),
            'shift_state': location_data.get('shift_state'),
            'gps_as_of': location_data.get('gps_as_of')
        }
        
        if existing_location:
            # Update existing record
            query = '''
                UPDATE vehicle_locations SET 
                    latitude = %s, longitude = %s, heading = %s, speed = %s,
                    power = %s, shift_state = %s, gps_as_of = %s,
                    updated_at = %s
                WHERE vehicle_id = %s AND id = (
                    SELECT id FROM vehicle_locations 
                    WHERE vehicle_id = %s 
                    ORDER BY created_at DESC 
                    LIMIT 1
                )
            '''
            execute_query(query, (
                new_location['latitude'],
                new_location['longitude'],
                new_location['heading'],
                new_location['speed'],
                new_location['power'],
                new_location['shift_state'],
                new_location['gps_as_of'],
                get_turkey_timestamp(),  # updated_at
                vehicle_id,
                vehicle_id
            ))
            
            # Log the update asynchronously
            async_save_update_log(vehicle_id, 'location', existing_location, new_location)
            
        else:
            # Insert new record
            query = '''
                INSERT INTO vehicle_locations (
                    vehicle_id, latitude, longitude, heading, speed, 
                    power, shift_state, gps_as_of, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            '''
            turkey_time = get_turkey_timestamp()
            execute_query(query, (
                vehicle_id,
                new_location['latitude'],
                new_location['longitude'],
                new_location['heading'],
                new_location['speed'],
                new_location['power'],
                new_location['shift_state'],
                new_location['gps_as_of'],
                turkey_time,  # created_at
                turkey_time   # updated_at
            ))
            
            # Log the creation
            async_save_update_log(vehicle_id, 'location', None, new_location)
        
        return True
    except Exception as e:
        print(f"❌ Save vehicle location failed: {e}")
        return False

def get_latest_vehicle_location(vehicle_id):
    """Get latest vehicle location with update time"""
    try:
        query = '''
            SELECT latitude, longitude, heading, speed, power, 
                   shift_state, gps_as_of, created_at, updated_at
            FROM vehicle_locations 
            WHERE vehicle_id = %s 
            ORDER BY created_at DESC 
            LIMIT 1
        '''
        result = execute_query(query, (vehicle_id,), fetch='one')
        return dict(result) if result else None
    except Exception as e:
        print(f"❌ Get vehicle location failed: {e}")
        return None

# Update Logging Functions
def save_update_log(vehicle_id, update_type, old_data, new_data, updated_by=None):
    """Save update log for vehicle changes"""
    try:
        # Calculate changes
        changes = {}
        if old_data and new_data:
            for key, new_value in new_data.items():
                old_value = old_data.get(key)
                if old_value != new_value:
                    changes[key] = {
                        'old': old_value,
                        'new': new_value
                    }
        
        query = '''
            INSERT INTO vehicle_update_logs (
                vehicle_id, update_type, old_data, new_data, changes, updated_by, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        '''
        execute_query(query, (
            vehicle_id,
            update_type,
            json.dumps(old_data, cls=CustomJSONEncoder) if old_data else None,
            json.dumps(new_data, cls=CustomJSONEncoder),
            json.dumps(changes, cls=CustomJSONEncoder) if changes else None,
            updated_by,
            get_turkey_timestamp()  # created_at
        ))
        
        if changes:
            print(f"📝 Logged {update_type} update for vehicle {vehicle_id}: {len(changes)} changes")
        else:
            print(f"📝 Logged {update_type} creation for vehicle {vehicle_id}")
        
        return True
    except Exception as e:
        print(f"❌ Save update log failed: {e}")
        return False

def get_vehicle_update_logs(vehicle_id=None, update_type=None, limit=50):
    """Get vehicle update logs with optional filters"""
    try:
        where_conditions = []
        params = []
        
        if vehicle_id:
            where_conditions.append("vehicle_id = %s")
            params.append(vehicle_id)
            
        if update_type:
            where_conditions.append("update_type = %s")
            params.append(update_type)
        
        where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        query = f'''
            SELECT id, vehicle_id, update_type, old_data, new_data, 
                   changes, updated_by, created_at
            FROM vehicle_update_logs
            {where_clause}
            ORDER BY created_at DESC 
            LIMIT %s
        '''
        params.append(limit)
        
        result = execute_query(query, tuple(params), fetch='all')
        
        # Convert timestamps to Turkey time
        logs = []
        for row in result:
            log_dict = dict(row)
            log_dict['created_at'] = convert_to_turkey_time(log_dict['created_at'])
            logs.append(log_dict)
            
        return logs
    except Exception as e:
        print(f"❌ Get vehicle update logs failed: {e}")
        return []

def get_vehicle_update_summary(vehicle_id):
    """Get update summary for a specific vehicle"""
    try:
        query = '''
            SELECT 
                update_type,
                COUNT(*) as update_count,
                MAX(created_at) as last_update
            FROM vehicle_update_logs 
            WHERE vehicle_id = %s 
            GROUP BY update_type
            ORDER BY last_update DESC
        '''
        result = execute_query(query, (vehicle_id,), fetch='all')
        return [dict(row) for row in result] if result else []
    except Exception as e:
        print(f"❌ Get vehicle update summary failed: {e}")
        return []

# Sync Logging
def start_sync_log(sync_type):
    """Start a sync operation log"""
    try:
        query = '''
            INSERT INTO sync_logs (sync_type, status, started_at)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            RETURNING id
        '''
        result = execute_query(query, (sync_type, 'running'), fetch='one')
        return result['id'] if result else None
    except Exception as e:
        print(f"❌ Start sync log failed: {e}")
        return None

def update_sync_log(log_id, status='completed', message=None, vehicles_processed=0, 
                   locations_updated=0, errors_count=0):
    """Update sync operation log"""
    try:
        query = '''
            UPDATE sync_logs 
            SET status = %s, message = %s, vehicles_processed = %s, 
                locations_updated = %s, errors_count = %s, completed_at = CURRENT_TIMESTAMP
            WHERE id = %s
        '''
        execute_query(query, (status, message, vehicles_processed, 
                            locations_updated, errors_count, log_id))
        return True
    except Exception as e:
        print(f"❌ Update sync log failed: {e}")
        return False

def get_recent_sync_logs(limit=10):
    """Get recent sync logs"""
    try:
        query = '''
            SELECT id, sync_type, status, message, vehicles_processed,
                   locations_updated, errors_count, started_at, completed_at
            FROM sync_logs 
            ORDER BY started_at DESC 
            LIMIT %s
        '''
        result = execute_query(query, (limit,), fetch='all')
        return [dict(row) for row in result] if result else []
    except Exception as e:
        print(f"❌ Get sync logs failed: {e}")
        return []

def cleanup_expired_sessions():
    """Clean up expired auth sessions"""
    try:
        query = "DELETE FROM auth_sessions WHERE expires_at < CURRENT_TIMESTAMP"
        deleted_count = execute_query(query)
        print(f"🧹 Cleaned up {deleted_count} expired auth sessions")
        return deleted_count
    except Exception as e:
        print(f"❌ Session cleanup failed: {e}")
        return 0

# Auth session management
def save_auth_session(session_id, state, code_verifier, email):
    """Save auth session to database"""
    try:
        query = '''
            INSERT INTO auth_sessions (session_id, state, code_verifier, email)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (session_id) 
            DO UPDATE SET 
                state = EXCLUDED.state,
                code_verifier = EXCLUDED.code_verifier,
                email = EXCLUDED.email,
                created_at = CURRENT_TIMESTAMP,
                expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour'
        '''
        execute_query(query, (session_id, state, code_verifier, email))
        return True
    except Exception as e:
        print(f"❌ Save auth session failed: {e}")
        return False

def get_auth_session(state):
    """Get auth session by state"""
    try:
        query = '''
            SELECT session_id, state, code_verifier, email 
            FROM auth_sessions 
            WHERE state = %s AND expires_at > CURRENT_TIMESTAMP
        '''
        result = execute_query(query, (state,), fetch='one')
        return dict(result) if result else None
    except Exception as e:
        print(f"❌ Get auth session failed: {e}")
        return None

def delete_auth_session(session_id):
    """Delete auth session"""
    try:
        query = "DELETE FROM auth_sessions WHERE session_id = %s"
        execute_query(query, (session_id,))
        return True
    except Exception as e:
        print(f"❌ Delete auth session failed: {e}")
        return False

# Vehicle data management
def save_vehicle_data(vehicle_id, data_type, data):
    """Save vehicle data to database"""
    try:
        query = '''
            INSERT INTO vehicle_data_logs (vehicle_id, data_type, data)
            VALUES (%s, %s, %s)
        '''
        execute_query(query, (vehicle_id, data_type, json.dumps(data, cls=CustomJSONEncoder)))
        return True
    except Exception as e:
        print(f"❌ Save vehicle data failed: {e}")
        return False

def get_latest_vehicle_data(vehicle_id, data_type):
    """Get latest vehicle data"""
    try:
        query = '''
            SELECT data, timestamp 
            FROM vehicle_data_logs 
            WHERE vehicle_id = %s AND data_type = %s 
            ORDER BY timestamp DESC 
            LIMIT 1
        '''
        result = execute_query(query, (vehicle_id, data_type), fetch='one')
        return dict(result) if result else None
    except Exception as e:
        print(f"❌ Get vehicle data failed: {e}")
        return None

def get_turkey_timestamp():
    """Get current timestamp in Turkey timezone for database operations"""
    turkey_time = datetime.now(TURKEY_TZ)
    return turkey_time.strftime('%Y-%m-%d %H:%M:%S')

def async_save_update_log(vehicle_id, update_type, old_data, new_data, updated_by=None):
    """Save update log asynchronously"""
    def save_in_background():
        try:
            save_update_log(vehicle_id, update_type, old_data, new_data, updated_by)
        except Exception as e:
            print(f"❌ Async update log failed: {e}")
    
    # Run in background thread
    thread = threading.Thread(target=save_in_background, daemon=True)
    thread.start()

if __name__ == "__main__":
    # Test the database connection
    print("🔍 Testing database connection...")
    if test_connection():
        print("🏗️ Creating tables...")
        create_tables()
        print("🧹 Cleaning up expired sessions...")
        cleanup_expired_sessions()
    else:
        print("❌ Database setup failed!") 