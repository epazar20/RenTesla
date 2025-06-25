# 🚗 Tesla Vehicle Test Guide - Real Vehicle Commands

## 📋 **Adım 1: Tesla Vehicle Enrollment**

### **Vehicle Enrollment (ÖNEMLİ!)**

Tesla aracınızı rentesla.xyz domain'ine enroll etmeniz gerekiyor:

1. **Tarayıcıda şu URL'yi açın:**
   ```
   https://tesla.com/_ak/rentesla.xyz
   ```

2. **Tesla hesabınızla giriş yapın**
   - Tesla.com credentials kullanın
   - MFA varsa tamamlayın

3. **Third-party app access'i approve edin**
   - Araç(lar)ınızı seçin
   - "Allow" butonuna tıklayın
   - rentesla.xyz domain'ini authorize edin

4. **Add Key işlemini tamamlayın**
   - "Add Key" butonuna tıklayın
   - rentesla.xyz domain'i onaylayın

---

## 🧪 **Adım 2: Curl ile Test**

### **Test Script Çalıştırma**

```bash
# Script'i çalıştır
chmod +x tesla_real_vehicle_test.sh
./tesla_real_vehicle_test.sh
```

### **Manuel Curl Komutları**

**1. Tesla Token Alma:**
```bash
curl -X POST https://auth.tesla.com/oauth2/v3/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "1dbbfed2-ad60-4d78-946a-bac7fab420a8",
    "client_secret": "ta-secret.7CPosOop%gZtZ%5e",
    "scope": "openid email offline_access"
  }'
```

**2. Vehicle List Alma:**
```bash
# TOKEN değişkenini yukarıdaki response'dan alın
curl -H "Authorization: Bearer $TOKEN" \
  https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles
```

**3. Vehicle Wake Up:**
```bash
# VEHICLE_ID değişkenini vehicle list'ten alın
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/$VEHICLE_ID/wake_up
```

**4. Horn Command:**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/$VEHICLE_ID/command/honk_horn
```

---

## 📮 **Adım 3: Postman Collection**

### **Import Collection**

1. **Postman'i açın**
2. **Import butonuna tıklayın**
3. **File tab'ini seçin**
4. **`Tesla_Fleet_API_Collection.json` dosyasını seçin**

### **Collection Variables**

Collection import edildikten sonra şu variables otomatik set edilecek:

```json
{
  "tesla_client_id": "1dbbfed2-ad60-4d78-946a-bac7fab420a8",
  "tesla_client_secret": "ta-secret.7CPosOop%gZtZ%5e",
  "base_url": "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1",
  "rental_api_url": "https://rentesla.xyz"
}
```

### **Test Sequence**

**Sequential olarak çalıştırın:**

1. **🔑 Get Tesla Fleet API Token**
   - Tesla credentials ile token alır
   - Token otomatik olarak `tesla_token` variable'a kaydedilir

2. **🚙 Get Vehicle List**
   - Enrolled vehicle'ları listeler
   - İlk vehicle'ın ID'si otomatik olarak `vehicle_id` variable'a kaydedilir

3. **⏰ Wake Up Vehicle**
   - Vehicle'ı uyandırır (komut göndermeden önce gerekli)

4. **🔍 Check Vehicle State**
   - Vehicle'ın current state'ini kontrol eder

5. **📯 Send Horn Command**
   - **ASIL TEST: Aracınızın kornası çalacak!**

### **Additional Commands**

Collection'da aşağıdaki ekstra komutlar da mevcut:
- 🔓 Unlock Doors
- 🔒 Lock Doors  
- 🌡️ Start Climate Control
- ❄️ Stop Climate Control
- 🚪 Open Frunk

---

## 🏢 **Adım 4: Rental API üzerinden Test**

### **Rental API Flow**

1. **🔑 Login to Rental API**
   - Rental API'ye giriş
   - JWT token alır

2. **🚗 Start Rental**
   - Vehicle için rental session başlatır
   - 60 dakika duration

3. **📯 Send Horn via Rental API**
   - Rental API üzerinden horn command
   - Rental validation ile

---

## 🔍 **Expected Responses**

### **Successful Horn Command Response:**
```json
{
  "response": {
    "reason": "",
    "result": true
  }
}
```

### **Failed Command Response:**
```json
{
  "response": {
    "reason": "vehicle_unavailable",
    "result": false
  }
}
```

### **Vehicle Not Enrolled:**
```json
{
  "response": [],
  "count": 0,
  "pagination": null
}
```

---

## ❗ **Troubleshooting**

### **"No vehicles found"**
- Vehicle enrollment yapmadınız
- https://tesla.com/_ak/rentesla.xyz adresinden enrollment yapın

### **"Vehicle unavailable"**
- Araç sleep mode'da
- Wake up komutunu çalıştırın
- 10-15 saniye bekleyin

### **"Authentication failed"**
- Tesla token expired
- Yeni token alın (15 dakika geçerli)

### **"Command failed"**
- Vehicle network bağlantısını kontrol edin
- Araç garage'da ise mobil sinyal zayıf olabilir

---

## 🎯 **Success Criteria**

✅ **Enrollment başarılı:**
- Vehicle list'te araç görünür
- Vehicle state "online" veya "asleep"

✅ **Wake up başarılı:**
- Wake up response `result: true`
- Vehicle state "online" olur

✅ **Horn command başarılı:**
- Response `result: true`
- **Aracınızın kornası çalar!**

---

## 🔐 **Security Notes**

- Tesla credentials production credentials
- Test sonrası tokens expire olur
- Real vehicle commands gerçek etki yapar
- Test'i güvenli bir yerde yapın (garage, açık alan)

---

## 📞 **Support**

Bu test sırasında sorun yaşarsanız:

1. **Vehicle enrollment'ı kontrol edin**
2. **Network connectivity'yi kontrol edin**  
3. **Tesla app'te vehicle'ın online olduğunu kontrol edin**
4. **Logs'ları inceleyin**

**Test başarılı olursa, Tesla Fleet Rental API production'a hazır! 🎉** 