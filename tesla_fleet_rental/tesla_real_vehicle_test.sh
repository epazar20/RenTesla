#!/bin/bash

# Tesla Real Vehicle Test Script
# Tests horn command with real Tesla vehicle

echo "🚗 Tesla Real Vehicle Test Script"
echo "================================="

# Tesla Fleet API Credentials
TESLA_CLIENT_ID="1dbbfed2-ad60-4d78-946a-bac7fab420a8"
TESLA_CLIENT_SECRET="ta-secret.7CPosOop%gZtZ%5e"

# Step 1: Get Tesla Fleet API Token
echo "🔑 Step 1: Getting Tesla Fleet API Token..."

TESLA_TOKEN=$(curl -s -X POST https://auth.tesla.com/oauth2/v3/token \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"client_credentials\",
    \"client_id\": \"$TESLA_CLIENT_ID\",
    \"client_secret\": \"$TESLA_CLIENT_SECRET\",
    \"scope\": \"openid email offline_access vehicle_device_data vehicle_commands vehicle_charging_cmds\"
  }" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('access_token', ''))" 2>/dev/null)

if [ -z "$TESLA_TOKEN" ]; then
  echo "❌ Failed to get Tesla token"
  exit 1
fi

echo "✅ Tesla token obtained: ${TESLA_TOKEN:0:20}..."

# Step 2: Get Vehicle List
echo "🚙 Step 2: Getting vehicle list..."

VEHICLES_RESPONSE=$(curl -s -H "Authorization: Bearer $TESLA_TOKEN" \
  https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles)

echo "📋 Vehicles Response:"
echo "$VEHICLES_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data, indent=2))" 2>/dev/null || echo "$VEHICLES_RESPONSE"

# Extract first vehicle ID
VEHICLE_ID=$(echo "$VEHICLES_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    vehicles = data.get('response', [])
    if vehicles:
        print(vehicles[0]['id'])
    else:
        print('')
except:
    print('')
" 2>/dev/null)

if [ -z "$VEHICLE_ID" ]; then
  echo "❌ No vehicles found or vehicle enrollment required"
  echo "💡 Please enroll your vehicle at: https://tesla.com/_ak/rentesla.xyz"
  exit 1
fi

echo "🚗 Using Vehicle ID: $VEHICLE_ID"

# Step 3: Wake Up Vehicle
echo "⏰ Step 3: Waking up vehicle..."

WAKE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TESLA_TOKEN" \
  -H "Content-Type: application/json" \
  https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/$VEHICLE_ID/wake_up)

echo "🔄 Wake up response:"
echo "$WAKE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data, indent=2))" 2>/dev/null || echo "$WAKE_RESPONSE"

# Wait for vehicle to wake up
echo "⏳ Waiting 10 seconds for vehicle to wake up..."
sleep 10

# Step 4: Check Vehicle State
echo "🔍 Step 4: Checking vehicle state..."

STATE_RESPONSE=$(curl -s -H "Authorization: Bearer $TESLA_TOKEN" \
  https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/$VEHICLE_ID)

VEHICLE_STATE=$(echo "$STATE_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    state = data.get('response', {}).get('state', 'unknown')
    print(state)
except:
    print('unknown')
" 2>/dev/null)

echo "🚦 Vehicle State: $VEHICLE_STATE"

# Step 5: Send Horn Command
echo "📯 Step 5: Sending horn command..."

HORN_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TESLA_TOKEN" \
  -H "Content-Type: application/json" \
  https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/$VEHICLE_ID/command/honk_horn)

echo "🎵 Horn command response:"
echo "$HORN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data, indent=2))" 2>/dev/null || echo "$HORN_RESPONSE"

# Check if command was successful
SUCCESS=$(echo "$HORN_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    result = data.get('response', {}).get('result', False)
    print('true' if result else 'false')
except:
    print('false')
" 2>/dev/null)

if [ "$SUCCESS" = "true" ]; then
  echo "🎉 SUCCESS: Horn command sent successfully!"
else
  echo "❌ FAILED: Horn command failed"
fi

echo "�� Test completed." 