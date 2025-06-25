# Tesla Fleet Rental API - Production Yol Haritası

## 🔐 Production Key Management ve Configuration

### 📋 Genel Bakış

Tesla Fleet Rental API'sini production ortamında çalıştırmak için şu ana key ve configuration alanları gereklidir:

1. **Tesla Developer Credentials** (OAuth & Fleet API)
2. **Tesla Vehicle Command Keys** (Private/Public Key Pair)
3. **JWT Secret Keys** (API Security)
4. **Redis Configuration** (Session & Token Storage)
5. **SSL/TLS Certificates** (HTTPS)

---

## 🏗️ **PHASE 1: Tesla Developer Setup**

### 1.1 Tesla Developer Account

```bash
# 1. Tesla Developer Portal
https://developer.tesla.com

# 2. Account Registration
- Tesla hesabı gerekli (tesla.com)
- Business email address
- Developer agreement kabul
```

### 1.2 Fleet API Application Registration

```bash
# Tesla Developer Console'da:
Application Name: "Tesla Fleet Rental"
Description: "Commercial Tesla vehicle rental management system"
Website URL: "https://rentesla.xyz"
Redirect URI: "https://rentesla.xyz/auth/tesla/callback"
Scopes: "openid offline_access vehicle_device_data vehicle_commands"
```

### 1.3 Production Keys Alma

```bash
# Developer Console'dan alınacak:
TESLA_CLIENT_ID=1dbbfed2-ad60-4d78-946a-bac7fab420a8
TESLA_CLIENT_SECRET=ta-secret.7CPosOop%gZtZ%5e

# Bu key'ler ASLA version control'e commit edilmemelidir!
```

---

## 🔑 **PHASE 2: Tesla Vehicle Command Keys**

### 2.1 Private/Public Key Pair Generation

```bash
# Production için system keyring kullanımı:
export TESLA_KEY_NAME=rentesla_production
./tesla-keygen create > tesla_production_public.pem

# Bu komut:
# 1. Private key'i system keyring'e kaydeder
# 2. Public key'i dosya olarak export eder
```

### 2.2 Domain Setup ve Public Key Hosting

```bash
# Production domain gerekli:
Domain: rentesla.xyz 

# Required path:
https://rentesla.xyz/.well-known/appspecific/com.tesla.3p.public-key.pem

# SSL certificate gerekli (Let's Encrypt veya commercial)
```

### 2.3 Tesla Partner Registration

```bash
# Fleet API üzerinden partner registration:
POST https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts
{
  "domain": "rentesla.xyz"
}

# Public key registration:
POST https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts/{id}/public_key
{
  "public_key": "-----BEGIN PUBLIC KEY-----\n...",
  "domain": "rentesla.xyz"
}
```

---

## 🛡️ **PHASE 3: Security Configuration**

### 3.1 JWT Secret Keys

```bash
# Production için güçlü secret key:
JWT_SECRET_KEY=$(openssl rand -base64 64)

# Örnek output:
JWT_SECRET_KEY=7x9K2mN8pQ3vR6wE4tY1uI0oP5sA2dF9g7H8jK6lL3nM4bV8cX1zQ2wE5rT7yU9iO0p

# Bu key production environment'ta güvenli şekilde saklanmalı
```

### 3.2 Redis Security

```bash
# Production Redis configuration:
REDIS_PASSWORD=2d7f5194cb1c42328157b90fde8af061
REDIS_HOST=fly-rentesla.upstash.io
REDIS_PORT=6379
REDIS_DB=0

# Redis AUTH enable:
requirepass your_strong_redis_password

# Redis TLS (önerilir):
REDIS_SSL=true
REDIS_SSL_CERT_PATH=/path/to/redis-client.crt
REDIS_SSL_KEY_PATH=/path/to/redis-client.key
REDIS_SSL_CA_CERTS=/path/to/ca.crt
```

### 3.3 Environment Variables (Production)

```bash
# Production .env file (SECURE STORAGE):

# Tesla Fleet API
TESLA_CLIENT_ID=1dbbfed2-ad60-4d78-946a-bac7fab420a8
TESLA_CLIENT_SECRET=ta-secret.7CPosOop%gZtZ%5e

# Tesla Vehicle Command
TESLA_KEY_NAME=rentesla_production
TESLA_TOKEN_NAME=rentesla_production
TESLA_CACHE_FILE=/var/lib/rentesla/tesla_cache.json

# JWT Configuration
JWT_SECRET_KEY=7x9K2mN8pQ3vR6wE4tY1uI0oP5sA2dF9g7H8jK6lL3nM4bV8cX1zQ2wE5rT7yU9iO0p
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000

# Redis Configuration
REDIS_PASSWORD=2d7f5194cb1c42328157b90fde8af061
REDIS_HOST=fly-rentesla.upstash.io
REDIS_PORT=6379
REDIS_DB=0
REDIS_SSL=true

# API Configuration
API_HOST=0.0.0.0
API_PORT=5000
DEBUG=False

# Production Mode
TEST_MODE=False
MOCK_TESLA_API=False

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/rentesla/app.log

# SSL/TLS
SSL_CERT_PATH=/etc/ssl/certs/rentesla.crt
SSL_KEY_PATH=/etc/ssl/private/rentesla.key
```

