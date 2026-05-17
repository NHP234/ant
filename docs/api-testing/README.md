# API Testing Guide (Postman)

> Hướng dẫn test các API bằng Postman. Base URL: `http://localhost:8080/api`

## Trước khi test

1. Chạy Docker containers:
```
cd d:\ant
docker-compose up -d
```

2. Chạy SpringBoot (trên PowerShell):
```
cd d:\ant\backend
.\mvnw spring-boot:run
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
| 7 | [07-dashboard.md](07-dashboard.md) | Dashboard Statistics API |
| 8 | [08-search.md](08-search.md) | Full-text Search (nâng cao) |
| 9 | [09-notifications.md](09-notifications.md) | Notification APIs |

---

## Thứ tự test khuyến nghị
1. Test Auth trước (file 03): register → login → refresh
2. Test Authorization (file 04): kiểm tra phân quyền STUDENT vs LIBRARIAN vs ADMIN
3. Test lại Category/Book CRUD (file 01-02) với token ADMIN trong header
4. Test Borrow/Hold (file 05): đặt mượn → xác nhận → trả
5. Test User Management (file 06): tạo LIBRARIAN, đổi role, update status
6. Test Dashboard (file 07): thống kê + cache verification
7. Test Search nâng cao (file 08): full-text search tiếng Việt
8. Test Notifications (file 09): xem, đếm chưa đọc, mark read

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
| 1.4 | POST categories - create (ADMIN) | |
| 1.5 | POST categories - validation | |
| 1.6 | PUT categories - update (ADMIN) | |
| 1.7 | DELETE categories (ADMIN) | |
| 1.8 | POST categories - LIBRARIAN forbidden | |
| 1.9 | POST categories - no token 401 | |
| 2.1 | GET books - default | |
| 2.2 | GET books - pagination & sort | |
| 2.3 | GET books - by id | |
| 2.4 | GET books - not found | |
| 2.5 | GET books/search - found | |
| 2.6 | GET books/search - not found | |
| 2.7 | POST books - no category (ADMIN/LIBRARIAN) | |
| 2.8 | POST books - with category (ADMIN/LIBRARIAN) | |
| 2.9 | POST books - missing title | |
| 2.10 | POST books - invalid quantity | |
| 2.11 | PUT books - partial update (ADMIN/LIBRARIAN) | |
| 2.12 | PUT books - assign categories (ADMIN/LIBRARIAN) | |
| 2.13 | DELETE books - success (ADMIN only) | |
| 2.14 | DELETE books - not found | |
| 2.15 | POST books - STUDENT forbidden | |
| 2.16 | DELETE books - LIBRARIAN forbidden | |
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
| 4.5 | Login ADMIN (DataInitializer) | |
| 4.6 | POST books - ADMIN success | |
| 4.7 | DELETE books - ADMIN success | |
| 4.8 | DELETE books - LIBRARIAN forbidden | |
| 4.9 | POST users - LIBRARIAN forbidden | |
| 4.10 | Dashboard stats - STUDENT forbidden | |
| 5.1 | Create hold - success | |
| 5.2 | Hold - validation cases | |
| 5.3 | Confirm hold - success | |
| 5.4 | Return book - success | |
| 5.5 | My borrows - history | |
| 5.6 | All borrows - admin | |
| 5.7 | Overdue borrows | |
| 6.1 | Create LIBRARIAN | |
| 6.2 | Create user - validation | |
| 6.3 | Get my profile | |
| 6.4 | List users - admin | |
| 6.5 | Get user by id | |
| 6.6 | Update role | |
| 6.7 | Update status | |
| 7.1 | Dashboard stats | |
| 7.2 | Cache verification | |
| 7.3 | Dashboard - STUDENT forbidden | |
| 8.1 | Search by title | |
| 8.2 | Search by author | |
| 8.3 | Search by description | |
| 8.4 | Search tiếng Việt không dấu | |
| 8.5 | Search nhiều từ | |
| 8.6 | Search no results | |
| 8.7 | Search with pagination | |
| 9.1 | Get notifications | |
| 9.2 | Unread count | |
| 9.3 | Mark one as read | |
| 9.4 | Mark all as read | |
| 9.5 | Mark other's notification | |
| 9.6 | No token | |
