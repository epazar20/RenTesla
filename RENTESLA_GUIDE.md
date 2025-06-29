# RenTesla Mobile Araç Kiralama Uygulaması - Kapsamlı Kullanım Kılavuzu

## 📱 Uygulama Genel Bakış

RenTesla, modern teknoloji kullanarak araç kiralama deneyimini kolaylaştıran bir mobil uygulamadır. OCR teknolojisi, konum tabanlı arama, QR kod tarama ve gerçek zamanlı bildirimler ile güvenli ve kullanıcı dostu bir platform sunar.

## 🚀 Özellikler

### ✅ Tamamlanan Özellikler (2. Maddeye Kadar)

1. **Kayıt & KVKK Onayları & Belge Yükleme (OCR + manuel inceleme)**
2. **Konum tabanlı araç listeleme veya QR kod tarama**

### 🔄 Devam Eden Geliştirmeler

3. Tarih/teslimat konumu girişi ile araç seçimi
4. Müsaitlik kontrolü ve rezervasyon
5. PAYTR ön ödeme entegrasyonu
6. Gerçek zamanlı bildirimler (FCM)
7. Chat modülü (mesajlaşma)
8. Hizmet sonrası değerlendirme ve yorumlar

## 📋 Kurulum ve Başlangıç

### Backend Kurulumu

```bash
cd mobile_backend
./mvnw spring-boot:run
```

Backend varsayılan olarak `http://localhost:8080` adresinde çalışır.

### Frontend Kurulumu

```bash
cd mobile_frontend
npm install
npx expo start
```

## 🔐 1. Kayıt ve KVKK Onayları

### Consent Screen (Onay Ekranı)

**Dosya:** `mobile_frontend/src/screens/ConsentScreen.js`

#### Zorunlu Onaylar:
- **KVKK Onayı**: Kişisel verilerin işlenmesi için zorunlu
- **Açık Rıza Onayı**: Kimlik doğrulama ve araç kiralama işlemleri için zorunlu

#### İsteğe Bağlı Onaylar:
- **Konum İzni**: Yakın araçları göstermek için
- **Bildirim İzni**: Rezervasyon güncellemeleri için
- **Pazarlama İzni**: Kampanya bilgilendirmeleri için

#### API Endpoint:
```
POST /api/consents/submit
```

#### Kullanım:
1. Uygulama açıldığında onay ekranı gösterilir
2. Kullanıcı zorunlu onayları vermelidir
3. İsteğe bağlı onaylar işaretlenebilir
4. "Onayları Kaydet ve Devam Et" butonuna basılır

## 📄 2. Belge Yükleme ve OCR

### Document Upload Screen (Belge Yükleme Ekranı)

**Dosya:** `mobile_frontend/src/screens/DocumentUploadScreen.js`

#### Desteklenen Belgeler:
- **Ehliyet** (Zorunlu)
- **Kimlik Kartı** (Zorunlu)
- **Pasaport** (Kimlik kartı alternatifi)

#### OCR Süreci:
1. **Otomatik OCR**: Belge yüklendikten sonra otomatik analiz
2. **Güven Skorları**:
   - %95+ → Otomatik onay
   - %80-95% → İnceleme bekliyor
   - %80- → Manuel inceleme gerekli

#### API Endpoints:
```
POST /api/documents/upload
GET /api/documents/user/{userId}
GET /api/documents/user/{userId}/verification-status
```

#### Kullanım:
1. Belge kartına tıklayın
2. Kamera veya galeri seçin
3. Belge fotoğrafını çekin/seçin
4. OCR işlemi otomatik olarak başlar
5. Onay durumunu bekleyin

## 🚗 3. Araç Listeleme ve Arama

### Vehicle Listing Screen (Araç Listeleme Ekranı)

**Dosya:** `mobile_frontend/src/screens/VehicleListingScreen.js`

#### Arama ve Filtreleme:
- **Metin Arama**: Araç adı, model, marka
- **Konum Filtresi**: 10 km yarıçapında yakın araçlar
- **Kategori Filtreleri**:
  - Tümü
  - Yakınımdaki (konum gerekli)
  - Ekonomik (≤500₺/gün)
  - Lüks (>800₺/gün)
  - Tesla araçları

#### Konum Servisleri:
- **Otomatik Konum**: Kullanıcı izni ile otomatik konum algılama
- **Mesafe Hesaplama**: Haversine formülü ile doğru mesafe
- **Sıralama**: Yakından uzağa doğru sıralama

#### API Endpoints:
```
GET /api/vehicles
GET /api/vehicles/nearby?latitude={lat}&longitude={lng}&radiusKm=10
GET /api/vehicles/search?q={term}
GET /api/vehicles/category/{category}
GET /api/vehicles/price-range?minPrice={min}&maxPrice={max}
```

#### Kullanım:
1. Ana ekrandan "Araç Listesi"ne tıklayın
2. Konum izni verin (isteğe bağlı)
3. Arama çubuğunu kullanın
4. Filtre sekmelerinden birini seçin
5. Araç kartına tıklayarak detayları görün

## 📱 4. QR Kod Tarama

### QR Scanner Screen (QR Tarayıcı Ekranı)

**Dosya:** `mobile_frontend/src/screens/QRScannerScreen.js`

#### Özellikler:
- **Kamera İzni**: Otomatik izin kontrolü
- **Flaş Desteği**: Karanlık ortamlar için
- **QR Çerçevesi**: Net tarama için görsel kılavuz
- **Anında Sonuç**: QR kod okunduktan sonra araç bilgileri

#### API Endpoints:
```
POST /api/vehicles/qr-scan
```

