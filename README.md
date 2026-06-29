# Hướng dẫn Cài đặt & Vận hành Hệ thống Quản lý Thư viện Thông minh (Awaken Ant)

Hệ thống tích hợp đầy đủ các dịch vụ: **Backend Spring Boot 4.0.3**, **Frontend Vite/React**, **RAG AI Chatbot (FastAPI + ChromaDB)**, và **Đầu đọc NFC phần cứng (ESP32 + RC522)**.

Tài liệu này hướng dẫn chi tiết cách cài đặt, cấu hình và khởi chạy toàn bộ hệ thống trên cả môi trường cục bộ (Local) và máy chủ sản xuất (Production VPS).

---

## 📋 Yêu cầu Hệ thống (Prerequisites)

### 1. Phần mềm:
* **Docker & Docker Compose** (Khuyên dùng để triển khai nhanh)
* **Java 21 JDK** & **Maven 3.9+** (Nếu muốn chạy hoặc debug Backend thủ công)
* **Node.js v22+** & **npm** (Nếu muốn chạy hoặc debug Frontend thủ công)
* **Python 3.10 / 3.11** (Nếu muốn chạy hoặc debug RAG AI Service thủ công)
* **VS Code** cài extension **PlatformIO IDE** (Để nạp code cho vi điều khiển ESP32)

### 2. Thiết bị phần cứng (Kiosk NFC):
* 01 Mạch vi điều khiển **ESP32 NodeMCU** (WiFi enabled)
* 01 Đầu đọc thẻ **MFRC522 RFID/NFC Reader**
* Dây cắm Breadboard (Dupont lines) để đấu nối
* Thẻ hoặc nhãn dán NFC chuẩn **Mifare Classic 1K** hoặc **Mifare Ultralight**

---

## 🚀 Cách 1: Triển khai nhanh bằng Docker Compose (Khuyên dùng)

Đây là cách nhanh nhất để khởi chạy toàn bộ stack dịch vụ bao gồm PostgreSQL, Redis, Spring Boot Backend, Vite Frontend, FastAPI RAG Service và ChromaDB.

### Bước 1: Chuẩn bị biến môi trường
Sao chép tệp cấu hình ví dụ tại thư mục gốc:
```powershell
cp .env.example .env
```
Mở tệp `.env` vừa tạo và điền các khóa API cần thiết (đặc biệt là `DEEPSEEK_API_KEY` cho Chatbot RAG):
```env
# Database & Redis Config
POSTGRES_DB=library_db
POSTGRES_USER=library_user
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key

# RAG Chatbot Service
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-v4-flash

# API Security Keys (Giữa Kiosk ESP32 và Backend)
INTERNAL_API_KEY=ee28583a1306c165a18184b14a3a47a95c4c3d7caa90c7a0110b7d40de2b22c6
NFC_API_KEY=4e7ef12c516bbd79fd5cff9c17f92ace6c7a566fb6b2d216
```

### Bước 2: Khởi chạy các dịch vụ Docker
Chạy lệnh khởi tạo và tải ảnh container trong thư mục gốc:
```powershell
docker compose up -d --build
```
Lệnh này sẽ khởi chạy 5 container:
1. `library-postgres`: PostgreSQL cơ sở dữ liệu chính (Port `5432` nội bộ)
2. `library-redis`: Redis làm bộ đệm cache & khóa phân tán (Port `6379` nội bộ)
3. `library-backend`: Spring Boot REST API (Port `8080`)
4. `library-frontend`: Web client chạy qua Nginx (Port `80` hoặc `5173` theo cấu hình mapping)
5. `library-rag`: AI Chatbot Service chạy FastAPI (Port `8000`)

Kiểm tra trạng thái các container:
```powershell
docker compose ps
```

### Bước 3: Nạp dữ liệu mẫu (Seeding Demo Data)
Để có sẵn tài khoản thủ thư, sinh viên, sách và các phiếu mượn giả lập phục vụ chạy thử/bảo vệ đồ án, hãy chạy script Python sau:
1. Tạo môi trường ảo và cài dependencies:
   ```powershell
   cd scripts
   python -m venv venv
   .\venv\Scripts\activate
   pip install requests
   ```
2. Thực thi script seed dữ liệu (Tự động gọi API backend):
   ```powershell
   python seed_demo_users_and_holds.py
   ```

---

## 🛠️ Cách 2: Hướng dẫn chạy thủ công từng cấu phần (Phục vụ Development)

Nếu bạn cần sửa đổi code và muốn chạy debug trực tiếp từng dịch vụ không qua Docker:

### 1. Cơ sở dữ liệu & Caching:
Khởi chạy PostgreSQL và Redis độc lập (hoặc tận dụng container DB có sẵn bằng cách chỉ chạy `docker compose up -d postgres redis`).

