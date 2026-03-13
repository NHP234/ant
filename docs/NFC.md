# NFC Integration

> Bonus feature: Quẹt thẻ sinh viên + quẹt sách để mượn/trả nhanh tại quầy thư viện.

## Mục đích

Thủ thư thao tác trên hệ thống, sinh viên chỉ cần đưa thẻ và sách ra quẹt. Không cần sinh viên đăng nhập hay chạm máy tính.

## Hardware

- **NFC Reader**: ACR122U USB NFC Reader (~300-500k VND trên Shopee/Lazada), cắm USB vào máy tính quầy thủ thư
- **Thẻ sinh viên**: Dùng luôn thẻ sinh viên nếu có NFC, hoặc phát thẻ NFC riêng (NTAG215 / Mifare Classic 1K, ~5-10k/thẻ)
- **NFC Tag trên sách**: Dán tag NTAG215 lên bìa sau mỗi cuốn sách (~5-10k/tag, demo chỉ cần 5-10 cuốn)

## Flow mượn sách

```
1. Thủ thư đăng nhập hệ thống (role LIBRARIAN), bấm "Phiên mượn mới"
2. Sinh viên đưa thẻ -> thủ thư quẹt thẻ sinh viên vào đầu đọc
   -> Hệ thống nhận UID -> tra bảng users (nfc_card_uid) -> hiện thông tin sinh viên
3. Quẹt sách 1 vào đầu đọc
   -> Hệ thống nhận UID -> tra bảng books (nfc_tag_uid) -> thêm sách vào danh sách mượn
4. Quẹt sách 2 -> thêm sách nữa
5. Thủ thư bấm "Xác nhận mượn" -> hệ thống tạo borrow_records cho tất cả sách
```

## Flow trả sách

```
1. Thủ thư bấm "Phiên trả sách"
2. Quẹt thẻ sinh viên -> hiện danh sách sách đang mượn
3. Quẹt sách trả -> sách đó được tick/chọn trong danh sách
4. Thủ thư bấm "Xác nhận trả" -> cập nhật borrow_records
```

## Flow đăng ký thẻ cho sinh viên

```
1. Admin/Librarian vào trang quản lý users
2. Chọn sinh viên cần gán thẻ
3. Bấm "Đăng ký thẻ NFC" -> quẹt thẻ mới -> lưu UID vào users.nfc_card_uid
```

## Flow đăng ký NFC tag cho sách

```
1. Admin/Librarian vào trang quản lý sách
2. Chọn sách cần gán tag
3. Bấm "Gán NFC tag" -> quẹt tag -> lưu UID vào books.nfc_tag_uid
```

## Architecture

```
[NFC Reader USB] -> [Python NFC Script (pyscard)]
                        |
                        | REST call: POST /api/nfc/scan { uid: "AA:BB:CC" }
                        v
                    [SpringBoot Backend]
                        |
                        | 1. Tra users.nfc_card_uid -> nếu tìm thấy -> trả user info
                        | 2. Nếu không -> tra books.nfc_tag_uid -> nếu tìm thấy -> trả book info
                        | 3. Nếu không tìm thấy ở cả 2 -> trả lỗi "UID chưa đăng ký"
                        v
                    [WebSocket push event tới Frontend]
                        |
                        v
                    [Frontend cập nhật UI real-time]
```

## Database

- `users.nfc_card_uid` (VARCHAR(50), UNIQUE, NULLABLE): UID thẻ sinh viên
- `books.nfc_tag_uid` (VARCHAR(50), UNIQUE, NULLABLE): UID tag NFC dán trên sách

## API Endpoints

### POST /api/nfc/scan
Endpoint chính - nhận UID từ NFC reader, tự phân biệt thẻ sinh viên hay sách.
```json
// Request
{ "uid": "04:A2:B3:C4:D5:E6:F7" }

// Response (nếu là sinh viên)
{
  "type": "USER",
  "data": {
    "userId": 123,
    "fullName": "Nguyen Van A",
    "studentId": "20200001",
    "currentBorrowCount": 3
  }
}

// Response (nếu là sách)
{
  "type": "BOOK",
  "data": {
    "bookId": 45,
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "available": true
  }
}

// Response (UID chưa đăng ký)
{ "type": "UNKNOWN", "data": null }
```

### POST /api/nfc/register-card
```json
// Gán thẻ NFC cho sinh viên
{ "userId": 123, "nfcCardUid": "04:A2:B3:C4:D5:E6:F7" }
```

### POST /api/nfc/register-tag
```json
// Gán NFC tag cho sách
{ "bookId": 45, "nfcTagUid": "08:C3:D4:E5:F6:A7:B8" }
```

### DELETE /api/nfc/unregister-card/{userId}
Gỡ thẻ NFC khỏi sinh viên.

### DELETE /api/nfc/unregister-tag/{bookId}
Gỡ NFC tag khỏi sách.

## Implementation - Python NFC Script

```python
# Pseudo-code
import requests
from smartcard.System import readers
from smartcard.CardMonitoring import CardMonitor, CardObserver

API_URL = "http://localhost:8080/api"
API_TOKEN = "..." # JWT của librarian đang đăng nhập

class NFCObserver(CardObserver):
    def update(self, observable, actions):
        added, removed = actions
        for card in added:
            uid = self.read_uid(card)
            response = requests.post(
                f"{API_URL}/nfc/scan",
                json={"uid": uid},
                headers={"Authorization": f"Bearer {API_TOKEN}"}
            )
            print(response.json())

monitor = CardMonitor()
observer = NFCObserver()
monitor.addObserver(observer)
# Script chạy liên tục, tự detect khi có thẻ/tag mới quẹt
```

## Frontend - Trang "Phiên mượn/trả"

Trang này dành cho thủ thư, giao diện đơn giản:
- **Trạng thái**: "Chờ quẹt thẻ sinh viên..." -> "Đã nhận diện: Nguyễn Văn A" -> "Chờ quẹt sách..."
- **Danh sách sách**: Hiện các sách đã quẹt, có nút xóa nếu quẹt nhầm
- **Nút xác nhận**: "Xác nhận mượn" / "Xác nhận trả"
- Frontend nhận event từ backend qua WebSocket (hoặc SSE) khi có NFC scan mới

## Ưu tiên

NFC là **bonus feature**, chỉ làm khi backend + frontend + RAG đã hoàn thành.
Nếu thiếu thời gian hoặc chưa có hardware:
- Có thể demo bằng cách nhập UID thủ công trên giao diện web
- Dùng NFC trên điện thoại Android (NFC Tools app) để đọc UID rồi nhập tay

## Status: chưa bắt đầu
