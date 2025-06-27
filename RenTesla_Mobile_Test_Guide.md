# RenTesla Mobile App - Emülatör Test Rehberi

## 📱 Genel Bakış

RenTesla mobile uygulaması React Native ve Expo framework'ü kullanılarak geliştirilmiştir. Bu rehber, uygulamayı Android ve iOS emülatörlerinde nasıl test edeceğinizi adım adım gösterir.

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
```

## 🚀 Projeyi Başlatma

### 1. Backend Servisi Başlatma

```bash
# Backend klasörüne gidin
cd mobile_backend

# .env dosyasını kontrol edin (Supabase bağlantı bilgileri)
cat .env

# Maven ile backend'i başlatın
mvn clean install -DskipTests
mvn spring-boot:run
```

**Backend Kontrolü:**
```bash
# Health check
curl http://localhost:8080/api/mobile/actuator/health

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
```

## 📱 Emülatör Kurulumu ve Kullanımı

### Android Emülatör (Android Studio)

#### Kurulum:
1. **Android Studio'yu indirin ve kurun**
   - https://developer.android.com/studio
   
2. **Android SDK ve Emülatör kurun**
   ```bash
   # Android Studio'yu açın
   # Tools > SDK Manager > SDK Platforms
   # En son Android versiyonunu seçin (API 34)
   
   # SDK Tools sekmesinde:
   # - Android SDK Build-Tools
   # - Android Emulator
   # - Android SDK Platform-Tools
   ```

3. **Virtual Device oluşturun**
   ```bash
   # Tools > Device Manager > Create Device
   # Pixel 7 Pro (recommended) seçin
   # System Image: Android 14 (API 34)
   # Advanced Settings: RAM 4GB, Internal Storage 8GB
   ```

#### Test Etme:
```bash
# Android emülatörü başlatın
# Android Studio > Device Manager > Play button

# Expo terminalde 'a' basın (Android)
# veya
npx expo run:android
```

### iOS Simulator (macOS only)

#### Kurulum:
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

#### Test Etme:
```bash
# iOS simulator'da test etmek için
# Expo terminalde 'i' basın (iOS)
# veya
npx expo run:ios
```

## 🔍 Test Senaryoları

### 1. Ana Sayfa Testi
- ✅ Uygulama başarıyla açılıyor mu?
- ✅ Welcome mesajı görünüyor mu?
- ✅ Navigation bar çalışıyor mu?
- ✅ İstatistik kartları yükleniyor mu?

### 2. Araç Listesi Testi
- ✅ Vehicles sekmesi açılıyor mu?
- ✅ Araç listesi yükleniyor mu?
- ✅ Arama fonksiyonu çalışıyor mu?
- ✅ Araç detayına geçiş yapılıyor mu?

### 3. Harita Testi
- ✅ Map sekmesi açılıyor mu?
- ✅ Placeholder mesajı görünüyor mu?
- ✅ Refresh butonu çalışıyor mu?

### 4. Profil Testi
- ✅ Profile sekmesi açılıyor mu?
- ✅ Kullanıcı bilgileri görünüyor mu?
- ✅ Menu items'a tıklanıyor mu?

### 5. API Bağlantı Testleri
```bash
# Backend API'leri test edin
curl -X GET http://localhost:8080/api/mobile/vehicles
curl -X GET http://localhost:8080/api/mobile/users/stats
curl -X GET http://localhost:8080/api/mobile/vehicles/stats
```

## 🐛 Yaygın Sorunlar ve Çözümleri

### Problem: Metro bundler hatası
```bash
# Cache'i temizleyin
npx expo start --clear

# Node modules'u yeniden yükleyin
rm -rf node_modules
npm install
```

### Problem: Android emülatör yavaş
```bash
# Emülatör ayarlarını optimize edin
# AVD Manager > Edit > Advanced Settings
# RAM: 4GB, VM Heap: 256MB
# Graphics: Hardware - GLES 2.0
```

### Problem: iOS simulator bulunamıyor
```bash
# Xcode command line tools'u yükleyin
sudo xcode-select --install