### 2. Khởi chạy Backend (Java Spring Boot):
1. Đảm bảo file cấu hình cục bộ [backend/src/main/resources/application.yml](file:///d:/ant/backend/src/main/resources/application.yml) đã khớp với thông tin kết nối DB.
2. Di chuyển vào thư mục backend và khởi chạy:
   ```powershell
   cd backend
   ./mvnw spring-boot:run
   ```
   * *Backend API sẽ khả dụng tại: `http://localhost:8080`*

### 3. Khởi chạy Frontend (Vite + React):
1. Khởi tạo và cài đặt các gói thư viện:
   ```powershell
   cd frontend
   npm install
   ```
2. Chạy máy chủ phát triển cục bộ:
   ```powershell
   npm run dev
   ```
   * *Giao diện Web sẽ khả dụng tại: `http://localhost:5173`*

### 4. Khởi chạy RAG AI Service (FastAPI):
1. Thiết lập môi trường và cài đặt thư viện:
   ```powershell
   cd rag-service
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Khởi chạy FastAPI server:
   ```powershell
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   * *Tài liệu API Swagger khả dụng tại: `http://localhost:8000/docs`*

---

## 📟 3. Đấu nối & Cài đặt phần cứng NFC (ESP32 Kiosk)

Vi điều khiển ESP32 đóng vai trò đầu đọc thẻ tại trạm Kiosk tự phục vụ, giao tiếp với thẻ sinh viên và thẻ sách qua sóng radio NFC.

### 1. Sơ đồ đấu nối dây (Wiring):

Đấu nối mạch **ESP32 NodeMCU** với mạch **RC522 RFID Reader** theo sơ đồ chân sau:

| RC522 Reader Pin | ESP32 GPIO Pin | Mô tả chức năng |
| :--- | :--- | :--- |
| **SDA (SS)** | **GPIO 5** | SPI Slave Select |
| **SCK** | **GPIO 18** | SPI Clock |
| **MOSI** | **GPIO 23** | SPI Master Out Slave In |
| **MISO** | **GPIO 19** | SPI Master In Slave Out |
| **IRQ** | *Không nối* | Interrupt Request |
| **GND** | **GND** | Ground |
| **RST** | **GPIO 22** | Reset Pin |
| **3.3V** | **3.3V** | Nguồn điện (Không nối vào chân 5V gây cháy cảm biến) |

### 2. Cấu hình & Nạp code cho ESP32:
1. Mở thư mục [nfc-firmware/](file:///d:/ant/nfc-firmware/) bằng VS Code (đã cài đặt PlatformIO).
2. Sao chép và tạo tệp cấu hình bí mật:
   ```powershell
   cd nfc-firmware/include
   cp secrets.example.h secrets.h
   ```
3. Mở tệp `secrets.h` và cấu hình các thông số Wi-Fi và API endpoint:
   * `WIFI_SSID`: Tên Wi-Fi phát từ điện thoại (4G) hoặc router của bạn.
   * `WIFI_PASSWORD`: Mật khẩu Wi-Fi.
   * `API_URL`: Nhập URL API của máy local (`http://IP_CUA_MAY_TINH:8080/api/nfc/scan`) hoặc tên miền máy chủ VPS (`https://awakenant.app/api/nfc/scan`).
   * `API_KEY`: API Key bảo mật NFC (khớp với `NFC_API_KEY` trong file cấu hình `.env` của backend).
4. Kết nối mạch ESP32 vào máy tính qua cáp MicroUSB/TypeC.
5. Nhấn biểu tượng **PlatformIO** ở thanh công cụ bên trái $\rightarrow$ chọn **Upload** để biên dịch và nạp chương trình vào mạch.

---

## 🌐 4. Triển khai sản xuất trên VPS (DigitalOcean Production)

Hệ thống được cấu hình sẵn sàng chạy Production trên VPS Ubuntu sử dụng Caddy làm Web Server phân giải tên miền và cấp chứng chỉ bảo mật SSL tự động.

1. Kết nối SSH vào VPS và clone mã nguồn:
   ```bash
   git clone <your-repo-url> awaken-ant
   cd awaken-ant
   ```
2. Cấu hình tệp môi trường production:
   ```bash
   cp .env.production.example .env.production
   nano .env.production # Cấu hình APP_DOMAIN=yourdomain.com và các thông tin bảo mật
   ```
3. Khởi chạy toàn bộ hệ thống production:
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   ```
   * Caddy Server sẽ tự động trỏ cổng `80/443`, yêu cầu chứng chỉ HTTPS miễn phí từ Let's Encrypt dựa trên biến `APP_DOMAIN` bạn đã khai báo.
