# 🚗 RenTesla Mobile Backend

Spring Boot tabanlı mikroservis mimarisi ile geliştirilmiş Tesla araç kiralama sistemi mobile backend API'si.

## 🚀 Özellikler

- **RESTful API**: Mobile uygulama için optimize edilmiş API endpoints
- **PostgreSQL Database**: Supabase PostgreSQL entegrasyonu
- **Spring Security**: JWT tabanlı authentication ve authorization
- **API Documentation**: Swagger/OpenAPI 3.0 entegrasyonu
- **Real-time Data**: Tesla API entegrasyonu
- **Microservice Architecture**: Distributed sistem mimarisi

## 🛠 Teknoloji Stack

- **Framework**: Spring Boot 3.2.1
- **Language**: Java 17
- **Database**: PostgreSQL (Supabase)
- **ORM**: Spring Data JPA / Hibernate
- **Security**: Spring Security + JWT
- **Documentation**: SpringDoc OpenAPI 3
- **Build Tool**: Maven
- **Timezone**: Europe/Istanbul

## 📋 Gereksinimler

- Java 17+
- Maven 3.6+
- PostgreSQL database (Supabase)

## 🔧 Kurulum

### 1. Projeyi Klonlayın
```bash
git clone <repository-url>
cd mobile_backend
```

### 2. Environment Değişkenlerini Ayarlayın
```bash
cp env.example .env
```

`.env` dosyasını düzenleyin:
```properties
DATABASE_URL=jdbc:postgresql://your-supabase-host:6543/postgres
DB_USER=postgres.your_project_id
DB_PASSWORD=your-password
JWT_SECRET=your-jwt-secret-key
```

### 3. Bağımlılıkları Yükleyin
```bash
mvn clean install
```

### 4. Uygulamayı Çalıştırın
```bash
mvn spring-boot:run
```

Uygulama `http://localhost:8080/api/mobile` adresinde çalışacaktır.

## 📚 API Endpoints

### Vehicle Management
- `GET /api/mobile/vehicles` - Tüm müsait araçları listele
- `GET /api/mobile/vehicles/{id}` - Araç detaylarını getir
- `GET /api/mobile/vehicles/search?q={term}` - Araç ara
- `GET /api/mobile/vehicles/price-range?minRate={min}&maxRate={max}` - Fiyat aralığına göre araç ara
- `GET /api/mobile/vehicles/with-location` - Konum bilgisi olan araçları listele
- `GET /api/mobile/vehicles/stats` - Araç istatistikleri

### User Management
- `GET /api/mobile/users` - Aktif kullanıcıları listele
- `GET /api/mobile/users/{id}` - Kullanıcı detaylarını getir
- `GET /api/mobile/users/email/{email}` - Email ile kullanıcı ara
- `POST /api/mobile/users` - Yeni kullanıcı oluştur
- `PUT /api/mobile/users/{id}` - Kullanıcı bilgilerini güncelle
- `POST /api/mobile/users/check-email` - Email kontrolü
- `POST /api/mobile/users/check-phone` - Telefon kontrolü

## 📖 API Dokümantasyonu

Swagger UI: `http://localhost:8080/api/mobile/swagger-ui.html`
API Docs: `http://localhost:8080/api/mobile/api-docs`

## 🏥 Health Check

Health endpoint: `http://localhost:8080/api/mobile/actuator/health`

## 🗃 Database Schema

### mobile_users
- `id` (BIGINT, Primary Key)
- `first_name` (VARCHAR(100))
- `last_name` (VARCHAR(100))
- `email` (VARCHAR(255), Unique)
- `phone` (VARCHAR(20))
- `address` (VARCHAR(500))
- `is_active` (BOOLEAN)
- `role` (ENUM: CUSTOMER, ADMIN, MANAGER)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### mobile_vehicles
- `id` (BIGINT, Primary Key)
- `tesla_vehicle_id` (BIGINT, Unique)
- `vin` (VARCHAR(17), Unique)
- `display_name` (VARCHAR(100))
- `model` (VARCHAR(50))
- `color` (VARCHAR(50))
- `status` (ENUM: AVAILABLE, RENTED, MAINTENANCE, OUT_OF_SERVICE)
- `daily_rate` (DECIMAL(10,2))
- `battery_level` (INTEGER)
- `latitude` (DECIMAL(10,8))
- `longitude` (DECIMAL(11,8))
- `location_address` (VARCHAR(255))
- `is_available` (BOOLEAN)
- `description` (VARCHAR(500))
- `features` (VARCHAR(1000))
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## 🔐 Security

- JWT tabanlı authentication
- CORS desteği (React Native için optimize edilmiş)
- Request validation
- SQL injection koruması

## 🌍 Timezone

Tüm tarih/saat verileri Türkiye saati (Europe/Istanbul) olarak saklanır ve döndürülür.

## 🧪 Test

```bash
# Unit testleri çalıştır
mvn test

# Integration testleri çalıştır
mvn verify
```

## 📊 Monitoring

- Spring Boot Actuator endpoints
- Health checks
- Metrics collection
- Application info

## 🔧 Development

### Profiles
- `development`: Geliştirme ortamı
- `production`: Prodüksiyon ortamı

### Logging
- Console logging (development)
- File logging (production)
- SQL query logging (debug mode)

## 🚀 Deployment

### Docker (Opsiyonel)
```bash
# Docker image oluştur
docker build -t rentesla-mobile-backend .

# Container çalıştır
docker run -p 8080:8080 --env-file .env rentesla-mobile-backend
```

## 🤝 Katkıda Bulunma

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

- **Proje**: RenTesla Mobile Backend
- **Versiyon**: 1.0.0
- **Geliştirici**: RenTesla Team 