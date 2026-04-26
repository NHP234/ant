# 5. Borrow APIs

> **Pre-requisite**: Đã có ít nhất 1 STUDENT account và 1 ADMIN/LIBRARIAN account. Đã có books trong DB.

### 5.1 Mượn sách (STUDENT)

**Login STUDENT trước:**
```
POST {{base_url}}/auth/login
{
  "username": "teststudent",
  "password": "Test1234"
}
```
Copy accessToken -> variable `token`

**Mượn sách:**
```
POST {{base_url}}/borrows
Authorization: Bearer {{token}}
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
    "userId": 2,
    "userFullName": "Test Student",
    "bookId": 1,
    "bookTitle": "...",
    "borrowDate": "2026-04-15T...",
    "dueDate": "2026-04-29T...",
    "returnDate": null,
    "status": "BORROWING"
  },
  "message": "Book borrowed successfully"
}
```

### 5.2 Mượn sách - Validation Cases

**TC1: Mượn sách không tồn tại**
```
POST {{base_url}}/borrows
Authorization: Bearer {{token}}
{
  "bookId": 9999
}
```
**Expected**: 404 - `RESOURCE_NOT_FOUND`

**TC2: Mượn cùng sách đang mượn**
```
POST {{base_url}}/borrows
Authorization: Bearer {{token}}
{
  "bookId": 1
}
```
**Expected**: 400 - `BAD_REQUEST` - "You are already borrowing this book"

**TC3: Mượn quá giới hạn (5 sách)**
Mượn sách bookId 2, 3, 4, 5 rồi thử mượn thêm bookId 6:
```
POST {{base_url}}/borrows
Authorization: Bearer {{token}}
{
  "bookId": 6
}
```
**Expected**: 400 - `BORROW_LIMIT_EXCEEDED`

**TC4: Mượn sách hết (available_quantity = 0)**
Cần nhiều user mượn hết sách, hoặc seed dữ liệu sách có quantity=1, mượn 1 lần rồi mượn lại bằng user khác.
**Expected**: 400 - `BOOK_NOT_AVAILABLE`

**TC5: Không có token**
```
POST {{base_url}}/borrows
(no Authorization header)
{
  "bookId": 1
}
```
**Expected**: 401/403

### 5.3 Trả sách (ADMIN/LIBRARIAN)

**Login ADMIN:**
```
POST {{base_url}}/auth/login
{
  "username": "admin",
  "password": "Admin1234"
}
```
Copy accessToken -> variable `token`

**Trả sách:**
```
PUT {{base_url}}/borrows/1/return?note=Sách còn tốt
Authorization: Bearer {{token}}
```
**Expected**: 200 OK
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "RETURNED",
    "returnDate": "2026-04-15T...",
    "note": "Sách còn tốt"
  },
  "message": "Book returned successfully"
}
```

**TC6: Trả sách đã trả rồi**
```
PUT {{base_url}}/borrows/1/return
Authorization: Bearer {{token}}
```
**Expected**: 400 - `BAD_REQUEST` - "This book has already been returned"

**TC7: STUDENT cố trả sách**
Login lại với STUDENT token:
```
PUT {{base_url}}/borrows/1/return
Authorization: Bearer {{student_token}}
```
**Expected**: 403 Forbidden

### 5.4 Xem lịch sử mượn trả (STUDENT)

```
GET {{base_url}}/borrows/my
Authorization: Bearer {{student_token}}
```
**Expected**: 200 OK, trả về danh sách borrow records của user đang login, có pagination.

**Với phân trang:**
```
GET {{base_url}}/borrows/my?page=0&size=5&sort=borrowDate,desc
Authorization: Bearer {{student_token}}
```

### 5.5 Xem tất cả borrows (ADMIN/LIBRARIAN)

```
GET {{base_url}}/borrows
Authorization: Bearer {{admin_token}}
```
**Expected**: 200 OK, trả về tất cả borrow records.

**TC8: STUDENT cố xem tất cả**
```
GET {{base_url}}/borrows
Authorization: Bearer {{student_token}}
```
**Expected**: 403 Forbidden

### 5.6 Xem sách quá hạn (ADMIN/LIBRARIAN)

```
GET {{base_url}}/borrows/overdue
Authorization: Bearer {{admin_token}}
```
**Expected**: 200 OK, trả về danh sách sách đang quá hạn (status = OVERDUE hoặc BORROWING nhưng dueDate < now).

### 5.7 Test Flow Hoàn chỉnh

| Step | Action | Expected |
|------|--------|----------|
| 1 | STUDENT login | 200 + tokens |
| 2 | Mượn sách id=1 | 201 + status=BORROWING |
| 3 | Mượn cùng sách id=1 | 400 - already borrowing |
| 4 | Xem lịch sử `/borrows/my` | 200 + 1 record |
| 5 | ADMIN login | 200 + tokens |
| 6 | Xem tất cả `/borrows` | 200 + records |
| 7 | Trả sách PUT `/borrows/1/return` | 200 + status=RETURNED |
| 8 | Trả lại lần nữa | 400 - already returned |
| 9 | STUDENT mượn lại sách id=1 | 201 (vì đã trả) |

---

### Lưu ý Testing
- Cần seed data: ít nhất 5-6 books với quantity > 0 để test giới hạn mượn
- Cần 2 accounts: 1 STUDENT + 1 ADMIN/LIBRARIAN
- available_quantity tự động giảm/tăng khi mượn/trả (check trong DB)
- Notification được tạo tự động khi mượn/trả/quá hạn (check table `notifications`)
- OverdueCheckScheduler chạy 00:00 mỗi ngày, chuyển BORROWING -> OVERDUE nếu dueDate < now
