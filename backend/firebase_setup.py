import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
import os

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

def create_test_user(email="user@gmail.com", password="Ep*2857088*"):
    """Test kullanıcısını Firebase Auth'ta oluşturur"""
    try:
        # Kullanıcı var mı kontrol et
        try:
            user = firebase_auth.get_user_by_email(email)
            print(f"✅ User already exists: {user.uid}")
            return user.uid
        except firebase_auth.UserNotFoundError:
            # Kullanıcı yoksa oluştur
            user = firebase_auth.create_user(
                email=email,
                password=password,
                email_verified=True,
                disabled=False
            )
            print(f"✅ User created successfully: {user.uid}")
            return user.uid
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return None

def create_custom_token(uid):
    """Kullanıcı için custom token oluşturur"""
    try:
        custom_token = firebase_auth.create_custom_token(uid)
        return custom_token.decode('utf-8')
    except Exception as e:
        print(f"❌ Error creating custom token: {e}")
        return None

if __name__ == "__main__":
    if setup_firebase():
        uid = create_test_user()
        if uid:
            token = create_custom_token(uid)
            if token:
                print(f"🔐 Custom token: {token}")
                print("\n📝 Bu token'ı Firebase Auth SDK ile ID token almak için kullanabilirsiniz") 