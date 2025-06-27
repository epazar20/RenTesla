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