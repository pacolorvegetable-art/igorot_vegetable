import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Bell,
  CircleHelp,
  ChevronDown,
  Clock3,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Package,
  PanelLeftClose,
  PencilLine,
  Phone,
  Save,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserRound,
  Users
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { updateCustomer } from '../services/customerService'
import { getCurrentUserOrderHistory } from '../services/settingsService'
import NotificationsPanel from '../components/NotificationsPanel'
import { useNotifications } from '../hooks/useNotifications'
import { extractNotificationOrderId } from '../lib/notificationUtils'
import { ACTIVE_ORDER_STATUSES } from '../lib/orderStatus'

function SectionCard({ icon: Icon, title, action, children }) {
  return (
    <section className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4 sm:p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight sm:text-2xl">
          <Icon className="h-4 w-4 shrink-0 text-primary" />
          {title}
        </h2>
        {action}
      </div>
      <div className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">{children}</div>
    </section>
  )
}

function CountCard({ icon: Icon, title, value, description, loading }) {
  return (
    <section className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </span>
        {title}
      </div>
      {loading ? (
        <div className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : (
        <div>
          <p className="text-4xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
      )}
    </section>
  )
}

function AccountPage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showEditProfileForm, setShowEditProfileForm] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [savingDeliveryAddress, setSavingDeliveryAddress] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' })
  const [deliveryAddressForm, setDeliveryAddressForm] = useState('')
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
    recipientRole: 'customer',
    recipientUserId: user?.id
  })

  const accountName =
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Account'
  const accountInitial = accountName.trim().charAt(0).toUpperCase() || 'A'
  const accountRoleLabel = profile?.role === 'staff' ? 'Staff' : 'Customer'

  useEffect(() => {
    setProfileForm({
      name: profile?.name || user?.user_metadata?.full_name || '',
      email: user?.email || profile?.email || '',
      phone: profile?.phone || ''
    })
  }, [profile, user])

  useEffect(() => {
    setDeliveryAddressForm(profile?.delivery_address || '')
  }, [profile?.delivery_address])

  useEffect(() => {
    let isMounted = true

    const loadOrders = async () => {
      if (!user?.id) {
        if (isMounted) {
          setOrders([])
          setOrdersLoading(false)
        }
        return
      }

      try {
        setOrdersLoading(true)
        const nextOrders = await getCurrentUserOrderHistory()

        if (isMounted) {
          setOrders(nextOrders)
        }
      } catch (error) {
        console.error('Failed to load account orders:', error)
        if (isMounted) {
          setOrders([])
          toast.error('Failed to load account details')
        }
      } finally {
        if (isMounted) setOrdersLoading(false)
      }
    }

    loadOrders()
    return () => {
      isMounted = false
    }
  }, [user?.id])

  const activeOrders = orders.filter(order => ACTIVE_ORDER_STATUSES.includes(order.status))

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    if (!user) return

    const nextName = profileForm.name.trim()
    const nextPhone = profileForm.phone.trim()
    if (!nextName) {
      toast.error('Full name is required')
      return
    }

    try {
      setSavingProfile(true)
      await updateCustomer(user.id, { name: nextName, phone: nextPhone || null })
      await refreshProfile(user)
      toast.success('Profile updated')
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleDeliveryAddressSave = async () => {
    if (!user) return

    const nextDeliveryAddress = deliveryAddressForm.trim()

    try {
      setSavingDeliveryAddress(true)
      await updateCustomer(user.id, { delivery_address: nextDeliveryAddress || null })
      await refreshProfile(user)
      toast.success(nextDeliveryAddress ? 'Delivery address saved' : 'Saved delivery address cleared')
    } catch (error) {
      console.error('Failed to save delivery address:', error)
      toast.error('Failed to save delivery address')
    } finally {
      setSavingDeliveryAddress(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setMobileMenuOpen(false)
      setMobileProfileMenuOpen(false)
      setNotificationsOpen(false)
      setIsSigningOut(true)
      await signOut()
      toast.success('Signed out successfully')
      navigate('/auth/retail')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to sign out')
    } finally {
      setIsSigningOut(false)
    }
  }

  const sidebarItems = [
    { icon: Store, label: 'Shop', onClick: () => navigate('/public-shop') },
    { icon: ShoppingCart, label: 'My Orders', onClick: () => navigate('/track-order') }
  ]

  const openMobileMenu = () => {
    setMobileMenuOpen(true)
    setMobileProfileMenuOpen(false)
    setNotificationsOpen(false)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const toggleMobileProfileMenu = () => {
    setMobileProfileMenuOpen(currentValue => !currentValue)
    setMobileMenuOpen(false)
    setNotificationsOpen(false)
  }

  const toggleNotificationsPanel = () => {
    setMobileMenuOpen(false)
    setMobileProfileMenuOpen(false)
    setNotificationsOpen(currentValue => !currentValue)
  }

  const openNotificationsPanel = () => {
    setMobileMenuOpen(false)
    setMobileProfileMenuOpen(false)
    setNotificationsOpen(true)
  }

  const handleMobileNotificationsClick = () => {
    toggleNotificationsPanel()
  }

  const handleMobileHelpClick = () => {
    setMobileProfileMenuOpen(false)
    toast.info('Need help? Please contact the shop for account support.')
  }

  const handleNotificationClick = async (notification) => {
    if (!notification) return

    await markNotificationAsRead(notification)

    const orderId = extractNotificationOrderId(notification)
    setNotificationsOpen(false)

    if (orderId) {
      navigate(`/track-order?order=${encodeURIComponent(orderId)}`)
      return
    }

    toast.info('This notification is not linked to a specific order yet.')
  }

  const handleMarkAllNotificationsRead = async () => {
    await markAllAsRead()
  }

  return (
    <div className="min-h-screen flex">
      <aside className="fixed left-0 top-0 z-[60] hidden h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Package className="h-4.5 w-4.5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-base font-bold tracking-tight text-foreground">Farmia</h1>
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Inventory</p>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-b border-sidebar-border/50 px-2 py-1.5">
          <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
          <button
            type="button"
            onClick={toggleNotificationsPanel}
            className={`sidebar-item group relative w-full text-left ${notificationsOpen ? 'sidebar-item-active' : ''}`}
          >
            <Bell className="h-[18px] w-[18px] shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-sidebar-accent-foreground" />
            <span className="truncate">Notifications</span>
            {hasUnread && (
              <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </button>

          <div className="mx-2 mb-1.5 mt-4 border-t border-sidebar-border/40"></div>
          <button className="sidebar-section-title group flex w-full items-center justify-between">
            <span className="transition-colors group-hover:text-sidebar-foreground">My Account</span>
            <ChevronDown className="h-3 w-3 transition-transform duration-200 group-hover:text-sidebar-foreground" />
          </button>

          <div className="space-y-0.5">
            {sidebarItems.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  className="sidebar-item group w-full text-left"
                  onClick={item.onClick}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-sidebar-accent-foreground" />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
            <button type="button" className="sidebar-item group w-full text-left sidebar-item-active">
              <Users className="h-[18px] w-[18px] shrink-0 text-primary" />
              <span className="truncate">My Account</span>
            </button>
          </div>
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-2">
          <div className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/50">
            <span className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/10">
              <span className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {accountInitial}
              </span>
            </span>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">{accountName}</p>
              <div className="mt-0.5 inline-flex items-center rounded-full border border-transparent bg-secondary px-1.5 py-0 text-[9px] font-medium text-secondary-foreground">
                {accountRoleLabel}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-[1px] animate-fade-in md:hidden"
            onClick={closeMobileMenu}
          />
          <div className="fixed inset-y-0 left-0 z-[70] w-72 max-w-[86vw] border-r border-border bg-background shadow-2xl animate-slide-in-left md:hidden">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">My Account</p>
                <p className="text-[11px] text-muted-foreground">{accountRoleLabel}</p>
              </div>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Close menu"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-border px-4 py-4">
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {accountInitial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{accountName}</p>
                  <p className="truncate text-xs text-muted-foreground">{accountRoleLabel}</p>
                </div>
              </div>
            </div>

            <nav className="space-y-1 p-3">
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={openNotificationsPanel}
              >
                <Bell className="h-4 w-4 shrink-0" />
                <span className="truncate">Notifications</span>
                {hasUnread && (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </button>

              {sidebarItems.map(item => {
                const Icon = item.icon

                return (
                  <button
                    key={item.label}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      closeMobileMenu()
                      item.onClick()
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}

              <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary">
                <Users className="h-4 w-4 shrink-0" />
                <span className="truncate">My Account</span>
              </div>
            </nav>
          </div>
        </>
      )}

      <main className="flex-1 md:ml-64">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dcfce7_0%,#f8fafc_45%,#ffffff_100%)]">
          <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
            <div className="relative">
              <div className="flex h-12 items-center justify-between px-3 sm:h-14 sm:px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={openMobileMenu}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="hidden items-center gap-1.5 rounded-md border border-border/50 bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground sm:flex">
                    <Clock3 className="h-3 w-3" />
                    <span>PHT</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleMobileNotificationsClick}
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {hasUnread && (
                      <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                    )}
                  </button>

                  <div className="hidden sm:block">
                    <button
                      type="button"
                      onClick={handleMobileHelpClick}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label="Help"
                    >
                      <CircleHelp className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={toggleMobileProfileMenu}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ring-offset-background transition-all duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-haspopup="menu"
                      aria-expanded={mobileProfileMenuOpen}
                    >
                      <span className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full">
                        <span className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {accountInitial}
                        </span>
                      </span>
                    </button>

                    {mobileProfileMenuOpen && (
                      <>
                        <button
                          type="button"
                          aria-label="Close account menu"
                          className="fixed inset-0 z-[55] cursor-default md:hidden"
                          onClick={() => setMobileProfileMenuOpen(false)}
                        />
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-[60] mt-2 w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
                        >
                          <div className="flex items-center gap-3 p-2">
                            <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
                              <span className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary">
                                {accountInitial}
                              </span>
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{accountName}</p>
                              <p className="truncate text-xs text-muted-foreground">{accountRoleLabel}</p>
                            </div>
                          </div>

                          <div className="-mx-1 my-1 h-px bg-muted" />

                          <button
                            type="button"
                            role="menuitem"
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-accent focus:bg-accent focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <header className="sticky top-0 z-40 hidden border-b bg-white/80 backdrop-blur-sm md:block">
            <div className="mx-auto max-w-6xl px-6">
              <div className="flex h-16 items-center justify-between">
                <Link to="/public-shop" className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Shop
                </Link>
                <h1 className="text-lg font-bold text-primary">My Account</h1>
                <div className="flex w-24 justify-end">
                  <button
                    type="button"
                    onClick={toggleNotificationsPanel}
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4.5 w-4.5" />
                    {hasUnread && (
                      <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 lg:px-8 md:pb-8">
            <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {accountInitial}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{accountName}</h2>
                  <p className="text-sm text-gray-500">{accountRoleLabel}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <CountCard
                  icon={Clock3}
                  title="Active Orders"
                  value={activeOrders.length}
                  description="Orders that are still pending review or already confirmed."
                  loading={ordersLoading}
                />
                <CountCard
                  icon={ShoppingBag}
                  title="Orders"
                  value={orders.length}
                  description="Total number of orders linked to this account."
                  loading={ordersLoading}
                />
              </div>

              <SectionCard
                icon={PencilLine}
                title="Edit Profile Account"
                action={
                  <button
                    type="button"
                    onClick={() => setShowEditProfileForm(currentValue => !currentValue)}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground sm:text-sm"
                  >
                    {showEditProfileForm ? 'Hide Form' : 'Edit Profile'}
                  </button>
                }
              >
                <div className="grid gap-3 rounded-lg border border-dashed border-border p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Name</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{profileForm.name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Email</p>
                    <p className="mt-1 break-all text-sm font-medium text-foreground">{profileForm.email || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Phone</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{profileForm.phone || 'Not set'}</p>
                  </div>
                </div>

                {showEditProfileForm && (
                  <form className="space-y-3" onSubmit={handleProfileSubmit}>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={profileForm.name}
                          onChange={(event) =>
                            setProfileForm(currentForm => ({ ...currentForm, name: event.target.value }))
                          }
                          placeholder="Your full name"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          className="flex h-10 w-full rounded-md border border-input bg-muted/40 py-2 pl-10 pr-3 text-sm text-muted-foreground"
                          value={profileForm.email}
                          disabled
                          readOnly
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Email is currently managed by your sign-in account.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={profileForm.phone}
                          onChange={(event) =>
                            setProfileForm(currentForm => ({ ...currentForm, phone: event.target.value }))
                          }
                          placeholder="09XX XXX XXXX"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
                    >
                      {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Changes
                    </button>
                  </form>
                )}
              </SectionCard>

              <SectionCard icon={MapPin} title="Delivery Address">
                <div className="rounded-lg border border-dashed border-border p-4">
                  <p className="text-sm font-medium text-foreground">Saved delivery address</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This address auto-fills checkout when you are signed in, and you can still change it before placing an order.
                  </p>

                  <div className="mt-3 space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Delivery Address</label>
                    <textarea
                      className="flex min-h-[104px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Street, Barangay, Municipality, Province"
                      value={deliveryAddressForm}
                      onChange={(event) => setDeliveryAddressForm(event.target.value)}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDeliveryAddressSave}
                      disabled={savingDeliveryAddress}
                      className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
                    >
                      {savingDeliveryAddress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Address
                    </button>
                    <span className="text-[11px] text-muted-foreground">
                      {profile?.delivery_address?.trim()
                        ? 'Your saved address is ready for checkout autofill.'
                        : 'No saved delivery address yet.'}
                    </span>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          <nav className="fixed bottom-0 left-0 right-0 z-[60] isolate border-t border-border bg-background/95 backdrop-blur-lg md:hidden">
            <div className="flex h-[60px] items-center justify-around px-1">
              <Link className="flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground transition-all duration-150 active:scale-95 hover:text-foreground" to="/public-shop">
                <div className="flex h-7 w-12 items-center justify-center rounded-full">
                  <Store className="h-[20px] w-[20px]" />
                </div>
                <span className="text-[10px] font-medium leading-tight">Shop</span>
              </Link>
              <Link className="flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground transition-all duration-150 active:scale-95 hover:text-foreground" to="/track-order">
                <div className="flex h-7 w-12 items-center justify-center rounded-full">
                  <ShoppingCart className="h-[20px] w-[20px]" />
                </div>
                <span className="text-[10px] font-medium leading-tight">Orders</span>
              </Link>
              <Link className="relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-primary transition-all duration-150 active:scale-95" to="/account">
                <div className="flex h-7 w-12 items-center justify-center rounded-full bg-primary/12">
                  <Users className="h-[20px] w-[20px] text-primary" />
                </div>
                <span className="text-[10px] font-semibold leading-tight text-primary">Account</span>
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary"></span>
              </Link>
              <button
                type="button"
                onClick={openMobileMenu}
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
      </main>

      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        panelClassName="fixed inset-x-4 top-[4.25rem] z-[80] overflow-hidden rounded-xl border border-border bg-card shadow-2xl md:left-auto md:right-6 md:top-[5rem] md:w-[min(24rem,calc(100vw-3rem))]"
        backdropClassName="fixed inset-0 z-[70] cursor-default"
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        unreadCount={unreadCount}
        hasUnread={hasUnread}
        isMarkingAllRead={isMarkingAllRead}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onNotificationClick={handleNotificationClick}
      />
    </div>
  )
}

export default AccountPage
