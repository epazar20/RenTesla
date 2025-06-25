# Tesla Fleet Rental API

## Özellikler

- JWT ile kullanıcı yönetimi
- Redis ile token ve kiralama bilgisi saklama
- Tesla Fleet API entegrasyonu
- Kiralama süresi bazlı araç komut kontrolü
- APScheduler ile token yenileme görevleri

## Kurulum

1. Python 3.8+ yüklü olduğundan emin olun.
2. Sanal ortam oluşturun ve aktifleştirin:

   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   venv\Scripts\activate   # Windows
   ```

3. Bağımlılıkları yükleyin:

   ```bash
   pip install -r requirements.txt
   ```

4. `.env` dosyanızı oluşturun ve gerekli ortam değişkenlerini girin (`.env.example`'den kopyalayabilirsiniz).

5. Redis server çalışıyor olmalı.

6. Uygulamayı başlatın:

   ```bash
   python app.py
   ```

## API Endpoints

- `POST /login`  
  Kullanıcı giriş, access ve refresh token alır.

- `POST /refresh`  
  Refresh token ile yeni access token alır.

- `DELETE /logout`  
  Mevcut access token'ı iptal eder.

- `POST /rental/start`  
  Kiralama başlatır (vehicle_id ve duration istekte JSON olarak verilir).

- `POST /vehicle/command`  
  Kiralama süresi dolmamışsa araca komut gönderir.

---

## Notlar

- Bu temel bir örnektir, prodüksiyon için güvenlik ve hata kontrolü artırılmalıdır.
- Redis bağlantısı, Tesla API detayları, hata yönetimi genişletilebilir.
