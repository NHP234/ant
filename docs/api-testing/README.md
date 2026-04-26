# API Testing Guide (Postman)

> Hướng dẫn test các API bằng Postman. Base URL: `http://localhost:8080/api`

## Trước khi test

1. Chạy Docker containers:
```
cd d:\ant
docker-compose up -d
```

2. Chạy SpringBoot:
```
cd d:\ant\backend
./mvnw spring-boot:run
```

3. Verify: Mở browser vào `http://localhost:8080` - nếu thấy response (kể cả lỗi 401/403) là app đang chạy.

---

## Mục lục

| # | File | Nội dung |
|---|------|----------|
| 1 | [01-category.md](01-category.md) | Category CRUD APIs |
| 2 | [02-book.md](02-book.md) | Book CRUD APIs |
| 3 | [03-auth.md](03-auth.md) | Auth APIs (register, login, refresh) |
| 4 | [04-authorization.md](04-authorization.md) | Phân quyền (role-based access) |
| 5 | [05-borrow.md](05-borrow.md) | Borrow APIs (mượn/trả sách) |
| 6 | [06-user-management.md](06-user-management.md) | User Management APIs (ADMIN) |

---

## Thứ tự test khuyến nghị
1. Test Auth trước (file 03): register -> login -> refresh
2. Test Authorization (file 04): kiểm tra phân quyền STUDENT vs ADMIN
3. Test lại Category/Book CRUD (file 01-02) với token ADMIN trong header
4. Test Borrow (file 05): mượn/trả sách
5. Test User Management (file 06): tạo LIBRARIAN, đổi role, update status

---

## Setup Postman cho nhanh
- Tạo Collection variable: `base_url` = `http://localhost:8080/api`
- Tạo Collection variable: `token` = (paste accessToken sau khi login)
- Trong mỗi request cần auth, tab Authorization chọn Bearer Token, value = `{{token}}`
- Sau mỗi lần login/register, copy accessToken vào variable `token`

## Ghi chú chung
- Nếu gặp lỗi 500, kiểm tra terminal SpringBoot để xem stack trace
- Nếu gặp lỗi kết nối DB, kiểm tra `docker ps` xem PostgreSQL đang chạy không
- Seed data tạo 5 sách (id 1-5) và 8 categories (id 1-8), thứ tự test nên từ trên xuống
- Sau khi test xong, có thể restart Docker để reset data: `docker-compose down -v` rồi `docker-compose up -d`

## Checklist tổng hợp

| # | Test case | Status |
|---|-----------|--------|
| 1.1 | GET categories - all | |
| 1.2 | GET categories - by id | |
| 1.3 | GET categories - not found | |
| 1.4 | POST categories - create | |
| 1.5 | POST categories - validation | |
| 1.6 | PUT categories - update | |
| 1.7 | DELETE categories | |
| 2.1 | GET books - default | |
| 2.2 | GET books - pagination & sort | |
| 2.3 | GET books - by id | |
| 2.4 | GET books - not found | |
| 2.5 | GET books/search - found | |
| 2.6 | GET books/search - not found | |
| 2.7 | POST books - no category | |
| 2.8 | POST books - with category | |
| 2.9 | POST books - missing title | |
| 2.10 | POST books - invalid quantity | |
| 2.11 | PUT books - partial update | |
| 2.12 | PUT books - assign categories | |
| 2.13 | DELETE books - success | |
| 2.14 | DELETE books - not found | |
| 3.1 | Register - success | |
| 3.2 | Register - duplicate username | |
| 3.3 | Register - validation errors | |
| 3.4 | Login - success | |
| 3.5 | Login - wrong password | |
| 3.6 | Login - user not found | |
| 3.7 | Refresh token - success | |
| 3.8 | Refresh token - invalid | |
| 4.1 | GET books - public no token | |
| 4.2 | POST books - STUDENT forbidden | |
| 4.3 | POST categories - STUDENT forbidden | |
| 4.4 | POST books - no token 401 | |
| 4.5 | Update role to ADMIN in DB | |
| 4.6 | POST books - ADMIN success | |
| 4.7 | DELETE books - ADMIN success | |
| 5.1 | Borrow book - success | |
| 5.2 | Borrow - validation cases | |
| 5.3 | Return book - success | |
| 5.4 | My borrows - history | |
| 5.5 | All borrows - admin | |
| 5.6 | Overdue borrows | |
| 6.1 | Create LIBRARIAN | |
| 6.2 | Create user - validation | |
| 6.3 | Get my profile | |
| 6.4 | List users - admin | |
| 6.5 | Get user by id | |
| 6.6 | Update role | |
| 6.7 | Update status | |
