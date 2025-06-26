# RenTesla - Tesla Vehicle Rental Management System

A comprehensive vehicle rental management system specifically designed for Tesla vehicles, featuring real-time vehicle tracking, fleet management, and rental operations.

## 🚗 Project Overview

RenTesla is a full-stack application that combines Tesla's official API with a robust rental management system, providing real-time vehicle monitoring, location tracking, and complete rental workflow management.

## 📁 Project Structure

```
RenTesla/
├── tesla_info_api/          # Tesla API Backend Service
│   ├── app.py              # Flask API server
│   ├── database.py         # Database operations
│   ├── tesla_sync.py       # Sync service
│   ├── requirements.txt    # Python dependencies
│   └── tests/              # Test files
├── tesla_fleet_rental/     # Fleet Management System
├── frontend/               # Frontend Application
├── rents/                  # Rental Management
└── README.md              # This file
```

## 🛠 Components

### Tesla Info API (`tesla_info_api/`)
- **Real-time Tesla API integration**
- **Vehicle location tracking with UPSERT operations**
- **Turkey timezone support (+03:00)**
- **Asynchronous logging system**
- **OAuth2 authentication with Tesla**
- **PostgreSQL database with connection pooling**

**Key Features:**
- Auto-refresh vehicle locations from Tesla API
- Complete vehicle data management
- Background sync operations
- Comprehensive logging and monitoring

### Tesla Fleet Rental (`tesla_fleet_rental/`)
- **Fleet management system**
- **Rental booking and management**
- **Vehicle availability tracking**
- **Customer management**

### Frontend (`frontend/`)
- **User interface for rental operations**
- **Real-time vehicle tracking dashboard**
- **Admin panel for fleet management**

## 🚀 Quick Start

### 1. Tesla Info API Setup

```bash
cd tesla_info_api
pip install -r requirements.txt
cp env.example .env
# Configure your .env file
python app.py
```

### 2. Database Configuration

The system requires PostgreSQL. Configure your `.env` file:

```env
DB_HOST=your-db-host
DB_PORT=6543
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
TESLA_EMAIL=your-tesla-email@example.com
```

### 3. Tesla Authentication

1. Initialize authentication:
```bash
POST http://localhost:8000/auth/init
{
  "email": "your-tesla-email@example.com"
}
```

2. Complete OAuth flow with Tesla callback URL

## 📊 Key Features

### Real-time Vehicle Tracking
- **GPS coordinates with heading and speed**
- **Automatic location updates from Tesla API**
- **Turkey timezone timestamps**
- **UPSERT database operations (no duplicates)**

### Fleet Management
- **Vehicle availability status**
- **Maintenance scheduling**
- **Battery level monitoring**
- **Service state tracking**

### Rental Operations
- **Booking management**
- **Customer verification**
- **Rental history tracking**
- **Billing integration**

## 🔧 API Endpoints

### Vehicle Information
- `GET /api/vehicles-with-locations` - Auto-refresh vehicle locations
- `GET /api/tesla/vehicle/{id}/data` - Complete vehicle data
- `GET /api/vehicles` - All vehicles from database

### Monitoring
- `GET /api/sync/logs` - Synchronization logs
- `GET /api/vehicle/{id}/update-logs` - Vehicle update history
- `POST /api/sync/trigger` - Manual sync trigger

### Health Check
- `GET /health` - System health status

## 🛡️ Security & Performance

- **OAuth2 Tesla authentication**
- **Encrypted token storage**
- **Connection pooling for database**
- **Asynchronous logging for performance**
- **Environment-based configuration**

## 📈 Database Schema

### Core Tables
- **vehicles**: Vehicle information and metadata
- **vehicle_locations**: GPS tracking with timestamps
- **vehicle_update_logs**: Change history tracking
- **tesla_tokens**: Secure authentication storage

### Features
- **UPSERT operations** prevent duplicate records
- **Turkey timezone** for all timestamps
- **Asynchronous logging** for performance
- **Connection pooling** for scalability

## 🧪 Testing

```bash
# Run API tests
cd tesla_info_api
python tests/test_rent_flow.py

# Test vehicle location endpoint
curl http://localhost:8000/api/vehicles-with-locations
```

## 📝 Recent Updates

- ✅ **Auto-refresh location data** from Tesla API
- ✅ **UPSERT database operations** prevent conflicts
- ✅ **Turkey timezone support** throughout system
- ✅ **Asynchronous logging** for better performance
- ✅ **Comprehensive error handling** and monitoring

## 🔄 Sync Operations

The system provides multiple synchronization methods:

1. **Auto-sync**: Real-time updates on API calls
2. **Manual sync**: Trigger via API endpoint
3. **Background sync**: Scheduled operations
4. **Refresh parameter**: Force fresh data retrieval

## 📚 Documentation

For detailed API documentation, see individual component README files:
- [`tesla_info_api/README.md`](tesla_info_api/README.md) - Tesla API Backend
- [`tesla_fleet_rental/README.md`](tesla_fleet_rental/README.md) - Fleet Management
- [`frontend/README.md`](frontend/README.md) - Frontend Application

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Check the documentation in component directories
- Review API endpoint documentation

---

**RenTesla** - Revolutionizing Tesla vehicle rental management with real-time tracking and comprehensive fleet operations. 