# 📱 RenTesla Mobile App

React Native Expo ile geliştirilmiş Tesla araç kiralama sistemi mobile uygulaması.

## 🚀 Özellikler

- **Modern UI/UX**: Tesla'nın tasarım diline uygun modern arayüz
- **Real-time Data**: Spring Boot backend ile gerçek zamanlı veri entegrasyonu
- **Vehicle Management**: Araç arama, filtreleme ve detay görüntüleme
- **Interactive Maps**: Araç konumlarını haritada görüntüleme
- **User Profile**: Kullanıcı profili ve ayarlar yönetimi
- **Cross-platform**: iOS ve Android desteği

## 🛠 Teknoloji Stack

- **Framework**: React Native + Expo SDK 53
- **Navigation**: React Navigation 7
- **HTTP Client**: Axios
- **UI Components**: React Native + Expo Vector Icons
- **Maps**: React Native Maps (gelecekte)
- **State Management**: React Hooks
- **Platform**: iOS, Android, Web

## 📋 Gereksinimler

- Node.js 18+
- npm veya yarn
- Expo CLI
- iOS Simulator (Mac) veya Android Emulator

## 🔧 Kurulum

### 1. Projeyi Klonlayın
```bash
git clone <repository-url>
cd mobile_frontend
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Backend API'yi Ayarlayın
`src/constants/api.js` dosyasında backend URL'ini güncelleyin:
```javascript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8080/api/mobile', // Backend URL'inizi buraya yazın
  // ...
};
```

### 4. Uygulamayı Çalıştırın
```bash
# Development server başlat
npm start

# iOS simulator
npm run ios

# Android emulator
npm run android

# Web browser
npm run web
```

## 📱 Uygulama Yapısı

```
src/
├── components/          # Yeniden kullanılabilir bileşenler
├── constants/          # API ve uygulama sabitleri
├── navigation/         # Navigation yapısı
├── screens/           # Uygulama ekranları
├── services/          # API servisleri
├── types/             # TypeScript tip tanımları (gelecekte)
└── utils/             # Yardımcı fonksiyonlar
```

## 🎯 Ana Ekranlar

### 🏠 Home Screen
- Fleet özet istatistikleri
- Hızlı erişim butonları
- Son aktiviteler

### 🚗 Vehicles Screen
- Müsait araçların listesi
- Arama ve filtreleme
- Araç detay görüntüleme

### 🗺 Map Screen
- Araçların harita üzerinde konumları
- Gerçek zamanlı konum güncellemeleri

### 👤 Profile Screen
- Kullanıcı profili
- Uygulama ayarları
- Destek seçenekleri

## 🔌 API Entegrasyonu

Uygulama Spring Boot backend ile RESTful API üzerinden iletişim kurar:

### Vehicle Endpoints
- `GET /vehicles` - Müsait araçları listele
- `GET /vehicles/{id}` - Araç detaylarını getir
- `GET /vehicles/search` - Araç ara
- `GET /vehicles/with-location` - Konumlu araçları getir

### User Endpoints
- `GET /users` - Kullanıcıları listele
- `POST /users` - Yeni kullanıcı oluştur
- `GET /users/stats` - Kullanıcı istatistikleri

## 🎨 Design System

### Renkler
- **Primary**: #e60012 (Tesla Red)
- **Secondary**: #1a1a1a (Tesla Black)
- **Success**: #4CAF50
- **Warning**: #FF9800
- **Error**: #F44336

### Typography
- **Headers**: Bold, Tesla Sans benzeri
- **Body**: Regular, okunabilir fontlar
- **Captions**: Light, bilgi metinleri

## 📦 Kullanılan Paketler

### Core
- `expo` - Expo SDK
- `react-native` - React Native framework

### Navigation
- `@react-navigation/native` - Navigation core
- `@react-navigation/stack` - Stack navigator
- `@react-navigation/bottom-tabs` - Tab navigator

### UI & Icons
- `@expo/vector-icons` - Icon seti
- `react-native-safe-area-context` - Safe area management

### Networking
- `axios` - HTTP client

### Location & Maps
- `expo-location` - Konum servisleri
- `react-native-maps` - Harita bileşeni

## 🔧 Development

### Debug Modu
```bash
# Metro bundler loglarını görüntüle
npm start

# React Native debugger kullan
# Chrome DevTools ile debug
```

### Environment Variables
Geliştirme ve prodüksiyon için farklı API URL'leri:
```javascript
const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://localhost:8080/api/mobile'  // Development
    : 'https://api.rentesla.com/mobile',  // Production
};
```

## 📱 Platform Özellikleri

### iOS
- Native iOS design patterns
- Safe area handling
- iOS specific icons

### Android
- Material Design elements
- Android navigation patterns
- Adaptive icons

## 🚀 Build & Deploy

### Development Build
```bash
# Expo development build
expo build:android
expo build:ios
```

### Production Build
```bash
# EAS Build (önerilen)
eas build --platform android
eas build --platform ios
```

## 🧪 Testing

```bash
# Unit testler (gelecekte)
npm test

