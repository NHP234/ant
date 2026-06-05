import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState, type ComponentType } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import NotificationBell from '@/components/shared/NotificationBell'
import ThemeToggle from '@/components/shared/ThemeToggle'
import { cn } from '@/lib/utils'
import {
  ArrowLeftRight,
  BookOpen,
  Clock,
  ExternalLink,
  LayoutDashboard,
  Library,
  Menu,
  ScrollText,
  Tags,
  User,
  Users,
} from 'lucide-react'

interface StaffNavItem {
  path: string
  label: string
  icon: ComponentType<{ className?: string }>
}

interface StaffNavGroup {
  label: string
  items: StaffNavItem[]
}

const operationItems = (basePath: '/admin' | '/librarian'): StaffNavItem[] => [
  { path: `${basePath}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
  { path: `${basePath}/books`, label: 'Quản lý sách', icon: BookOpen },
  { path: `${basePath}/borrows`, label: 'Mượn / Trả', icon: ArrowLeftRight },
  { path: `${basePath}/holds`, label: 'Đặt trước', icon: Clock },
]

const adminNavGroups: StaffNavGroup[] = [
  { label: 'Vận hành', items: operationItems('/admin') },
  {
    label: 'Quản trị',
    items: [
      { path: '/admin/users', label: 'Người dùng', icon: Users },
      { path: '/admin/categories', label: 'Danh mục', icon: Tags },
      { path: '/admin/audit-logs', label: 'Nhật ký', icon: ScrollText },
    ],
  },
]

const librarianNavGroups: StaffNavGroup[] = [
  {
    label: 'Bàn thủ thư',
    items: [
      ...operationItems('/librarian'),
      { path: '/librarian/profile', label: 'Hồ sơ', icon: User },
    ],
  },
]

function SidebarContent({ role }: { role: string | undefined }) {
  const isAdmin = role === 'ADMIN'
  const navGroups = isAdmin ? adminNavGroups : librarianNavGroups
  const studentLinkLabel = isAdmin ? 'Xem trang sinh viên' : 'Xem catalog'

  return (
    <div className="flex h-full flex-col bg-card/70 backdrop-blur-xl">
      <div className="p-6 pb-4">
        <div className="mb-1 flex items-center gap-2 font-heading text-primary">
          <Library className="h-6 w-6" />
          <h1 className="text-xl font-bold tracking-tight">Awaken Ant</h1>
        </div>
        <p className="ml-8 text-xs text-muted-foreground">
          {isAdmin ? 'Quản trị hệ thống' : 'Bàn thủ thư'}
        </p>
      </div>

      <div className="px-4">
        <Separator className="bg-border/50" />
      </div>

      <nav className="flex-1 space-y-5 p-4">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <div className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  data-testid={`staff-nav-${item.path.replaceAll('/', '-').slice(1)}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/15'
                        : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="px-4">
        <Separator className="bg-border/50" />
      </div>
      <div className="p-4">
        <NavLink
          to="/browse"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          {studentLinkLabel}
        </NavLink>
      </div>
    </div>
  )
}

export default function StaffLayout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const profilePath = isAdmin ? '/admin/profile' : '/librarian/profile'
  const roleLabel = isAdmin ? 'Quản trị viên' : 'Thủ thư'

  const userInitial = useMemo(
    () => user?.username?.charAt(0).toUpperCase() ?? 'U',
    [user?.username]
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay" />

      <aside className="relative z-20 hidden border-r border-border/50 bg-card/40 md:flex md:w-64 md:flex-col">
        <SidebarContent role={user?.role} />
      </aside>

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-background/60 px-4 backdrop-blur-md md:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Mở menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-r-0 p-0">
              <SidebarContent role={user?.role} />
            </SheetContent>
          </Sheet>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {roleLabel}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {isAdmin ? 'Không gian quản trị' : 'Không gian vận hành'}
            </p>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 rounded-full bg-muted/30 pl-2 pr-4 transition-colors hover:bg-muted/60">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">{user?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem disabled className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {user?.role}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(profilePath)} className="cursor-pointer">
                  Thông tin cá nhân
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto overflow-x-hidden">
          <div className="h-full w-full p-4 pb-20 md:p-8">
            <div key={location.pathname} className="animate-in fade-in slide-in-from-bottom-4 h-full duration-500">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