---

## 🏭 **PHASE 4: Production Deployment**

### 4.1 Server Configuration

```bash
# Production server requirements:
- Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- Python 3.8+
- Redis 6.0+
- Nginx (reverse proxy)
- Systemd (service management)
```

### 4.2 Directory Structure

```bash
# Production directory layout:
/opt/rentesla/
├── app/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   └── utils/
├── keys/
│   └── tesla_production_public.pem
├── logs/
│   └── app.log
├── config/
│   ├── .env (SECURED: 600 permissions)
│   ├── redis.conf
│   └── nginx.conf
└── scripts/
    ├── start.sh
    ├── stop.sh
    └── backup.sh
```

### 4.3 Systemd Service Configuration

```bash
# /etc/systemd/system/rentesla.service

[Unit]
Description=Tesla Fleet Rental API
After=network.target redis.service

[Service]
Type=simple
User=rentesla
Group=rentesla
WorkingDirectory=/opt/rentesla/app
Environment=PATH=/opt/rentesla/venv/bin
ExecStart=/opt/rentesla/venv/bin/python app.py
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=5

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/rentesla/logs /var/lib/rentesla

[Install]
WantedBy=multi-user.target
```

### 4.4 Nginx Reverse Proxy

```bash
# /etc/nginx/sites-available/rentesla.conf

server {
    listen 443 ssl http2;
    server_name rentesla.xyz;

    ssl_certificate /etc/ssl/certs/yourcompany.crt;
    ssl_certificate_key /etc/ssl/private/yourcompany.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # Tesla public key hosting
    location /.well-known/appspecific/com.tesla.3p.public-key.pem {
        alias /opt/rentesla/keys/tesla_production_public.pem;
        add_header Content-Type application/x-pem-file;
        add_header Cache-Control "public, max-age=31536000";
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}

# HTTP redirect
server {
    listen 80;
    server_name rentesla.xyz;
    return 301 https://$server_name$request_uri;
}
```

---

## 🔄 **PHASE 5: Key Rotation ve Maintenance**

### 5.1 Tesla OAuth Token Rotation

```python
# Automatic token refresh (built-in APScheduler):
def refresh_all_tokens():
    # Token expiry 5 dakika kala otomatik yenileme
    for user_id in get_active_users():
        refresh_user_token(user_id)

# Schedule her saat başı kontrol:
scheduler.add_job(func=refresh_all_tokens, trigger='cron', minute=0)
```

### 5.2 Tesla Vehicle Command Key Rotation

```bash
# Vehicle command key rotation (yılda 1 kez önerilir):

# 1. Yeni key pair oluştur:
export TESLA_KEY_NAME=rentesla_production_v2
./tesla-keygen create > tesla_production_public_v2.pem

# 2. New public key'i domain'de host et:
cp tesla_production_public_v2.pem /opt/rentesla/keys/
ln -sf tesla_production_public_v2.pem /opt/rentesla/keys/tesla_production_public.pem

# 3. Tesla Partner API'de güncelle:
curl -X PUT https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts/{id}/public_key \
  -H "Authorization: Bearer $TESLA_FLEET_TOKEN" \
  -d '{"public_key": "-----BEGIN PUBLIC KEY-----\n..."}'

# 4. Kullanıcılar yeni key enrollment yapmalı:
# https://tesla.com/_ak/yourcompany.com
```

### 5.3 JWT Secret Key Rotation

```bash
# JWT secret rotation (6 ayda 1 kez):

# 1. New secret generate:
NEW_JWT_SECRET=$(openssl rand -base64 64)

# 2. Graceful rotation (dual secret support):
JWT_SECRET_KEY_OLD=old_secret
JWT_SECRET_KEY_NEW=new_secret

# 3. Deploy with both secrets
# 4. Monitor transition
# 5. Remove old secret after 24 hours
```

---

## 📊 **PHASE 6: Monitoring ve Logging**

### 6.1 Application Metrics

```python
# metrics.py
from prometheus_client import Counter, Histogram, Gauge

# API metrics
api_requests_total = Counter('api_requests_total', 'Total API requests', ['method', 'endpoint'])
api_request_duration = Histogram('api_request_duration_seconds', 'API request duration')
active_rentals = Gauge('active_rentals_total', 'Number of active rentals')
tesla_api_errors = Counter('tesla_api_errors_total', 'Tesla API errors', ['error_type'])

# Vehicle command metrics
vehicle_commands_total = Counter('vehicle_commands_total', 'Total vehicle commands', ['command', 'status'])
vehicle_command_duration = Histogram('vehicle_command_duration_seconds', 'Vehicle command duration')
```

