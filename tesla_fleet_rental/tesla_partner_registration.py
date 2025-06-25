#!/usr/bin/env python3
"""
Tesla Partner Account Registration
Register domain and public key with Tesla Fleet API
"""

import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

class TeslaPartnerRegistration:
    def __init__(self):
        self.base_url = "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1"
        self.client_id = os.getenv("TESLA_CLIENT_ID")
        self.client_secret = os.getenv("TESLA_CLIENT_SECRET")
        self.domain = "rentesla.xyz"
        self.access_token = None
        
    def get_access_token(self):
        """Get OAuth access token for Tesla Fleet API"""
        print("🔑 Getting Tesla Fleet API access token...")
        
        url = "https://auth.tesla.com/oauth2/v3/token"
        headers = {"Content-Type": "application/json"}
        data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "openid email offline_access"
        }
        
        try:
            response = requests.post(url, headers=headers, json=data)
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data["access_token"]
                print(f"✅ Access token obtained successfully")
                return True
            else:
                print(f"❌ Failed to get access token: {response.status_code}")
                print(f"Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error getting access token: {e}")
            return False
    
    def register_partner_account(self):
        """Register partner account with Tesla"""
        print(f"🏢 Registering partner account for domain: {self.domain}")
        
        url = f"{self.base_url}/partner_accounts"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        data = {
            "domain": self.domain
        }
        
        try:
            response = requests.post(url, headers=headers, json=data)
            
            if response.status_code in [200, 201]:
                partner_data = response.json()
                print(f"✅ Partner account registered successfully")
                print(f"📋 Partner Account ID: {partner_data.get('id', 'N/A')}")
                return partner_data.get('id')
            elif response.status_code == 409:
                print(f"ℹ️ Partner account already exists for domain {self.domain}")
                # Get existing partner account
                return self.get_partner_account()
            else:
                print(f"❌ Failed to register partner account: {response.status_code}")
                print(f"Response: {response.text}")
                return None
        except Exception as e:
            print(f"❌ Error registering partner account: {e}")
            return None
    
    def get_partner_account(self):
        """Get existing partner account"""
        print(f"🔍 Getting existing partner account...")
        
        url = f"{self.base_url}/partner_accounts"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                accounts = response.json().get('response', [])
                for account in accounts:
                    if account.get('domain') == self.domain:
                        print(f"✅ Found existing partner account: {account.get('id')}")
                        return account.get('id')
                print(f"❌ No partner account found for domain {self.domain}")
                return None
            else:
                print(f"❌ Failed to get partner accounts: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error getting partner account: {e}")
            return None
    
    def register_public_key(self, partner_id):
        """Register public key with Tesla"""
        print(f"🔐 Registering public key for partner account {partner_id}")
        
        # Read public key from file
        try:
            with open("tesla_production_public.pem", "r") as f:
                public_key = f.read().strip()
        except FileNotFoundError:
            print("❌ Public key file not found: tesla_production_public.pem")
            return False
        
        url = f"{self.base_url}/partner_accounts/{partner_id}/public_key"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        data = {
            "public_key": public_key,
            "domain": self.domain
        }
        
        try:
            response = requests.post(url, headers=headers, json=data)
            
            if response.status_code in [200, 201]:
                print(f"✅ Public key registered successfully")
                return True
            elif response.status_code == 409:
                print(f"ℹ️ Public key already registered")
                return True
            else:
                print(f"❌ Failed to register public key: {response.status_code}")
                print(f"Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error registering public key: {e}")
            return False
    
    def verify_setup(self):
        """Verify the complete setup"""
        print(f"🔍 Verifying Tesla Partner setup...")
        
        # Test public key endpoint
        try:
            response = requests.get(f"https://{self.domain}/.well-known/appspecific/com.tesla.3p.public-key.pem")
            if response.status_code == 200 and "BEGIN PUBLIC KEY" in response.text:
                print(f"✅ Public key accessible at https://{self.domain}/.well-known/appspecific/com.tesla.3p.public-key.pem")
            else:
                print(f"❌ Public key not accessible on domain")
                return False
        except Exception as e:
            print(f"❌ Error accessing public key endpoint: {e}")
            return False
        
        return True
    
    def run_registration(self):
        """Run complete registration process"""
        print("🚀 Tesla Partner Account Registration Process")
        print("=" * 60)
        
        if not self.client_id or not self.client_secret:
            print("❌ Tesla credentials not found in environment")
            return False
        
        # Step 1: Get access token
        if not self.get_access_token():
            return False
        
        # Step 2: Register partner account
        partner_id = self.register_partner_account()
        if not partner_id:
            return False
        
        # Step 3: Register public key
        if not self.register_public_key(partner_id):
            return False
        
        # Step 4: Verify setup
        if not self.verify_setup():
            return False
        
        print("\n🎉 Tesla Partner Registration Completed Successfully!")
        print(f"📋 Domain: {self.domain}")
        print(f"🆔 Partner ID: {partner_id}")
        print(f"🔑 Public Key: Registered")
        print(f"🌐 Endpoint: https://{self.domain}/.well-known/appspecific/com.tesla.3p.public-key.pem")
        
        return True

def main():
    registration = TeslaPartnerRegistration()
    success = registration.run_registration()
    return success

if __name__ == "__main__":
    main() 