#### Kullanım:
1. Araç listesi ekranından QR kod simgesine tıklayın
2. Kamera izni verin
3. QR kodu kamera çerçevesine hizalayın
4. Otomatik okuma sonrası araç bilgileri görüntülenir
5. "Araç Detayı" ile detaylara geçin

## 🛠 Backend API Yapısı

### Controller'lar

#### VehicleController
```java
@RestController
@RequestMapping("/api/vehicles")
```

**Temel Endpoint'ler:**
- `GET /` - Tüm müsait araçlar
- `GET /{uuid}` - UUID ile araç detayı
- `GET /nearby` - Konum tabanlı arama
- `POST /qr-scan` - QR kod tarama
- `GET /search` - Metin tabanlı arama

#### DocumentController
```java
@RestController
@RequestMapping("/api/documents")
```

**Temel Endpoint'ler:**
- `POST /upload` - Belge yükleme
- `GET /user/{userId}` - Kullanıcı belgeleri
- `GET /user/{userId}/verification-status` - Doğrulama durumu

#### UserConsentController
```java
@RestController
@RequestMapping("/api/consents")
```

**Temel Endpoint'ler:**
- `POST /submit` - Onay gönderimi
- `GET /user/{userId}/status` - Onay durumu
- `POST /revoke` - Onay iptali

### Veritabanı Yapısı

#### Ana Tablolar:
- **users**: Kullanıcı bilgileri ve onay durumları
- **vehicles**: UUID tabanlı araç bilgileri
- **user_consents**: KVKK ve diğer onaylar
- **documents**: OCR belge verileri
- **reservations**: Rezervasyon sistemi (gelecek)
- **messages**: Chat sistemi (gelecek)
- **reviews**: Değerlendirme sistemi (gelecek)

## 🔧 Teknik Detaylar

### Frontend Teknolojileri
- **React Native**: Ana framework
- **Expo**: Geliştirme platformu
- **React Navigation**: Sayfa yönlendirme
- **Expo Camera**: QR kod tarama
- **Expo Location**: Konum servisleri
- **Expo ImagePicker**: Belge fotoğrafı

### Backend Teknolojileri
- **Spring Boot**: Ana framework
- **JPA/Hibernate**: ORM
- **PostgreSQL/Supabase**: Veritabanı
- **UUID**: Birincil anahtar sistemi
- **Swagger**: API dokümantasyonu

### Güvenlik Önlemleri
- **JWT Token**: Kimlik doğrulama
- **KVKK Uyumlu**: Onay sistemi
- **OCR Güvenlik**: Güven skorları ile doğrulama
- **IP ve UserAgent**: Onay takibi

## 📊 Performans Optimizasyonları

### Konum Tabanlı Arama
```sql
-- Haversine formülü ile mesafe hesaplama
SELECT v FROM Vehicle v WHERE 
(6371 * acos(cos(radians(?1)) * cos(radians(v.locationLat)) * 
cos(radians(v.locationLng) - radians(?2)) + sin(radians(?1)) * 
sin(radians(v.locationLat)))) <= ?3
```

### Veritabanı İndeksleri
- Konum koordinatları için composite index
- UUID için unique index
- Kullanıcı ID'leri için foreign key indexleri

## 🚨 Hata Yönetimi

### Frontend Hata Durumları
1. **Ağ Bağlantısı**: Otomatik yeniden deneme
2. **İzin Reddedildi**: Kullanıcı yönlendirme
3. **QR Kod Bulunamadı**: Açıklayıcı mesaj
4. **Konum Erişimi**: Alternatif yöntemler

### Backend Hata Yanıtları
```json
{
  "message": "Hata açıklaması",
  "status": 400,
  "data": null
}
```

## 📱 Kullanıcı Deneyimi

### Akış Diyagramı
```
Başlangıç → KVKK Onayları → Belge Yükleme → 
Araç Listeleme/QR Tarama → Araç Seçimi → 
[Rezervasyon - Gelecek Sürüm]
```

### Durum Yönetimi
- **Loading States**: Her işlem için yükleme göstergesi
- **Error States**: Açıklayıcı hata mesajları
- **Success States**: Başarı bildirimleri
- **Empty States**: Boş liste durumları

## 🔮 Gelecek Sürümler

### 3. Madde: Rezervasyon Sistemi
- Tarih seçimi
- Teslimat konumu
- Müsaitlik kontrolü

### 4. Madde: Ödeme Entegrasyonu
- PAYTR pre-auth
- Güvenli ödeme akışı

### 5-8. Maddeler: Gelişmiş Özellikler
- FCM bildirimler
- Gerçek zamanlı chat
- Değerlendirme sistemi

## 📞 Destek ve İletişim

### Geliştirici Notları
- **Loglama**: Console.log kullanımı
- **Debug**: Swagger UI `/swagger-ui.html`
- **Testing**: Postman collection'ları mevcut

### API Dokümantasyonu
Backend çalışırken `http://localhost:8080/swagger-ui.html` adresinden API dokümantasyonuna erişilebilir.

---

## 📝 Sonuç

Bu kılavuz, RenTesla uygulamasının mevcut özelliklerini ve kullanımını detaylı olarak açıklamaktadır. PRD'nin ilk 2 maddesi başarıyla tamamlanmış olup, kullanıcılar şimdi:

1. ✅ Güvenli onay sistemi ile kayıt olabilir
2. ✅ OCR teknolojisi ile belge yükleyebilir
3. ✅ Konum tabanlı araç arayabilir
4. ✅ QR kod ile araç tarayabilir

Gelecek sürümlerde rezervasyon, ödeme ve iletişim özelliklerinin eklenmesi planlanmaktadır. 