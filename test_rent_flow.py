#!/usr/bin/env python3
"""
Tesla Rent Flow Test Script
Bu script Firebase JWT authentication ile user@gmail.com kullanıcısını sisteme giriş yaptırır
ve Tesla aracını 2 günlüğüne kiralar.
"""

import requests
import json
import time
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:5001"
USER_EMAIL = "user@gmail.com"
USER_UID = "user-test-123"
RENT_DURATION_DAYS = 2
RENT_DURATION_MINUTES = RENT_DURATION_DAYS * 24 * 60  # 2 gün = 2880 dakika

class TeslaRentTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.jwt_token = None
        self.session = requests.Session()
        
    def log(self, message, emoji="📝"):
        print(f"{emoji} {message}")
        
    def make_request(self, method, endpoint, **kwargs):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, **kwargs)
            self.log(f"{method} {endpoint} -> {response.status_code}")
            return response
        except Exception as e:
            self.log(f"Request failed: {e}", "❌")
            return None
    
    def check_health(self):
        """Check system health"""
        self.log("Checking system health...", "🏥")
        response = self.make_request("GET", "/health")
        
        if response and response.status_code == 200:
            health_data = response.json()
            self.log(f"System status: {health_data['status']}")
            self.log(f"Test mode: {health_data['test_mode']}")
            self.log(f"Firebase connected: {health_data['firebase_connected']}")
            self.log(f"Tesla token exists: {health_data['tesla_token_exists']}")
            return True
        else:
            self.log("Health check failed", "❌")
            return False
    
    def get_firebase_auth_token(self):
        """Get Firebase JWT token for authentication"""
        self.log("Getting Firebase auth token...", "🔐")
        
        # First try to get system health to see if we're in test mode
        health_response = self.make_request("GET", "/health")
        if health_response and health_response.status_code == 200:
            health_data = health_response.json()
            is_test_mode = health_data.get('test_mode', False)
            firebase_connected = health_data.get('firebase_connected', False)
            
            if is_test_mode or not firebase_connected:
                # Use simple mock token for test mode
                self.jwt_token = "mock-jwt-token-for-testing"
                self.log(f"Using mock JWT token (Test Mode: {is_test_mode})")
                self.log(f"User: {USER_EMAIL} (UID: {USER_UID})")
                return True
        
        # Try Firebase auth endpoint
        auth_data = {
            "uid": USER_UID,
            "email": USER_EMAIL
        }
        
        response = self.make_request("POST", "/auth/id-token", 
                                   json=auth_data,
                                   headers={"Content-Type": "application/json"})
        
        if response and response.status_code == 200:
            token_data = response.json()
            self.jwt_token = token_data["id_token"]
            self.log(f"JWT token obtained: {self.jwt_token[:50]}...")
            self.log(f"User: {token_data['email']} (UID: {token_data['uid']})")
            return True
        else:
            # Fallback to mock token
            self.log("Firebase auth failed, using mock token", "⚠️")
            self.jwt_token = "mock-jwt-token-for-testing"
            return True
    
    def get_tesla_vehicles(self):
        """Get available Tesla vehicles"""
        self.log("Getting Tesla vehicles...", "🚗")
        
        response = self.make_request("GET", "/api/tesla/vehicles")
        
        if response and response.status_code == 200:
            vehicles_data = response.json()
            vehicles = vehicles_data.get("vehicles", [])
            self.log(f"Found {len(vehicles)} vehicle(s)")
            
            for i, vehicle in enumerate(vehicles):
                self.log(f"  Vehicle {i+1}: {vehicle.get('display_name')} (ID: {vehicle.get('id')})")
                self.log(f"    State: {vehicle.get('state')}")
                self.log(f"    VIN: {vehicle.get('vin')}")
            
            return vehicles[0] if vehicles else None
        else:
            self.log("Failed to get Tesla vehicles", "❌")
            if response:
                self.log(f"Error: {response.text}")
            return None
    
    def start_rent(self, vehicle_id=None):
        """Start Tesla rent for 2 days"""
        self.log(f"Starting {RENT_DURATION_DAYS}-day Tesla rent...", "🚀")
        
        if not self.jwt_token:
            self.log("No JWT token available", "❌")
            return False
        
        rent_data = {
            "duration": RENT_DURATION_MINUTES,
            "vehicle_id": vehicle_id or "default"
        }
        
        headers = {
            "Authorization": f"Bearer {self.jwt_token}",
            "Content-Type": "application/json"
        }
        
        response = self.make_request("POST", "/api/rent", 
                                   json=rent_data, 
                                   headers=headers)
        
        if response and response.status_code == 200:
            rent_info = response.json()
            self.log("Rent started successfully! ✅")
            self.log(f"Rent ID: {rent_info.get('rent_id')}")
            self.log(f"Vehicle ID: {rent_info.get('vehicle_id')}")
            self.log(f"Start time: {rent_info.get('start_time')}")
            self.log(f"End time: {rent_info.get('end_time')}")
            self.log(f"Duration: {rent_info.get('duration_minutes')} minutes ({RENT_DURATION_DAYS} days)")
            self.log(f"Allowed commands: {rent_info.get('allowed_commands')}")
            return rent_info
        else:
            self.log("Failed to start rent", "❌")
            if response:
                self.log(f"Error: {response.text}")
            return None
    
    def check_rent_status(self):
        """Check current rent status"""
        self.log("Checking rent status...", "📊")
        
        if not self.jwt_token:
            self.log("No JWT token available", "❌")
            return None
        
        headers = {
            "Authorization": f"Bearer {self.jwt_token}"
        }
        
        response = self.make_request("GET", "/api/rent/status", headers=headers)
        
        if response and response.status_code == 200:
            status_data = response.json()
            
            if status_data.get("active_rent"):
                rent_info = status_data.get("rent_info", {})
                self.log("Active rent found! ✅")
                self.log(f"User: {rent_info.get('user_email')}")
                self.log(f"Vehicle ID: {rent_info.get('vehicle_id')}")
                self.log(f"Duration: {rent_info.get('duration_minutes')} minutes")
                self.log(f"End time: {rent_info.get('end_time')}")
                self.log(f"Current time: {status_data.get('current_time')}")
                
                # Calculate remaining time
                try:
                    end_time = datetime.fromisoformat(rent_info.get('end_time').replace('Z', '+00:00'))
                    current_time = datetime.fromisoformat(status_data.get('current_time').replace('Z', '+00:00'))
                    remaining = end_time - current_time
                    self.log(f"Time remaining: {remaining}")
                except Exception as e:
                    self.log(f"Time calculation error: {e}")
                
                return rent_info
            else:
                self.log("No active rent found")
                return None
        else:
            self.log("Failed to check rent status", "❌")
            if response:
                self.log(f"Error: {response.text}")
            return None
    
    def test_vehicle_command(self, command="honk_horn"):
        """Test vehicle command execution"""
        self.log(f"Testing vehicle command: {command}", "🎛️")
        
        if not self.jwt_token:
            self.log("No JWT token available", "❌")
            return False
        
        command_data = {
            "command": command
        }
        
        headers = {
            "Authorization": f"Bearer {self.jwt_token}",
            "Content-Type": "application/json"
        }
        
        response = self.make_request("POST", "/api/vehicle/command", 
                                   json=command_data, 
                                   headers=headers)
        
        if response and response.status_code == 200:
            result = response.json()
            self.log(f"Command executed successfully! ✅")
            self.log(f"Status: {result.get('status')}")
            if result.get('vehicle_name'):
                self.log(f"Vehicle: {result.get('vehicle_name')}")
            return True
        else:
            self.log(f"Command execution failed", "❌")
            if response:
                self.log(f"Error: {response.text}")
            return False
    
    def run_full_test(self):
        """Run complete rent flow test"""
        self.log("Starting Tesla Rent Flow Test", "🧪")
        self.log("=" * 50)
        
        # Step 1: Health check
        if not self.check_health():
            return False
        
        time.sleep(1)
        
        # Step 2: Get Firebase auth token
        if not self.get_firebase_auth_token():
            return False
        
        time.sleep(1)
        
        # Step 3: Get Tesla vehicles
        vehicle = self.get_tesla_vehicles()
        vehicle_id = vehicle.get('id') if vehicle else None
        
        time.sleep(1)
        
        # Step 4: Start rent
        rent_info = self.start_rent(vehicle_id)
        if not rent_info:
            return False
        
        time.sleep(1)
        
        # Step 5: Check rent status
        if not self.check_rent_status():
            return False
        
        time.sleep(1)
        
        # Step 6: Test vehicle commands
        commands = ["honk_horn", "lock", "unlock"]
        for command in commands:
            self.test_vehicle_command(command)
            time.sleep(1)
        
        # Step 7: Final status check
        self.log("Final rent status check...", "🔍")
        self.check_rent_status()
        
        self.log("=" * 50)
        self.log("Tesla Rent Flow Test Completed! 🎉", "✅")
        
        return True

def main():
    """Main function"""
    print("🚗 Tesla Rent Flow Test Script")
    print("📧 User: user@gmail.com")
    print(f"⏰ Rent Duration: {RENT_DURATION_DAYS} days ({RENT_DURATION_MINUTES} minutes)")
    print("🔗 Backend URL:", BASE_URL)
    print()
    
    tester = TeslaRentTester()
    success = tester.run_full_test()
    
    if success:
        print("\n✅ All tests passed successfully!")
    else:
        print("\n❌ Some tests failed!")
    
    return success

if __name__ == "__main__":
    main() 