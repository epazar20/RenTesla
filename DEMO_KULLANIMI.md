# RenTesla Mobil Uygulama - Demo Kullanım Kılavuzu

## 🎯 Demo Amacı

Bu kılavuz, RenTesla uygulamasının tamamlanan özelliklerini test etmek için adım adım kullanım talimatları sağlar.

## 📱 Test Edilebilecek Özellikler

### ✅ Tamamlanan PRD Maddeleri:

1. **Kayıt & KVKK Onayları & Belge Yükleme (OCR + manuel inceleme)**
2. **Konum tabanlı araç listeleme veya QR kod tarama**

## 🚀 Demo Başlatma

### 1. Backend Başlatma
```bash
cd mobile_backend
./mvnw spring-boot:run
```
**Beklenen Sonuç:** Backend `http://localhost:8080` adresinde çalışmaya başlar.

### 2. Frontend Başlatma
```bash
cd mobile_frontend
npm install
npx expo start
```
**Beklenen Sonuç:** Expo geliştirme sunucusu başlar ve QR kod gösterilir.

### 3. Mobil Cihazda Çalıştırma
- **iOS:** App Store'dan Expo Go uygulamasını indirin ve QR kodu tarayın
- **Android:** Google Play'den Expo Go uygulamasını indirin ve QR kodu tarayın

## 📋 Test Senaryoları

### Senaryo 1: Yeni Kullanıcı Kaydı ve Onboarding

#### Adım 1: İlk Açılış
1. Uygulamayı açın
2. **Beklenen Sonuç:** ConsentScreen (Onay Ekranı) gösterilir

#### Adım 2: KVKK Onayları
1. **Zorunlu Onayları** işaretleyin:
   - ✅ KVKK Onayı
   - ✅ Açık Rıza Onayı

2. **İsteğe Bağlı Onayları** işaretleyin (önerilen):
   - ✅ Konum İzni
   - ✅ Bildirim İzni
   - ⬜ Pazarlama İzni (isteğe bağlı)

3. **"Onayları Kaydet ve Devam Et"** butonuna tıklayın

**Beklenen Sonuç:** DocumentUploadScreen (Belge Yükleme Ekranı) açılır

#### Adım 3: Belge Yükleme
1. **"Ehliyet"** kartına tıklayın
2. **"Kamera"** veya **"Galeri"** seçin
3. Ehliyet fotoğrafı çekin/seçin
4. OCR işleminin tamamlanmasını bekleyin

5. **"Kimlik Kartı"** için aynı işlemi tekrarlayın

**Beklenen Sonuç:** 
- OCR işlemi başarılı olursa: Otomatik onay
- Düşük güven skoru ise: "İnceleme Bekliyor" durumu

#### Adım 4: Ana Uygulamaya Geçiş
Belgeler onaylandıktan sonra ana uygulama açılır.

### Senaryo 2: Araç Listeleme ve Arama

#### Adım 1: Konum İzni
1. Uygulama konum izni isteyecek
2. **"İzin Ver"** seçeneğini seçin

**Beklenen Sonuç:** Mevcut konumunuz algılanır

#### Adım 2: Araç Listesine Erişim
1. Ana ekranın alt navigation'ından **"Vehicles"** sekmesine tıklayın
2. **"VehicleListing"** seçeneğini seçin

**Beklenen Sonuç:** VehicleListingScreen açılır

#### Adım 3: Filtreleme Testleri
1. **"Yakınımdaki"** filtresini test edin:
   - Filtre sekmesine tıklayın
   - 10 km yarıçapındaki araçları görün
   - Mesafe bilgilerini kontrol edin

2. **"Ekonomik"** filtresini test edin:
   - ≤500₺/gün araçları görün

3. **"Tesla"** filtresini test edin:
   - Tesla markası araçları görün

#### Adım 4: Arama Testi
1. Üstteki arama çubuğuna araç adı yazın
2. Sonuçların dinamik olarak filtrelendiğini gözlemleyin

### Senaryo 3: QR Kod Tarama

#### Adım 1: QR Scanner'a Erişim
1. VehicleListingScreen'de sağ üstteki **QR kod simgesine** tıklayın
2. Kamera izni verin

**Beklenen Sonuç:** QRScannerScreen açılır

#### Adım 2: Test QR Kodu Oluşturma
Test için QR kod oluşturun:
```json
{
  "vehicleUuid": "test-uuid-123",
  "action": "scan"
}
```

#### Adım 3: QR Kod Tarama
1. QR kodu kamera çerçevesine hizalayın
2. Otomatik okuma için bekleyin
3. **Flaş** düğmesini kullanarak karanlık ortamlarda test edin