### 6.2 Log Configuration

```python
# logging_config.py
import logging
from logging.handlers import RotatingFileHandler

# Production logging setup
if not Config.DEBUG:
    file_handler = RotatingFileHandler(
        '/var/log/rentesla/app.log',
        maxBytes=100 * 1024 * 1024,  # 100MB
        backupCount=10
    )
    file_handler.setLevel(logging.INFO)
    
    formatter = logging.Formatter(
        '%(asctime)s %(levelname)s [%(name)s] %(message)s'
    )
    file_handler.setFormatter(formatter)
    
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
```

### 6.3 Health Checks

```python
# health.py
@app.route('/health')
def health_check():
    checks = {
        'api': True,
        'redis': check_redis_connection(),
        'tesla_api': check_tesla_api_connectivity(),
        'disk_space': check_disk_space(),
        'memory': check_memory_usage()
    }
    
    status_code = 200 if all(checks.values()) else 503
    
    return jsonify({
        'status': 'healthy' if status_code == 200 else 'unhealthy',
        'checks': checks,
        'timestamp': datetime.utcnow().isoformat()
    }), status_code
```

---

## 🚨 **PHASE 7: Security Best Practices**

### 7.1 Key Security

```bash
# Key file permissions:
chmod 600 /opt/rentesla/config/.env
chmod 600 /etc/ssl/private/yourcompany.key
chown rentesla:rentesla /opt/rentesla/config/.env

# System keyring security:
# Private keys are stored in OS keyring (macOS Keychain, Linux keyring)
# Never store private keys in files for production
```

### 7.2 Network Security

```bash
# Firewall configuration:
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect)
ufw allow 443/tcp   # HTTPS
ufw deny 5000/tcp   # Block direct API access
ufw deny 6379/tcp   # Block direct Redis access
```

### 7.3 API Security

```python
# Rate limiting, CORS, security headers
from flask_limiter import Limiter
from flask_cors import CORS

# Rate limiting
limiter = Limiter(app, key_func=get_remote_address)

@app.route('/api/vehicle/command', methods=['POST'])
@limiter.limit("10 per minute")  # Max 10 commands per minute
@jwt_required()
def vehicle_command():
    # Command logic...
```

---

## 📋 **Production Deployment Checklist**

### ✅ Pre-Deployment

- [ ] **Tesla Developer Account** aktif
- [ ] **Fleet API credentials** alındı
- [ ] **Domain** satın alındı ve SSL kuruldu
- [ ] **Public key** domain'de host edildi
- [ ] **Partner registration** Tesla'da tamamlandı
- [ ] **Vehicle key enrollment** test edildi

### ✅ Infrastructure

- [ ] **Production server** hazır (specs: 4 CPU, 8GB RAM, 100GB disk)
- [ ] **Redis server** kuruldu ve güvenlik ayarları yapıldı
- [ ] **Nginx** reverse proxy konfigürasyonu
- [ ] **SSL certificates** kuruldu
- [ ] **Firewall** ayarları yapıldı
- [ ] **Backup** sistemi kuruldu

### ✅ Application

- [ ] **Environment variables** güvenli şekilde set edildi
- [ ] **Systemd service** konfigürasyonu
- [ ] **Log rotation** ayarları
- [ ] **Health checks** implementasyonu
- [ ] **Monitoring** sistemi (Prometheus/Grafana)
- [ ] **Alerting** sistemi (PagerDuty/email)

### ✅ Security

- [ ] **Key rotation** procedures
- [ ] **Secret management** (HashiCorp Vault/AWS Secrets Manager)
- [ ] **API rate limiting**
- [ ] **HTTPS enforcement**
- [ ] **Security headers**
- [ ] **Vulnerability scanning**

### ✅ Testing

- [ ] **Load testing** (Artillery/JMeter)
- [ ] **Security testing** (OWASP ZAP)
- [ ] **API integration tests**
- [ ] **Tesla command validation**
- [ ] **Failure scenarios** testing

---

## 🎯 **Implementation Timeline**

### Week 1-2: Foundation
- Tesla Developer account setup
- Domain purchase and SSL configuration
- Basic infrastructure deployment

### Week 3-4: Integration
- Tesla Fleet API integration
- Vehicle Command key enrollment
- Production environment setup

### Week 5-6: Security & Monitoring
- Security hardening
- Monitoring and alerting setup
- Load testing and optimization

### Week 7-8: Production Readiness
- Full integration testing
- Documentation and runbooks
- Go-live preparation

Bu roadmap'i takip ederek Tesla Fleet Rental API'nizi güvenli ve ölçeklenebilir bir şekilde production'a deploy edebilirsiniz! 🚀 