import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useCart } from '../lib/useCart'
import { useWishlist } from '../lib/useWishlist'
import { useAuth } from '../lib/useAuth'
import CartDialog from '../components/CartDialog'
import WishlistDialog from '../components/WishlistDialog'
import {
  Bell,
  LogIn,
  Heart,
  ShoppingCart,
  Clock,
  BadgeCheck,
  Users,
  ShieldCheck,
  Leaf,
  Truck,
  Search,
  Package,
  CircleHelp,
  CircleCheck,
  TrendingDown,
  Plus,
  Minus,
  X,
  Scale,
  Check,
  Salad,
  Mountain,
  Wheat,
  Apple,
  Phone
} from 'lucide-react'
import NotificationsPanel from '../components/NotificationsPanel'
import { useNotifications } from '../hooks/useNotifications'
import { extractNotificationOrderId } from '../lib/notificationUtils'
import { getProducts } from '../services/productService'
import OrderTrackingPage from './OrderTrackingPage'

function PublicShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const trackedPhoneParam = searchParams.get('phone') || ''
  const trackedOrderIdParam = searchParams.get('order') || ''
  const isOrdersView = searchParams.get('view') === 'orders'
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAvailability, setSelectedAvailability] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isWishlistOpen, setIsWishlistOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [trackingPhone, setTrackingPhone] = useState(() => trackedPhoneParam)
  const [activeProductId, setActiveProductId] = useState(null)

  const { addToCart, setIsCartOpen, getItemCount } = useCart()
  const { toggleWishlist, isInWishlist, getWishlistCount } = useWishlist()
  const { user, profile, loading: authLoading } = useAuth()
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
  const navigate = useNavigate()
  const accountName =
    profile?.name ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Account'
  const accountInitial = accountName.trim().charAt(0).toUpperCase() || 'A'

  const openOrdersView = ({ phone = null, orderId = null } = {}) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('view', 'orders')

    if (phone) {
      nextSearchParams.set('phone', phone)
    } else {
      nextSearchParams.delete('phone')
    }

    if (orderId) {
      nextSearchParams.set('order', orderId)
    } else {
      nextSearchParams.delete('order')
    }

    setSelectedProduct(null)
    setQuantity('')
    setImageLoaded(false)
    setNotificationsOpen(false)
    setSearchParams(nextSearchParams)
  }

  const closeOrdersView = () => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('view')
    nextSearchParams.delete('phone')
    nextSearchParams.delete('order')

    setSearchParams(nextSearchParams)
  }

  // Handle order tracking
  const handleTrackOrder = () => {
    if (!trackingPhone.trim()) {
      toast.error('Please enter a phone number')
      return
    }

    openOrdersView({ phone: trackingPhone.trim() })
  }

  useEffect(() => {
    if (trackingPhone === trackedPhoneParam) return
    setTrackingPhone(trackedPhoneParam)
  }, [trackedPhoneParam, trackingPhone])

  useEffect(() => {
    if (!user || !isOrdersView) return

    const nextSearchParams = new URLSearchParams()
    nextSearchParams.set('view', 'orders')

    if (trackedOrderIdParam) {
      nextSearchParams.set('order', trackedOrderIdParam)
    }

    navigate(`/account?${nextSearchParams.toString()}`, { replace: true })
  }, [user, isOrdersView, trackedOrderIdParam, navigate])

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts({
          availableOnly: true,
          sortBy: 'name',
          sortOrder: 'asc'
        })
        setProducts(data || [])
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesAvailability =
      selectedAvailability === 'all' ||
      (selectedAvailability === 'on-hand' && product.availability_type === 'on_hand') ||
      (selectedAvailability === 'pre-order' && product.availability_type === 'pre_order')
    const matchesCategory =
      selectedCategory === 'all' ||
      product.category === selectedCategory
    return matchesSearch && matchesAvailability && matchesCategory
  })

  const onHandCount = products.filter(p => p.availability_type === 'on_hand').length
  const preOrderCount = products.filter(p => p.availability_type === 'pre_order').length
  
  // Category counts
  const fruitsCount = products.filter(p => p.category === 'fruits').length
  const highlandCount = products.filter(p => p.category === 'highland_vegetables').length
  const lowlandCount = products.filter(p => p.category === 'lowland_vegetables').length

  const categoryIconConfig = {
    highland_vegetables: {
      icon: Mountain,
      bgClass: 'bg-emerald-100 hover:bg-emerald-200 group-hover:bg-emerald-200 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 dark:group-hover:bg-emerald-900/40',
      touchBgClass: 'bg-emerald-200 dark:bg-emerald-900/40',
      iconClass: 'text-emerald-600 dark:text-emerald-400'
    },
    lowland_vegetables: {
      icon: Wheat,
      bgClass: 'bg-amber-100 hover:bg-amber-200 group-hover:bg-amber-200 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 dark:group-hover:bg-amber-900/40',
      touchBgClass: 'bg-amber-200 dark:bg-amber-900/40',
      iconClass: 'text-amber-600 dark:text-amber-400'
    },
    fruits: {
      icon: Apple,
      bgClass: 'bg-rose-100 hover:bg-rose-200 group-hover:bg-rose-200 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 dark:group-hover:bg-rose-900/40',
      touchBgClass: 'bg-rose-200 dark:bg-rose-900/40',
      iconClass: 'text-rose-600 dark:text-rose-400'
    }
  }

  const getCategoryIconConfig = (category) => (
    categoryIconConfig[category] || {
      icon: Package,
      bgClass: 'bg-primary/10 hover:bg-primary/20 group-hover:bg-primary/20',
      touchBgClass: 'bg-primary/20',
      iconClass: 'text-primary'
    }
  )

  const openProductModal = (product) => {
    setSelectedProduct(product)
    setQuantity('')
    setImageLoaded(false)
  }

  const closeProductModal = () => {
    setSelectedProduct(null)
    setQuantity('')
    setImageLoaded(false)
  }

  const handleQuantityChange = (value) => {
    const num = parseFloat(value)
    if (value === '' || (!isNaN(num) && num >= 0)) {
      setQuantity(value)
    }
  }

  const incrementQuantity = () => {
    const current = parseFloat(quantity) || 0
    setQuantity((current + 0.5).toString())
  }

  const decrementQuantity = () => {
    const current = parseFloat(quantity) || 0
    if (current > 0) {
      setQuantity(Math.max(0, current - 0.5).toString())
    }
  }

  const setPresetQuantity = (value) => {
    setQuantity(value.toString())
  }

  // Helper to get effective price considering sale
  const getEffectivePrice = (product, qty = 1) => {
    let price = qty >= 10 && product.wholesale_price 
      ? product.wholesale_price 
      : product.price
    // Apply sale discount
    if (product.sale_percent > 0) {
      price = price * (1 - product.sale_percent / 100)
    }
    return price
  }

  const calculateTotal = () => {
    const qty = parseFloat(quantity) || 0
    if (!selectedProduct) return 0
    const price = getEffectivePrice(selectedProduct, qty)
    return (qty * price).toFixed(2)
  }

  const handleAddToCart = () => {
    if (!selectedProduct || !quantity || parseFloat(quantity) <= 0) return
    
    const success = addToCart(selectedProduct, quantity)
    if (success) {
      const qty = parseFloat(quantity)
      const price = getEffectivePrice(selectedProduct, qty)
      const total = (qty * price).toFixed(2)
      
      toast.success(
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Check className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Added to cart!</p>
            <p className="text-xs text-muted-foreground">
              {qty} {selectedProduct.unit || 'kg'} {selectedProduct.name} — ₱{total}
            </p>
          </div>
        </div>,
        {
          duration: 3000,
        }
      )
      
      closeProductModal()
    }
  }

  // Instant add to cart with default quantity (1 unit)
  const handleInstantAddToCart = (product, e) => {
    e.stopPropagation() // Prevent triggering parent click events
    
    const defaultQuantity = 1
    const success = addToCart(product, defaultQuantity.toString())
    
    if (success) {
      const price = getEffectivePrice(product, defaultQuantity)
      const total = (defaultQuantity * price).toFixed(2)
      
      toast.success(
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Check className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Added to cart!</p>
            <p className="text-xs text-muted-foreground">
              {defaultQuantity} {product.unit || 'kg'} {product.name} — ₱{total}
            </p>
          </div>
        </div>,
        {
          duration: 2500,
        }
      )
    }
  }

  // Handle wishlist toggle with toast feedback
  const handleWishlistToggle = (product, e) => {
    e?.stopPropagation()
    const added = toggleWishlist(product)
    if (added) {
      toast.success(`${product.name} added to wishlist`)
    } else {
      toast.success(`${product.name} removed from wishlist`)
    }
  }

  // Get products by category for section display
  const getProductsByCategory = (category) => {
    return filteredProducts.filter(p => p.category === category)
  }

  const handleProductCardTouchStart = (productId) => {
    setActiveProductId(productId)
  }

  const clearActiveProductCard = () => {
    setActiveProductId(null)
  }

  const toggleNotificationsPanel = () => {
    setNotificationsOpen(currentValue => !currentValue)
  }

  const handleNotificationClick = async (notification) => {
    if (!notification) return

    await markNotificationAsRead(notification)

    const orderId = extractNotificationOrderId(notification)
    setNotificationsOpen(false)

    if (orderId) {
      openOrdersView({ orderId })
      return
    }

    toast.info('This notification is not linked to a specific order yet.')
  }

  const handleMarkAllNotificationsRead = async () => {
    await markAllAsRead()
  }

  const highlandProducts = getProductsByCategory('highland_vegetables')
  const lowlandProducts = getProductsByCategory('lowland_vegetables')
  const fruitProducts = getProductsByCategory('fruits')

  // Render a product card (reusable for all sections)
  const renderProductCard = (product) => {
    const hasSale = product.sale_percent > 0
    const salePrice = hasSale ? (product.price * (1 - product.sale_percent / 100)) : product.price
    const inWishlist = isInWishlist(product.id)
    const categoryConfig = getCategoryIconConfig(product.category)
    const CategoryIcon = categoryConfig.icon
    const isTouchActive = activeProductId === product.id
    
    return (
      <div
        key={product.id}
        onTouchStart={() => handleProductCardTouchStart(product.id)}
        onTouchEnd={clearActiveProductCard}
        onTouchCancel={clearActiveProductCard}
        className={`rounded-xl border border-border bg-card p-2.5 sm:p-3 flex flex-col group relative overflow-hidden min-w-0 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/70 hover:bg-emerald-50/30 hover:shadow-xl dark:hover:border-emerald-800/80 dark:hover:bg-emerald-950/10 ${
          isTouchActive
            ? '-translate-y-1 border-emerald-300/70 bg-emerald-50/30 shadow-xl dark:border-emerald-800/80 dark:bg-emerald-950/10'
            : ''
        }`}
      >
        {/* Sale badge */}
        {hasSale && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
              -{product.sale_percent}%
            </div>
          </div>
        )}

        <button 
          onClick={(e) => handleWishlistToggle(product, e)}
          className="absolute top-1.5 left-1.5 z-10 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-7 w-7"
        >
          <Heart className={`h-3.5 w-3.5 transition-colors ${inWishlist ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
        </button>

        {/* Centered product identity */}
        <div 
          className={`mb-2.5 mt-5 sm:mt-6 rounded-xl border border-border/70 bg-muted/30 px-2 py-3 sm:px-3 sm:py-4 flex flex-col items-center text-center cursor-pointer transition-all duration-300 group-hover:border-emerald-200 group-hover:bg-white/80 group-hover:shadow-sm dark:group-hover:border-emerald-900 dark:group-hover:bg-emerald-950/20 ${
            isTouchActive
              ? 'border-emerald-200 bg-white/80 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/20'
              : ''
          }`}
          onClick={() => openProductModal(product)}
        >
          <div className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border border-white/60 shadow-sm flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md ${categoryConfig.bgClass} ${
            isTouchActive ? `scale-105 shadow-md ${categoryConfig.touchBgClass}` : ''
          }`}>
            <CategoryIcon className={`h-6 w-6 sm:h-7 sm:w-7 ${categoryConfig.iconClass}`} />
          </div>
          <p className={`mt-2 font-semibold text-sm sm:text-base text-foreground line-clamp-2 leading-tight transition-colors duration-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 ${
            isTouchActive ? 'text-emerald-700 dark:text-emerald-300' : ''
          }`}>
            {product.name}
          </p>
        </div>

        {/* Stock info */}
        <p className="text-[11px] text-muted-foreground mb-1 leading-tight text-center">
          {product.stock_quantity > 0 
            ? `${product.stock_quantity} ${product.unit || 'kg'} available`
            : 'Pre-order only'}
        </p>

        {/* Harvest freshness indicator */}
        {product.harvested_at && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-1 text-center">
            {(() => {
              const harvest = new Date(product.harvested_at)
              const today = new Date()
              const diffDays = Math.floor((today - harvest) / (1000 * 60 * 60 * 24))
              if (diffDays === 0) return '🌿 Harvested today'
              if (diffDays === 1) return '🌿 Harvested yesterday'
              if (diffDays <= 3) return `🌿 ${diffDays} days fresh`
              return `📦 Harvested ${diffDays}d ago`
            })()}
          </p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mt-1.5 mb-1.5 justify-center">
          {product.availability_type === 'on_hand' ? (
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors text-[10px] gap-1 border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10">
              <CircleCheck className="h-2.5 w-2.5" />
              On-Hand
            </div>
          ) : (
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors text-[10px] gap-1 border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10">
              <Clock className="h-2.5 w-2.5" />
              Pre-Order
            </div>
          )}
        </div>

        {/* Wholesale price hint */}
        {product.wholesale_price && (
          <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 border-dashed">
            <TrendingDown className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 truncate">
                Bulk: ₱{product.wholesale_price?.toFixed(2)}/{product.unit || 'kg'}
              </span>
              <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/70">
                Order 10+ {product.unit || 'kg'} to unlock
              </span>
            </div>
          </div>
        )}

        {/* Price and add button */}
        <div className="flex items-center justify-between mt-auto pt-1 gap-1 min-w-0">
          <div className="min-w-0">
            {hasSale ? (
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm font-bold text-red-500 leading-tight">
                  ₱{salePrice.toFixed(2)}
                  <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">
                    /{product.unit || 'kg'}
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground line-through">
                  ₱{product.price?.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className="text-xs sm:text-sm font-bold text-primary leading-tight truncate min-w-0">
                ₱{product.price?.toFixed(2)}
                <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">
                  /{product.unit || 'kg'}
                </span>
              </p>
            )}
          </div>
          <button 
            onClick={(e) => handleInstantAddToCart(product, e)}
            className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md rounded-md h-7 sm:h-8 px-1.5 sm:px-2 shrink-0 touch-manipulation text-[10px] sm:text-xs gap-0.5 sm:gap-1"
          >
            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden xs:inline">Add</span>
          </button>
        </div>
      </div>
    )
  }

  // Render a category section
  const renderCategorySection = (title, products, borderColor) => {
    if (products.length === 0) return null
    
    return (
      <div className={`mb-6 border-t pt-3 ${borderColor}`}>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-base sm:text-lg">{title}</h3>
          <span className="text-xs text-muted-foreground">({products.length})</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {products.map(renderProductCard)}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-28 sm:pb-4">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 sm:h-16 px-2 sm:px-5 lg:px-8">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <Salad className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-bold text-foreground truncate">Igorot Vegetable</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Fresh produce, daily prices</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <span className="hidden sm:inline-flex">
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-8 w-8">
                <CircleHelp className="h-4 w-4" />
                <span className="sr-only">Help guide</span>
              </button>
            </span>
            {user && (
              <button
                type="button"
                onClick={toggleNotificationsPanel}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {hasUnread && (
                  <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                )}
              </button>
            )}
            {user ? (
              <button 
                onClick={() => navigate('/account')}
                className="inline-flex h-9 w-9 items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-all duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 sm:w-auto sm:gap-1 sm:px-3 text-xs sm:text-sm"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                  {accountInitial}
                </div>
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {accountName}
                </span>
              </button>
            ) : (
              <Link
                to="/auth/retail"
                className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-9 rounded-md gap-1 text-xs sm:text-sm px-1.5 sm:px-3"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
            <button
              onClick={() => setIsWishlistOpen(true)}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-10 w-10 relative"
            >
              <Heart className={`h-4 w-4 ${getWishlistCount() > 0 ? 'fill-red-500 text-red-500' : ''}`} />
              {getWishlistCount() > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                  {getWishlistCount()}
                </span>
              )}
            </button>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md relative gap-1 sm:gap-2 px-2 sm:px-3"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Cart</span>
              {getItemCount() > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {getItemCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        panelClassName="fixed inset-x-4 top-[4.25rem] z-[80] overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:left-auto sm:right-5 sm:top-[4.75rem] sm:w-[min(24rem,calc(100vw-2.5rem))] lg:right-8"
        backdropClassName="fixed inset-0 z-[70] cursor-default"
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        unreadCount={unreadCount}
        hasUnread={hasUnread}
        isMarkingAllRead={isMarkingAllRead}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onNotificationClick={handleNotificationClick}
      />

      <div className="max-w-6xl mx-auto px-3 sm:px-5 lg:px-8 overflow-x-hidden">
        {isOrdersView ? (
          <OrderTrackingPage embedded onBack={closeOrdersView} embeddedContext="shop" />
        ) : (
          <>
            <div className="pt-3 sm:pt-4 space-y-3">
              {/* Trust badges */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 sm:p-4 overflow-hidden">
                <div className="flex gap-4 sm:gap-4 overflow-x-auto scrollbar-hide sm:grid sm:grid-cols-5 pb-0.5">
                  <div className="flex items-center gap-2 text-sm shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground text-xs sm:text-sm whitespace-nowrap">Verified Local Farm</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground text-xs sm:text-sm whitespace-nowrap">500+ Orders Served</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground text-xs sm:text-sm whitespace-nowrap">98% Satisfaction</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Leaf className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground text-xs sm:text-sm whitespace-nowrap">Farm-Fresh Guarantee</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Truck className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground text-xs sm:text-sm whitespace-nowrap">Same-Day Delivery</span>
                  </div>
                </div>
              </div>

              {!authLoading && !user && (
                <div className="bg-muted/50 border border-border rounded-xl p-3 sm:p-4 overflow-hidden">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">Track Your Order</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Enter the phone number you used when ordering.
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-9 h-9 text-base sm:text-sm"
                          placeholder="09XX XXX XXXX"
                          value={trackingPhone}
                          onChange={(e) => setTrackingPhone(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleTrackOrder()
                            }
                          }}
                        />
                      </div>
                      <button
                        onClick={handleTrackOrder}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md rounded-md px-3 h-9"
                      >
                        Track
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm pl-10 text-base h-11 sm:h-10"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Availability filters */}
            <div className="flex items-center gap-1.5 sm:gap-2 py-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedAvailability('all')}
            className={`inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md gap-1 sm:gap-1.5 text-[11px] sm:text-xs shrink-0 h-8 px-2.5 sm:px-3 ${
              selectedAvailability === 'all'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            All
            <div className={`inline-flex items-center rounded-full border py-0.5 font-semibold transition-colors ml-0.5 h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px] ${
              selectedAvailability === 'all'
                ? 'border-transparent bg-primary-foreground/20 text-primary-foreground'
                : 'border-transparent bg-secondary text-secondary-foreground'
            }`}>
              {products.length}
            </div>
          </button>
          <button
            onClick={() => setSelectedAvailability('on-hand')}
            className={`inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md gap-1 sm:gap-1.5 text-[11px] sm:text-xs shrink-0 h-8 px-2.5 sm:px-3 ${
              selectedAvailability === 'on-hand'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            On-Hand
            <div className="inline-flex items-center rounded-full border py-0.5 font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground ml-0.5 h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px]">
              {onHandCount}
            </div>
          </button>
          <button
            onClick={() => setSelectedAvailability('pre-order')}
            className={`inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md gap-1 sm:gap-1.5 text-[11px] sm:text-xs shrink-0 h-8 px-2.5 sm:px-3 ${
              selectedAvailability === 'pre-order'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Pre-Order
            <div className="inline-flex items-center rounded-full border py-0.5 font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground ml-0.5 h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px]">
              {preOrderCount}
            </div>
          </button>
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-1.5 sm:gap-2 pb-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md gap-1 sm:gap-1.5 text-[11px] sm:text-xs shrink-0 h-8 px-2.5 sm:px-3 ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setSelectedCategory('highland_vegetables')}
            className={`inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md gap-1 sm:gap-1.5 text-[11px] sm:text-xs shrink-0 h-8 px-2.5 sm:px-3 ${
              selectedCategory === 'highland_vegetables'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            🏔️ Highland
            <div className="inline-flex items-center rounded-full border py-0.5 font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground ml-0.5 h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px]">
              {highlandCount}
            </div>
          </button>
          <button
            onClick={() => setSelectedCategory('lowland_vegetables')}
            className={`inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md gap-1 sm:gap-1.5 text-[11px] sm:text-xs shrink-0 h-8 px-2.5 sm:px-3 ${
              selectedCategory === 'lowland_vegetables'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            🌾 Lowland
            <div className="inline-flex items-center rounded-full border py-0.5 font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground ml-0.5 h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px]">
              {lowlandCount}
            </div>
          </button>
          <button
            onClick={() => setSelectedCategory('fruits')}
            className={`inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md gap-1 sm:gap-1.5 text-[11px] sm:text-xs shrink-0 h-8 px-2.5 sm:px-3 ${
              selectedCategory === 'fruits'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            🍎 Fruits
            <div className="inline-flex items-center rounded-full border py-0.5 font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground ml-0.5 h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px]">
              {fruitsCount}
            </div>
          </button>
        </div>

        {/* Products grid */}
        <div className="pt-3 pb-8">
          {loading ? (
            <div className="text-center py-16">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 animate-pulse">
                <Package className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">No products found</p>
              <p className="text-sm text-muted-foreground">Try a different search term or browse all categories</p>
            </div>
          ) : selectedCategory === 'all' ? (
            /* Show categorized sections when "All Types" is selected */
            <div className="space-y-2">
              {renderCategorySection(
                'Highland Vegetables',
                highlandProducts,
                'border-emerald-200 dark:border-emerald-800'
              )}
              {renderCategorySection(
                'Lowland Vegetables',
                lowlandProducts,
                'border-amber-200 dark:border-amber-800'
              )}
              {renderCategorySection(
                'Fruits',
                fruitProducts,
                'border-red-200 dark:border-red-800'
              )}
            </div>
          ) : (
            /* Show flat grid when a specific category is selected */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map(renderProductCard)}
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeProductModal}
          />
          
          {/* Modal */}
          <div className="fixed z-50 w-[calc(100%-2rem)] max-w-lg gap-4 border bg-background shadow-lg rounded-xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:max-w-xl p-0 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in-0 zoom-in-95">
            {/* Image section - only loads when modal opens */}
            <div className="relative bg-muted/30 flex items-center justify-center overflow-hidden transition-all duration-300 cursor-pointer shrink-0 h-36 sm:h-52">
              {selectedProduct.image_url ? (
                <>
                  {!imageLoaded && (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-pulse" />
                      <span className="text-xs">Loading image...</span>
                    </div>
                  )}
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className={`w-full h-full object-cover ${imageLoaded ? 'block' : 'hidden'}`}
                    onLoad={() => setImageLoaded(true)}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Package className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
                  <span className="text-xs">No photo available</span>
                </div>
              )}
            </div>

            {/* Content section */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3">
              {/* Title with favorite button */}
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold tracking-tight text-lg sm:text-xl leading-tight">
                  {selectedProduct.name}
                </h2>
                <button 
                  onClick={(e) => handleWishlistToggle(selectedProduct, e)}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-8 w-8 shrink-0"
                >
                  <Heart className={`h-4 w-4 transition-colors ${isInWishlist(selectedProduct.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                </button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1">
                {selectedProduct.stock_quantity > 0 ? (
                  <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors text-[10px] gap-1 border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10">
                    <CircleCheck className="h-3 w-3" />
                    On-Hand
                  </div>
                ) : (
                  <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors text-[10px] gap-1 border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10">
                    <Clock className="h-3 w-3" />
                    Pre-Order
                  </div>
                )}
              </div>

              {/* Stock info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4 shrink-0" />
                <span>
                  {selectedProduct.stock_quantity > 0 
                    ? `${selectedProduct.stock_quantity} ${selectedProduct.unit || 'kg'} available`
                    : 'Pre-order only'}
                </span>
              </div>

              {/* Price section */}
              <div className="border-t border-border pt-3">
                <div className="flex items-end justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      ₱{selectedProduct.price?.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">per {selectedProduct.unit || 'kg'}</p>
                  </div>
                </div>

                {/* Wholesale price hint */}
                {selectedProduct.wholesale_price && (
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs font-medium">
                        Wholesale: ₱{selectedProduct.wholesale_price?.toFixed(2)}/{selectedProduct.unit || 'kg'} — order 10+ {selectedProduct.unit || 'kg'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity selector */}
              <div className="bg-muted/40 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm font-medium">Enter custom weight</p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={decrementQuantity}
                    disabled={!quantity || parseFloat(quantity) <= 0}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10 shrink-0 touch-manipulation"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm text-center text-base font-semibold pr-12 h-10"
                      step="0.1"
                      min="0"
                      max={selectedProduct.stock_quantity || 9999}
                      placeholder="e.g. 0.5 kg"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      {selectedProduct.unit || 'kg'}
                    </span>
                  </div>

                  <button 
                    onClick={incrementQuantity}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10 shrink-0 touch-manipulation"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Quick quantity buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {[0.25, 0.5, 1, 2, 5].map((val) => (
                    <button
                      key={val}
                      onClick={() => setPresetQuantity(val)}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-xs h-8 px-3 touch-manipulation"
                    >
                      {val} {selectedProduct.unit || 'kg'}
                    </button>
                  ))}
                  <button
                    onClick={() => setPresetQuantity(10)}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md text-xs h-8 px-3 touch-manipulation bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800"
                  >
                    10 {selectedProduct.unit || 'kg'} (wholesale)
                  </button>
                </div>
              </div>

              {/* Add to cart button */}
              <div className="pb-1">
                <button 
                  onClick={handleAddToCart}
                  disabled={!quantity || parseFloat(quantity) <= 0}
                  className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md rounded-lg px-8 w-full gap-2 h-11 touch-manipulation"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {quantity && parseFloat(quantity) > 0 
                    ? `Add to Cart — ₱${calculateTotal()}`
                    : 'Enter quantity to add'}
                </button>
              </div>
            </div>

            {/* Close button */}
            <button 
              onClick={closeProductModal}
              className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background/80 backdrop-blur p-1"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Dialog */}
      <CartDialog />

      {/* Wishlist Dialog */}
      <WishlistDialog isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />
    </div>
  )
}

export default PublicShopPage
