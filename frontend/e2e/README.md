# E2E Tests — Awaken Ant Library

## Setup

Yêu cầu: Docker (PostgreSQL + Redis) + Backend (IntelliJ) + Frontend (`npm run dev`) đều đang chạy.

```powershell
docker compose up postgres redis -d
# Mở IntelliJ → Run DemoApplication (port 8080)
cd frontend; npm run dev  # port 5173

# Chạy test
npx playwright test

# Xem report (nếu có --reporter html)
npx playwright show-report
```

---

## Test Suites

### 1. `specs/auth.spec.ts` — Authentication

| Test | Mô tả | Flow |
|------|-------|------|
| register new student successfully | Đăng ký student mới qua API, login bằng form | API POST `/auth/register` → fill form login → submit → redirect `/browse` |
| login as admin | Login admin bằng form | Fill username/password → submit → redirect `/admin/dashboard` |
| login as student | Login student đã đăng ký | Fill username/password → submit → redirect `/browse` |

### 2. `specs/catalog.spec.ts` — Catalog & Book Detail

| Test | Mô tả | Flow |
|------|-------|------|
| browse shows book grid | Vào browse, kiểm tra danh sách sách | Login → `/browse` → đếm card sách (`a[href^="/books/"]`) > 0 |
| book detail shows correct info | Xem chi tiết sách | Login → `/books/:id` → check title, author, availableCopies |
| hold a book from detail page | Đặt mượn (hold) sách | Login → `/books/:id` → click "Đặt mượn" → redirect `/my-borrows` → check book title |

### 3. `specs/admin-flow.spec.ts` — Admin Full Flow

Test full end-to-end: **Hold → Confirm → Borrow → Return**

| Test | Mô tả | Flow |
|------|-------|------|
| admin logs in and sees dashboard holds | Dashboard hiển thị holds | Login admin → Dashboard → check "Holds đang chờ" → check student name |
| admin confirms hold in Hold Management | Xác nhận hold | `/admin/holds` → click "Xác nhận mượn" → check "Đã xác nhận" |
| admin sees borrow slip and returns book | Xem borrow slip + trả sách | `/admin/borrows` → expand row → click "Xác nhận trả" → check "Đã trả" |

**beforeAll setup:** (dùng API, không qua UI)
1. Register student
2. Login student → lấy token
3. Login admin → lấy token
4. Tạo book mới
5. Tạo hold (student hold book)

### 4. `specs/book-mgmt.spec.ts` — Book Management (Admin)

| Test | Mô tả | Flow |
|------|-------|------|
| create a new book with copies | Thêm sách mới | Login → `/admin/books` → click "Thêm sách" → fill form → submit → search tên sách → verify |
| view and delete a book copy | Xem + xóa bản sao | Login → `/admin/books` → click "Bản sao" → verify dialog → click "Thêm bản sao" |
| delete a book | Xóa sách | Login → `/admin/books` → click "Xóa" cuối cùng → accept confirm → verify |

### 5. `specs/notifications.spec.ts` — Notifications

| Test | Mô tả | Flow |
|------|-------|------|
| student sees notification count and marks as read | Xem + đánh dấu đã đọc | Login → `/notifications` → click "Đã đọc" |

---

## Helper API (`helpers/api.ts`)

Các function dùng trong `beforeAll` để setup dữ liệu test qua API (không qua UI):

| Function | Endpoint | Mục đích |
|----------|----------|----------|
| `apiLogin` | POST `/auth/login` | Lấy JWT token |
| `apiRegister` | POST `/auth/register` | Tạo tài khoản student |
| `apiCreateBook` | POST `/books` | Tạo sách (admin token) |
| `apiCreateCategory` | POST `/categories` | Tạo danh mục (admin token) |
| `apiCreateHold` | POST `/holds` | Tạo hold (student token) |
| `apiGetBooks` | GET `/books?size=50` | Lấy danh sách sách |
| `apiGetHolds` | GET `/holds` | Lấy danh sách holds (admin token) |
| `apiConfirmHold` | PUT `/holds/:id/confirm` | Xác nhận hold (admin token) |

## Test Data (`fixtures/test-data.ts`)

| Constant | Giá trị |
|----------|---------|
| `ADMIN` | `{ username: "admin", password: "Admin@123", ... }` |
| `STUDENT` | `{ username: "test_student_${Date.now()}", password: "Test@123456", ... }` |
| `TEST_BOOK` | `{ title: "E2E Test Book", author: "E2E Author", ... }` |
| `API_BASE` | `http://localhost:8080/api` |

## Lưu ý

- Các spec chạy **sequential** (`fullyParallel: false`) để tránh xung đột dữ liệu
- Mỗi spec dùng `test.describe` + `beforeAll` để setup dữ liệu riêng
- Student dùng timestamp (`${Date.now()}`) trong username để tránh conflict giữa các lần chạy
- Khi backend caching có thể cần refresh hoặc đợi
- Nếu test vẫn fail, xóa `test-results/` và chạy lại để có trace sạch
