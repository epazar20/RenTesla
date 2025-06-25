# Tesla Vehicle Command Key Enrollment - Detaylı Rehber

## 🔐 Ana Süreç Adımları

### 1️⃣ **Tesla Developer Account & Domain Setup**

#### A. Tesla Developer Portal
```bash
https://developer.tesla.com
```

**Hesap Açma Gereksinimleri:**
- Tesla hesabı (tesla.com)
- Valid email address
- Business bilgileri (opsiyonel)

#### B. Fleet API Application Registration
```
1. Developer Portal > "Applications" > "Create"
2. Application Name: "RenTesla"
3. Description: "Tesla vehicle rental management system"
4. Website URL: "https://rentesla.com" (örnek domain)
5. Redirect URI: "https://rentesla.com/auth/tesla/callback"
```

### 2️⃣ **Domain & Public Key Hosting**

#### A. Domain Gereksinimi
Tesla, public key'inizin tanımlanmış bir domain'de host edilmesini gerektirir.

**Required Domain Path:**
```
https://your-domain.com/.well-known/appspecific/com.tesla.3p.public-key.pem
```

#### B. Domain Setup Örneği
```bash
# Örnek domain structure:
rentesla.com/
├── .well-known/
│   └── appspecific/
│       └── com.tesla.3p.public-key.pem
├── index.html
└── auth/
    └── tesla/
        └── callback/
```

#### C. Public Key Upload
```bash
# Generated public key content:
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEr4C1ZZcDqr0/+0VKl8GV+GVtQ+GJ
xNkqKiX8nB5LVv0DqrTALGfAnEgN7WUtoGpuwQM9jHNjqe8m1XagQwNADQ==
-----END PUBLIC KEY-----

# Bu dosyayı domain'inizde host edin:
# https://rentesla.com/.well-known/appspecific/com.tesla.3p.public-key.pem
```

### 3️⃣ **Tesla Fleet API Partner Registration**

#### A. Partner Endpoint Registration
```bash
# Tesla Fleet API call:
POST https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts

# Request body:
{
  "domain": "rentesla.com",
  "ca_cert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
}
```

#### B. Public Key Registration
```bash
# Tesla Fleet API call:
POST https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts/{partner_account_id}/public_key

# Request body:
{
  "public_key": "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZI...\n-----END PUBLIC KEY-----",
  "domain": "rentesla.com"
}
```

### 4️⃣ **User Vehicle Key Enrollment**

#### A. Enrollment Link Creation
```bash
# Tesla enrollment link format:
https://tesla.com/_ak/<your_domain_name>

# Example:
https://tesla.com/_ak/rentesla.com
```

#### B. User Enrollment Process
1. **User taps enrollment link**
2. **Tesla Mobile App opens** (iOS/Android 4.27.3+)
3. **App shows domain name** ("rentesla.com")
4. **User approves key enrollment**
5. **Tesla App sends command to vehicle**
6. **Vehicle enrolls public key** (requires online + phone paired)

#### C. Vehicle Key Management
```bash
# User can see enrolled keys in vehicle:
Vehicle UI > Controls > Locks > "rentesla.com"
```

### 5️⃣ **OAuth Token Alma Süreci**

#### A. Authorization URL Generation
```python
# Flask authorization endpoint:
@app.route('/tesla/auth')
def tesla_auth():
    client_id = "your_tesla_client_id"
    redirect_uri = "https://rentesla.com/auth/tesla/callback"
    scope = "openid offline_access vehicle_device_data vehicle_commands"
    
    auth_url = f"https://auth.tesla.com/oauth2/v3/authorize?" \
               f"client_id={client_id}&" \
               f"redirect_uri={redirect_uri}&" \
               f"response_type=code&" \
               f"scope={scope}&" \
               f"state=random_state_string"
    
    return redirect(auth_url)
```

#### B. Token Exchange
```python
# Callback endpoint:
@app.route('/auth/tesla/callback')
def tesla_callback():
    code = request.args.get('code')
    
    token_data = {
        'grant_type': 'authorization_code',
        'client_id': 'your_tesla_client_id',
        'client_secret': 'your_tesla_client_secret',
        'code': code,
        'redirect_uri': 'https://rentesla.com/auth/tesla/callback'
    }
    
    response = requests.post('https://auth.tesla.com/oauth2/v3/token', data=token_data)
    tokens = response.json()
    
    # Store tokens securely
    access_token = tokens['access_token']
    refresh_token = tokens['refresh_token']
```

### 6️⃣ **Command Authentication Test**

#### A. System Keyring Key Test
```bash
# Test key from system keyring:
export TESLA_KEY_NAME=rentesla_dev
export TESLA_VIN=your_actual_vin
export TESLA_AUTH_TOKEN=your_oauth_token

./tesla-control -vin $TESLA_VIN honk
```

