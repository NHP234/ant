# Frontend Implementation Plan — Awaken Ant Library

> Kế hoạch triển khai cập nhật Frontend để đồng bộ với backend V9–V12 (book_copies, borrow_slips, holds).
> Dựa trên: API_SPEC.md, BACKEND.md, REQUIREMENTS.md, và 25 DTO classes.

---

## Phần 1: API_SPEC.md Review — So sánh Code Backend thực tế

### ✅ Các endpoint khớp chuẩn
| Endpoint | API_SPEC | Backend Controller | OK |
|----------|----------|--------------------|----|
| POST /auth/login | ✅ | AuthController | ✅ |
| POST /auth/register | ✅ | AuthController | ✅ |
| POST /auth/refresh | ✅ | AuthController | ✅ |
| GET /books | ✅ | BookController | ✅ |
| GET /books/{id} | ✅ | BookController | ✅ |
| GET /books/search | ✅ | BookController | ✅ |
| POST /books | ✅ ADMIN/LIBRARIAN | BookController | ✅ |
| PUT /books/{id} | ✅ ADMIN/LIBRARIAN | BookController | ✅ |
| DELETE /books/{id} | ✅ ADMIN | BookController | ✅ |
| GET /categories | ✅ | CategoryController | ✅ |
| POST /categories | ✅ ADMIN | CategoryController | ✅ |
| PUT /categories/{id} | ✅ ADMIN | CategoryController | ✅ |
| DELETE /categories/{id} | ✅ ADMIN | CategoryController | ✅ |
| POST /borrows | ✅ ADMIN/LIBRARIAN | BorrowController | ✅ |
| PUT /borrows/{id}/return | ✅ ADMIN/LIBRARIAN | BorrowController | ✅ |
| GET /borrows/my | ✅ User | BorrowController | ✅ |
| GET /borrows | ✅ ADMIN/LIBRARIAN | BorrowController | ✅ |
| GET /borrows/overdue | ✅ ADMIN/LIBRARIAN | BorrowController | ✅ |
| POST /holds | ✅ User | BookHoldController | ✅ |
| GET /holds/my | ✅ User | BookHoldController | ✅ |
| GET /holds | ✅ ADMIN/LIBRARIAN | BookHoldController | ✅ |
| GET /holds/{id} | ✅ ADMIN/LIBRARIAN | BookHoldController | ✅ |
| PUT /holds/{id}/confirm | ✅ ADMIN/LIBRARIAN | BookHoldController | ✅ |
| PUT /holds/{id}/cancel | ✅ User/ADMIN/LIBRARIAN | BookHoldController | ✅ |
| GET /users/me | ✅ User | UserController | ✅ |
| POST /users | ✅ ADMIN | UserController | ✅ |
| GET /users | ✅ ADMIN | UserController | ✅ |
| GET /users/{id} | ✅ ADMIN | UserController | ✅ |
| PUT /users/{id}/role | ✅ ADMIN | UserController | ✅ |
| PUT /users/{id}/status | ✅ ADMIN | UserController | ✅ |
| GET /notifications | ✅ User | NotificationController | ✅ |
| PUT /notifications/{id}/read | ✅ User | NotificationController | ✅ |
| PUT /notifications/read-all | ✅ User | NotificationController | ✅ |
| GET /notifications/unread-count | ✅ User | NotificationController | ✅ |
| GET /dashboard/stats | ✅ ADMIN/LIBRARIAN | DashboardController | ✅ |

### ⚠️ Endpoints tồn tại trong code nhưng CHƯA có trong API_SPEC.md

| Endpoint | Controller | Mô tả |
|----------|-----------|-------|
| `GET /api/borrow-slips/my` | BorrowSlipController | Phiếu mượn của user hiện tại |
| `GET /api/borrow-slips` | BorrowSlipController | Tất cả phiếu mượn (ADMIN/LIBRARIAN) |
| `GET /api/borrow-slips/{id}` | BorrowSlipController | Chi tiết 1 phiếu mượn |
| `GET /api/books/{bookId}/copies` | BookCopyController | List bản sao vật lý |
| `POST /api/books/{bookId}/copies` | BookCopyController | Thêm bản sao |
| `PUT /api/books/{bookId}/copies/{copyId}` | BookCopyController | Cập nhật bản sao |
| `DELETE /api/books/{bookId}/copies/{copyId}` | BookCopyController | Xóa bản sao |
| `POST /auth/logout` | (chưa implement) | API_SPEC ghi nhưng chưa thấy code |
| `GET /dashboard/popular-books` | (chưa implement) | API_SPEC ghi nhưng chưa thấy code |
| `GET /dashboard/recent-activities` | (chưa implement) | API_SPEC ghi nhưng chưa thấy code |
| `POST /chat` | (chưa implement) | API_SPEC ghi, thuộc RAG (chưa tới giai đoạn) |
| `POST /nfc/*` | (chưa implement) | API_SPEC ghi, thuộc NFC (chưa tới giai đoạn) |
| `GET /categories/{id}` | CategoryController | Có trong code nhưng thiếu trong API_SPEC |

