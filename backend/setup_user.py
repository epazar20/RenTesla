#!/usr/bin/env python3
"""
Firebase kullanıcı oluşturma scripti
user@gmail.com / Ep*2857088* kullanıcısını oluşturur
"""

import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
import sys

def setup_firebase():
    """Firebase admin SDK'yı başlatır"""
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate('serviceAccountKey.json')
            firebase_admin.initialize_app(cred)
            print("✅ Firebase initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        return False

def create_or_update_user(email="user@gmail.com", password="Ep*2857088*"):
    """Test kullanıcısını Firebase Auth'ta oluşturur veya günceller"""
    try:
        # Önce kullanıcının var olup olmadığını kontrol et
        try:
            existing_user = firebase_auth.get_user_by_email(email)
            print(f"✅ User already exists: {existing_user.uid} ({existing_user.email})")
            
            # Parolayı güncelle
            firebase_auth.update_user(
                existing_user.uid,
                password=password,
                email_verified=True,
                disabled=False
            )
            print(f"✅ User password updated: {existing_user.uid}")
            return existing_user.uid
            
        except firebase_auth.UserNotFoundError:
            # Kullanıcı yoksa oluştur
            user = firebase_auth.create_user(
                email=email,
                password=password,
                email_verified=True,
                disabled=False
            )
            print(f"✅ New user created: {user.uid} ({user.email})")
            return user.uid
            
    except Exception as e:
        print(f"❌ Error creating/updating user: {e}")
        return None

def test_auth(email="user@gmail.com", password="Ep*2857088*"):
    """Authentication test için custom token oluşturur"""
    try:
        # Kullanıcıyı email ile bul
        user = firebase_auth.get_user_by_email(email)
        
        # Custom token oluştur
        custom_token = firebase_auth.create_custom_token(user.uid, {
            'email': email,
            'role': 'user'
        })
        
        print(f"\n🔐 Custom token created for testing:")
        print(f"UID: {user.uid}")
        print(f"Email: {email}")
        print(f"Custom Token: {custom_token.decode('utf-8')[:50]}...")
        
        print(f"\n📋 Test bu custom token'ı Firebase Auth SDK ile ID token almak için kullanabilirsiniz")
        print(f"   Ya da doğrudan email/password ile login endpoint'ini kullanabilirsiniz")
        
        return custom_token.decode('utf-8')
        
    except Exception as e:
        print(f"❌ Error creating custom token: {e}")
        return None

def main():
    print("🚀 RenTesla Firebase User Setup")
    print("=" * 50)
    
    if not setup_firebase():
        sys.exit(1)
    
    # Kullanıcıyı oluştur/güncelle
    uid = create_or_update_user()
    if not uid:
        print("❌ Failed to create/update user")
        sys.exit(1)
    
    # Test için custom token oluştur
    custom_token = test_auth()
    
    print("\n" + "=" * 50)
    print("✅ Setup completed successfully!")
    print("\n📝 Kullanım:")
    print("1. REST API'ye POST /auth/login ile email/password gönder")
    print("2. Dönen id_token'ı Authorization: Bearer <token> header'ında kullan")
    print("3. Tüm /api/* endpoint'leri bu token ile korunuyor")
    
if __name__ == "__main__":
    main() 