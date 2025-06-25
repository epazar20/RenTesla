#!/usr/bin/env python3
import requests
import json

def test_api():
    try:
        # Test login
        response = requests.post(
            "http://localhost:5001/login",
            json={"username": "testuser"},
            timeout=5
        )
        
        print(f"Login Response Status: {response.status_code}")
        print(f"Login Response Headers: {dict(response.headers)}")
        print(f"Login Response Body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            
            if access_token:
                print("✅ Login successful!")
                
                # Test protected endpoint
                headers = {"Authorization": f"Bearer {access_token}"}
                rental_response = requests.post(
                    "http://localhost:5001/rental/start",
                    json={"vehicle_id": "test_123", "duration": 30},
                    headers=headers,
                    timeout=5
                )
                
                print(f"Rental Response Status: {rental_response.status_code}")
                print(f"Rental Response: {rental_response.text}")
                
                return True
            else:
                print("❌ No access token in response")
                return False
        else:
            print(f"❌ Login failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

if __name__ == "__main__":
    test_api() 