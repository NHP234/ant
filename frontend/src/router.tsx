import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import StaffLayout from '@/layouts/StaffLayout'
import StudentLayout from '@/layouts/StudentLayout'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardPage from '@/pages/admin/DashboardPage'
import BookManagementPage from '@/pages/admin/BookManagementPage'
import BorrowManagementPage from '@/pages/admin/BorrowManagementPage'
import HoldManagementPage from '@/pages/admin/HoldManagementPage'
import UserManagementPage from '@/pages/admin/UserManagementPage'
import CategoryManagementPage from '@/pages/admin/CategoryManagementPage'
import ProfilePage from '@/pages/admin/ProfilePage'
import AuditLogViewerPage from '@/pages/admin/AuditLogViewerPage'
import BookCatalogPage from '@/pages/student/BookCatalogPage'
import BookDetailPage from '@/pages/student/BookDetailPage'
import MyBorrowsPage from '@/pages/student/MyBorrowsPage'
import NotificationsPage from '@/pages/student/NotificationsPage'
import ChatPage from '@/pages/student/ChatPage'

import KioskPage from '@/pages/KioskPage'

function PrivateRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function RoleRoute({ allowedRoles }: { allowedRoles: string[] }) {
  const { user, isLoading, isLibrarian } = useAuth()

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles.includes(user.role)) return <Outlet />

  return <Navigate to={isLibrarian ? '/librarian/dashboard' : '/'} replace />
}

function RootRedirect() {
  const { isAdmin, isLibrarian } = useAuth()
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />
  if (isLibrarian) return <Navigate to="/librarian/dashboard" replace />
  return <Navigate to="/browse" replace />
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/kiosk" element={<KioskPage />} />

        <Route element={<PrivateRoute />}>
          <Route path="/" element={<RootRedirect />} />

          <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
            <Route element={<StaffLayout />}>
              <Route path="/admin/dashboard" element={<DashboardPage />} />
              <Route path="/admin/books" element={<BookManagementPage />} />
              <Route path="/admin/borrows" element={<BorrowManagementPage />} />
              <Route path="/admin/holds" element={<HoldManagementPage />} />
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/categories" element={<CategoryManagementPage />} />
              <Route path="/admin/profile" element={<ProfilePage />} />
              <Route path="/admin/audit-logs" element={<AuditLogViewerPage />} />
            </Route>
          </Route>

          <Route element={<RoleRoute allowedRoles={['LIBRARIAN']} />}>
            <Route element={<StaffLayout />}>
              <Route path="/librarian/dashboard" element={<DashboardPage />} />
              <Route path="/librarian/books" element={<BookManagementPage />} />
              <Route path="/librarian/borrows" element={<BorrowManagementPage />} />
              <Route path="/librarian/holds" element={<HoldManagementPage />} />
              <Route path="/librarian/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route element={<StudentLayout />}>
            <Route path="/browse" element={<BookCatalogPage />} />
            <Route path="/books/:id" element={<BookDetailPage />} />
            <Route path="/my-borrows" element={<MyBorrowsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