# Simulator yolunu kontrol edin
xcrun simctl list devices
```

### Problem: API bağlantı hatası
```bash
# Backend'in çalıştığını kontrol edin
curl http://localhost:8080/api/mobile/actuator/health

# Cors ayarlarını kontrol edin
# application.yml'de cors konfigürasyonu
```

## 📊 Test Checklist

### Başlangıç Kontrolleri
- [ ] Node.js kurulu (v18+)
- [ ] Expo CLI kurulu
- [ ] Android Studio/Xcode kurulu
- [ ] Backend çalışıyor (port 8080)
- [ ] Frontend çalışıyor (Expo)

### Functional Tests
- [ ] App açılış ekranı
- [ ] Navigation tabs çalışması
- [ ] API data yüklenmesi
- [ ] Search functionality
- [ ] Detail page navigation
- [ ] Error handling

### UI/UX Tests
- [ ] Responsive design
- [ ] Loading states
- [ ] Empty states
- [ ] Error messages
- [ ] Icons ve images
- [ ] Color scheme

### Performance Tests
- [ ] App açılış süresi (<3s)
- [ ] Page geçiş animasyonları
- [ ] API response times
- [ ] Memory usage
- [ ] Battery consumption

## 🚀 Production Test

### APK Build (Android)
```bash
# EAS CLI kurulum
npm install -g @expo/eas-cli

# Build profili oluştur
eas build:configure

# APK build
eas build --platform android --profile preview
```

### IPA Build (iOS)
```bash
# iOS build (Apple Developer hesabı gerekli)
eas build --platform ios --profile preview
```

## 📱 Fiziksel Device Test

### Android Device
```bash
# USB debugging'i etkinleştirin
# Settings > Developer Options > USB Debugging

# Device'ı bağlayın ve kontrol edin
adb devices

# Uygulamayı device'a yükleyin
npx expo run:android --device
```

### iOS Device
```bash
# Device'ı Xcode'a kaydedin
# Window > Devices and Simulators

# Uygulamayı device'a yükleyin
npx expo run:ios --device
```

## 📋 Test Raporu Formatı

```markdown
## Test Raporu - [Tarih]

### Test Ortamı
- Device: [iPhone 15 Pro Simulator / Pixel 7 Emulator]
- OS Version: [iOS 17.0 / Android 14]
- App Version: v1.0.0

### Test Sonuçları
#### Functional Tests
- ✅ Login/Authentication: PASS
- ✅ Vehicle Listing: PASS
- ❌ Map Integration: FAIL (API Error)
- ✅ Profile Management: PASS

#### Performance Tests
- App Launch: 2.3s ✅
- API Response: 1.2s ✅
- Memory Usage: 45MB ✅

#### Issues Found
1. Map API integration error
2. Search filter not working properly
3. Loading spinner sometimes freezes

### Action Items
- [ ] Fix map API endpoint
- [ ] Debug search filter logic
- [ ] Optimize loading states
```

## 🔧 Debug Araçları

### Expo Developer Tools
```bash
# Debug menüsü açmak için device'ı shake edin
# veya emülatörde Cmd+D (iOS) / Ctrl+M (Android)

# Kullanılabilir options:
# - Reload
# - Debug Remote JS
- Performance Monitor
# - Inspector
# - Fast Refresh
```

### React Native Debugger
```bash
# React Native Debugger kurulum
npm install --global react-native-debugger

# Başlatma
react-native-debugger
```

### API Testing
```bash
# Postman Collection import
# Backend > docs > RenTesla-Mobile-API.postman_collection.json

# HTTPie ile test
http GET localhost:8080/api/mobile/vehicles
```

## 📞 Destek

### Teknik Sorunlar
- Repository Issues: [GitHub Issues Link]
- Email: tech@rentesla.com
- Slack: #rentesla-mobile-support

### Dokümantasyon
- API Docs: http://localhost:8080/api/mobile/swagger-ui.html
- React Native Docs: https://reactnative.dev/
- Expo Docs: https://docs.expo.dev/

---

**Not:** Bu rehber sürekli güncellenmektedir. En son versiyonu için repository'yi kontrol edin. 