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

## 🔐 Environment Setup

Before running the application, you need to set up environment variables:

### 1. Create Environment File
```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your actual values:

```env
# JWT Configuration (REQUIRED - Change in production!)
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-256-bits-long
JWT_EXPIRATION=86400000

# Database Configuration
DATABASE_URL=jdbc:postgresql://localhost:5433/rentesla
DB_USER=rentesla_user
DB_PASSWORD=rentesla_password

# Demo Admin Credentials (Remove in production!)
DEMO_ADMIN_USERNAME=admin
DEMO_ADMIN_PASSWORD=admin123

# API URLs
TESLA_API_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:*,https://localhost:*,exp://*:*,http://192.168.*:*,https://192.168.*:*
```

### 3. Important Security Notes

⚠️ **CRITICAL SECURITY REQUIREMENTS:**

- **NEVER commit the `.env` file to version control!**
- **Change JWT_SECRET to a secure random string in production**
- **Remove demo admin credentials in production**
- **Use strong database passwords**
- **Configure proper CORS origins for production**

## 🚀 Installation & Setup

### Prerequisites
- Java 17 or higher
- Maven 3.6+
- PostgreSQL 13+ (via Docker)
- Docker & Docker Compose

### Database Setup
```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d

# Verify database is running
docker-compose ps
```

### Install Dependencies & Run
```bash
# Install dependencies
mvn clean install

# Run the application
mvn spring-boot:run
```

### Alternative: Run with Docker
```bash
# Build and run everything
docker-compose up --build
```

## 🔧 Configuration

### Environment Variables
All sensitive configuration is managed through environment variables:

- **JWT_SECRET**: Must be at least 256 bits long
- **Database credentials**: Never hardcode in application.yml
- **Admin credentials**: For demo only, remove in production
- **API endpoints**: Configurable for different environments

### Database Configuration
- Uses PostgreSQL via Docker
- Connection pooling with HikariCP
- Automatic schema updates with Hibernate

### Security Configuration
- JWT-based authentication
- CORS configured for mobile app
- No basic authentication (removed)
- Secure headers and HTTPS ready

## 📊 Database Schema

### Tables
- **users**: User management with roles
- **vehicles**: Tesla vehicle inventory  
- **rentals**: Rental transactions
- **documents**: KYC document verification
- **consents**: User consent management

### Sample Data
The application includes sample Tesla vehicles:
- 8 Tesla models (Model S, 3, X, Y)
- Location data for Istanbul area
- Battery levels and pricing

## 🛠️ API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/signup` - User registration
- `POST /auth/refresh` - Token refresh

### Vehicles
- `GET /vehicles` - List all vehicles
- `GET /vehicles/{id}` - Get vehicle by ID
- `GET /vehicles/search` - Search vehicles
- `GET /vehicles/stats` - Vehicle statistics

### Users
- `GET /users` - List users (admin)
- `GET /users/{id}` - Get user by ID
- `PUT /users/{id}` - Update user
- `GET /users/stats` - User statistics

### Documents
- `POST /documents/upload` - Upload documents
- `GET /documents/user/{userId}/verification-status` - Check verification

## 📖 API Documentation

Swagger UI is available at:
- **Development**: http://localhost:8080/api/mobile/swagger-ui.html
- **API Docs**: http://localhost:8080/api/mobile/api-docs

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8080/api/mobile/actuator/health
```

### Test Authentication
```bash
curl -X POST http://localhost:8080/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Test Vehicle API
```bash
# Get auth token first, then:
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/mobile/vehicles
```

## 🚨 Security Best Practices

### Production Deployment
1. **Environment Variables**: All secrets in `.env` file
2. **JWT Secret**: Use cryptographically secure random string
3. **Database**: Use strong passwords and SSL connections
4. **HTTPS**: Enable SSL/TLS in production
5. **CORS**: Restrict to your actual frontend domains
6. **Logging**: Don't log sensitive data
7. **Monitoring**: Set up application monitoring

### Demo vs Production
- **Demo**: Uses hardcoded admin credentials for testing
- **Production**: Should use proper user management system

## 🔍 Monitoring & Observability

### Actuator Endpoints
- `/actuator/health` - Application health
- `/actuator/info` - Application info
- `/actuator/metrics` - Metrics
- `/actuator/prometheus` - Prometheus metrics

### Logging
- Structured logging with timestamp
- Debug level for development
- SQL logging for troubleshooting

## 🐳 Docker Configuration

### Services
- **PostgreSQL**: Database
- **Spring Boot App**: Backend API
- **pgAdmin**: Database management (optional)

### Environment Files
Docker Compose reads from `.env` file automatically.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. **Create your own `.env` file** (don't commit it!)
4. Make your changes
5. Test thoroughly
6. Submit a pull request

### Development Guidelines
- Follow Spring Boot best practices
- Use environment variables for configuration
- Write tests for new features
- Document API changes in Swagger

## 📄 License

This project is proprietary software for RenTesla.

---

**⚠️ Security Reminder: Never commit sensitive information like passwords, API keys, or JWT secrets to version control!** 