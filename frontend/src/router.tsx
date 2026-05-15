import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AdminLayout from '@/layouts/AdminLayout'
import StudentLayout from '@/layouts/StudentLayout'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardPage from '@/pages/admin/DashboardPage'
import BookManagementPage from '@/pages/admin/BookManagementPage'
import BorrowManagementPage from '@/pages/admin/BorrowManagementPage'
import UserManagementPage from '@/pages/admin/UserManagementPage'
import BookCatalogPage from '@/pages/student/BookCatalogPage'
import BookDetailPage from '@/pages/student/BookDetailPage'
import MyBorrowsPage from '@/pages/student/MyBorrowsPage'
import NotificationsPage from '@/pages/student/NotificationsPage'

function PrivateRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function AdminRoute() {
  const { isAdmin, isLibrarian } = useAuth()
  return isAdmin || isLibrarian ? <Outlet /> : <Navigate to="/" replace />
}

function RootRedirect() {
  const { isAdmin, isLibrarian } = useAuth()
  if (isAdmin || isLibrarian) return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/browse" replace />
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Authenticated */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<RootRedirect />} />

          {/* Admin/Librarian */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<DashboardPage />} />
              <Route path="/admin/books" element={<BookManagementPage />} />
              <Route path="/admin/borrows" element={<BorrowManagementPage />} />
              <Route path="/admin/users" element={<UserManagementPage />} />
            </Route>
          </Route>

          {/* Student (or any authenticated user) */}
          <Route element={<StudentLayout />}>
            <Route path="/browse" element={<BookCatalogPage />} />
            <Route path="/books/:id" element={<BookDetailPage />} />
            <Route path="/my-borrows" element={<MyBorrowsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