### ⚠️ Lỗi trong API_SPEC.md cần sửa

1. **AuthResponse thiếu `user` object**: API_SPEC ghi response có `user: { id, username, role }` nhưng backend DTO `AuthResponse.java` trả về nested `UserInfo { id, username, email, fullName, role }`. Cần bổ sung `email`, `fullName` vào spec.

2. **BookResponse field name sai**: API_SPEC ghi `totalCopies`, `availableCopies` nhưng frontend đang dùng `quantity`, `availableQuantity`. Backend DTO `BookResponse.java` dùng `totalCopies`, `availableCopies`. → Frontend cần sửa theo backend DTO.

3. **BorrowRequest thiếu mô tả**: `POST /borrows` hiện chỉ cho ADMIN/LIBRARIAN (tại quầy), `BorrowRequest { bookId, username, studentId, copyId }`. Cần ghi rõ hơn luồng.

4. **Thiếu Borrow Slips API section**: `BorrowSlipController` đã có nhưng API_SPEC thiếu.

5. **Thiếu Book Copies API section**: `BookCopyController` đã có nhưng API_SPEC thiếu.

6. **PageResponse field `page` vs `number`**: API_SPEC ghi `page`, backend DTO ghi `page`, frontend type ghi `number`. → Cần thống nhất thành `page`.

---

## Phần 2: Frontend DTO Mismatches — Cần sửa

### 2.1 `api/auth.ts` — AuthResponse
```diff
 export interface AuthResponse {
   accessToken: string
   refreshToken: string
-  username: string
-  role: string
+  tokenType: string
+  expiresIn: number
+  user: {
+    id: number
+    username: string
+    email: string
+    fullName: string
+    role: string
+  }
 }
```

### 2.2 `api/books.ts` — Book interface
```diff
 export interface Book {
   // ...
-  quantity: number
-  availableQuantity: number
+  totalCopies: number
+  availableCopies: number
   // ...
 }
```

### 2.3 `api/books.ts` — PageResponse
```diff
 export interface PageResponse<T> {
   content: T[]
   totalElements: number
   totalPages: number
   size: number
-  number: number
+  page: number
+  last: boolean
 }
```

### 2.4 `api/borrows.ts` — BorrowRecord
```diff
 export interface BorrowRecord {
   id: number
   userId: number
   userFullName: string
   bookId: number
   bookTitle: string
   bookAuthor: string
+  copyId: number
+  copyNumber: number
   borrowDate: string
   dueDate: string
   returnDate: string | null
   status: 'BORROWING' | 'RETURNED' | 'OVERDUE'
   note: string | null
   createdAt: string
 }
```

### 2.5 THIẾU — `api/holds.ts` (mới)
```typescript
// Toàn bộ file mới cho Hold API
export interface Hold {
  id: number
  userId: number
  userFullName: string
  bookId: number
  bookTitle: string
  copyId: number | null
  copyNumber: number | null
  status: 'ACTIVE' | 'FULFILLED' | 'EXPIRED' | 'CANCELED'
  reservedAt: string
  expiresAt: string
  fulfilledAt: string | null
  canceledAt: string | null
  cancelReason: string | null
  librarianName: string | null
  createdAt: string
}
```

### 2.6 THIẾU — `api/borrowSlips.ts` (mới)
```typescript
export interface BorrowSlip {
  id: number
  userId: number
  userFullName: string
  librarianName: string
  borrowDate: string
  dueDate: string
  note: string | null
  source: 'HOLD' | 'COUNTER'
  records: BorrowRecord[]
  createdAt: string
}
```

