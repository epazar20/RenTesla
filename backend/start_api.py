#!/usr/bin/env python3
"""
RenTesla Quick Start Script
Firebase kullanıcısı oluştur, API'yi başlat ve test et
"""

import subprocess
import sys
import time
import os
import signal
from threading import Thread

def run_command(command, description, cwd=None):
    """Komut çalıştır ve sonucu döndür"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print(f"✅ {description} - Success")
            return True
        else:
            print(f"❌ {description} - Failed")
            if result.stderr:
                print(f"   Error: {result.stderr[:200]}...")
            return False
    except subprocess.TimeoutExpired:
        print(f"⏰ {description} - Timeout")
        return False
    except Exception as e:
        print(f"❌ {description} - Error: {e}")
        return False

def setup_user():
    """Firebase kullanıcısını oluştur"""
    print("\n" + "="*50)
    print("🔥 Setting up Firebase User")
    print("="*50)
    
    return run_command("python setup_user.py", "Creating Firebase user")

def start_api_server():
    """API sunucusunu başlat"""
    print("\n" + "="*50)
    print("🚀 Starting API Server")
    print("="*50)
    
    # API sunucusunu arka planda başlat
    process = subprocess.Popen([
        sys.executable, "app.py"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    # Sunucunun başlamasını bekle
    print("⏳ Waiting for server to start...")
    time.sleep(5)
    
    # Health check yap
    import requests
    try:
        response = requests.get("http://localhost:5001/health", timeout=5)
        if response.status_code == 200:
            print("✅ API Server started successfully")
            print(f"📡 Server running at: http://localhost:5001")
            return process
        else:
            print("❌ Health check failed")
            process.terminate()
            return None
    except Exception as e:
        print(f"❌ Failed to connect to server: {e}")
        process.terminate()
        return None

def run_tests():
    """API testlerini çalıştır"""
    print("\n" + "="*50)
    print("🧪 Running API Tests")
    print("="*50)
    
    # Biraz bekle server tamamen başlasın
    time.sleep(2)
    
    return run_command("python test_complete_api.py", "Running comprehensive tests")

def main():
    """Ana fonksiyon"""
    print("🚀 RenTesla Quick Start")
    print("="*50)
    
    api_process = None
    
    try:
        # 1. Kullanıcı setup
        if not setup_user():
            print("❌ User setup failed, exiting...")
            sys.exit(1)
        
        # 2. API server başlat
        api_process = start_api_server()
        if not api_process:
            print("❌ Failed to start API server, exiting...")
            sys.exit(1)
        
        # 3. Testleri çalıştır
        if run_tests():
            print("\n" + "="*50)
            print("🎉 Quick Start Completed Successfully!")
            print("="*50)
            print("\n📋 Next Steps:")
            print("1. API is running at: http://localhost:5001")
            print("2. Login credentials:")
            print("   Email: user@gmail.com")
            print("   Password: Ep*2857088*")
            print("3. Use POST /auth/login to get JWT token")
            print("4. Use token in Authorization: Bearer <token> header")
            print("5. All /api/* endpoints are now protected")
            print("\n⏹️  Press Ctrl+C to stop the server")
            
            # Sunucuyu çalışır durumda tut
            while True:
                time.sleep(1)
        else:
            print("\n❌ Tests failed, check logs above")
            
    except KeyboardInterrupt:
        print("\n\n⏹️  Shutting down...")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
    finally:
        # API process'i temizle
        if api_process:
            print("🔄 Stopping API server...")
            api_process.terminate()
            try:
                api_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                api_process.kill()
            print("✅ API server stopped")

if __name__ == "__main__":
    main()