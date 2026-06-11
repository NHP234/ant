# NFC/RFID Integration (ESP32 + RC522)

> **Bonus feature:** Quẹt thẻ sinh viên + quẹt sách để mượn/trả nhanh tại quầy thư viện, ứng dụng IoT vào quản lý.

## Mục đích

Biến hệ thống thư viện thành một **Self-Service Kiosk** (Trạm tự phục vụ) chuẩn mực như các thư viện đại học hiện đại. 
Sinh viên tự mượn/trả sách mà không cần thủ thư can thiệp. Tăng tính thực tế và "demo effect" (hiệu ứng WOW) cho đồ án tốt nghiệp bằng cách tích hợp thiết bị IoT (ESP32). Kiosk sẽ xử lý các phiên giao dịch dựa trên quẹt thẻ và tự động kết thúc (timeout) hoặc bấm nút.

## Hardware

Thay vì dùng đầu đọc USB cắm trực tiếp vào máy tính, dự án sử dụng mô hình IoT:
- **Vi điều khiển**: ESP32 (có sẵn Wi-Fi, giá rẻ, dễ lập trình).
- **Module đọc thẻ**: RC522 (Module RFID 13.56MHz, giao tiếp SPI với ESP32, giá rất rẻ).
- **Thẻ sinh viên**: Thẻ nhựa RFID/NFC tần số 13.56MHz (Mifare Classic 1K) dùng làm thẻ định danh sinh viên.
- **Tag trên sách**: Tag RFID/NFC dạng sticker (Mifare 1K / NTAG215) dán lên bìa sách. (Demo khoảng 5-10 cuốn).

## Architecture (Kiến trúc kết nối)

Mô hình Client-Server qua Wi-Fi kết hợp màn hình Kiosk:

```
[Thẻ/Tag 13.56MHz] 
       | (RF)
       v
  [Module RC522] 
       | (SPI)
       v
    [ESP32] =====(Wi-Fi)====> REST API: POST /api/nfc/scan { "uid": "AA:BB:CC" }
                                      |
                                      v
                             [SpringBoot Backend]
                                      |
                                      | 1. Tra users.nfc_card_uid -> nếu tìm thấy -> trả user info
                                      | 2. Nếu không -> tra book_copies.nfc_tag_uid -> nếu tìm thấy -> trả copy info (kèm book info)
                                      | 3. Nếu không tìm thấy -> trả lỗi "UID chưa đăng ký"
                                      v
                    [WebSocket / SSE push event tới Frontend Kiosk]
                                      |
                                      v
         [Frontend React (Trang Kiosk công cộng) nhận event và cập nhật UI]
```

## Luồng nghiệp vụ Self-Service Kiosk (Business Flows)

Kiosk là một màn hình (tablet hoặc màn hình phụ) luôn mở ở trang `/kiosk` (không yêu cầu đăng nhập, hoặc dùng token KIOSK_ROLE riêng).

### Flow mượn sách tự động
1. Kiosk luôn ở màn hình chờ: "Vui lòng quẹt thẻ sinh viên để bắt đầu".
2. Sinh viên quẹt thẻ vào ESP32 -> Backend nhận diện được User và push event tới Kiosk.
3. Kiosk chuyển sang màn hình chứa profile sinh viên và 2 lựa chọn: **[Mượn Sách]** - **[Trả Sách]**.
4. Sinh viên bấm (hoặc chạm trên màn hình cảm ứng) vào nút **[Mượn Sách]**. Kiosk hiện: "Vui lòng quẹt lần lượt các sách bạn muốn mượn".
5. Sinh viên quẹt sách 1, sách 2 -> Kiosk nhận event từ Backend và liệt kê các sách lên màn hình.
6. Sinh viên bấm nút **[Hoàn Tất]** để xác nhận. Nếu timeout sau 30 giây không thao tác, Kiosk hủy phiên và quay về màn hình chờ.
7. Kiosk gửi một `POST /api/borrow-slips` với `source = NFC` và toàn bộ `{ bookId, copyId }` đã quét.
8. Backend tạo đúng một `borrow_slip` chứa nhiều `borrow_records` trong một transaction. Một cuốn lỗi thì toàn bộ giao dịch rollback.
9. Nếu API lỗi, Kiosk giữ danh sách đã quét để người dùng thử lại; thành công mới reset về màn hình chờ.

### Flow trả sách tự động
1. Tương tự, sau khi quẹt thẻ, sinh viên chọn **[Trả Sách]**.
2. Kiosk gọi API lấy danh sách những cuốn sách sinh viên đang mượn và hiển thị lên màn hình.
3. Sinh viên quẹt từng quyển sách -> Kiosk đánh dấu sách đó đã được nhận diện.
4. Bấm **[Hoàn Tất]** hoặc đợi **Timeout** -> Hệ thống cập nhật trạng thái `borrow_records` sang RETURNED và quay về màn hình chờ.

### Flow đăng ký thẻ/tag (Dành cho Admin/Librarian)
1. Kiosk chỉ dùng để mượn/trả. Việc gán thẻ vẫn làm trên giao diện Quản trị.
2. Admin/Librarian vào trang quản lý sách, mở danh sách bản sao và bấm **Gán tag** hoặc **Đổi tag** tại bản sao cần cấu hình.
3. Frontend mở SSE `/api/nfc/stream` và hiển thị trạng thái chờ quét.
4. Quẹt một tag chưa đăng ký vào RC522. ESP32 gửi UID tới `/api/nfc/scan`, backend broadcast event `UNKNOWN` về frontend.
5. Frontend hiển thị UID để thủ thư xác nhận, sau đó gọi `POST /api/nfc/register-book-copy` và cập nhật danh sách bản sao.
6. Nếu UID đã thuộc user hoặc bản sao khác, frontend cảnh báo và tiếp tục chờ một tag chưa đăng ký.

