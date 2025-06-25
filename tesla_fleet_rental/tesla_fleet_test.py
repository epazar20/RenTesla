#!/usr/bin/env python3
"""
Tesla Fleet Rental API - Live Tesla Fleet API Test
Tests real Tesla Fleet API integration with production credentials
"""

import requests
import json
import time
from datetime import datetime

class TeslaFleetTester:
    def __init__(self, base_url="https://rentesla.xyz"):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token = None
        self.tesla_fleet_token = None
        
        # Production Tesla credentials
        self.tesla_client_id = "1dbbfed2-ad60-4d78-946a-bac7fab420a8"
        self.tesla_client_secret = "ta-secret.7CPosOop%gZtZ%5e"
        
    def print_header(self, title):
        print("\n" + "="*70)
        print(f"🚗 {title}")
        print("="*70)
        
    def print_result(self, success, message, data=None):
        icon = "✅" if success else "❌"
        print(f"{icon} {message}")
        if data:
            print(f"📊 Data: {json.dumps(data, indent=2)}")
        print()
        
    def get_tesla_fleet_token(self):
        """Get Tesla Fleet API access token"""
        self.print_header("Tesla Fleet API Authentication")
        
        url = "https://auth.tesla.com/oauth2/v3/token"
        headers = {"Content-Type": "application/json"}
        data = {
            "grant_type": "client_credentials",
            "client_id": self.tesla_client_id,
            "client_secret": self.tesla_client_secret,
            "scope": "openid email offline_access"
        }
        
        try:
            response = self.session.post(url, headers=headers, json=data, timeout=10)
            
            if response.status_code == 200:
                token_data = response.json()
                self.tesla_fleet_token = token_data["access_token"]
                self.print_result(True, "Tesla Fleet API token obtained", {
                    "token_type": token_data.get("token_type"),
                    "expires_in": token_data.get("expires_in"),
                    "scope": token_data.get("scope")
                })
                return True
            else:
                self.print_result(False, f"Tesla token failed: {response.status_code}", {
                    "response": response.text[:200]
                })
                return False
                
        except Exception as e:
            self.print_result(False, f"Tesla token error: {str(e)}")
            return False
    
    def test_partner_accounts(self):
        """Test Tesla Partner Accounts endpoint"""
        self.print_header("Tesla Partner Accounts")
        
        if not self.tesla_fleet_token:
            self.print_result(False, "No Tesla Fleet token available")
            return False
        
        url = "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts"
        headers = {
            "Authorization": f"Bearer {self.tesla_fleet_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = self.session.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                accounts = response.json()
                self.print_result(True, "Partner accounts retrieved", {
                    "accounts_count": len(accounts.get("response", [])),
                    "accounts": accounts.get("response", [])[:2]  # Show first 2
                })
                return True
            else:
                self.print_result(False, f"Partner accounts failed: {response.status_code}", {
                    "response": response.text[:300]
                })
                return False
                
        except Exception as e:
            self.print_result(False, f"Partner accounts error: {str(e)}")
            return False
    
    def test_register_domain(self):
        """Test domain registration with Tesla"""
        self.print_header("Domain Registration")
        
        if not self.tesla_fleet_token:
            self.print_result(False, "No Tesla Fleet token available")
            return False
        
        url = "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts"
        headers = {
            "Authorization": f"Bearer {self.tesla_fleet_token}",
            "Content-Type": "application/json"
        }
        data = {
            "domain": "rentesla.xyz"
        }
        
        try:
            response = self.session.post(url, headers=headers, json=data, timeout=10)
            
            if response.status_code in [200, 201]:
                partner_data = response.json()
                self.print_result(True, "Domain registered successfully", {
                    "partner_id": partner_data.get("id"),
                    "domain": partner_data.get("domain"),
                    "created_at": partner_data.get("created_at")
                })
                return partner_data.get("id")
            elif response.status_code == 409:
                self.print_result(True, "Domain already registered (409 - OK)", {
                    "message": "Domain was previously registered"
                })
                return "existing"
            else:
                self.print_result(False, f"Domain registration failed: {response.status_code}", {
                    "response": response.text[:300]
                })
                return False
                
        except Exception as e:
            self.print_result(False, f"Domain registration error: {str(e)}")
            return False
    
    def test_public_key_access(self):
        """Test public key accessibility from domain"""
        self.print_header("Public Key Accessibility")
        
        url = "https://rentesla.xyz/.well-known/appspecific/com.tesla.3p.public-key.pem"
        
        try:
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                public_key = response.text
                if "BEGIN PUBLIC KEY" in public_key and "END PUBLIC KEY" in public_key:
                    self.print_result(True, "Public key accessible", {
                        "url": url,
                        "content_length": len(public_key),
                        "key_format": "Valid PEM format",
                        "preview": public_key[:100] + "..."
                    })
                    return True
                else:
                    self.print_result(False, "Invalid public key format")
                    return False
            else:
                self.print_result(False, f"Public key not accessible: {response.status_code}")
                return False
                
        except Exception as e:
            self.print_result(False, f"Public key access error: {str(e)}")
            return False
    
    def test_api_login(self):
        """Test rental API login"""
        self.print_header("Rental API Login Test")
        
        payload = {"username": "tesla_fleet_test_user"}
        
        try:
            response = self.session.post(
                f"{self.base_url}/login",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.print_result(True, "API login successful", {
                    "access_token_length": len(self.access_token) if self.access_token else 0,
                    "has_refresh_token": "refresh_token" in data
                })
                return True
            else:
                self.print_result(False, f"API login failed: {response.status_code}", {
                    "response": response.text[:200]
                })
                return False
                
        except Exception as e:
            self.print_result(False, f"API login error: {str(e)}")
            return False
    
    def test_monitoring_endpoints(self):
        """Test monitoring endpoints"""
        self.print_header("Monitoring Endpoints")
        
        endpoints = [
            ("/health", "Health Check"),
            ("/metrics", "Metrics"),
            ("/status", "Status")
        ]
        
        results = []
        
        for endpoint, name in endpoints:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}", timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    self.print_result(True, f"{name} endpoint working", {
                        "status": data.get("status", "N/A"),
                        "timestamp": data.get("timestamp", "N/A")
                    })
                    results.append(True)
                else:
                    self.print_result(False, f"{name} endpoint failed: {response.status_code}")
                    results.append(False)
                    
            except Exception as e:
                self.print_result(False, f"{name} endpoint error: {str(e)}")
                results.append(False)
        
        return all(results)
    
    def test_vehicle_command_preparation(self):
        """Test vehicle command endpoint preparation (without real vehicle)"""
        self.print_header("Vehicle Command Endpoint Test")
        
        if not self.access_token:
            self.print_result(False, "No API access token available")
            return False
        
        # Test with mock data (will fail as expected since no rental active)
        headers = {"Authorization": f"Bearer {self.access_token}"}
        payload = {
            "vehicle_id": "test_vehicle_123",
            "command": "honk_horn",
            "data": {}
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/vehicle/command",
                json=payload,
                headers=headers,
                timeout=10
            )
            
            # We expect 403 (rental not found) which means endpoint is working
            if response.status_code == 403:
                self.print_result(True, "Vehicle command endpoint working (403 expected)", {
                    "status_code": response.status_code,
                    "message": "Endpoint correctly validates rental status"
                })
                return True
            else:
                self.print_result(False, f"Unexpected vehicle command response: {response.status_code}", {
                    "response": response.text[:200]
                })
                return False
                
        except Exception as e:
            self.print_result(False, f"Vehicle command error: {str(e)}")
            return False
    
    def run_full_test(self):
        """Run comprehensive Tesla Fleet API test"""
        print("🚗 Tesla Fleet Rental API - Complete Integration Test")
        print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🌐 Testing: {self.base_url}")
        
        tests = [
            ("Tesla Fleet Token", self.get_tesla_fleet_token),
            ("Partner Accounts", self.test_partner_accounts),
            ("Domain Registration", self.test_register_domain),
            ("Public Key Access", self.test_public_key_access),
            ("API Login", self.test_api_login),
            ("Monitoring Endpoints", self.test_monitoring_endpoints),
            ("Vehicle Command Prep", self.test_vehicle_command_preparation)
        ]
        
        results = []
        
        for test_name, test_func in tests:
            print(f"\n⏱️  Running: {test_name}...")
            try:
                result = test_func()
                results.append({"test": test_name, "success": bool(result)})
            except Exception as e:
                print(f"❌ Test '{test_name}' failed with exception: {str(e)}")
                results.append({"test": test_name, "success": False})
            
            time.sleep(1)  # Brief pause between tests
        
        # Summary
        self.print_header("Tesla Fleet API Test Summary")
        
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
        
        # Final recommendation
        print(f"\n🎯 Integration Status:")
        if successful_tests >= 6:
            print("🎉 EXCELLENT - Tesla Fleet API integration ready for production!")
        elif successful_tests >= 4:
            print("🟡 GOOD - Most components working, minor issues to resolve")
        else:
            print("🔴 NEEDS WORK - Multiple components need attention")
        
        return successful_tests == total_tests

def main():
    print("🚗 Tesla Fleet Rental API - Complete Integration Test")
    print("=" * 70)
    
    tester = TeslaFleetTester()
    success = tester.run_full_test()
    
    print(f"\n🏁 Tesla Fleet Integration Test completed!")
    return success

if __name__ == "__main__":
    main() 