**Beklenen Sonuç:** 
- Geçerli QR kod: Araç bilgileri modal'ı açılır
- Geçersiz QR kod: Hata mesajı gösterilir

### Senaryo 4: UI/UX Testleri

#### Adım 1: Responsive Tasarım
1. Uygulamayı dikey/yatay çevirin
2. Farklı ekran boyutlarında test edin

#### Adım 2: Loading States
1. Ağ bağlantısını yavaşlatın
2. Loading göstergelerini gözlemleyin

#### Adım 3: Error Handling
1. İnternet bağlantısını kesin
2. Hata mesajlarını kontrol edin

## 🔧 Test Verisi Oluşturma

### Backend Test Verisi
Backend çalışırken Swagger UI'dan test verisi ekleyin:
`http://localhost:8080/swagger-ui.html`

#### Örnek Araç Verisi:
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "displayName": "Tesla Model 3 Standard",
  "make": "Tesla",
  "model": "Model 3",
  "pricePerDay": 450.00,
  "batteryLevel": 85,
  "status": "AVAILABLE",
  "locationLat": 41.0082,
  "locationLng": 28.9784,
  "address": "Taksim, İstanbul"
}
```

### Konsent Test Verisi:
```json
{
  "userId": 1,
  "consents": [
    {
      "type": "KVKK",
      "given": true,
      "consentText": "KVKK onayı metni"
    }
  ],
  "ipAddress": "127.0.0.1",
  "userAgent": "RenTeslaMobileApp/1.0"
}
```

## 📊 Test Kriterleri

### Başarı Kriterleri:

#### 1. Onay Sistemi ✅
- [ ] Zorunlu onaylar seçilmeden devam edilemiyor
- [ ] İsteğe bağlı onaylar işaretlenebiliyor
- [ ] Backend'e onay verisi doğru gönderiliyor

#### 2. Belge Yükleme ✅
- [ ] Kamera/galeri seçimi çalışıyor
- [ ] OCR işlemi başlatılıyor
- [ ] Güven skoruna göre onay durumu değişiyor
- [ ] Progress bar doğru çalışıyor

#### 3. Araç Listeleme ✅
- [ ] Konum izni ile yakın araçlar gösteriliyor
- [ ] Mesafe hesaplaması doğru
- [ ] Filtreler beklenen sonuçları veriyor
- [ ] Arama çubuğu çalışıyor

#### 4. QR Tarama ✅
- [ ] Kamera izni isteniyor
- [ ] QR kod okuma çalışıyor
- [ ] Geçerli/geçersiz QR kod ayrımı yapılıyor
- [ ] Flaş kontrolü çalışıyor

## 🐛 Bilinen Sorunlar ve Geçici Çözümler

### 1. OCR Mock Implementation
**Sorun:** OCR gerçek tesseract/Google Cloud Vision entegrasyonu değil, mock
**Geçici Çözüm:** Random güven skoru üretiyor, test için yeterli

### 2. Payment Integration
**Sorun:** PAYTR henüz entegre değil
**Durum:** 5. madde kapsamında gelecek sürümde

### 3. Real-time Notifications
**Sorun:** FCM henüz entegre değil
**Durum:** 6. madde kapsamında gelecek sürümde

## 📝 Test Raporu Şablonu

### Test Sonuçları:
```
Tarih: [TARİH]
Tester: [İSİM]
Platform: [iOS/Android]
Versiyon: [VERSİYON]

Senaryo 1 - Onboarding: [BAŞARILI/BAŞARISIZ]
Senaryo 2 - Araç Listeleme: [BAŞARILI/BAŞARISIZ]
Senaryo 3 - QR Tarama: [BAŞARILI/BAŞARISIZ]
Senaryo 4 - UI/UX: [BAŞARILI/BAŞARISIZ]

Notlar:
- [ELDE EDİLEN SONUÇLAR]
- [SORUNLAR VE ÖNERİLER]
```

## 🎯 Sonraki Adımlar

Bu demo tamamlandıktan sonra:

1. **3. Madde**: Tarih/teslimat konumu ile araç seçimi
2. **4. Madde**: Müsaitlik kontrolü ve rezervasyon
3. **5. Madde**: PAYTR ödeme entegrasyonu
4. **6. Madde**: FCM bildirimler
5. **7. Madde**: Chat modülü
6. **8. Madde**: Değerlendirme sistemi

## 📞 Destek

Test sırasında sorun yaşanırsa:
- Backend logları: Console output
- Frontend logları: Expo console
- API dokümantasyonu: `http://localhost:8080/swagger-ui.html` 