import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Mountain,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import NotificationsPanel from './NotificationsPanel'
import { useNotifications } from '../hooks/useNotifications'
import { extractNotificationOrderId } from '../lib/notificationUtils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const mobileNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart }
]

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const {
    notifications,
    notificationsLoading,
    unreadCount,
    hasUnread,
    isMarkingAllRead,
    markNotificationAsRead,
    markAllAsRead
  } = useNotifications({
    enabled: Boolean(user?.id),
    recipientRole: 'staff'
  })

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const handleNotificationClick = async (notification) => {
    if (!notification) return

    await markNotificationAsRead(notification)

    const orderId = extractNotificationOrderId(notification)
    setNotificationsOpen(false)

    if (orderId) {
      navigate(`/dashboard/orders?order=${encodeURIComponent(orderId)}`)
    }
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const isNavItemActive = (href) => {
    return location.pathname === href ||
      (href !== '/dashboard' && location.pathname.startsWith(href))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-4 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Mountain className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Igorot Vegetable</h1>
            <p className="text-[10px] text-muted-foreground">Management</p>
          </div>
          <button
            className="ml-auto lg:hidden p-1 rounded-md hover:bg-muted"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600/10 text-emerald-600'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User section at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/95 backdrop-blur px-4 lg:px-6">
          <button
            className="lg:hidden p-2 rounded-md hover:bg-muted"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen)
                setUserMenuOpen(false)
              }}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Bell className="h-5 w-5" />
              {hasUnread && (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-card" />
              )}
            </button>

            {notificationsOpen && (
              <NotificationsPanel
                open={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
                panelClassName="fixed inset-x-4 top-[4.5rem] z-20 overflow-hidden rounded-xl border border-border bg-card shadow-lg sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:w-[min(24rem,calc(100vw-2rem))]"
                notifications={notifications}
                notificationsLoading={notificationsLoading}
                unreadCount={unreadCount}
                hasUnread={hasUnread}
                isMarkingAllRead={isMarkingAllRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                onNotificationClick={handleNotificationClick}
              />
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen)
                setNotificationsOpen(false)
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-emerald-600/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-emerald-600">
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-foreground">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile?.role || 'Staff'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-lg z-20">
                  <div className="p-2">
                    <div className="px-3 py-2 border-b border-border mb-2">
                      <p className="text-sm font-medium truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 pb-24 md:p-6">
          {children}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 isolate border-t border-border bg-background/95 backdrop-blur-lg md:hidden">
        <div className="flex h-[60px] items-center justify-around px-1">
          {mobileNavigation.map((item) => {
            const isActive = isNavItemActive(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-95 ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`flex h-7 w-12 items-center justify-center rounded-full ${
                  isActive ? 'bg-primary/12' : ''
                }`}>
                  <Icon className={`h-[20px] w-[20px] ${isActive ? 'text-primary' : ''}`} />
                </div>
                <span className={`text-[10px] leading-tight ${
                  isActive ? 'font-semibold text-primary' : 'font-medium'
                }`}>
                  {item.name}
                </span>
                {isActive && (
                  <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => {
              setSidebarOpen(true)
              setNotificationsOpen(false)
              setUserMenuOpen(false)
            }}
            className="flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground transition-all duration-150 active:scale-95 hover:text-foreground"
          >
            <div className="flex h-7 w-12 items-center justify-center rounded-full">
              <Menu className="h-[20px] w-[20px]" />
            </div>
            <span className="text-[10px] font-medium leading-tight">More</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
