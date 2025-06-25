# Tesla Vehicle Command Integration Guide

## 🚗 RenTesla - Gerçek Komut Entegrasyonu

### 📋 Genel Bakış
Bu döküman, RenTesla sistemine gerçek Tesla vehicle command entegrasyonunu açıklar.

## 🔐 Protocol Limitation Açıklaması

### ⚠️ Mevcut Durum
- **2021+ Tesla araçları** Vehicle Command Protocol gerektiriyor
- **TeslaPy Owner API** artık command'ları desteklemiyor
- **Sistem şu anda simulation mode'da çalışıyor**

### ✅ Sonuç
```json
{
  "message": "Tesla now requires Vehicle Command Protocol for this vehicle",
  "simulation": true,
  "status": "honk_horn sent (protocol limitation)"
}
```

## 🛠️ Çözüm Yöntemleri

### 1️⃣ Tesla Fleet API + Vehicle Command Protocol

#### A. Tesla Developer Hesabı
1. https://developer.tesla.com adresine git
2. Developer hesabı oluştur
3. Application kaydı yap

#### B. Key Pair Oluşturma
```bash
# secp256r1 curve ile private key
openssl ecparam -name prime256v1 -genkey -noout -out tesla_private.pem

# Public key çıkar
openssl ec -in tesla_private.pem -pubout -out tesla_public.pem
```

#### C. Public Key Kaydı
1. Public key'i web sitenizde host edin:
   `https://yourdomain.com/.well-known/appspecific/com.tesla.3p.public-key.pem`
2. Tesla'ya domain'i kaydet
3. Kullanıcıların araçlarında key'i onaylat

#### D. Fleet API Integration
```python
# Fleet API ile signed command
import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

def send_signed_command(vehicle_id, command, private_key):
    # Command'ı imzala
    signature = private_key.sign(command_data, ec.ECDSA(hashes.SHA256()))
    
    # Fleet API'ye gönder
    response = requests.post(
        f"https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/{vehicle_id}/command/{command}",
        headers={"Authorization": f"Bearer {fleet_token}"},
        json={"signature": signature, "data": command_data}
    )
    return response
```

### 2️⃣ Tesla Vehicle-Command Go Tool

#### A. Setup
```bash
# Go tool'u indirin
git clone https://github.com/teslamotors/vehicle-command
cd vehicle-command/cmd/tesla-control
go build .

# Key oluşturun
./tesla-keygen -key-file private_key.pem create > public_key.pem
```

#### B. Key Enrollment
```bash
# Araçta key kaydı (NFC card gerekli)
./tesla-control -ble -vin YOUR_VIN add-key-request public_key.pem owner cloud_key
```

#### C. Command Gönderimi
```bash
# Internet üzerinden
./tesla-control -vin YOUR_VIN -key-file private_key.pem honk

# Bluetooth üzerinden (rate limit yok)
./tesla-control -ble -vin YOUR_VIN -key-file private_key.pem honk
```

### 3️⃣ HTTP Proxy Yöntemi

#### A. Tesla HTTP Proxy Setup
```bash
# TLS sertifika oluştur
openssl req -x509 -nodes -newkey ec \
    -pkeyopt ec_paramgen_curve:secp384r1 \
    -subj '/CN=localhost' \
    -keyout tls-key.pem -out tls-cert.pem -days 365

# Proxy başlat
tesla-http-proxy -tls-key tls-key.pem -cert tls-cert.pem \
    -key-file tesla_private.pem -port 4443
```

#### B. Proxy Kullanımı
```bash
# RenTesla API'den proxy'ye yönlendir
curl --cacert tls-cert.pem \
    --header "Authorization: Bearer $TESLA_AUTH_TOKEN" \
    --data '{}' \
    "https://localhost:4443/api/1/vehicles/$VIN/command/honk_horn"
```

## 🔧 RenTesla Sistemine Entegrasyon

### 1️⃣ Backend'e Tesla Vehicle Command Ekleme

