# 📱 RenTesla Mobile App

React Native Expo ile geliştirilmiş Tesla araç kiralama sistemi mobile uygulaması.

## 🚀 Özellikler

- **Modern UI/UX**: Tesla'nın tasarım diline uygun modern arayüz
- **Real-time Data**: Spring Boot backend ile gerçek zamanlı veri entegrasyonu
- **JWT Authentication**: Otomatik token yönetimi ve güvenli oturum kontrolü
- **Redux State Management**: Merkezi state yönetimi ve otomatik logout
- **Auto-Logout Protection**: Token süresi dolduğunda otomatik yönlendirme
- **Vehicle Management**: Araç arama, filtreleme ve detay görüntüleme
- **Interactive Maps**: Araç konumlarını haritada görüntüleme (WebView tabanlı)
- **User Profile**: Kullanıcı profili ve ayarlar yönetimi
- **Cross-platform**: iOS ve Android desteği

## 🛠 Teknoloji Stack

- **Framework**: React Native + Expo SDK 53
- **State Management**: Redux Toolkit + AsyncStorage
- **Authentication**: JWT token with auto-refresh
- **Navigation**: React Navigation 7
- **HTTP Client**: Axios with interceptors
- **Maps**: Google Maps via WebView
- **UI Components**: React Native + Expo Vector Icons
- **Platform**: iOS, Android, Web

## 🔐 JWT Token Management

### Otomatik Token Yönetimi
- **AsyncStorage**: Token'lar güvenli şekilde saklanır
- **Redux Store**: Merkezi authentication state yönetimi
- **Axios Interceptors**: Her API isteğine otomatik token ekleme
- **Auto-Logout**: Token süresi dolduğunda otomatik logout ve redirect

### Güvenlik Özellikleri
- Token validation her uygulama başlatışında
- 401/403 hatalarında otomatik logout
- Navigation stack reset ile güvenli yönlendirme
- Error handling ve user feedback

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

### 2. Environment Değişkenlerini Ayarlayın
```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:
```env
# Google Maps API Key (REQUIRED)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# API Configuration
EXPO_PUBLIC_API_BASE_URL_DEVELOPMENT=http://your_local_ip:8080/api/mobile
EXPO_PUBLIC_API_BASE_URL_PRODUCTION=https://your-production-api.com/api/mobile

# Demo Admin Credentials (Remove in production!)
EXPO_PUBLIC_DEMO_ADMIN_USERNAME=admin
EXPO_PUBLIC_DEMO_ADMIN_PASSWORD=admin123
```

### 3. Bağımlılıkları Yükleyin
```bash
npm install
```

### 4. Backend API'yi Başlatın
Backend uygulamasının çalıştığından emin olun (`http://localhost:8080/api/mobile`)

### 5. Uygulamayı Çalıştırın
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
├── navigation/         # Navigation yapısı (Redux entegreli)
├── screens/           # Uygulama ekranları
├── services/          # API servisleri ve interceptors
├── store/             # Redux store ve slices
│   ├── store.js       # Redux store konfigürasyonu
│   └── slices/        # Redux slice'lar
│       └── authSlice.js  # Authentication state management
└── utils/             # Yardımcı fonksiyonlar
```

## 🔑 Authentication Flow

### Login Süreci
1. Kullanıcı credentials girer
2. Redux `loginUser` action dispatch edilir
3. API'ye login request gönderilir
4. Token alınırsa AsyncStorage'a kaydedilir
5. Redux state güncellenir
6. Navigation otomatik olarak main app'e yönlendirir

### Auto-Logout Süreci
1. API request 401/403 hatası döner
2. Axios interceptor hatayı yakalar
3. `logoutUser` action dispatch edilir
4. AsyncStorage temizlenir
5. Redux state sıfırlanır
6. Navigation login screen'e reset edilir

### Token Validation
- Uygulama açılışında stored token validate edilir
- Geçersiz token'lar otomatik temizlenir
- Loading states ile smooth UX

## 🎯 Ana Ekranlar

### 🔐 Authentication Screens
- **LoginScreen**: Redux entegreli giriş ekranı
- **SignupScreen**: Kayıt olma ekranı
- Auto-navigation between auth and main app

### 🏠 Home Screen
- Fleet özet istatistikleri
- Hızlı erişim butonları
- Son aktiviteler

### 🚗 Vehicles Screen
- Müsait araçların listesi
- Arama ve filtreleme
- Araç detay görüntüleme
- JWT korumalı API calls

### 🗺 Map Screen
- Google Maps WebView entegrasyonu
- Araçların harita üzerinde konumları
- JWT authentication ile veri yükleme
- Real-time location tracking

### 👤 Profile Screen
- Redux tabanlı user state
- Secure logout functionality
- Kullanıcı ayarları

## 🔌 API Entegrasyonu

### Otomatik Token Management
```javascript
// Axios interceptor otomatik token ekler
axios.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Error Handling
```javascript
// 401/403 hatalarında otomatik logout
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      store.dispatch(logoutUser());
      navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
    return Promise.reject(error);
  }
);
```

