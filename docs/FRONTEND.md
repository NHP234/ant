# Frontend Architecture — Awaken Ant Library

> React SPA cho hệ thống quản lý thư viện. Kết nối backend Spring Boot qua REST API.

## Tech Stack

- React 19 + TypeScript
- Vite (build tool)
- Shadcn/ui (Radix + Nova preset) + TailwindCSS v4 (UI components)
- TanStack Query / React Query (data fetching, caching, mutations)
- React Router v7 (routing)
- Axios (HTTP client, interceptors cho JWT)
- Lucide React (icon library)
- Sonner (toast notifications)
- AuthProvider Context (global auth state)

## Project Structure

```
frontend/src/
├── main.tsx
├── App.tsx
├── router.tsx                    # Route definitions + guards
├── index.css                     # Global styles + Tailwind
├── api/
│   ├── axios.ts                  # Base URL, interceptors, token refresh
│   ├── auth.ts                   # Login, Register, Refresh
│   ├── books.ts                  # Book CRUD + Search + Category
│   ├── borrows.ts                # Borrow records (individual book records)
│   ├── borrowSlips.ts            # Borrow slips (grouped sessions)
│   ├── holds.ts                  # Hold/Reservation CRUD
│   ├── dashboard.ts              # Dashboard statistics
│   ├── notifications.ts          # Notification API
│   └── users.ts                  # User management
├── components/
│   ├── ui/                       # Shadcn/ui generated components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   └── ... (auto-generated)
│   └── shared/
│       ├── NotificationBell.tsx   # Header notification icon + count
│       ├── ThemeToggle.tsx        # Dark/Light mode switch
│       ├── Pagination.tsx         # Shared pagination component
│       └── StatusBadge.tsx        # Shared status badge component
├── layouts/
│   ├── AdminLayout.tsx            # Admin sidebar + header + content
│   └── StudentLayout.tsx          # Student sidebar + header + content
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── admin/
│   │   ├── DashboardPage.tsx      # Stats + Recent Activity + Pending Holds
│   │   ├── BookManagementPage.tsx  # Book CRUD + Copy management
│   │   ├── BorrowManagementPage.tsx # Borrow slips (grouped) + Return action
│   │   ├── HoldManagementPage.tsx  # Hold requests + Confirm/Cancel
│   │   └── UserManagementPage.tsx  # User CRUD + Role/Status
│   ├── student/
│   │   ├── BookCatalogPage.tsx     # Browse + Search + Filter
│   │   ├── BookDetailPage.tsx      # Detail + Hold button
│   │   ├── MyBorrowsPage.tsx       # Tabs: Holds / Borrowing / History
│   │   ├── NotificationsPage.tsx   # Notification list + Mark read
│   │   └── ChatPage.tsx            # RAG Chatbot (kết nối API thực)
│   └── NotFoundPage.tsx
├── hooks/
│   └── useAuth.tsx                # Auth context + provider
├── lib/
│   └── utils.ts                   # cn() helper
└── styles/
    └── global.css
```

## Routing

```
/login                      # Login page (public)
/register                   # Register page (public)
/                           # Auto-redirect by role

# Admin/Librarian routes
/admin/dashboard            # Dashboard (ADMIN/LIBRARIAN)
/admin/books                # Book management (ADMIN/LIBRARIAN)
/admin/borrows              # Borrow slip management (ADMIN/LIBRARIAN)
/admin/holds                # Hold management (ADMIN/LIBRARIAN)
/admin/users                # User management (ADMIN only)

# Student routes (any authenticated user)
/browse                     # Book catalog with search
/books/:id                  # Book detail + Hold button
/my-borrows                 # My borrows (tabs: holds/borrowing/history)
/notifications              # Notifications
/chat                       # RAG chatbot (AI Trợ lý học tập)
```

## API Layer — Type Mapping

> Các TypeScript interface trong `api/*.ts` PHẢI khớp 1:1 với Java DTO trong `dto/response/*.java`.

| Frontend Type | Backend DTO | File |
|---|---|---|
| `AuthResponse` | `AuthResponse.java` (nested `UserInfo`) | `api/auth.ts` |
| `Book` | `BookResponse.java` (`totalCopies`, `availableCopies`) | `api/books.ts` |
| `Category` | `CategoryResponse.java` | `api/books.ts` |
| `PageResponse<T>` | `PageResponse.java` (field: `page`, not `number`) | `api/books.ts` |
| `BorrowRecord` | `BorrowRecordResponse.java` (+`copyId`, `copyNumber`) | `api/borrows.ts` |
| `BorrowSlip` | `BorrowSlipResponse.java` (contains `List<BorrowRecordResponse>`) | `api/borrowSlips.ts` |
| `Hold` | `HoldResponse.java` | `api/holds.ts` |
| `DashboardStats` | `DashboardStatsResponse.java` | `api/dashboard.ts` |
| `Notification` | `NotificationResponse.java` | `api/notifications.ts` |
| `User` | `UserResponse.java` | `api/users.ts` |

