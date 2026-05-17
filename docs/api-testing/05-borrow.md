# 5. Hold & Borrow APIs

> **Pre-requisite**: Có ít nhất 1 STUDENT account và 1 ADMIN/LIBRARIAN account. Có books trong DB.

### 5.1 Đặt mượn (STUDENT)

**Login STUDENT trước:**
```
POST {{base_url}}/auth/login
{
  "username": "student01",
  "password": "Pass@123"
}
```
Copy accessToken -> variable `student_token`

**Đặt mượn:**
```
POST {{base_url}}/holds
Authorization: Bearer {{student_token}}
{
  "bookId": 1
}
```
**Expected**: 201 Created
```json
{
  "success": true,
  "data": {
    "id": 1,
    "bookId": 1,
    "bookTitle": "Clean Code",
    "copyId": 101,
    "status": "ACTIVE",
    "reservedAt": "2026-05-17T10:00:00",
    "expiresAt": "2026-05-18T10:00:00"
  },
  "message": "Hold created successfully"
}
```

### 5.2 Đặt mượn - Validation Cases

**TC1: Book không tồn tại**
```
POST {{base_url}}/holds
Authorization: Bearer {{student_token}}
{ "bookId": 9999 }
```
**Expected**: 404 - `RESOURCE_NOT_FOUND`

**TC2: Đặt trùng cùng sách**
```
POST {{base_url}}/holds
Authorization: Bearer {{student_token}}
{ "bookId": 1 }
```
**Expected**: 400 - "You already have an active hold for this book"

**TC3: Vượt giới hạn (5 cuốn: hold + borrow)**
Tạo đủ 5 hold/borrow, rồi thử thêm:
```
POST {{base_url}}/holds
Authorization: Bearer {{student_token}}
{ "bookId": 6 }
```
**Expected**: 400 - `BORROW_LIMIT_EXCEEDED`

**TC4: Hết copy AVAILABLE**
Khi tất cả copies đã BORROWED/RESERVED:
**Expected**: 400 - `BOOK_NOT_AVAILABLE`

**TC5: Không có token**
```
POST {{base_url}}/holds
(no Authorization header)
{ "bookId": 1 }
```
**Expected**: 401/403

### 5.3 Xác nhận mượn từ hold (ADMIN/LIBRARIAN)

**Login ADMIN/LIBRARIAN:**
```
POST {{base_url}}/auth/login
{
  "username": "admin",
  "password": "Admin@123"
}
```
Copy accessToken -> variable `admin_token`

**Xác nhận (không truyền copyId):**
```
PUT {{base_url}}/holds/1/confirm
Authorization: Bearer {{admin_token}}
```
**Expected**: 200 OK, hold status = FULFILLED, tạo borrow record

**Xác nhận (quẹt NFC, đổi copy cùng đầu sách):**
```
PUT {{base_url}}/holds/1/confirm
Authorization: Bearer {{admin_token}}
{ "copyId": 123 }
```
**Expected**: 200 OK, copyId cập nhật sang 123

### 5.4 Mượn trực tiếp tại quầy (không cần hold)

```
POST {{base_url}}/borrows
Authorization: Bearer {{admin_token}}
{
  "bookId": 1,
  "username": "student01"
}
```
**Expected**: 201 Created, tạo borrow record ngay.

> Có thể dùng `studentId` thay cho `username`. Nếu quẹt NFC, truyền thêm `copyId`.

### 5.5 Trả sách (ADMIN/LIBRARIAN)

```
PUT {{base_url}}/borrows/1/return?note=Sách còn tốt
Authorization: Bearer {{admin_token}}
```
**Expected**: 200 OK, status = RETURNED

### 5.6 Xem lịch sử mượn (STUDENT)

```
GET {{base_url}}/borrows/my
Authorization: Bearer {{student_token}}
```
**Expected**: 200 OK, paginated borrow records

### 5.7 Xem tất cả borrows (ADMIN/LIBRARIAN)

```
GET {{base_url}}/borrows
Authorization: Bearer {{admin_token}}
```
**Expected**: 200 OK

### 5.8 Xem sách quá hạn (ADMIN/LIBRARIAN)

```
GET {{base_url}}/borrows/overdue
Authorization: Bearer {{admin_token}}
```
**Expected**: 200 OK

### 5.9 Hủy hold (STUDENT)

```
PUT {{base_url}}/holds/1/cancel
Authorization: Bearer {{student_token}}
{ "reason": "USER_CANCELED" }
```
**Expected**: 200 OK, status = CANCELED

---

### Lưu ý Testing
- Copy status chuyển: AVAILABLE → RESERVED → BORROWED → AVAILABLE
- Hold hết hạn sau 24h (scheduler chạy mỗi 30 phút)
- Notification được tạo tự động khi đặt/confirm/hủy/hết hạn hold
