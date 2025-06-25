#!/usr/bin/env python3
"""
Tesla Fleet Rental API Test Script
Comprehensive testing for JWT authentication and vehicle commands
"""

import requests
import json
import time
import threading
from datetime import datetime
from config import Config

class TeslaFleetRentalTester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token = None
        self.refresh_token = None
        
    def print_header(self, title):
        print("\n" + "="*60)
        print(f"🚗 {title}")
        print("="*60)
        
    def print_result(self, success, message, data=None):
        icon = "✅" if success else "❌"
        print(f"{icon} {message}")
        if data:
            print(f"📊 Data: {json.dumps(data, indent=2)}")
        print()
        
    def test_health_check(self):
        """Test if API is running"""
        self.print_header("Health Check")
        
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 404:
                self.print_result(True, "API is running (404 expected for root path)")
                return True
            else:
                self.print_result(True, f"API responding with status: {response.status_code}")
                return True
        except Exception as e:
            self.print_result(False, f"API connection failed: {str(e)}")
            return False
    
    def test_login(self, username="testuser"):
        """Test JWT login functionality"""
        self.print_header("JWT Login Test")
        
        payload = {"username": username}
        
        try:
            response = self.session.post(f"{self.base_url}/login", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.refresh_token = data.get("refresh_token")
                
                # Update session headers
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                
                self.print_result(True, "Login successful", {
                    "username": username,
                    "access_token_length": len(self.access_token) if self.access_token else 0,
                    "refresh_token_length": len(self.refresh_token) if self.refresh_token else 0
                })
                return True
            else:
                self.print_result(False, f"Login failed: {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.print_result(False, f"Login error: {str(e)}")
            return False
    
    def test_refresh_token(self):
        """Test JWT refresh token functionality"""
        self.print_header("JWT Refresh Token Test")
        
        if not self.refresh_token:
            self.print_result(False, "No refresh token available")
            return False
        
        try:
            # Remove access token header temporarily
            old_auth_header = self.session.headers.get("Authorization")
            self.session.headers.update({
                "Authorization": f"Bearer {self.refresh_token}"
            })
            
            response = self.session.post(f"{self.base_url}/refresh")
            
            if response.status_code == 200:
                data = response.json()
                new_access_token = data.get("access_token")
                
                # Update session with new access token
                self.access_token = new_access_token
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                
                self.print_result(True, "Token refresh successful", {
                    "new_access_token_length": len(new_access_token) if new_access_token else 0
                })
                return True
            else:
                # Restore old auth header on failure
                if old_auth_header:
                    self.session.headers.update({"Authorization": old_auth_header})
                self.print_result(False, f"Token refresh failed: {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.print_result(False, f"Token refresh error: {str(e)}")
            return False
    
    def test_start_rental(self, vehicle_id="test_vehicle_123", duration=30):
        """Test rental start functionality"""
        self.print_header("Start Rental Test")
        
        if not self.access_token:
            self.print_result(False, "No access token available")
            return False
        
        payload = {
            "vehicle_id": vehicle_id,
            "duration": duration
        }
        
        try:
            response = self.session.post(f"{self.base_url}/rental/start", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                self.print_result(True, "Rental started successfully", {
                    "vehicle_id": vehicle_id,
                    "duration_minutes": duration,
                    "message": data.get("msg")
                })
                return True
            else:
                self.print_result(False, f"Rental start failed: {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.print_result(False, f"Rental start error: {str(e)}")
            return False
    
    def test_vehicle_command(self, vehicle_id="test_vehicle_123", command="command/honk_horn"):
        """Test vehicle command functionality"""
        self.print_header(f"Vehicle Command Test: {command}")
        
        if not self.access_token:
            self.print_result(False, "No access token available")
            return False
        
        payload = {
            "vehicle_id": vehicle_id,
            "command": command,
            "data": {}
        }
        
        try:
            start_time = time.time()
            response = self.session.post(f"{self.base_url}/vehicle/command", json=payload)
            end_time = time.time()
            
            execution_time = round((end_time - start_time) * 1000, 2)
            
            if response.status_code == 200:
                data = response.json()
                self.print_result(True, f"Command '{command}' executed successfully", {
                    "vehicle_id": vehicle_id,
                    "command": command,
                    "execution_time_ms": execution_time,
                    "response": data
                })
                return True
            elif response.status_code == 403:
                data = response.json()
                self.print_result(False, f"Command failed - Rental issue: {data.get('error')}", {
                    "vehicle_id": vehicle_id,
                    "command": command,
                    "execution_time_ms": execution_time
                })
                return False
            else:
                self.print_result(False, f"Command failed: {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.print_result(False, f"Command error: {str(e)}")
            return False
    
    def test_logout(self):
        """Test JWT logout functionality"""
        self.print_header("JWT Logout Test")
        
        if not self.access_token:
            self.print_result(False, "No access token available")
            return False
        
        try:
            response = self.session.delete(f"{self.base_url}/logout")
            
            if response.status_code == 200:
                data = response.json()
                self.print_result(True, "Logout successful", {
                    "message": data.get("msg")
                })
                
                # Clear tokens
                self.access_token = None
                self.refresh_token = None
                self.session.headers.pop("Authorization", None)
                
                return True
            else:
                self.print_result(False, f"Logout failed: {response.status_code}", response.json())
                return False
                
        except Exception as e:
            self.print_result(False, f"Logout error: {str(e)}")
            return False
    
    def test_unauthorized_access(self):
        """Test unauthorized access protection"""
        self.print_header("Unauthorized Access Test")
        
        # Remove authorization header
        old_auth_header = self.session.headers.pop("Authorization", None)
        
        try:
            # Try to start rental without token
            response = self.session.post(f"{self.base_url}/rental/start", json={
                "vehicle_id": "test_vehicle",
                "duration": 30
            })
            
            if response.status_code == 401:
                self.print_result(True, "Unauthorized access properly blocked", {
                    "status_code": response.status_code
                })
                success = True
            else:
                self.print_result(False, f"Unexpected response: {response.status_code}", response.json())
                success = False
                
        except Exception as e:
            self.print_result(False, f"Unauthorized test error: {str(e)}")
            success = False
        finally:
            # Restore auth header if it existed
            if old_auth_header:
                self.session.headers["Authorization"] = old_auth_header
        
        return success
    
    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚗 Tesla Fleet Rental API Test Suite")
        print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🔧 Test Mode: {Config.TEST_MODE}")
        print(f"🏠 Base URL: {self.base_url}")
        
        # Test sequence
        tests = [
            ("Health Check", self.test_health_check),
            ("Login", lambda: self.test_login("testuser")),
            ("Refresh Token", self.test_refresh_token),
            ("Start Rental", lambda: self.test_start_rental("test_vehicle_123", 60)),
            ("Vehicle Command - Honk", lambda: self.test_vehicle_command("test_vehicle_123", "command/honk_horn")),
            ("Vehicle Command - Unlock", lambda: self.test_vehicle_command("test_vehicle_123", "command/door_unlock")),
            ("Vehicle Command - Lock", lambda: self.test_vehicle_command("test_vehicle_123", "command/door_lock")),
            ("Unauthorized Access", self.test_unauthorized_access),
            ("Logout", self.test_logout)
        ]
        
        results = []
        
        for test_name, test_func in tests:
            print(f"\n⏱️  Running: {test_name}...")
            try:
                result = test_func()
                results.append({"test": test_name, "success": result})
            except Exception as e:
                print(f"❌ Test '{test_name}' failed with exception: {str(e)}")
                results.append({"test": test_name, "success": False})
            
            time.sleep(1)  # Brief pause between tests
        
        # Summary
        self.print_header("Test Summary")
        
        successful_tests = sum(1 for r in results if r["success"])
        total_tests = len(results)
        
        print(f"📊 Tests run: {total_tests}")
        print(f"✅ Successful: {successful_tests}")
        print(f"❌ Failed: {total_tests - successful_tests}")
        print(f"📈 Success rate: {(successful_tests/total_tests)*100:.1f}%")
        
        # Detailed results
        print("\n📋 Detailed Results:")
        for result in results:
            status = "✅" if result["success"] else "❌"
            print(f"  {status} {result['test']}")
        
        return successful_tests == total_tests

def test_api_with_redis_check():
    """Test with Redis availability check"""
    try:
        import redis
        from config import Config
        
        # Test Redis connection
        redis_client = redis.Redis(
            host=Config.REDIS_HOST,
            port=Config.REDIS_PORT,
            db=Config.REDIS_DB,
            decode_responses=True
        )
        redis_client.ping()
        print("✅ Redis connection successful")
        
    except Exception as e:
        print(f"⚠️  Redis connection failed: {e}")
        print("💡 Starting Redis: brew services start redis")
        return False
    
    return True

def main():
    print("🚀 Tesla Fleet Rental API Test Suite")
    print("=" * 60)
    
    # Check configuration
    try:
        if not Config.TEST_MODE:
            Config.validate_config()
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        return False
    
    # Check Redis availability
    if not test_api_with_redis_check():
        print("❌ Redis not available. Please start Redis server.")
        return False
    
    # Run tests
    tester = TeslaFleetRentalTester()
    success = tester.run_comprehensive_test()
    
    print(f"\n🏁 Test Suite completed: {'SUCCESS' if success else 'FAILED'}")
    return success

if __name__ == "__main__":
    main() 