## Kế hoạch Triển khai Chi tiết

### Phase 1: Phần cứng & ESP32 Firmware
1. **Đấu nối dây (Wiring)**: 
   - RC522 <-> ESP32 (Dùng giao tiếp SPI: SDA, SCK, MOSI, MISO, IRQ, GND, RST, 3.3V).
2. **Lập trình ESP32 (Arduino IDE / PlatformIO)**:
   - Thư viện: `MFRC522` (đọc thẻ) và `WiFi`, `HTTPClient` (gửi request).
   - Logic: 
     - ESP32 kết nối Wi-Fi thư viện (hoặc LAN).
     - Vòng lặp liên tục quét thẻ. Nếu có thẻ mới, đọc UID (chuyển sang chuỗi Hex, ví dụ `04:A2:B3:C4`).
     - Gửi HTTP POST request đến `http://<SERVER_IP>:8080/api/nfc/scan` với payload JSON: `{"uid": "04:A2:B3:C4"}`.
     - Xử lý debounce: Tránh việc 1 thẻ quẹt gửi request liên tục (delay 2-3s sau mỗi lần đọc thành công).

### Cấu hình firmware cục bộ

Thông tin Wi-Fi, địa chỉ backend và API key không được lưu trong Git. Khi setup firmware lần đầu:

```powershell
Copy-Item include/secrets.example.h include/secrets.h
```

Sau đó sửa `include/secrets.h`:

```cpp
constexpr char WIFI_SSID[] = "YOUR_WIFI_SSID";
constexpr char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";
constexpr char API_URL[] = "http://YOUR_COMPUTER_LAN_IP:8080/api/nfc/scan";
constexpr char API_KEY[] = "YOUR_NFC_API_KEY";
```

`include/secrets.h` đã nằm trong `.gitignore`; chỉ `include/secrets.example.h` được commit làm template.

### Phase 2: Backend (Spring Boot)
1. **Database Schema**: 
   - Đảm bảo bảng `users` có cột `nfc_card_uid` (VARCHAR, UNIQUE, NULLABLE).
   - Đảm bảo bảng `book_copies` có cột `nfc_tag_uid` (VARCHAR, UNIQUE, NULLABLE).
2. **REST API**:
   - `POST /api/nfc/scan`: Endpoint nhận payload từ ESP32. Nhận `uid` và tìm kiếm trong `users` và `book_copies`. Trả về loại định danh (USER, BOOK_COPY, UNKNOWN).
     - *Lưu ý: Có thể dùng header `x-api-key` cố định cấu hình trên ESP32 và Backend để bảo mật endpoint này.*
   - `POST /api/nfc/register-user` và `POST /api/nfc/register-book-copy`: Dùng để gán UID vào Entity tương ứng khi setup hệ thống.
3. **Real-time Event Push (WebSocket / SSE)**:
   - Cấu hình Spring WebSocket hoặc Server-Sent Events (SSE). 
   - Khi có request hợp lệ tới `/api/nfc/scan`, Backend xử lý xong sẽ broadcast một event (VD: `NfcScanEvent`) xuống các client (Frontend của Librarian) đang subscribe.

### Phase 3: Frontend (React)
1. **Integration**: Connect tới WebSocket / SSE endpoint của Backend để lắng nghe `NfcScanEvent`.
2. **Giao diện Kiosk (`/kiosk`)**: 
   - Đây là trang full-screen, ẩn Navbar/Sidebar.
   - Quản lý state theo các step: `WAITING_FOR_USER` -> `SELECT_MODE` -> `SCANNING_BOOKS` -> `PROCESSING` -> `WAITING_FOR_USER`.
   - Có một bộ đếm ngược (timer) chạy ngầm (VD 30 giây) khi ở state `SELECT_MODE` hoặc `SCANNING_BOOKS`. Bất kỳ thao tác touch/quẹt thẻ nào cũng reset timer này. Hết timer thì tự động "Hoàn Tất" hoặc "Hủy" tùy logic.
   - Các nút to, rõ ràng, tối ưu cho thao tác chạm (touch-friendly).

## API Endpoints (Dự kiến)

### POST /api/nfc/scan
Endpoint này nhận request trực tiếp từ ESP32 qua Wi-Fi.

```json
// Request (từ ESP32)
{
  "uid": "04:A2:B3:C4:D5:E6"
}

// Response (nếu là User)
{
  "type": "USER",
  "data": {
    "id": 123,
    "fullName": "Nguyễn Văn A",
    "studentId": "20200001"
  }
}

// Response (nếu là Book Copy)
{
  "type": "BOOK_COPY",
  "data": {
    "copyId": 45,
    "bookId": 12,
    "copyNumber": 1,
    "title": "Clean Architecture",
    "status": "AVAILABLE"
  }
}
```

## Ưu tiên & Đánh giá
- Đây là tính năng **rất ăn điểm** (Wow factor) khi bảo vệ đồ án vì nó thể hiện sự kết hợp giữa Web Application và thiết bị phần cứng IoT.
- Giải pháp ESP32 + RC522 vượt trội hơn việc dùng đầu đọc USB (ACR122U) vì:
  - Giá thành rẻ hơn đáng kể.
  - ESP32 hoạt động độc lập qua mạng Wi-Fi, không cần cắm dây trực tiếp vào máy tính thủ thư.
  - Mang tính chất hệ thống phân tán (IoT Node -> API Gateway) chuẩn mực hơn so với chạy script Python cục bộ.
