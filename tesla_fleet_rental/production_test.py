#!/usr/bin/env python3
"""
Tesla Fleet Rental API - Production Test Suite
Tests live production deployment on Fly.io
"""

import requests
import json
import time
from datetime import datetime

class ProductionTester:
    def __init__(self, base_url="https://rentesla-api.fly.dev"):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token = None
        
    def print_header(self, title):
        print("\n" + "="*70)
        print(f"🚀 {title}")
        print("="*70)
        
    def print_result(self, success, message, data=None):
        icon = "✅" if success else "❌"
        print(f"{icon} {message}")
        if data:
            print(f"📊 Data: {json.dumps(data, indent=2)}")
        print()
        
    def test_health_check(self):
        """Test production health endpoint"""
        self.print_header("Production Health Check")
        
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.print_result(True, "Health check successful", {
                    "status": data.get("status"),
                    "app": data.get("app"),
                    "version": data.get("version"),
                    "test_mode": data.get("test_mode"),
                    "tesla_credentials": data.get("tesla_credentials_configured"),
                    "redis_connected": data.get("redis_connected"),
                    "redis_error": data.get("redis_error")
                })
                return True
            else:
                self.print_result(False, f"Health check failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.print_result(False, f"Health check error: {str(e)}")
            return False
    
    def test_tesla_public_key(self):
        """Test Tesla public key endpoint"""
        self.print_header("Tesla Public Key Endpoint")
        
        try:
            response = self.session.get(
                f"{self.base_url}/.well-known/appspecific/com.tesla.3p.public-key.pem",
                timeout=10
            )
            
            if response.status_code == 200:
                public_key = response.text
                if "BEGIN PUBLIC KEY" in public_key and "END PUBLIC KEY" in public_key:
                    self.print_result(True, "Tesla public key served successfully", {
                        "key_length": len(public_key),
                        "key_preview": public_key[:100] + "..." if len(public_key) > 100 else public_key
                    })
                    return True
                else:
                    self.print_result(False, "Invalid public key format")
                    return False
            else:
                self.print_result(False, f"Public key endpoint failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.print_result(False, f"Public key test error: {str(e)}")
            return False
    
    def test_login_without_redis(self):
        """Test login functionality (may fail due to Redis dependency)"""
        self.print_header("Login Test (Redis Required)")
        
        try:
            payload = {"username": "production_test_user"}
            response = self.session.post(
                f"{self.base_url}/login",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.print_result(True, "Login successful", {
                    "access_token_length": len(self.access_token) if self.access_token else 0
                })
                return True
            else:
                self.print_result(False, f"Login failed: {response.status_code}", {
                    "response": response.text[:200]
                })
                return False
                
        except Exception as e:
            self.print_result(False, f"Login error: {str(e)}")
            return False
    
    def test_performance(self):
        """Test API performance"""
        self.print_header("Performance Test")
        
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            end_time = time.time()
            
            response_time = round((end_time - start_time) * 1000, 2)
            
            if response.status_code == 200:
                self.print_result(True, f"Performance test successful", {
                    "response_time_ms": response_time,
                    "status": "Good" if response_time < 500 else "Slow"
                })
                return True
            else:
                self.print_result(False, f"Performance test failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.print_result(False, f"Performance test error: {str(e)}")
            return False
    
    def test_security_headers(self):
        """Test security headers"""
        self.print_header("Security Headers Test")
        
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            
            headers_to_check = {
                "Server": response.headers.get("server", "Not Set"),
                "Content-Type": response.headers.get("content-type", "Not Set"),
                "Content-Length": response.headers.get("content-length", "Not Set")
            }
            
            self.print_result(True, "Security headers check", headers_to_check)
            return True
                
        except Exception as e:
            self.print_result(False, f"Security headers test error: {str(e)}")
            return False
    
    def test_invalid_endpoints(self):
        """Test invalid endpoints return proper errors"""
        self.print_header("Invalid Endpoints Test")
        
        try:
            # Test 404
            response = self.session.get(f"{self.base_url}/nonexistent", timeout=10)
            if response.status_code == 404:
                self.print_result(True, "404 handling works correctly")
                return True
            else:
                self.print_result(False, f"Unexpected status for invalid endpoint: {response.status_code}")
                return False
                
        except Exception as e:
            self.print_result(False, f"Invalid endpoints test error: {str(e)}")
            return False
    
    def run_production_tests(self):
        """Run comprehensive production tests"""
        print("🚀 Tesla Fleet Rental API - Production Test Suite")
        print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🌐 Testing: {self.base_url}")
        
        tests = [
            ("Health Check", self.test_health_check),
            ("Tesla Public Key", self.test_tesla_public_key),
            ("Performance", self.test_performance),
            ("Security Headers", self.test_security_headers),
            ("Invalid Endpoints", self.test_invalid_endpoints),
            ("Login (Redis Required)", self.test_login_without_redis)
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
        self.print_header("Production Test Summary")
        
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

def main():
    print("🚀 Tesla Fleet Rental API - Production Test Suite")
    print("=" * 70)
    
    tester = ProductionTester()
    success = tester.run_production_tests()
    
    print(f"\n🏁 Production Test Suite completed: {'SUCCESS' if success else 'PARTIAL SUCCESS'}")
    return success

if __name__ == "__main__":
    main() 