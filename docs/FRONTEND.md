# Frontend Architecture - React

> Frontend đóng vai trò phụ trợ, dùng UI component library để tiết kiệm thời gian.

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Ant Design hoặc MUI (UI components)
- TanStack Query / React Query (data fetching, caching, mutations)
- React Router v6 (routing)
- Axios (HTTP client, interceptors cho JWT)
- Zustand hoặc Context API (global state - auth)

## Project Structure

```
frontend/src/
├── main.tsx
├── App.tsx
├── api/
│   ├── axiosConfig.ts          # Base URL, interceptors, token refresh
│   ├── bookApi.ts              # Book-related API calls
│   ├── authApi.ts              # Auth API calls
│   ├── borrowApi.ts            # Borrow/Return API calls
│   └── chatApi.ts              # RAG chat API calls
├── components/
│   ├── layout/
│   │   ├── MainLayout.tsx      # Sidebar + Header + Content
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── common/
│   │   ├── ProtectedRoute.tsx  # Auth guard
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorBoundary.tsx
│   └── features/
│       ├── BookCard.tsx
│       ├── BorrowModal.tsx
│       ├── ChatWidget.tsx      # RAG chat floating widget
│       └── NotificationBell.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── BookListPage.tsx
│   ├── BookDetailPage.tsx
│   ├── BorrowHistoryPage.tsx
│   ├── ProfilePage.tsx
│   ├── admin/
│   │   ├── AdminBooksPage.tsx
│   │   ├── AdminUsersPage.tsx
│   │   └── AdminStatsPage.tsx
│   └── NotFoundPage.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useBooks.ts             # React Query hooks cho books
│   └── useBorrow.ts
├── types/
│   ├── book.ts                 # TypeScript interfaces
│   ├── user.ts
│   └── borrow.ts
├── utils/
│   ├── constants.ts
│   └── formatDate.ts
└── styles/
    └── global.css
```

## Routing

```
/login                    # Login page (public)
/register                 # Register page (public)
/                         # Dashboard (protected)
/books                    # Book list with search (protected)
/books/:id                # Book detail (protected)
/borrow-history           # User's borrow history (protected)
/profile                  # User profile (protected)
/admin/books              # Admin: manage books (ADMIN/LIBRARIAN only)
/admin/users              # Admin: manage users (ADMIN only)
/admin/stats              # Admin: statistics (ADMIN/LIBRARIAN only)
```

## Key Implementation Notes

### Axios Interceptor
- Request interceptor: attach JWT token to Authorization header
- Response interceptor: catch 401 -> try refresh token -> retry original request -> if fail, redirect to login

### React Query
- Dùng cho tất cả data fetching (thay vì useEffect + useState)
- Auto caching, background refetch, optimistic updates
- Query keys convention: `['books'], ['books', id], ['borrow-history', userId]`

### Auth State
- JWT + Refresh Token lưu trong localStorage (hoặc httpOnly cookie nếu đủ thời gian)
- Auth context/store: user info, isAuthenticated, login(), logout()

## Pages - Mô tả chi tiết

### Dashboard
- Thống kê: tổng sách, đang mượn, quá hạn
- Sách phổ biến (top 5)
- Hoạt động gần đây
- Quick actions: tìm sách, mượn sách

### Book List
- Search bar (gọi Elasticsearch API)
- Filter theo category
- Sort theo tên/năm/popularity
- Pagination
- Grid/List view toggle

### Chat RAG Widget
- Floating button góc phải dưới
- Mở ra chat window
- Gửi message -> gọi RAG API -> hiện response
- Hiện suggestions: "Gợi ý sách về...", "Tìm sách của tác giả..."

## Status: chưa bắt đầu
