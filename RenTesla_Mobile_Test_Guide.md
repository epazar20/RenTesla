# RenTesla Mobile App - Emülatör Test Rehberi

## 📱 Genel Bakış

RenTesla mobile uygulaması React Native ve Expo framework'ü kullanılarak geliştirilmiştir. Bu rehber, uygulamayı Android ve iOS emülatörlerinde nasıl test edeceğinizi adım adım gösterir.

**Son Test Durumu:** ✅ Backend çalışıyor, Android emulator aktif, Expo başarıyla başlatıldı

## 🔧 Gereksinimler

### Sistem Gereksinimleri
- **Node.js**: v18.0.0 veya üzeri
- **npm/yarn**: v8.0.0 veya üzeri
- **Expo CLI**: v6.0.0 veya üzeri
- **Android Studio** (Android emülatör için)
- **Xcode** (iOS simulator için - sadece macOS)

### Kurulu Olması Gerekenler
```bash
# Node.js ve npm versiyonlarını kontrol edin
node --version
npm --version

# Expo CLI'yi global olarak yükleyin
npm install -g @expo/cli

# Android SDK environment variables (macOS için)
export ANDROID_SDK_ROOT=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/platform-tools
```

## 🚀 Projeyi Başlatma

### 1. Backend Servisi Başlatma

```bash
# Backend klasörüne gidin
cd mobile_backend

# .env dosyasını kontrol edin (Supabase bağlantı bilgileri)
cat .env

# Environment variables örneği:
# DATABASE_URL=jdbc:postgresql://aws-0-eu-north-1.pooler.supabase.com:6543/postgres
# DB_USER=postgres.irwytzimorfljkuugcfa
# DB_PASSWORD=Ep*2857088*

# Maven ile backend'i başlatın
mvn clean install -DskipTests
mvn spring-boot:run
```

**Backend Kontrolü:**
```bash
# Health check (Backend çalışıyor ✅)
curl http://localhost:8080/api/mobile/actuator/health
# Expected: {"status":"UP","components":{"db":{"status":"UP"}}}

# API Documentation
open http://localhost:8080/api/mobile/swagger-ui.html
```

### 2. Frontend Uygulaması Başlatma

```bash
# Frontend klasörüne gidin
cd mobile_frontend

# Dependency'leri kontrol edin (gerekirse yükleyin)
npm install

# Expo development server'ı başlatın
npx expo start

# Not: Port 8081 kullanımda ise 8082'yi kabul edin
# Starting Metro Bundler on port 8082 ✅
```

## 📱 Android Emülatör Kurulumu ve Kullanımı

### ✅ Mevcut Çalışan Durum
- **Aktif Emulator:** Pixel_7 (emulator-5554)
- **SDK Yolu:** ~/Library/Android/sdk
- **ADB Status:** Device olarak tanınıyor

### Android SDK Environment Setup (Kalıcı)

```bash
# .zshrc dosyasına ekleyin (kalıcı çözüm)
echo '
# Android SDK Environment Variables
export ANDROID_SDK_ROOT=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/platform-tools' >> ~/.zshrc

# Değişiklikleri uygulayın
source ~/.zshrc
```

### Mevcut Emülatörler

```bash
# Kullanılabilir emülatörleri listeleyin
emulator -list-avds
# Çıktı:
# Medium_Phone_API_36.0
# Pixel_7 ✅ (Şu anda çalışan)
```

### Emülatör Yönetimi

```bash
# Emülatör başlatma
emulator -avd Pixel_7 -no-snapshot-load &

# Emülatör durumunu kontrol etme
adb devices
# Expected: emulator-5554    device ✅

# Emülatör kapatma
adb emu kill
```

### Test Etme (Android)

```bash
# Method 1: Expo development server'dan
# Expo terminalde 'a' basın (Android)

# Method 2: Direct run
export ANDROID_SDK_ROOT=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/platform-tools
npx expo run:android

# Method 3: Start specific device
npx expo start --android
```

## 📱 iOS Simulator (macOS only)

### Kurulum:
1. **Xcode'u App Store'dan indirin**
   
2. **iOS Simulator'ı açın**
   ```bash
   # Terminal'den
   open -a Simulator
   
   # veya Xcode içinden
   # Xcode > Open Developer Tool > Simulator
   ```

