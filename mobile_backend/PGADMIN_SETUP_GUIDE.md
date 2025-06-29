# 🐘 RenTesla PostgreSQL & pgAdmin Setup Guide

## 📋 Genel Bakış

Bu döküman, RenTesla Mobile Backend projesinde Docker ile ayağa kaldırılan PostgreSQL ve pgAdmin yapılandırma rehberidir.

## 🐳 Docker Container Bilgileri

### Container'lar
- **PostgreSQL**: `rentesla-postgres`
- **Redis**: `rentesla-redis` 
- **pgAdmin**: `rentesla-pgadmin`

### Port Yapılandırması
- **PostgreSQL**: `localhost:5433` → `container:5432`
- **Redis**: `localhost:6379` → `container:6379`
- **pgAdmin**: `localhost:5050` → `container:80`

## 📊 Veritabanı Bilgileri

### PostgreSQL Bağlantı Detayları
```
Host: localhost
Port: 5433
Database: rentesla
Username: rentesla_user
Password: rentesla_password
```

### pgAdmin Erişim Bilgileri
```
URL: http://localhost:5050
Email: admin@rentesla.com
Password: admin123
```

## 🔧 pgAdmin Server Yapılandırması

### Adım 1: pgAdmin'e Erişim
1. Web tarayıcınızda `http://localhost:5050` adresine gidin
2. Login bilgilerini girin:
   - **Email**: `admin@rentesla.com`
   - **Password**: `admin123`
3. "Login" butonuna tıklayın

### Adım 2: Server Grubu Oluşturma (Opsiyonel)
1. Sol panelde "Servers" üzerine sağ tıklayın
2. "Create" → "Server Group..." seçin
3. Name: `RenTesla Servers`
4. "Save" butonuna tıklayın

### Adım 3: PostgreSQL Server Ekleme
1. "Servers" (veya oluşturduğunuz grup) üzerine sağ tıklayın
2. "Create" → "Server..." seçin
3. **General** sekmesinde:
   - **Name**: `RenTesla PostgreSQL`
   - **Server group**: `RenTesla Servers` (eğer oluşturduysanız)
   - **Comments**: `RenTesla Mobile Backend Database`

### Adım 4: Connection Yapılandırması
**Connection** sekmesine geçin ve aşağıdaki bilgileri girin:

**🎯 GÜNCEL BAĞLANTI BİLGİLERİ:**
```
Host name/address: rentesla-postgres
Port: 5432
Maintenance database: rentesla
Username: rentesla_user
Password: rentesla_password
```

⚠️ **Önemli Notlar**: 
- Host olarak `rentesla-postgres` (container adı) kullanıyoruz
- Eğer `rentesla-postgres` çalışmazsa alternatif olarak `host.docker.internal` deneyin
- Port container içi portu: `5432` (dış port 5433 değil!)

**🔧 Alternatif Host Seçenekleri (eğer yukarıdaki çalışmazsa):**
1. `host.docker.internal` 
2. `172.18.0.2` (docker network IP)
3. `localhost` (nadiren çalışır)

**🧪 Bağlantı Testi:**
"Test" butonuna tıklayarak bağlantıyı test edin. Başarılı olursa "Connection to server was successful" mesajı alacaksınız.

### Adım 5: SSL ve Advanced Ayarları
1. **SSL** sekmesinde:
   - **SSL mode**: `Prefer`
