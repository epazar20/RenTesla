# RenTesla Backend API

🚗 Tesla vehicle rental API with Firebase Authentication and TeslaPy integration.

## Features

- 🔐 **Firebase Authentication** - JWT token based authentication
- 🚗 **Tesla API Integration** - Complete Tesla vehicle control via TeslaPy
- 📱 **RESTful API** - Clean REST endpoints for all operations
- 🔒 **Secured Endpoints** - All API routes protected with JWT tokens
- 📊 **Firestore Database** - Rental data storage in Firebase Firestore
- 🧪 **Comprehensive Testing** - Complete test suite included

## Quick Start

### 1. Setup Environment

```bash
# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp env.example .env

# Update .env with your Tesla credentials
TESLA_EMAIL=your-tesla-email@example.com
FIREBASE_WEB_API_KEY=your-firebase-web-api-key
```

### 2. Setup Firebase User

```bash
# Create the test user in Firebase
python setup_user.py
```

This creates a user with:
- Email: `user@gmail.com`
- Password: `Ep*2857088*`

### 3. Start the API

```bash
python app.py
```

The API will start on `http://localhost:5001`

### 4. Test the API

```bash
# Run comprehensive tests
python test_complete_api.py

# Or test with custom URL
python test_complete_api.py --url http://localhost:5001
```

## Authentication Flow

### 1. Login to get JWT token

```bash
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@gmail.com",
    "password": "Ep*2857088*"
  }'
```

Response:
```json
{
  "message": "Login successful",
  "id_token": "eyJhbGciOiJSUzI1NiIsIn...",
  "refresh_token": "AMf-vBxYXm...",
  "user_id": "firebase_user_id",
  "email": "user@gmail.com",
  "expires_in": "3600"
}
```

### 2. Use JWT token for API calls

```bash
curl -X GET http://localhost:5001/api/tesla/vehicles \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsIn..."
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/refresh` | Refresh JWT token |
| GET | `/health` | API health check |

### Tesla Vehicle Operations (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tesla/vehicles` | List all vehicles |
| GET | `/api/tesla/vehicle/{id}/data` | Get full vehicle data |
| GET | `/api/tesla/vehicle/{id}/summary` | Get vehicle summary |
| GET | `/api/tesla/vehicle/{id}/location` | Get vehicle location |

### Vehicle Commands (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/vehicle/command` | Send command to vehicle |

### Rental Operations (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rent` | Start a rental |
| GET | `/api/rent/status` | Get current rental status |
| POST | `/api/rent/end` | End current rental |

## Example Usage

### Login and Get Vehicles

```python
import requests

# Login
login_response = requests.post('http://localhost:5001/auth/login', json={
    'email': 'user@gmail.com',
    'password': 'Ep*2857088*'
})

token = login_response.json()['id_token']

# Get vehicles
vehicles_response = requests.get(
    'http://localhost:5001/api/tesla/vehicles',
    headers={'Authorization': f'Bearer {token}'}
)

vehicles = vehicles_response.json()['vehicles']
print(f"Found {len(vehicles)} vehicles")
```

### Start a Rental

```python
# Start rental
rental_response = requests.post(
    'http://localhost:5001/api/rent',
    headers={'Authorization': f'Bearer {token}'},
    json={
        'vehicle_id': vehicles[0]['id'],
        'duration_hours': 2
    }
)

rental_info = rental_response.json()
print(f"Rental started: {rental_info['rent_info']['rent_id']}")
```

## Security Features

- 🔐 **JWT Token Authentication** - All API endpoints protected
- 🔥 **Firebase Auth Integration** - Secure user management
- 🛡️ **Token Validation** - Automatic token verification
- ⏰ **Token Refresh** - Seamless token renewal
- 🚫 **Unauthorized Access Blocking** - 401/403 responses for invalid tokens

## Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
python test_complete_api.py

# Test specific scenarios
python test_complete_api.py --email user@gmail.com --password Ep*2857088*
```

Test coverage includes:
- ✅ Authentication flow
- ✅ Token refresh
- ✅ Unauthorized access blocking
- ✅ Tesla vehicle operations
- ✅ Rental operations
- ✅ Vehicle commands

## Configuration

### Environment Variables

Create a `.env` file:

```env
# Tesla API
TESLA_EMAIL=your-tesla-email@example.com
TEST_MODE=False

# Flask
SECRET_KEY=your-secret-key
DEBUG=True
HOST=0.0.0.0
PORT=5001

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json
FIREBASE_WEB_API_KEY=your-firebase-web-api-key
```

### Firebase Setup

1. Download `serviceAccountKey.json` from Firebase Console
2. Place it in the backend directory
3. Update `FIREBASE_WEB_API_KEY` in environment

## Production Deployment

### Security Checklist

- [ ] Change `SECRET_KEY` to a strong random value
- [ ] Set `DEBUG=False`
- [ ] Use environment variables for sensitive data
- [ ] Enable HTTPS
- [ ] Restrict CORS origins
- [ ] Set up proper logging
- [ ] Configure rate limiting

### Docker Deployment

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5001
CMD ["python", "app.py"]
```

## Troubleshooting

### Common Issues

1. **Firebase Connection Failed**
   - Check `serviceAccountKey.json` exists
   - Verify Firebase project ID matches

2. **Tesla API Errors**
   - Ensure Tesla email is configured
   - Check Tesla account has vehicle access

3. **Authentication Errors**
   - Verify user exists in Firebase
   - Check token expiration
   - Validate Firebase Web API key

### Debug Mode

Set `DEBUG=True` in environment for detailed error logs.

## API Response Examples

### Vehicle List Response

```json
{
  "vehicles": [
    {
      "id": "123456789",
      "display_name": "My Tesla",
      "state": "online",
      "vin": "5YJ3E1EA1KF123456"
    }
  ],
  "count": 1,
  "success": true
}
```

### Rental Start Response

```json
{
  "message": "Rent started successfully",
  "rent_info": {
    "rent_id": "rent_123",
    "vehicle_id": "123456789",
    "user_id": "firebase_user_id",
    "status": "active",
    "started_at": "2024-01-15T10:30:00Z",
    "duration_hours": 2
  },
  "success": true
}
```

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check this README
2. Run the test suite
3. Check Firebase Console for auth issues
4. Verify Tesla API credentials