#### B. Internet vs Bluetooth
```bash
# Internet (Fleet API üzerinden):
./tesla-control -vin $TESLA_VIN -key-name rentesla_dev honk

# Bluetooth (doğrudan araç - rate limit yok):
./tesla-control -ble -vin $TESLA_VIN -key-name rentesla_dev honk
```

---

## ⚡ **Hızlı Test Setup (Development)**

### Development Environment için Geçici Çözüm

#### 1. Local Domain Simulation
```bash
# /etc/hosts dosyasına ekle:
127.0.0.1 dev.rentesla.local

# Local web server başlat:
mkdir -p public/.well-known/appspecific/
cp tesla_public_key.pem public/.well-known/appspecific/com.tesla.3p.public-key.pem
python3 -m http.server 8000 --directory public
```

#### 2. ngrok ile Public Exposure
```bash
# ngrok kurulumu:
brew install ngrok

# Public tunnel oluştur:
ngrok http 8000

# Örnek output:
# https://abc123.ngrok.io -> http://localhost:8000
```

#### 3. Test Domain ile Registration
```bash
# Geçici test için ngrok domain kullan:
https://abc123.ngrok.io/.well-known/appspecific/com.tesla.3p.public-key.pem
```

---

## 🔧 **RenTesla Backend Integration**

### OAuth Token Management

```python
# token_manager.py
class TeslaTokenManager:
    def __init__(self):
        self.client_id = os.getenv('TESLA_CLIENT_ID')
        self.client_secret = os.getenv('TESLA_CLIENT_SECRET')
    
    def exchange_code_for_tokens(self, auth_code):
        """Exchange authorization code for access/refresh tokens"""
        token_data = {
            'grant_type': 'authorization_code',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': auth_code,
            'redirect_uri': 'https://rentesla.com/auth/tesla/callback'
        }
        
        response = requests.post('https://auth.tesla.com/oauth2/v3/token', data=token_data)
        return response.json()
    
    def refresh_access_token(self, refresh_token):
        """Refresh expired access token"""
        token_data = {
            'grant_type': 'refresh_token',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'refresh_token': refresh_token
        }
        
        response = requests.post('https://auth.tesla.com/oauth2/v3/token', data=token_data)
        return response.json()
```

### Vehicle Command with OAuth

```python
# tesla_command_oauth.py
def execute_tesla_command_with_oauth(vehicle_vin, command, oauth_token):
    """Execute Tesla command using OAuth token and system keyring key"""
    
    # Store OAuth token in system keyring
    keyring_name = os.getenv('TESLA_TOKEN_NAME', 'rentesla_dev')
    keyring.set_password('tesla-auth', keyring_name, oauth_token)
    
    try:
        cmd_args = [
            './tesla-control',
            '-vin', vehicle_vin,
            '-key-name', os.getenv('TESLA_KEY_NAME', 'rentesla_dev'),
            '-token-name', keyring_name,
            command
        ]
        
        result = subprocess.run(cmd_args, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            return {
                "success": True,
                "output": result.stdout.strip(),
                "method": "fleet_api_oauth",
                "real_command": True
            }
        else:
            return {
                "success": False,
                "error": result.stderr.strip(),
                "method": "fleet_api_oauth"
            }
            
    except Exception as e:
        return {"success": False, "error": str(e)}
```

---

## 📋 **Checklist: Key Enrollment Completion**

### ✅ Required Steps:

- [ ] **Tesla Developer Account** oluşturuldu
- [ ] **Fleet API Application** kaydedildi
- [ ] **Domain satın alındı** ve SSL kuruldu
- [ ] **Public key** domain'de host edildi (/.well-known/appspecific/...)
- [ ] **Partner Account** Tesla'ya kaydedildi
- [ ] **Public Key** Fleet API'ye register edildi
- [ ] **User enrollment link** oluşturuldu
- [ ] **Tesla Mobile App** ile key enrollment yapıldı
- [ ] **OAuth credentials** alındı
- [ ] **Access token** test edildi
- [ ] **Real vehicle command** çalıştırıldı

### ⚠️ Common Issues:

1. **"could not load token"** → System keyring problemi
2. **"unauthorized"** → OAuth token expired/invalid
3. **"key not enrolled"** → Vehicle'da key enrollment yapılmamış
4. **"vehicle offline"** → Araç uyku modunda veya offline

---

## 🎯 **Next Steps for RenTesla**

### 1. Domain & Hosting Setup
```bash
# Öncelik: Production domain alın
# rentesla.com, teslarent.com, etc.
```

### 2. Tesla Developer Registration
```bash
# developer.tesla.com'da hesap açın
# Fleet API access için başvuru yapın
```

### 3. Test Vehicle Enrollment
```bash
# Test aracınızda key enrollment yapın
# https://tesla.com/_ak/your-domain.com
```

### 4. Production Integration
```bash
# OAuth flow'u backend'e ekleyin
# Token management sistemi kurun
# Real command testing yapın
```

Bu adımları tamamladığınızda, RenTesla sisteminiz gerçek Tesla Vehicle Command'ları çalıştırabilecek! 