---

## Phần 3: Files bị ảnh hưởng & cần sửa

### 3.1 API Layer (`src/api/`)
| File | Thay đổi |
|------|----------|
| `auth.ts` | Sửa `AuthResponse` interface cho khớp backend DTO |
| `books.ts` | Sửa `Book` interface (`totalCopies`/`availableCopies`), `PageResponse` |
| `borrows.ts` | Sửa `BorrowRecord` interface (thêm `copyId`, `copyNumber`) |
| `dashboard.ts` | ✅ Đã khớp, giữ nguyên |
| `notifications.ts` | Sửa nhỏ: `unreadCount` response key |
| `users.ts` | ✅ Đã khớp, giữ nguyên |
| **`holds.ts`** | 🆕 Tạo mới: Hold CRUD API layer |
| **`borrowSlips.ts`** | 🆕 Tạo mới: BorrowSlip API layer |

### 3.2 Pages (`src/pages/`)
| File | Thay đổi |
|------|----------|
| `admin/DashboardPage.tsx` | Thêm bảng "Hoạt động gần đây" + "Holds đang chờ" |
| `admin/BorrowManagementPage.tsx` | Refactor: gọi `borrow-slips` API thay vì `borrows`, hiển thị phiếu mượn + expand chi tiết |
| `admin/BookManagementPage.tsx` | Sửa `quantity` → `totalCopies`, thêm nút xem/quản lý Copies |
| `admin/UserManagementPage.tsx` | Sửa nhỏ (đã khớp phần lớn) |
| **`admin/HoldManagementPage.tsx`** | 🆕 Tạo mới: Quản lý đặt trước, xác nhận/hủy holds |
| `student/BookDetailPage.tsx` | Đổi nút "Mượn sách" → "Đặt mượn (Hold 24h)", gọi `holdApi` |
| `student/BookCatalogPage.tsx` | Sửa `availableQuantity` → `availableCopies` |
| `student/MyBorrowsPage.tsx` | Thêm tabs "Đang đặt trước / Đang mượn / Lịch sử trả" |
| `student/NotificationsPage.tsx` | Sửa nhỏ response key |
| **`student/ChatPage.tsx`** | 🆕 Tạo mới (placeholder cho RAG chatbot, giai đoạn sau) |

### 3.3 Layouts (`src/layouts/`)
| File | Thay đổi |
|------|----------|
| `AdminLayout.tsx` | Thêm menu "Quản lý đặt trước", đổi tên "Library Admin" → "Awaken Ant Library", dùng Lucide icon |
| `StudentLayout.tsx` | Thêm menu "Trợ lý AI", đổi tên "Thư viện" → "Awaken Ant Library", dùng Lucide icon |

### 3.4 Router (`src/router.tsx`)
| Thay đổi |
|----------|
| Thêm route `/admin/holds` → `HoldManagementPage` |
| Thêm route `/chat` → `ChatPage` (placeholder) |

### 3.5 Hooks (`src/hooks/`)
| File | Thay đổi |
|------|----------|
| `useAuth.tsx` | Sửa login/register handler cho khớp `AuthResponse.user` nested object |

---

## Phần 4: Chi tiết triển khai từng Phase

### Phase 1: Foundation — Sửa API layer & Types (Ước lượng: 1-2h)
1. Sửa `api/auth.ts` — AuthResponse interface
2. Sửa `api/books.ts` — Book, PageResponse interfaces
3. Sửa `api/borrows.ts` — BorrowRecord interface
4. Sửa `api/notifications.ts` — Response key
5. Tạo `api/holds.ts` — Full Hold CRUD API
6. Tạo `api/borrowSlips.ts` — BorrowSlip API
7. Sửa `hooks/useAuth.tsx` — Destructure `res.data.data.user`

### Phase 2: Layout & Routing (Ước lượng: 1h)
1. Sửa `AdminLayout.tsx`:
   - Đổi title → "Awaken Ant Library"
   - Thêm nav item "Quản lý đặt trước" (path: `/admin/holds`)
   - Thay emoji bằng Lucide React icons
2. Sửa `StudentLayout.tsx`:
   - Đổi title → "Awaken Ant Library"
   - Thêm nav item "Trợ lý AI" (path: `/chat`)
   - Thay emoji bằng Lucide React icons