## Key Implementation Notes

### Axios Interceptor
- Request interceptor: attach JWT token to Authorization header
- Response interceptor: catch 401 → try refresh token → retry original request → if fail, redirect to login + clear localStorage

### React Query
- Dùng cho tất cả data fetching (thay vì useEffect + useState)
- Auto caching, background refetch, optimistic updates
- Query keys convention: `['entity', ...params]`
  - `['books', page, size]`, `['book', id]`
  - `['holds', 'my', page]`, `['admin', 'holds', page, filter]`
  - `['borrow-slips', page]`, `['dashboard', 'stats']`
- Stale time: 30s cho danh sách, 5m cho detail/stats

### Auth State
- JWT + Refresh Token lưu trong localStorage
- Auth context: `user { username, role }`, `isAuthenticated`, `login()`, `logout()`
- Role checks: `isAdmin`, `isLibrarian`, `isStudent` computed properties

### Hold Flow (Student → Librarian)
1. Student nhấn "Đặt mượn (Hold 24h)" trên Book Detail → `POST /api/holds`
2. Copy được đặt `RESERVED` trong 24h
3. Student đến quầy → Librarian xem Hold Management → nhấn "Xác nhận mượn" → `PUT /api/holds/{id}/confirm`
4. Hệ thống tự động tạo BorrowSlip + BorrowRecord
5. Nếu 24h không đến → Hold auto-expire → ban 7 ngày

### Batch Borrow Flow (Counter + Kiosk)
1. Form tại quầy giữ nguyên sinh viên trong lúc thủ thư tìm và thêm tối đa 5 đầu sách vào danh sách chờ.
2. Frontend chặn trùng đầu sách, cho phép chọn/nhập `copyId` hoặc để backend tự chọn copy `AVAILABLE`.
3. Nút xác nhận gửi đúng một `POST /api/borrow-slips` với toàn bộ `items`, thay vì tạo một phiếu cho từng cuốn.
4. Nếu API lỗi, danh sách chờ vẫn được giữ để thủ thư sửa và thử lại; chỉ reset và refresh danh sách phiếu sau khi thành công.
5. Kiosk gom toàn bộ `scannedBorrowCopies` rồi gửi một request với `source = NFC`; mỗi item luôn có `bookId` và `copyId`.
6. EventSource của kiosk gọi NFC handler mới nhất qua ref để không giữ state cũ khi giao diện chuyển từ quẹt sinh viên sang quẹt sách.

## Security Rules

- **Client-side role guard chỉ là UX**: Server `@PreAuthorize` là source of truth
- **Không lưu sensitive data**: Chỉ lưu `access_token`, `refresh_token`, `{ username, role }`
- **XSS**: Không dùng `dangerouslySetInnerHTML`, React JSX auto-escape
- **Token Refresh**: Interceptor tự động, nếu thất bại → redirect login
- **Input validation**: Client-side cho UX, server-side là final authority
- **Error display**: Hiện `error.response.data.message`, không leak stack traces

## Code Standards

- **Max 150-200 lines/file**: Tách sub-components khi vượt quá
- **No `any` type**: Dùng proper generics
- **No `console.log`**: Xóa trước commit
- **Debounce search**: 300ms cho tất cả search inputs
- **Confirm dialog**: Bắt buộc cho mọi destructive action (xóa, hủy)
- **Empty states**: Mọi danh sách phải có empty state message
- **Vietnamese labels**: UI text tiếng Việt, code identifiers tiếng Anh

## Status: ✅ Đã hoàn thành

Frontend đã được nâng cấp toàn diện và khớp 100% với Backend V9-V12:
- ✅ Tích hợp Hold API + UI hoàn chỉnh (đặt giữ sách 24h, hủy hold).
- ✅ Tích hợp Borrow Slip API + UI quản lý phiếu mượn gộp.
- ✅ Form tại quầy và Kiosk tạo một phiếu mượn atomic cho nhiều sách.
- ✅ Khớp chuẩn xác Book DTO field names (`totalCopies` / `availableCopies`).
- ✅ Sửa Auth response interface khớp chuẩn JwtResponse.
- ✅ Cập nhật Branding toàn hệ thống thành "Awaken Ant Library".
- ✅ Tích hợp RAG AI Chatbot kết nối trực tiếp với backend proxy và Python service.