3. **Device seçin**
   - Device > iPhone 15 Pro (recommended)
   - iOS 17.0 veya üzeri

### Test Etme (iOS)
```bash
# iOS simulator'da test etmek için
# Expo terminalde 'i' basın (iOS)
# veya
npx expo run:ios
```

## 🔍 Test Senaryoları

### 1. ✅ Backend API Testleri (Başarılı)
```bash
# Health Check
curl http://localhost:8080/api/mobile/actuator/health
# Status: UP ✅

# Vehicle API
curl -X GET http://localhost:8080/api/mobile/vehicles
# Database bağlantısı: Supabase PostgreSQL ✅

# User Stats API
curl -X GET http://localhost:8080/api/mobile/users/stats
```

### 2. Frontend-Backend Entegrasyonu
- ✅ Backend port 8080 çalışıyor
- ✅ Frontend port 8082 çalışıyor
- ✅ API endpoint configuration: localhost:8080
- ✅ Supabase database connection aktif

### 3. Emülatör Test Senaryoları
- ✅ Android emulator başarıyla çalışıyor
- ✅ ADB device detection çalışıyor
- ✅ Expo Metro bundler çalışıyor
- 🔄 iOS simulator testi bekleniyor

### 4. Uygulama Fonksiyonellik Testleri
- [ ] Ana sayfa yüklenmesi
- [ ] Navigation tabs çalışması
- [ ] API data fetch işlemleri
- [ ] Araç listesi görüntülenmesi
- [ ] Harita fonksiyonelliği
- [ ] Profil yönetimi

## 🐛 Çözülmüş Sorunlar

### ✅ Android Emulator PATH Sorunu
**Problem:** `emulator` komutu bulunamıyor
**Çözüm:** Android SDK environment variables ayarlandı
```bash
export ANDROID_SDK_ROOT=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/platform-tools
```

### ✅ Expo Port Çakışması
**Problem:** Port 8081 kullanımda
**Çözüm:** Port 8082 kullanımı kabul edildi
```bash
# Expo otomatik olarak alternatif port önerdi
✔ Use port 8082 instead? … yes ✅
```

### ✅ Supabase Database Bağlantısı
**Problem:** Database connection hatası
**Çözüm:** Doğru Supabase credentials ile bağlantı sağlandı
```bash
# Working configuration:
DATABASE_URL=jdbc:postgresql://aws-0-eu-north-1.pooler.supabase.com:6543/postgres
DB_USER=postgres.irwytzimorfljkuugcfa
DB_PASSWORD=Ep*2857088*
```

## 🚀 Hızlı Başlangıç (Son Durum)

### Tüm Sistem Başlatma
```bash
# 1. Backend başlat (Terminal 1)
cd mobile_backend
mvn spring-boot:run

# 2. Android emulator başlat (Terminal 2)
export ANDROID_SDK_ROOT=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/platform-tools
emulator -avd Pixel_7 &

# 3. Frontend başlat (Terminal 3)
cd mobile_frontend
npx expo start --android

# 4. Test et
adb devices  # emulator-5554 device görünmeli
curl http://localhost:8080/api/mobile/actuator/health  # UP status
```

## 📊 Mevcut Test Status

### System Status ✅
- [x] Backend Health: UP
- [x] Database: Connected (Supabase)
- [x] Android Emulator: Running (Pixel_7)
- [x] Expo Server: Running (Port 8082)
- [x] ADB Connection: Active
- [ ] iOS Simulator: Pending
- [ ] App Testing: In Progress

### Environment Configuration ✅
- [x] Android SDK Path: Configured
- [x] Java/Maven: Working
- [x] Node.js/npm: Compatible
- [x] Expo CLI: Installed
- [x] Database Credentials: Valid

## 🔧 Debug Araçları

### Android Emulator Debug
```bash
# Emulator durumu
adb devices
adb shell getprop ro.build.version.release

# Log monitoring
adb logcat | grep -i "expo\|react"

# Screen recording
adb shell screenrecord /sdcard/test.mp4
```