3. Sửa `router.tsx`:
   - Thêm route `/admin/holds` → `HoldManagementPage`
   - Thêm route `/chat` → `ChatPage`

### Phase 3: Admin Pages (Ước lượng: 3-4h)
1. Sửa `DashboardPage.tsx`:
   - Thêm section "Holds đang chờ xác nhận" (gọi `/api/holds?status=ACTIVE`)
   - Thêm section "Hoạt động gần đây" (bảng borrow records mới nhất)
2. Sửa `BookManagementPage.tsx`:
   - Field names: `quantity` → `totalCopies`
   - Thêm nút "Quản lý bản sao" mở dialog liệt kê copies
3. Sửa `BorrowManagementPage.tsx`:
   - Chuyển sang gọi `/api/borrow-slips` thay vì `/api/borrows`
   - Hiển thị phiếu mượn (slip) với expandable rows xem danh sách sách
   - Giữ nút "Xác nhận trả" cho từng record trong phiếu
4. Tạo `HoldManagementPage.tsx`:
   - Bảng danh sách tất cả holds
   - Filter tabs: Tất cả / Đang chờ / Đã xác nhận / Đã hủy / Hết hạn
   - Nút "Xác nhận mượn" (gọi PUT /holds/{id}/confirm)
   - Nút "Hủy" (gọi PUT /holds/{id}/cancel)

### Phase 4: Student Pages (Ước lượng: 2-3h)
1. Sửa `BookDetailPage.tsx`:
   - Đổi `book.quantity` → `book.totalCopies`, `book.availableQuantity` → `book.availableCopies`
   - Đổi nút "Mượn sách" → "Đặt mượn (Hold 24h)"
   - Gọi `holdApi.create({ bookId })` thay vì `borrowApi.borrow(bookId)`
   - Thêm thông báo "Bạn có 24h để đến thư viện nhận sách"
2. Sửa `BookCatalogPage.tsx`:
   - Sửa field names
3. Sửa `MyBorrowsPage.tsx`:
   - Thêm Tabs component: "Đang đặt trước" | "Đang mượn" | "Lịch sử trả"
   - Tab "Đang đặt trước": gọi `holdApi.getMyHolds()`, hiển thị countdown 24h, nút "Hủy"
   - Tab "Đang mượn": filter borrows có status BORROWING
   - Tab "Lịch sử trả": filter borrows có status RETURNED
4. Tạo `ChatPage.tsx`:
   - Placeholder UI cho RAG chatbot (chưa kết nối API)
   - Giao diện chat bubble

### Phase 5: Polish & Testing (Ước lượng: 1-2h)
1. Kiểm tra toàn bộ flow Login → Browse → Hold → Admin Confirm → Borrow
2. Responsive check (mobile sidebar)
3. Dark mode check
4. Error handling cho các API mới

---

## Phần 5: Quy tắc & Tiêu chuẩn code

### 5.1 Bảo mật
- **Không lưu sensitive data trong localStorage**: Chỉ lưu access_token, refresh_token, và thông tin user cơ bản (username, role). Không lưu password, email.
- **XSS Prevention**: Không dùng `dangerouslySetInnerHTML`. Tất cả user input phải qua React JSX (auto-escaped).
- **CSRF**: Sử dụng Bearer Token (không cookie-based auth) nên CSRF không áp dụng.
- **Token Expiry**: Interceptor tự động refresh token khi 401. Nếu refresh thất bại → redirect to login, xóa sạch localStorage.
- **Role Guard**: Tất cả admin routes đều wrap trong `<AdminRoute>` component. Client-side guard chỉ là UX convenience, server-side `@PreAuthorize` là source of truth.
- **Input Validation**: Validate form inputs ở client-side (UX), nhưng luôn tin tưởng server-side validation là final.
- **API Error Handling**: Không leak error stack traces. Hiển thị `error.response.data.message` hoặc generic message.

### 5.2 Tổ chức code — Quy tắc tách file
- **Giới hạn 150-200 dòng / file**: Nếu một page component vượt quá 200 dòng, tách thành sub-components.
- **Ví dụ tách**:
  - `BorrowManagementPage.tsx` (container, state logic) → `BorrowSlipTable.tsx` (table rendering) + `BorrowSlipDetailDialog.tsx` (modal chi tiết)
  - `HoldManagementPage.tsx` → `HoldTable.tsx` + `HoldConfirmDialog.tsx`
  - `BookManagementPage.tsx` → `BookTable.tsx` + `BookFormDialog.tsx` + `BookCopyDialog.tsx`