## 🗃 State Management

### Redux Store
```javascript
// Store configuration
const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});
```

### Auth Slice
- `loginUser`: Async login action
- `logoutUser`: Async logout action
- `loadStoredAuth`: Uygulama açılışında token yükleme
- `setAuthError`: Error state management

## 🎨 Design System

### Renkler
- **Primary**: #e60012 (Tesla Red)
- **Secondary**: #1a1a1a (Tesla Black)
- **Success**: #4CAF50
- **Warning**: #FF9800
- **Error**: #F44336

## 📦 Kullanılan Paketler

### Redux & State Management
- `@reduxjs/toolkit` - Modern Redux
- `react-redux` - React Redux bindings
- `@react-native-async-storage/async-storage` - Persistent storage

### Navigation
- `@react-navigation/native` - Navigation core
- `@react-navigation/stack` - Stack navigator
- `@react-navigation/bottom-tabs` - Tab navigator

### HTTP & API
- `axios` - HTTP client with interceptors

### Maps & Location
- `expo-location` - Konum servisleri
- `react-native-webview` - Google Maps WebView

## 🔧 Development

### Debug Modu
```bash
# Metro bundler loglarını görüntüle
npm start

# Redux DevTools ile state monitoring
# Chrome DevTools ile debug
```

### Environment Variables
```javascript
// Platform-specific API URLs
const getBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID_DEVICE;
    } else if (Platform.OS === 'ios') {
      return process.env.EXPO_PUBLIC_API_BASE_URL_IOS;
    }
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL_PRODUCTION;
};
```

## 🚨 Security Best Practices

### JWT Token Security
1. **AsyncStorage**: Token'lar encrypted storage'da saklanır
2. **Auto-Expire**: Token validation ve otomatik cleanup
3. **Interceptors**: Merkezi token management
4. **No Hardcoding**: Tüm credentials environment variables'da

### API Security
1. **HTTPS**: Production'da HTTPS kullanımı
2. **Token Validation**: Her request'te token geçerliliği kontrolü
3. **Error Handling**: Güvenli error messages
4. **CORS**: Proper CORS configuration

## 📱 Platform Özellikleri

### iOS
- Native iOS design patterns
- Safe area handling
- iOS specific navigation

### Android
- Material Design elements
- Android navigation patterns
- Adaptive icons

## 🚀 Build & Deploy

### Development Build
```bash
# Expo development build
npx expo run:ios
npx expo run:android
```

### Production Build
```bash
# EAS Build (önerilen)
eas build --platform android
eas build --platform ios
```

## 🧪 Testing Authentication

### Login Test
```bash
# Demo credentials
Username: admin
Password: admin123
```

### Token Expiration Test
1. Login yapın
2. Backend'de token expiration'ı kısaltın
3. Herhangi bir protected endpoint'e istek atın
4. Otomatik logout'u gözlemleyin

## 🤝 Katkıda Bulunma

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. **Create your own `.env` file** (don't commit it!)
4. Make your changes
5. Test authentication flow
6. Submit a pull request

## 📝 License

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

- **Proje**: RenTesla Mobile App
- **Versiyon**: 1.0.0
- **Platform**: React Native + Expo
- **Geliştirici**: RenTesla Team

## 🔄 Güncellemeler

### v1.0.0
- ✅ Redux Toolkit entegrasyonu
- ✅ JWT token management sistemi
- ✅ Otomatik logout ve redirect
- ✅ Axios interceptors
- ✅ AsyncStorage token persistence
- ✅ Modern navigation yapısı
- ✅ WebView tabanlı Google Maps
- ✅ Cross-platform destek

### Gelecek Özellikler
- 🔄 Token refresh mechanism
- 🔄 Biometric authentication
- 🔄 Push notifications
- 🔄 Offline support
- 🔄 Advanced error recovery

---

**⚠️ Security Reminder: Never commit sensitive information like API keys, passwords, or JWT secrets to version control!** 