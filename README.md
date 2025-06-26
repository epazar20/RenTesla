# Tesla Info API

A comprehensive Flask-based REST API for Tesla vehicle information management and monitoring. This API provides real-time access to Tesla vehicle data, location tracking, and comprehensive logging capabilities.

## 🚗 Features

- **Vehicle Management**: Complete CRUD operations for Tesla vehicles
- **Real-time Location Tracking**: GPS coordinates, heading, speed monitoring
- **Turkey Timezone Support**: All timestamps in Turkey timezone (+03:00)
- **Asynchronous Logging**: Background update logging for better performance
- **UPSERT Operations**: Conflict-free database operations
- **Tesla API Integration**: Direct integration with Tesla's official API
- **Authentication Flow**: Secure OAuth2 authentication with Tesla
- **Database Sync**: Automatic synchronization with Tesla API data

## 🛠 Tech Stack

- **Backend**: Python 3.12+ with Flask
- **Database**: PostgreSQL with connection pooling
- **Tesla Integration**: TeslaPy library
- **Authentication**: Tesla OAuth2
- **Timezone**: Turkey timezone (Europe/Istanbul)
- **Logging**: Asynchronous update logging
- **JSON Handling**: Custom encoders for Decimal and DateTime objects

## 📦 Installation

### Prerequisites

- Python 3.12+
- PostgreSQL database
- Tesla account with API access

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/tesla_info_api.git
cd tesla_info_api
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Environment Configuration**
```bash
cp env.example .env
# Edit .env with your configuration
```

4. **Database Setup**
```bash
# The application will automatically create tables on first run
python app.py
```

## ⚙️ Configuration

Copy `env.example` to `.env` and configure:

```env
# Database Configuration
DB_HOST=your-db-host
DB_PORT=6543
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Tesla Configuration
TESLA_EMAIL=your-tesla-email@example.com
TESLA_AUTH_URL=https://auth.tesla.com/oauth2/v3/authorize
TESLA_CALLBACK_URL=https://auth.tesla.com/void/callback

# Application Configuration
SECRET_KEY=your-secret-key-here
DEBUG=True
HOST=0.0.0.0
PORT=8000
TIMEZONE=Europe/Istanbul
```

## 🚀 Usage

### Start the API Server

```bash
python app.py
```

The API will be available at `http://localhost:8000`

### Authentication

1. **Initialize Authentication**
```bash
POST /auth/init
{
  "email": "your-tesla-email@example.com"
}
```

2. **Complete OAuth Flow**
```bash
POST /auth/callback
{
  "callback_url": "tesla_callback_url_with_code"
}
```

### API Endpoints

#### Vehicle Information
- `GET /api/tesla/vehicles` - List all vehicles
- `GET /api/tesla/vehicle/{id}/summary` - Vehicle summary
- `GET /api/tesla/vehicle/{id}/data` - Complete vehicle data
- `GET /api/tesla/vehicle/{id}/location` - Vehicle location

#### Database Operations
- `GET /api/vehicles` - All vehicles from database
- `GET /api/vehicles-with-locations` - Vehicles with locations
- `GET /api/vehicles-with-locations?refresh=true` - Refresh from Tesla API

#### Monitoring & Logs
- `GET /api/vehicle/{id}/update-logs` - Vehicle update history
- `GET /api/sync/logs` - Synchronization logs
- `POST /api/sync/trigger` - Manual sync trigger

#### Health Check
- `GET /health` - API health status

## 📊 Database Schema

### Tables

- **vehicles**: Vehicle information and metadata
- **vehicle_locations**: GPS tracking data
- **vehicle_update_logs**: Change history with old/new values
- **tesla_tokens**: Secure token storage
- **auth_sessions**: OAuth session management
- **sync_logs**: API synchronization tracking

### Key Features

- **UPSERT Operations**: Conflict-free inserts/updates
- **Turkey Timezone**: All timestamps in +03:00
- **Asynchronous Logging**: Background update tracking
- **Connection Pooling**: Optimized database performance

## 🔄 Synchronization

The API provides multiple sync options:

1. **Automatic**: Real-time sync on API calls
2. **Manual**: Trigger via `/api/sync/trigger`
3. **Scheduled**: Background sync service
4. **Refresh**: On-demand refresh with `?refresh=true`

## 📝 Logging

Comprehensive logging system:

- **Vehicle Updates**: Track all vehicle information changes
- **Location Updates**: GPS coordinate change history
- **API Calls**: Tesla API interaction logs
- **Sync Operations**: Batch operation tracking
- **Error Handling**: Detailed error logging

## 🛡️ Security

- **OAuth2**: Secure Tesla authentication
- **Token Management**: Encrypted token storage
- **Session Handling**: Secure session management
- **Environment Variables**: Sensitive data protection

## 📈 Performance

- **Connection Pooling**: Optimized database connections
- **Asynchronous Logging**: Non-blocking update logs
- **Caching**: Smart data caching strategies
- **Background Processing**: Async operations

## 🧪 Testing

Run tests:
```bash
# Unit tests
python -m pytest tests/

# API integration tests
python tests/test_rent_flow.py
```

## 📚 API Documentation

### Response Format

All API responses follow this structure:
```json
{
  "success": true,
  "data": {...},
  "timestamp": "2025-06-27T01:00:00+03:00"
}
```

### Error Handling

```json
{
  "success": false,
  "error": "Error description",
  "timestamp": "2025-06-27T01:00:00+03:00"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TeslaPy](https://github.com/tdorssers/TeslaPy) - Tesla API Python library
- [Flask](https://flask.palletsprojects.com/) - Web framework
- [PostgreSQL](https://www.postgresql.org/) - Database system
- [Tesla API](https://developer.tesla.com/) - Official Tesla API

## 📞 Support

For support, email your-email@example.com or create an issue on GitHub.

---

**⚡ Powered by Tesla API & Flask ⚡** 