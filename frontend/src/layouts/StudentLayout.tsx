import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import NotificationBell from '@/components/shared/NotificationBell'
import ThemeToggle from '@/components/shared/ThemeToggle'
import { Search, BookMarked, Bell, Bot, Menu, ExternalLink, Library } from 'lucide-react'

const navItems = [
  { path: '/browse', label: 'Khám phá', icon: Search },
  { path: '/my-borrows', label: 'Tủ sách của tôi', icon: BookMarked },
  { path: '/notifications', label: 'Thông báo', icon: Bell },
  { path: '/chat', label: 'Thư ký Ant', icon: Bot },
]

function SidebarContent() {
  const { isAdmin, isLibrarian } = useAuth()
  const staffHref = isAdmin ? '/admin/dashboard' : '/librarian/dashboard'
  const staffLabel = isAdmin ? 'Trang quản trị' : 'Bàn thủ thư'

  return (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-xl">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2 text-primary font-heading mb-1">
          <Library className="h-6 w-6" />
          <h1 className="text-xl font-bold tracking-tight">Awaken Ant</h1>
        </div>
        <p className="text-xs font-serif italic text-muted-foreground ml-8">Nơi tri thức thức tỉnh</p>
      </div>
      <div className="px-4"><Separator className="bg-border/50" /></div>
      
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 translate-x-1'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      {(isAdmin || isLibrarian) && (
        <>
          <div className="px-4"><Separator className="bg-border/50" /></div>
          <div className="p-4">
            <NavLink
              to={staffHref}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
            >
              <ExternalLink className="h-4 w-4" />
              {staffLabel}
            </NavLink>
          </div>
        </>
      )}
    </div>
  )
}

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay z-0"></div>
      
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border/50 bg-card/40 relative z-20">
        <SidebarContent />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        {/* Glassmorphism Header */}
        <header className="flex h-16 items-center gap-4 border-b border-border/50 bg-background/60 backdrop-blur-md px-4 md:px-8 sticky top-0 z-30">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 border-r-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 rounded-full pl-2 pr-4 bg-muted/30 hover:bg-muted/60 transition-colors">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">{user?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  {user?.role}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <div className="absolute inset-0 max-w-full">
            <div className="h-full w-full p-4 md:p-8 pb-20">
              {/* Page transitions based on route change */}
              <div key={location.pathname} className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
                <Outlet />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