- **Quy tắc đặt tên**:
  - Pages: `*Page.tsx` (PascalCase)
  - Components: `*Table.tsx`, `*Dialog.tsx`, `*Card.tsx` (PascalCase, suffix theo chức năng)
  - API: `*Api.ts` hoặc `*.ts` (camelCase)
  - Hooks: `use*.ts` (camelCase)
  - Types: Đặt trong cùng file API hoặc tách `types/*.ts` khi được reuse

### 5.3 React Query Conventions
- **Query Key Convention**: `['entity', ...params]`
  - `['books', page, size]`
  - `['book', id]`
  - `['holds', 'my', page]`
  - `['admin', 'holds', page, filter]`
  - `['borrow-slips', page]`
  - `['dashboard', 'stats']`
- **Mutation side effects**: Luôn `invalidateQueries` sau mutation thành công.
- **Error handling**: Dùng `toast.error()` từ Sonner cho mọi mutation error.
- **Loading states**: Dùng skeleton (Shadcn) hoặc `animate-pulse` cho loading, không dùng spinner toàn trang.

### 5.4 UI/UX Standards
- **Toast notifications**: Dùng `sonner` cho tất cả success/error messages.
- **Confirm dialogs**: Tất cả destructive actions (xóa, hủy) phải có confirm dialog.
- **Empty states**: Mọi danh sách phải có empty state message (không để blank).
- **Pagination**: Component pagination nhất quán giữa tất cả pages (tách thành shared component nếu cần).
- **Responsive**: Tất cả pages phải hoạt động tốt trên mobile (sidebar collapse, table horizontal scroll).
- **Accessibility**: Tất cả interactive elements phải có `aria-label` hoặc text content.
- **Consistent Vietnamese labels**: Dùng tiếng Việt cho UI labels, tiếng Anh cho code identifiers.

### 5.5 Performance
- **React Query caching**: Stale time mặc định 30s cho danh sách, 5m cho detail/stats.
- **Lazy loading**: Dùng `React.lazy()` + `Suspense` cho route-level code splitting.
- **Image optimization**: Cover images dùng `loading="lazy"` attribute.
- **Debounce search**: Tất cả search inputs phải debounce 300ms.

### 5.6 Git & Code Review
- **Commit convention**: `feat:`, `fix:`, `refactor:`, `docs:` prefix
- **No console.log**: Xóa hết trước khi commit.
- **No unused imports**: ESLint check.
- **No `any` type**: Hạn chế tối đa, dùng proper generics.

---

## Phần 6: Tổng kết impact

### Files mới cần tạo (6 files)
1. `src/api/holds.ts`
2. `src/api/borrowSlips.ts`
3. `src/pages/admin/HoldManagementPage.tsx`
4. `src/pages/student/ChatPage.tsx`
5. `src/components/shared/Pagination.tsx` (shared)
6. `src/components/shared/StatusBadge.tsx` (shared)

### Files cần sửa (14 files)
1. `src/api/auth.ts`
2. `src/api/books.ts`
3. `src/api/borrows.ts`
4. `src/api/notifications.ts`
5. `src/hooks/useAuth.tsx`
6. `src/router.tsx`
7. `src/layouts/AdminLayout.tsx`
8. `src/layouts/StudentLayout.tsx`
9. `src/pages/admin/DashboardPage.tsx`
10. `src/pages/admin/BookManagementPage.tsx`
11. `src/pages/admin/BorrowManagementPage.tsx`
12. `src/pages/student/BookDetailPage.tsx`
13. `src/pages/student/BookCatalogPage.tsx`
14. `src/pages/student/MyBorrowsPage.tsx`

### Files KHÔNG cần sửa (giữ nguyên)
- `src/api/dashboard.ts` ✅
- `src/api/users.ts` ✅
- `src/api/axios.ts` ✅
- `src/pages/admin/UserManagementPage.tsx` ✅
- `src/pages/auth/LoginPage.tsx` ✅
- `src/pages/auth/RegisterPage.tsx` ✅
- `src/pages/student/NotificationsPage.tsx` ✅ (sửa nhỏ nếu cần)
- Tất cả `src/components/ui/*` ✅
