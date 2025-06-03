# Tesla Rental Backend 🚗⚡

Flask + Firebase + TeslaPy API ile araç kiralama backend'i.

## 🚀 Özellikler

- **Tesla API Entegrasyonu**: TeslaPy kullanarak gerçek Tesla araç kontrolü
- **Firebase Authentication**: Güvenli kullanıcı doğrulama
- **Kiralama Sistemi**: Zamanlı araç kiralama yönetimi
- **Environment Variables**: Güvenli konfigürasyon yönetimi
- **Test & Production Modes**: Geliştirme ve üretim ayrımı
- **RESTful API**: JSON tabanlı API endpoint'leri

## 📋 Gereksinimler

- Python 3.8+
- Tesla hesabı (gerçek araç kontrolü için)
- Firebase projesi (üretim için)

## 🛠️ Kurulum

### 1. Virtual Environment Oluştur
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# veya
venv\Scripts\activate     # Windows
```

### 2. Paketleri Kur
```bash
pip install -r requirements.txt
```

### 3. Environment Variables Ayarla
```bash
# .env dosyasını oluştur
cp env.example .env

# .env dosyasını gerçek değerlerle düzenle
TESLA_EMAIL=your-email@example.com
TEST_MODE=False
SECRET_KEY=your-secret-key-here
```

### 4. Firebase Kurulumu (Üretim için)
1. Firebase Console'dan `serviceAccountKey.json` dosyasını indirin
2. Proje root'una yerleştirin
3. `.env` dosyasında path'i ayarlayın

### 5. Uygulamayı Başlat
```bash
python app.py
```

Server http://localhost:5001 adresinde çalışacak.

## 🧪 Test

### Test Modu (Varsayılan)
```bash
# .env dosyasında
TEST_MODE=True

# Test scriptini çalıştır
python test_api.py
```

### Production Modu
```bash
# .env dosyasında
TEST_MODE=False

# Production test scriptini çalıştır
python test_production_with_auth.py
```

## 📱 API Endpoint'leri

### Health Check
```bash
GET /health
```
**Response:**
```json
{
  "status": "healthy",
  "test_mode": false,
  "firebase_connected": true,
  "tesla_token_exists": true,
  "tesla_email_configured": true
}
```

### Tesla Auth Init
```bash
GET /auth/init
```
**Response:**
```json
{
  "auth_url": "https://auth.tesla.com/oauth2/v3/authorize?...",
  "message": "Visit this URL to authorize Tesla access"
}
```

### Tesla Auth Callback
```bash
GET /auth/callback?url=<redirect_url>
```
**Response:**
```json
{
  "message": "Tesla token successfully obtained and saved"
}
```

### Kiralama Başlat
```bash
POST /api/rent
Authorization: Bearer <firebase_token>
Content-Type: application/json

{
  "duration": 60  # dakika (opsiyonel, varsayılan: 30)
}
```
**Response:**
```json
{
  "status": "Rent started",
  "valid_until": "2025-06-03T20:52:23.266743",
  "allowed_commands": ["unlock", "lock", "honk_horn"]
}
```

### Kiralama Durumu
```bash
GET /api/rent/status
Authorization: Bearer <firebase_token>
```
**Response:**
```json
{
  "active_rent": true,
  "current_time": "2025-06-03T19:52:23.268167",
  "rent_info": {
    "user_id": "test-user",
    "start_time": "2025-06-03T19:52:23.266743",
    "end_time": "2025-06-03T20:52:23.266743",
    "allowed_commands": ["unlock", "lock", "honk_horn"],
    "test_mode": false
  }
}
```

### Araç Komutu Gönder
```bash
POST /api/vehicle/command
Authorization: Bearer <firebase_token>
Content-Type: application/json