### Expo Developer Tools
```bash
# Debug menüsü açmak için device'ı shake edin
# veya emülatörde Cmd+D (iOS) / Ctrl+M (Android)

# Available options:
# - Reload ✅
# - Debug Remote JS ✅
# - Performance Monitor ✅
# - Inspector ✅
# - Fast Refresh ✅
```

### API Testing Tools
```bash
# cURL testleri
curl -X GET http://localhost:8080/api/mobile/vehicles \
  -H "Content-Type: application/json"

# HTTPie (daha kullanıcı dostu)
http GET localhost:8080/api/mobile/vehicles

# Backend API documentation
open http://localhost:8080/api/mobile/swagger-ui.html
```

## 📱 CLI Emulator Commands

### Android CLI Commands
```bash
# Tüm emülatörleri listele
emulator -list-avds

# Emulator başlat (headless)
emulator -avd Pixel_7 -no-window -no-audio &

# Emulator başlat (GPU acceleration)
emulator -avd Pixel_7 -gpu host &

# Device özellikleri
adb shell getprop | grep "model\|brand\|version"

# Apps listesi
adb shell pm list packages

# App install
adb install app.apk

# App uninstall
adb uninstall com.rentesla.mobile
```

### iOS Simulator CLI Commands
```bash
# Simulators listesi
xcrun simctl list devices

# Simulator başlat
xcrun simctl boot "iPhone 15 Pro"
open -a Simulator

# App install
xcrun simctl install booted path/to/app.app

# Screenshot
xcrun simctl io booted screenshot screenshot.png

# Video recording
xcrun simctl io booted recordVideo video.mov
```

## 🏁 Production Deployment Test

### Android APK Build
```bash
# EAS CLI setup
npm install -g @expo/eas-cli
eas login

# Build configuration
eas build:configure

# Development build
eas build --platform android --profile development

# Production build
eas build --platform android --profile production
```

### iOS IPA Build
```bash
# iOS build (Apple Developer account required)
eas build --platform ios --profile development

# TestFlight upload
eas submit --platform ios
```

## 📋 Son Test Raporu

```markdown
## Test Raporu - [Güncel Tarih]

### Test Ortamı ✅
- Backend: Spring Boot 3.2.1 (Port 8080)
- Database: Supabase PostgreSQL (aws-0-eu-north-1)
- Frontend: React Native + Expo (Port 8082)
- Android Emulator: Pixel_7 (API Level 34)
- Host OS: macOS 14.5.0

### Başarılı Testler ✅
- [x] Backend Health Check: PASS
- [x] Database Connection: PASS (Supabase)
- [x] Android Emulator: PASS (Running)
- [x] Expo Metro Bundler: PASS (Port 8082)
- [x] ADB Device Detection: PASS
- [x] API Endpoints: AVAILABLE

### Bekleyen Testler 🔄
- [ ] iOS Simulator Testing
- [ ] App UI/UX Testing
- [ ] API Integration Testing
- [ ] Performance Testing
- [ ] Production Build Testing

### Bilinen Sorunlar ✅ (Çözüldü)
1. ~~Android SDK PATH not found~~ → Fixed
2. ~~Expo port conflict (8081)~~ → Using 8082
3. ~~Database connection error~~ → Supabase working
4. ~~Emulator not starting~~ → Pixel_7 running

### Action Items
- [ ] Complete iOS simulator setup
- [ ] Run comprehensive app testing
- [ ] Verify all API endpoints with mobile app
- [ ] Performance optimization testing
```

## 📞 Destek ve Dokümantasyon

### Quick Reference
- **Backend Health:** http://localhost:8080/api/mobile/actuator/health
- **API Docs:** http://localhost:8080/api/mobile/swagger-ui.html
- **Expo DevTools:** http://localhost:8082
- **Android Emulator:** Pixel_7 (emulator-5554)

### Teknik Sorunlar
- Repository Issues: GitHub Issues
- Email: tech@rentesla.com
- Slack: #rentesla-mobile-support

### Yararlı Linkler
- React Native Docs: https://reactnative.dev/
- Expo Docs: https://docs.expo.dev/
- Android Studio: https://developer.android.com/studio
- Supabase Docs: https://supabase.com/docs

---

**Son Güncelleme:** [Güncel Tarih] - Android emulator çalışıyor, backend aktif, Expo başlatıldı ✅ 