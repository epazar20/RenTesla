#!/usr/bin/env python3
"""
Token Migration Script
Mevcut token.json dosyasını database'e migrate eder.
"""

import json
import os
from dotenv import load_dotenv
from database import init_db_pool, test_connection, save_tesla_token

# Load environment variables
load_dotenv()

EMAIL = os.getenv('TESLA_EMAIL', 'your-email@example.com')
TOKEN_FILE = 'token.json'

def migrate_token():
    """Migrate token.json to database"""
    print("🔄 Starting token migration...")
    
    # Initialize database
    if not init_db_pool():
        print("❌ Database initialization failed!")
        return False
        
    if not test_connection():
        print("❌ Database connection test failed!")
        return False
    
    # Check if token.json exists
    if not os.path.exists(TOKEN_FILE):
        print(f"❌ {TOKEN_FILE} not found!")
        return False
    
    try:
        # Load token from file
        with open(TOKEN_FILE, 'r') as f:
            token_data = json.load(f)
        
        print(f"✅ Loaded token from {TOKEN_FILE}")
        print(f"📧 Email: {EMAIL}")
        
        # Save to database
        if save_tesla_token(EMAIL, token_data):
            print("✅ Token successfully migrated to database")
            
            # Optionally backup and remove token.json
            backup_file = f"{TOKEN_FILE}.backup"
            os.rename(TOKEN_FILE, backup_file)
            print(f"📁 {TOKEN_FILE} backed up as {backup_file}")
            
            return True
        else:
            print("❌ Failed to save token to database")
            return False
            
    except Exception as e:
        print(f"❌ Token migration failed: {e}")
        return False

if __name__ == "__main__":
    if migrate_token():
        print("🎉 Token migration completed successfully!")
    else:
        print("💥 Token migration failed!") 