# E2E testler (gelecekte)
npm run test:e2e
```

## 📊 Performance

- **Lazy Loading**: Ekranlar ihtiyaç halinde yüklenir
- **Image Optimization**: Görseller optimize edilir
- **API Caching**: Network istekleri cache'lenir
- **Bundle Size**: Minimum paket boyutu

## 🔐 Security

- **API Security**: JWT token tabanlı authentication
- **Data Validation**: Giriş verisi doğrulama
- **Secure Storage**: Hassas verilerin güvenli saklanması

## 🌍 Internationalization

Gelecekte çoklu dil desteği eklenecek:
- Türkçe (varsayılan)
- English
- Deutsch

## 🤝 Katkıda Bulunma

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

- **Proje**: RenTesla Mobile App
- **Versiyon**: 1.0.0
- **Platform**: React Native + Expo
- **Geliştirici**: RenTesla Team

## 🔄 Güncellemeler

### v1.0.0
- ✅ Temel navigation yapısı
- ✅ Vehicle listing ve detayları
- ✅ API entegrasyonu
- ✅ Modern UI/UX tasarımı
- ✅ Cross-platform destek

### Gelecek Özellikler
- 🔄 Gerçek harita entegrasyonu
- 🔄 Push notifications
- 🔄 Offline support
- 🔄 Biometric authentication
- 🔄 Payment integration

## 🔐 Environment Setup

Before running the application, you need to set up environment variables:

### 1. Create Environment File
```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your actual values:

```env
# Google Maps API Key (Required)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key

# API Configuration
EXPO_PUBLIC_API_BASE_URL_DEVELOPMENT=http://your_local_ip:8080/api/mobile
EXPO_PUBLIC_API_BASE_URL_PRODUCTION=https://your-production-api.com/api/mobile

# iOS Development URL
EXPO_PUBLIC_API_BASE_URL_IOS=http://localhost:8080/api/mobile

# Android Development URLs
EXPO_PUBLIC_API_BASE_URL_ANDROID_EMULATOR=http://10.0.2.2:8080/api/mobile
EXPO_PUBLIC_API_BASE_URL_ANDROID_DEVICE=http://your_local_ip:8080/api/mobile

# Demo Admin Credentials (Remove in production!)
EXPO_PUBLIC_DEMO_ADMIN_USERNAME=admin
EXPO_PUBLIC_DEMO_ADMIN_PASSWORD=admin123
```

### 3. Important Security Notes

⚠️ **NEVER commit the `.env` file to version control!**

- The `.env` file contains sensitive information like API keys
- Only commit `.env.example` with placeholder values
- Each developer should create their own `.env` file locally

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio/Emulator (for Android development)

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npx expo start
```

## 🗺️ Google Maps Setup

1. Get a Google Maps API Key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the following APIs:
   - Maps JavaScript API
   - Places API (if needed)
   - Geocoding API (if needed)
3. Add your API key to the `.env` file
4. Rebuild the app:
   ```bash
   npx expo run:ios    # for iOS
   npx expo run:android # for Android
   ```

## 📱 Running the App

### iOS Simulator
```bash
npx expo run:ios
```

### Android Emulator
```bash
npx expo run:android
```

### Physical Device
Use Expo Go app and scan the QR code from `npx expo start`

## 🔧 Configuration

### API URLs
- **Development**: Uses local IP address for device testing
- **iOS Simulator**: Uses localhost
- **Android Emulator**: Uses 10.0.2.2 (emulator localhost)
- **Production**: Uses production API URL

### Authentication
- Demo admin login is available for testing
- Real authentication should be implemented for production

## 🎯 Features

- **Vehicle Map**: Interactive map showing all available vehicles
- **Authentication**: JWT-based authentication system  
- **Vehicle Management**: Browse, search, and view vehicle details
- **User Management**: User registration and profile management
- **Document Upload**: KYC document verification system

## 🛠️ Development

### Project Structure
```
src/
├── components/     # Reusable UI components
├── screens/       # Screen components
├── navigation/    # Navigation configuration
├── services/      # API service layer
├── constants/     # App constants and configuration
└── utils/         # Utility functions
```

### Environment Variables
All sensitive data is managed through environment variables:
- API keys
- API endpoints
- Authentication credentials (demo only)

## 🚨 Security Best Practices

1. **Environment Variables**: All secrets are in `.env` file
2. **API Keys**: Never hardcode API keys in source code
3. **Authentication**: Use secure JWT tokens
4. **Network**: Use HTTPS in production
5. **Data Validation**: Validate all user inputs

## 📖 API Documentation

The backend API provides comprehensive endpoints for:
- Vehicle management
- User authentication
- Document verification
- Location services

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. **Create your own `.env` file** (don't commit it!)
4. Make your changes
5. Test thoroughly
6. Submit a pull request

## 📄 License

This project is proprietary software for RenTesla.

---

**⚠️ Remember: Never commit sensitive information like API keys or passwords to version control!** 