2. **Advanced** sekmesinde:
   - **DB restriction**: `rentesla` (sadece bu DB'yi göster)

### Adım 6: Server'ı Kaydetme
1. "Save" butonuna tıklayın
2. Bağlantı başarılı olursa sol panelde server görünecek

## 🏗️ Docker Container Yönetimi

### Container'ları Başlatma
```bash
cd /path/to/mobile_backend
docker-compose up -d
```

### Container Durumunu Kontrol Etme
```bash
docker-compose ps
```

Beklenen çıktı:
```
      Name                     Command               State               Ports            
------------------------------------------------------------------------------------------
rentesla-pgadmin    /entrypoint.sh                   Up      443/tcp, 0.0.0.0:5050->80/tcp
rentesla-postgres   docker-entrypoint.sh postgres    Up      0.0.0.0:5433->5432/5432/tcp       
rentesla-redis      docker-entrypoint.sh redis ...   Up      0.0.0.0:6379->6379/tcp       
```

### Container'ları Durdurma
```bash
docker-compose down
```

### Container Loglarını Görüntüleme
```bash
# Tüm container'lar için
docker-compose logs

# Sadece PostgreSQL için
docker-compose logs postgres

# Real-time log takibi
docker-compose logs -f postgres
```

## 🔍 Veritabanı İçeriği

### Tablolar ve Veri Sayıları
- **users**: 18 kayıt
- **vehicles**: 10 kayıt  
- **reservations**: 0 kayıt
- **documents**: 0 kayıt
- **messages**: 0 kayıt
- **reviews**: 0 kayıt
- **user_consents**: 0 kayıt

### Örnek Sorgular
```sql
-- Kullanıcı sayısı
SELECT COUNT(*) FROM users;

-- Araç listesi
SELECT uuid, make, model, year, location FROM vehicles;

-- Kullanıcı detayları
SELECT id, email, first_name, last_name, phone FROM users LIMIT 5;
```

## 🛠️ Troubleshooting

### Sorun 1: pgAdmin'e erişemiyorum
**Çözüm:**
```bash
# Container'ın çalışıp çalışmadığını kontrol edin
docker-compose ps

# pgAdmin loglarını kontrol edin
docker-compose logs pgadmin

# Container'ı yeniden başlatın
docker-compose restart pgadmin
```

### Sorun 2: PostgreSQL'e bağlanamıyorum
**Kontrol Listesi:**
1. PostgreSQL container'ının çalıştığından emin olun:
   ```bash
   docker-compose ps postgres
   ```
2. Port'un açık olduğunu kontrol edin:
   ```bash
   netstat -an | grep 5433
   ```
3. Host name olarak `rentesla-postgres` kullandığınızdan emin olun

### Sorun 2.1: "role 'rentesla_user' does not exist" Hatası
**Bu hatayı alırsanız:**
```
connection failed: connection to server at "192.168.65.2", port 5432 failed: 
FATAL: role "rentesla_user" does not exist
```

**Çözüm:**
```bash
# Container'ları tamamen temizle ve yeniden başlat
docker-compose down -v
docker-compose up -d

# 15 saniye bekle ve kullanıcıyı kontrol et
sleep 15
docker exec -it rentesla-postgres psql -U rentesla_user -d rentesla -c "\du"
```

**pgAdmin'de doğru host ayarları:**
- ✅ Host: `rentesla-postgres` (container adı)
- ✅ Port: `5432` (container içi port)
- ❌ Host: `192.168.65.2` veya `localhost` (çalışmayabilir)

### Sorun 3: Veritabanı boş görünüyor
**Çözüm:**
```bash
# PostgreSQL container'ına bağlanıp veriyi kontrol edin
docker exec -it rentesla-postgres psql -U rentesla_user -d rentesla -c "\dt"
docker exec -it rentesla-postgres psql -U rentesla_user -d rentesla -c "SELECT COUNT(*) FROM users;"
```

### Sorun 4: Spring Boot uygulaması veritabanına bağlanamıyor
**application.yml kontrolü:**
```yaml
datasource:
  url: jdbc:postgresql://localhost:5433/rentesla
  username: rentesla_user
  password: rentesla_password
```

## 📱 Spring Boot Uygulama Bilgileri

### Uygulama Endpointleri
- **Ana API**: `http://localhost:8080/api/mobile/`
- **Health Check**: `http://localhost:8080/api/mobile/actuator/health`
- **Swagger UI**: `http://localhost:8080/api/mobile/swagger-ui.html`
- **API Docs**: `http://localhost:8080/api/mobile/api-docs`

### Health Check Sonucu
```json
{
  "status": "UP",
  "components": {
    "db": {
      "status": "UP",
      "details": {
        "database": "PostgreSQL",
        "validationQuery": "SELECT 1",
        "result": 1
      }
    },
    "diskSpace": {"status": "UP"},
    "ping": {"status": "UP"}
  }
}
```

## 🎯 Hızlı Başlangıç Checklist

- [ ] Docker Desktop çalışıyor
- [ ] `docker-compose up -d` komutu çalıştırıldı
- [ ] Container'lar "Up" durumda: `docker-compose ps`
- [ ] pgAdmin erişilebilir: `http://localhost:5050`
- [ ] pgAdmin login başarılı (admin@rentesla.com/admin123)
- [ ] PostgreSQL server eklendi ve bağlantı başarılı
- [ ] Spring Boot uygulaması çalışıyor: `http://localhost:8080/api/mobile/actuator/health`
- [ ] Veritabanı verileri görüntülenebiliyor

## 🔗 Faydalı Linkler

- **pgAdmin**: http://localhost:5050
- **Spring Boot Health**: http://localhost:8080/api/mobile/actuator/health  
- **Swagger UI**: http://localhost:8080/api/mobile/swagger-ui.html
- **Redis**: `localhost:6379` (GUI için Redis Desktop Manager kullanabilirsiniz)

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Bu dokümandaki troubleshooting bölümünü kontrol edin
2. Container loglarını inceleyin: `docker-compose logs`
3. Port çakışması kontrolü yapın: `netstat -an | grep -E "(5433|5050|6379)"`

---
**Son Güncelleme**: 29 Haziran 2025  
**Versiyon**: 1.0  
**Proje**: RenTesla Mobile Backend 