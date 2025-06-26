# Tesla REST API Microservice

A production-ready REST API microservice for Tesla vehicle integration using TeslaPy and PostgreSQL database.

## Features

- 🚗 **Tesla API Integration**: Full Tesla API access via TeslaPy
- 🔐 **OAuth Authentication**: Secure Tesla OAuth 2.0 flow
- 🗄️ **PostgreSQL Database**: Supabase PostgreSQL integration with connection pooling
- 💾 **Data Caching**: Vehicle data caching with configurable TTL
- 📊 **Session Management**: Database-backed authentication sessions
- 🔄 **Real-time Data**: Live vehicle data endpoints
- 🛡️ **Error Handling**: Comprehensive error handling and logging

## Database Schema

### Tables

- **users**: User management with Tesla email linking
- **vehicles**: Vehicle information and metadata
- **auth_sessions**: OAuth session management with expiration
- **vehicle_data_logs**: Cached vehicle data with timestamps

## API Endpoints

### Authentication
- `POST /auth/init` - Initialize Tesla OAuth flow
- `POST /auth/callback` - Handle OAuth callback
- `POST /auth/clear` - Clear authentication tokens
- `GET /auth/status` - Check authentication status

### Vehicle Data (Live)
- `GET /api/tesla/vehicles` - List all vehicles (live from Tesla API)
- `GET /vehicles/{vehicle_id}/data/{data_type}` - Get cached vehicle data
- `GET /api/tesla/vehicle/{vehicle_id}/summary` - Vehicle summary
- `GET /api/tesla/vehicle/{vehicle_id}/data` - **NEW!** Complete vehicle data
- `GET /api/tesla/vehicle/{vehicle_id}/charge` - Charge state
- `GET /api/tesla/vehicle/{vehicle_id}/climate` - Climate state
- `GET /api/tesla/vehicle/{vehicle_id}/location` - Vehicle location (live)

### Vehicle Data (Database)
- `GET /api/vehicles` - List all vehicles from database
- `GET /api/vehicles-with-locations` - Get all vehicles with latest locations
- `GET /api/vehicle/{vehicle_id}/location/latest` - Get latest location for vehicle

### Sync Operations
- `POST /api/sync/vehicles-locations` - **NEW!** Sync all vehicles and locations, return complete data
- `GET /api/sync/logs` - Get recent sync logs
- `POST /api/sync/trigger` - Manually trigger background sync

### Update Logs
- `GET /api/vehicle/{vehicle_id}/update-logs` - **NEW!** Get update logs for specific vehicle
- `GET /api/update-logs` - **NEW!** Get all vehicle update logs

### Vehicle Commands
- `POST /api/tesla/vehicle/{vehicle_id}/wake` - Wake up vehicle
- `POST /api/tesla/vehicle/{vehicle_id}/flash` - Flash lights
- `POST /api/tesla/vehicle/{vehicle_id}/honk` - Honk horn
- `POST /api/tesla/vehicle/{vehicle_id}/climate/on` - Turn on climate
- `POST /api/tesla/vehicle/{vehicle_id}/climate/off` - Turn off climate

## Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Tesla Configuration
TESLA_EMAIL=your-email@example.com

# App Configuration
PORT=5001
HOST=0.0.0.0
DEBUG=True

# Security
SECRET_KEY=your-secret-key-here

# Database Configuration (Supabase PostgreSQL)
DB_USER=postgres.your_project_id
DB_PASSWORD=your-password
DB_HOST=aws-0-eu-north-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DATABASE_URL=postgresql://postgres:your-password@db.your_project_id.supabase.co:5432/postgres
```

## Installation

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   cp env.example .env
   # Edit .env with your database credentials
   ```

3. **Initialize Database**
   ```bash
   python database.py
   ```

4. **Run Application**
   ```bash
   python app.py
   ```

## Database Setup

The application automatically creates necessary tables on startup:

```python
python database.py
```

This will:
- Test database connection
- Create all required tables
- Clean up expired sessions

## Usage

### 1. Authentication Flow

Initialize authentication:
```bash
curl -X POST http://localhost:5001/auth/init \
  -H "Content-Type: application/json" \
  -d '{"email": "your-tesla-email@example.com"}'
```

Complete authentication with callback URL:
```bash
curl -X POST http://localhost:5001/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"callback_url": "https://auth.tesla.com/void/callback?code=...&state=..."}'
```

### 2. Vehicle Data with Caching

