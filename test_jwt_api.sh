#!/bin/bash

echo "🔐 RenTesla JWT API Test Script"
echo "=================================="

# Get JWT Token
echo "1. Getting JWT Token..."
JWT_RESPONSE=$(curl -X POST http://localhost:8080/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -s)

if [ $? -eq 0 ]; then
    TOKEN=$(echo $JWT_RESPONSE | jq -r '.token')
    USERNAME=$(echo $JWT_RESPONSE | jq -r '.username')
    ROLE=$(echo $JWT_RESPONSE | jq -r '.role')
    
    echo "✅ Login successful!"
    echo "   User: $USERNAME"
    echo "   Role: $ROLE"
    echo "   Token: ${TOKEN:0:30}..."
else
    echo "❌ Login failed!"
    exit 1
fi

echo ""
echo "2. Testing API Endpoints..."

# Test Vehicles API
echo ""
echo "📋 Vehicles API:"
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/api/mobile/vehicles \
     -s | jq '.[0] | {id, displayName, model, status, dailyRate, batteryLevel}'

# Test User Stats API
echo ""
echo "👥 User Stats API:"
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/api/mobile/users/stats \
     -s | jq .

# Test Health API
echo ""
echo "💚 Health Check:"
curl -s http://localhost:8080/api/mobile/actuator/health | jq '{status: .status, database: .components.db.status}'

echo ""
echo "🎉 All tests completed!"
echo ""
echo "📱 Mobile App Connection Info:"
echo "   API Base URL: http://localhost:8080/api/mobile"
echo "   Auth Endpoint: /auth/login"
echo "   Token Type: Bearer"
echo "   Expires In: 24 hours" 