{
  "command": "unlock"  # unlock, lock, honk_horn
}
```
**Response:**
```json
{
  "status": "unlock sent",
  "test_mode": false
}
```

## 🔧 Environment Variables

| Variable | Açıklama | Varsayılan |
|----------|----------|------------|
| `TESLA_EMAIL` | Tesla hesap email'i | `your-email@example.com` |
| `TEST_MODE` | Test modu (true/false) | `False` |
| `PORT` | Sunucu portu | `5001` |
| `HOST` | Sunucu host'u | `0.0.0.0` |
| `DEBUG` | Debug modu (true/false) | `True` |
| `SECRET_KEY` | Flask secret key | `dev-secret-key-change-in-production` |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Firebase servis anahtarı path'i | `serviceAccountKey.json` |

## 📁 Proje Yapısı

```
backend/
├── app.py                          # Ana Flask uygulaması
├── test_api.py                     # Test modu API testleri
├── test_production_with_auth.py    # Production modu API testleri
├── requirements.txt                # Python bağımlılıkları
├── README.md                       # Bu dosya
├── .env                           # Environment variables (GİT'E EKLEMEYİN!)
├── env.example                    # Environment variables örneği
├── .gitignore                     # Git ignore kuralları
├── token.json                     # Tesla API token'ı (otomatik oluşur)
├── serviceAccountKey.json         # Firebase servis anahtarı (GİT'E EKLEMEYİN!)
├── venv/                         # Virtual environment
└── rents/                        # Kiralama dosyaları
    └── {user_id}.json           # Kullanıcı kiralama verileri
```

## 🔒 Güvenlik

### Dosya Güvenliği
- **`.env`**: Environment variables (gitignore'da)
- **`serviceAccountKey.json`**: Firebase anahtarı (gitignore'da)
- **`token.json`**: Tesla token'ı (gitignore'da)
- **`rents/`**: Kullanıcı verileri (gitignore'da)

### API Güvenliği
- **Firebase Authentication**: Production modunda gerçek token doğrulama
- **Test Mode**: Geliştirme için auth bypass
- **Zaman Sınırları**: Kiralama süre kontrolü
- **Komut Sınırları**: Sadece izin verilen Tesla komutları
- **Kullanıcı İzolasyonu**: Her kullanıcının kendi kiralama verisi

## 🐛 Hata Ayıklama

### Port Çakışması
macOS'ta AirPlay Receiver 5000 portunu kullanıyor:
```bash
# System Preferences -> General -> AirDrop & Handoff
# AirPlay Receiver'ı kapatın veya .env'de PORT=5001 kullanın
```

### Environment Variables
```bash
# .env dosyasını kontrol edin
cat .env

# Eksik variables için
cp env.example .env
# ve gerçek değerlerinizi girin
```

### Firebase Hataları
Test modu için:
```bash
# .env dosyasında
TEST_MODE=True
```

### Tesla API Hataları
- Tesla hesabınızın aktif olduğundan emin olun
- API rate limit'lerine dikkat edin
- Araç uyku modunda olabilir (wake-up gerekebilir)
- TeslaPy 2.9.0+ kullandığınızdan emin olun

## 📊 Test Sonuçları

### Test Mode
```
🎯 Overall: 6/6 tests passed (100.0%)
🎉 All tests passed! Backend is working correctly.
```

### Production Mode
```
🎯 Overall: 3/4 tests passed (75.0%)
⚠️  Mock Firebase token expected to fail
```

## 🚀 Production Deployment

### 1. Environment Setup
```bash
# Production .env
TEST_MODE=False
DEBUG=False
SECRET_KEY=your-production-secret-key
```

### 2. Firebase Setup
- Gerçek Firebase projesi oluşturun
- `serviceAccountKey.json` dosyasını indirin
- Firebase Console'da authentication'ı aktive edin

### 3. Tesla Setup
- Tesla hesabınızın email'ini `.env`'de ayarlayın
- `/auth/init` endpoint'ini ziyaret edin
- Tesla yetkilendirmesini tamamlayın

### 4. Production Server
```bash
# Production WSGI server kullanın
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun: `git checkout -b feature/amazing-feature`
3. Değişikliklerinizi commit edin: `git commit -m 'Add amazing feature'`
4. Branch'i push edin: `git push origin feature/amazing-feature`
5. Pull request açın

## 📄 Lisans

MIT License - detaylar için LICENSE dosyasına bakın.

---

**⚠️ Güvenlik Uyarısı**: Bu proje eğitim/demo amaçlıdır. Gerçek üretim kullanımı için:
- Güçlü secret key kullanın
- HTTPS kullanın
- Rate limiting ekleyin
- Log monitoring yapın
- Regular security audit'leri yapın