Get cached vehicle data (5-minute TTL):
```bash
curl http://localhost:5001/vehicles/123456789/data/charge_state
```

Available data types:
- `vehicle_data` - Complete vehicle data
- `charge_state` - Battery and charging info
- `climate_state` - HVAC and temperature
- `drive_state` - Location and driving data
- `vehicle_state` - Doors, windows, locks

### 3. **NEW!** One-Time Sync with Complete Response

Sync all vehicles and get complete data with locations:
```bash
curl -X POST http://localhost:5001/api/sync/vehicles-locations
```

Response example:
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "summary": {
    "vehicles_processed": 1,
    "locations_updated": 1,
    "errors_count": 0,
    "errors": [],
    "sync_time": "2025-06-26T20:45:05.813929"
  },
  "total_vehicles": 1,
  "vehicles": [
    {
      "vehicle_info": {
        "vehicle_id": 1689262419488057,
        "display_name": "Model Y",
        "state": "offline",
        "vin": "XP7YGCEL8PB160835"
      },
      "location": {
        "latitude": 37.066261,
        "longitude": 35.378087,
        "heading": 122,
        "gps_as_of": 1750959945
      },
      "location_source": "fresh",
      "updated_at": "2025-06-26T20:45:49.203610"
    }
  ]
}
```

### 4. Database Queries

Get all vehicles with latest locations:
```bash
curl http://localhost:5001/api/vehicles-with-locations
```

Get specific vehicle's latest location:
```bash
curl http://localhost:5001/api/vehicle/123456789/location/latest
```

### 5. Vehicle Commands

Wake up vehicle:
```bash
curl -X POST http://localhost:5001/api/tesla/vehicle/123456789/wake
```

Control climate:
```bash
curl -X POST http://localhost:5001/api/tesla/vehicle/123456789/climate/on
```

### 6. Update Logs and Change Tracking

Get update logs for specific vehicle:
```bash
curl "http://localhost:5001/api/vehicle/1689262419488057/update-logs"
```

Get only location updates:
```bash
curl "http://localhost:5001/api/vehicle/1689262419488057/update-logs?type=location&limit=10"
```

Get all vehicle update logs:
```bash
curl "http://localhost:5001/api/update-logs?type=vehicle_info&limit=20"
```

Update log response example:
```json
{
  "vehicle_id": 1689262419488057,
  "logs": [
    {
      "id": 3,
      "update_type": "vehicle_info", 
      "changes": {
        "state": {
          "old": "offline",
          "new": "online"
        }
      },
      "old_data": {
        "state": "offline",
        "display_name": "Model Y"
      },
      "new_data": {
        "state": "online", 
        "display_name": "Model Y"
      },
      "updated_by": "esrefpazar@hotmail.com",
      "created_at": "2025-06-26T17:57:38Z"
    }
  ],
  "summary": [
    {
      "update_type": "vehicle_info",
      "update_count": 2,
      "last_update": "2025-06-26T17:57:38Z"
    }
  ]
}
```

**Update Log Features:**
- 🔄 **UPSERT Logic**: Vehicle data and locations update existing records instead of creating duplicates
- 📝 **Change Tracking**: Detailed logs of what changed (old vs new values)  
- 🕒 **Timestamp Tracking**: Every update includes `updated_at` timestamp
- 📊 **Update Summary**: Count and last update time per data type
- 🔍 **Filtering**: Filter logs by vehicle, update type, and limit results
- 🎯 **Auto Database Sync**: All Tesla API endpoints automatically save data to database

**UPSERT Behavior:**
- Vehicle records are identified by `vehicle_id` (primary key)
- Location records update the latest entry per vehicle
- No duplicate records are created
- All changes are logged with old/new value comparison

## Development

### Database Management

Test connection:
```python
from database import test_connection
test_connection()
```

Create tables:
```python
from database import create_tables
create_tables()
```

Clean expired sessions:
```python
from database import cleanup_expired_sessions
cleanup_expired_sessions()
```

### Error Handling

The application includes comprehensive error handling:
- Database connection failures
- Tesla API errors
- Authentication timeouts
- Invalid vehicle IDs

## Security

- OAuth 2.0 with PKCE for Tesla authentication
- Database-backed session management
- Environment variable configuration
- Connection pooling for database security
- Automatic session cleanup

## Dependencies

- `flask` - Web framework
- `teslapy` - Tesla API client
- `psycopg2-binary` - PostgreSQL adapter
- `python-dotenv` - Environment management
- `PyJWT` - JWT token handling

---
MIT Lisansı