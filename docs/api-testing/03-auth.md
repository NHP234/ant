# 3. Auth APIs

> Test auth trước, vì từ giờ POST/PUT/DELETE books/categories cần token.

### 3.1 POST /api/auth/register - Đăng ký user mới
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/register`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "student01",
  "password": "Pass@123",
  "email": "student01@example.com",
  "fullName": "Nguyen Van A",
  "studentId": "20200001"
}
```
- **Expected**: 201 Created, trả về accessToken + refreshToken + user info (role = STUDENT)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": 2,
      "username": "student01",
      "email": "student01@example.com",
      "fullName": "Nguyen Van A",
      "role": "STUDENT"
    }
  }
}
```
> **Lưu ý**: Copy `accessToken` và `refreshToken` lại để dùng cho các test sau.
- [ ] PASS

### 3.2 POST /api/auth/register - Username đã tồn tại
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/register`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "student01",
  "password": "Pass@123",
  "email": "other@example.com",
  "fullName": "Nguyen Van B"
}
```
- **Expected**: 400 Bad Request, "Username already exists"
- [ ] PASS

### 3.3 POST /api/auth/register - Validation errors
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/register`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "ab",
  "password": "123",
  "email": "not-an-email",
  "fullName": ""
}
```
- **Expected**: 400 Bad Request, VALIDATION_ERROR (username size, password size, email format, fullName blank)
- [ ] PASS

### 3.4 POST /api/auth/login - Đăng nhập thành công
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "student01",
  "password": "Pass@123"
}
```
- **Expected**: 200 OK, trả về accessToken + refreshToken mới
> Copy `accessToken` mới vào Postman variable hoặc ghi lại.
- [ ] PASS

### 3.5 POST /api/auth/login - Sai mật khẩu
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "student01",
  "password": "wrongpassword"
}
```
- **Expected**: 401 Unauthorized, "Invalid username or password"
- [ ] PASS

### 3.6 POST /api/auth/login - User không tồn tại
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "nonexistent",
  "password": "Pass@123"
}
```
- **Expected**: 401 Unauthorized
- [ ] PASS

### 3.7 POST /api/auth/refresh - Refresh token
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/refresh`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "refreshToken": "<paste refreshToken từ 3.4>"
}
```
- **Expected**: 200 OK, trả về accessToken + refreshToken mới
- [ ] PASS

### 3.8 POST /api/auth/refresh - Token không hợp lệ
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/refresh`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "refreshToken": "invalid.token.here"
}
```
- **Expected**: 400 Bad Request, "Invalid or expired refresh token"
- [ ] PASS
