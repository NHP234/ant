# 6. User Management APIs (ADMIN)

> **Pre-requisite**: Login với ADMIN account. Copy accessToken -> variable `token`.

### 6.1 Tạo user LIBRARIAN

```
POST {{base_url}}/users
Authorization: Bearer {{admin_token}}
{
  "username": "librarian01",
  "password": "Lib@1234",
  "email": "lib01@library.com",
  "fullName": "Tran Thi B",
  "role": "LIBRARIAN"
}
```
**Expected**: 201 Created
```json
{
  "success": true,
  "data": {
    "id": 3,
    "username": "librarian01",
    "email": "lib01@library.com",
    "fullName": "Tran Thi B",
    "role": "LIBRARIAN",
    "isActive": true
  },
  "message": "User created successfully"
}
```

### 6.2 Tạo user - Validation Cases

**TC1: Role không hợp lệ**
```
POST {{base_url}}/users
Authorization: Bearer {{admin_token}}
{
  "username": "test123",
  "password": "Test1234",
  "email": "test@test.com",
  "fullName": "Test",
  "role": "SUPERADMIN"
}
```
**Expected**: 400 - "Invalid role: SUPERADMIN. Must be one of: ADMIN, LIBRARIAN, STUDENT"

**TC2: Username đã tồn tại**
```
POST {{base_url}}/users
Authorization: Bearer {{admin_token}}
{
  "username": "admin",
  "password": "Test1234",
  "email": "new@test.com",
  "fullName": "Test",
  "role": "LIBRARIAN"
}
```
**Expected**: 400 - "Username already exists"

**TC3: STUDENT cố tạo user**
```
POST {{base_url}}/users
Authorization: Bearer {{student_token}}
{
  "username": "hacker",
  "password": "Test1234",
  "email": "hack@test.com",
  "fullName": "Hacker",
  "role": "ADMIN"
}
```
**Expected**: 403 Forbidden

### 6.3 Xem profile bản thân

```
GET {{base_url}}/users/me
Authorization: Bearer {{token}}
```
**Expected**: 200 OK - trả về thông tin user đang login (bất kỳ role nào cũng gọi được)

### 6.4 Danh sách users (ADMIN)

```
GET {{base_url}}/users?page=0&size=10&sort=createdAt,desc
Authorization: Bearer {{admin_token}}
```
**Expected**: 200 OK - danh sách users có pagination

### 6.5 Xem chi tiết user (ADMIN)

```
GET {{base_url}}/users/2
Authorization: Bearer {{admin_token}}
```
**Expected**: 200 OK

### 6.6 Đổi role user (ADMIN)

```
PUT {{base_url}}/users/2/role
Authorization: Bearer {{admin_token}}
{
  "role": "LIBRARIAN"
}
```
**Expected**: 200 OK - role được cập nhật

### 6.7 Cập nhật trạng thái user (ADMIN)

**Deactivate user:**
```
PUT {{base_url}}/users/2/status
Authorization: Bearer {{admin_token}}
{
  "active": false
}
```
**Expected**: 200 OK - isActive = false

**Activate lại user:**
```
PUT {{base_url}}/users/2/status
Authorization: Bearer {{admin_token}}
{
  "active": true
}
```
**Expected**: 200 OK - isActive = true (idempotent, gọi nhiều lần cùng kết quả)

### 6.8 Test Flow Hoàn chỉnh

| Step | Action | Expected |
|------|--------|----------|
| 1 | ADMIN login | 200 + tokens |
| 2 | Tạo LIBRARIAN account | 201 |
| 3 | Login bằng LIBRARIAN mới | 200 + role=LIBRARIAN |
| 4 | LIBRARIAN trả sách (PUT /borrows/{id}/return) | 200 (có quyền) |
| 5 | ADMIN xem danh sách users | 200 + paginated list |
| 6 | ADMIN đổi role STUDENT -> LIBRARIAN | 200 |
| 7 | ADMIN deactivate user (active=false) | 200 + isActive=false |