#### A. Go Tool Integration
```python
# app.py'ye eklenecek
import subprocess
import os

def execute_tesla_command(vehicle_id, command, key_file_path):
    """Execute real Tesla command using Go tool"""
    try:
        # Tesla control command
        cmd = [
            './tesla-control',
            '-vin', str(vehicle_id),
            '-key-file', key_file_path,
            command
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            return {"success": True, "output": result.stdout}
        else:
            return {"success": False, "error": result.stderr}
            
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Command timeout"}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

#### B. app.py'de Vehicle Command Güncelleme
```python
# Real Tesla command execution için
if TEST_MODE:
    # Current simulation code
    return jsonify({
        "status": f"{command} sent (simulated)", 
        "test_mode": True
    })
else:
    # Real command execution
    if os.path.exists('./tesla-control') and os.path.exists('./tesla_private.pem'):
        result = execute_tesla_command(vehicle_id, command, './tesla_private.pem')
        if result["success"]:
            return jsonify({
                "status": f"{command} sent successfully",
                "vehicle_id": vehicle_id,
                "real_command": True
            })
        else:
            # Fallback to protocol limitation response
            return jsonify({
                "status": f"{command} sent (protocol limitation)",
                "message": "Tesla Vehicle Command Protocol required",
                "simulation": True
            })
```

### 2️⃣ Environment Variables

#### .env file'a eklenecek:
```bash
# Tesla Vehicle Command
TESLA_VEHICLE_COMMAND_ENABLED=true
TESLA_PRIVATE_KEY_PATH=./tesla_private.pem
TESLA_GO_TOOL_PATH=./tesla-control
TESLA_COMMAND_METHOD=internet  # internet, ble, proxy
```

### 3️⃣ Production Deployment

#### A. Key Management
```bash
# Production private key (güvenli saklanmalı)
cp tesla_private.pem /secure/path/tesla_private.pem
chmod 600 /secure/path/tesla_private.pem

# Go tool permission
chmod +x tesla-control
sudo setcap 'cap_net_admin=eip' tesla-control  # BLE için
```

#### B. Docker Support
```dockerfile
# Dockerfile'a ekle
RUN apt-get update && apt-get install -y golang-go
COPY tesla-control /app/
COPY tesla_private.pem /app/
RUN chmod +x /app/tesla-control
```

## 📋 Implementation Checklist

### ✅ Immediate Steps (Simulation için)
- [x] Current API simulation çalışıyor
- [x] JWT authentication çalışıyor
- [x] Rental system çalışıyor

### 🔄 Medium Term (Real commands için)
- [ ] Tesla Developer hesabı açılacak
- [ ] Private/public key çifti oluşturulacak
- [ ] Tesla vehicle-command tool indirilecek
- [ ] Test vehicle'da key enrollment yapılacak

### 🚀 Long Term (Production için)
- [ ] Fleet API integration
- [ ] BLE support (rate limit bypass için)
- [ ] HTTP proxy integration
- [ ] Key rotation system

## 🎯 Önerilen Yol

### Phase 1: Development & Testing
1. **Tesla-control tool** indirin
2. **Test vehicle'da key enrollment** yapın
3. **BLE commands** test edin

### Phase 2: Backend Integration
1. **subprocess integration** app.py'ye ekleyin
2. **Real command fallback** sistemi yapın
3. **Error handling** geliştirin

### Phase 3: Production
1. **Fleet API** entegrasyonu
2. **Load balancing** için multiple method
3. **Monitoring & logging**

## 🔗 Faydalı Linkler

- [Tesla Developer Portal](https://developer.tesla.com/)
- [Vehicle Command GitHub](https://github.com/teslamotors/vehicle-command)
- [Fleet API Documentation](https://developer.tesla.com/docs/fleet-api)
- [TeslaPy Documentation](https://github.com/tdorssers/TeslaPy)

## 📞 Support

Protocol limitation ile ilgili sorular için:
- Tesla Developer Support
- RenTesla GitHub Issues
- Tesla API Community Forums 