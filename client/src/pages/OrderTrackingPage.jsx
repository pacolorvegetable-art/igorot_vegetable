import { useCallback, useMemo, useState, useEffect, useEffectEvent } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import {
  Sprout,
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Info,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { getCurrentUserOrderHistory, getTrackedOrdersByPhone } from '../services/settingsService'

const ORDER_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10'
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle,
    className: 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10'
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10'
  }
}

const PAYMENT_STATUS_BADGE_STYLES = {
  unpaid: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10',
  paid: 'border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10',
  refunded: 'border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-500/10'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`

const formatPaymentMethod = (paymentMethod) => {
  const labels = {
    gcash: 'GCash',
    maya: 'Maya',
    bank: 'Bank Transfer',
    cod: 'Cash on Delivery'
  }

  return labels[paymentMethod] || paymentMethod || 'Not specified'
}

function StatusBadge({ status }) {
  const config = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.pending
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors text-xs gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </div>
  )
}

function PaymentStatusBadge({ status }) {
  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${PAYMENT_STATUS_BADGE_STYLES[status] || PAYMENT_STATUS_BADGE_STYLES.unpaid}`}
    >
      {status || 'unpaid'}
    </div>
  )
}

function OrderTrackingPage({ embedded = false, onBack = null, embeddedContext = 'shop' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const phone = searchParams.get('phone')
  const targetOrderId = searchParams.get('order')
  const { user, profile, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const isSignedInCustomer = Boolean(user?.id) && profile?.role === 'customer'
  const embeddedBackLabel = embeddedContext === 'account' ? 'Back to Account' : 'Back to Shop'
  const embeddedEmptyActionLabel = embeddedContext === 'account' ? 'View Account' : 'Browse Products'
  const embeddedSubtitle = embeddedContext === 'account'
    ? 'View and preview your orders without leaving your account'
    : 'Track your orders in the same shop view'

  const fetchOrders = useEffectEvent(async () => {
    try {
      if (isSignedInCustomer) {
        setOrders(await getCurrentUserOrderHistory())
        return
      }

      setOrders(await getTrackedOrdersByPhone(phone))
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    if (authLoading) {
      setLoading(true)
      return
    }

    if (isSignedInCustomer || phone) {
      fetchOrders()
    } else {
      setLoading(false)
    }
  }, [authLoading, isSignedInCustomer, phone])

  useEffect(() => {
    if (loading || !targetOrderId) return

    const matchedOrder = orders.find((order) => order.id === targetOrderId)
    if (matchedOrder) {
      setSelectedOrder(matchedOrder)
    }
  }, [loading, orders, targetOrderId])

  const closeSelectedOrder = useCallback(() => {
    // Closing the preview should feel instant; keep this as an urgent update.
    setSelectedOrder(null)

    if (!searchParams.has('order')) return

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('order')
    setSearchParams(nextSearchParams, { replace: true })
  }, [searchParams, setSearchParams])

  const handleOrderSelect = useCallback((order) => {
    setSelectedOrder(order)
  }, [])

  const orderCards = useMemo(() => orders.map((order) => (
    <button
      key={order.id}
      type="button"
      onClick={() => handleOrderSelect(order)}
      className="w-full overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="border-b border-border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Order #{order.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(order.created_at)}
              </p>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Delivery Address</p>
              <p className="line-clamp-2 font-medium">{order.delivery_address || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="font-medium text-primary">{formatCurrency(order.total_amount)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <PaymentStatusBadge status={order.payment_status} />
          <div className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {order.order_item?.length || 0} item(s)
          </div>
          {order.payment_method && (
            <div className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {formatPaymentMethod(order.payment_method)}
            </div>
          )}
          <p className="ml-auto text-xs font-medium text-primary">Tap to preview</p>
        </div>
      </div>
    </button>
  )), [orders, handleOrderSelect])

  if (!authLoading && !isSignedInCustomer && !phone) {
    if (embedded) {
      return (
        <section className="py-4">
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <Package className="mx-auto mb-4 h-14 w-14 text-muted-foreground/60" />
            <h2 className="text-xl font-semibold text-foreground">Track Your Orders</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter a phone number from the shop page to view order updates here.
            </p>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 h-10 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90"
              >
                <ArrowLeft className="h-4 w-4" />
                {embeddedBackLabel}
              </button>
            )}
          </div>
        </section>
      )
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Invalid Tracking Link</h1>
          <p className="text-muted-foreground mb-4">Please enter a phone number to track your order</p>
          <Link
            to="/public-shop"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md rounded-md px-4 h-10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop
          </Link>
        </div>
      </div>
    )
  }

  const trackingContent = (
    <>
      <div className={embedded ? 'py-4' : 'max-w-4xl mx-auto px-4 sm:px-6 py-6'}>
        {embedded && embeddedContext !== 'account' ? (
          <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sprout className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">{isSignedInCustomer ? 'My Orders' : 'Order Tracking'}</h1>
                <p className="text-xs text-muted-foreground">{isSignedInCustomer ? embeddedSubtitle : 'Track your orders in the same shop view'}</p>
              </div>
            </div>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 h-9 text-sm font-medium transition-all duration-200 hover:bg-accent hover:text-accent-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                {embeddedBackLabel}
              </button>
            )}
          </div>
        ) : null}

        {loading && (
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 animate-pulse">
              <Package className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">Loading orders...</p>
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingBag className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">No orders found</p>
            <p className="text-sm text-muted-foreground mb-4">
              {isSignedInCustomer
                ? 'You have no orders in your account yet.'
                : 'We couldn\'t find any orders with this phone number'}
            </p>
            {embedded && onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 h-10 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90"
              >
                {embeddedEmptyActionLabel}
              </button>
            ) : (
              <Link
                to="/public-shop"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md rounded-md px-4 h-10"
              >
                Start Shopping
              </Link>
            )}
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">{isSignedInCustomer ? 'My Orders' : 'Your Orders'} ({orders.length})</h2>
            {orderCards}
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close order preview"
            className="absolute inset-0 bg-black/55"
            onClick={closeSelectedOrder}
          />

          <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  Order #{selectedOrder.id.slice(0, 8)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(selectedOrder.created_at)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {selectedOrder.order_item?.length || 0} item(s)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeSelectedOrder}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={selectedOrder.status} />
                <PaymentStatusBadge status={selectedOrder.payment_status} />
                <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  {formatPaymentMethod(selectedOrder.payment_method)}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivery Address</p>
                  <div className="mt-3 flex items-start gap-2 text-sm text-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{selectedOrder.delivery_address || 'No delivery address provided'}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment Summary</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Method</span>
                      <span className="font-medium text-foreground">{formatPaymentMethod(selectedOrder.payment_method)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium capitalize text-foreground">{selectedOrder.payment_status || 'unpaid'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="text-base font-semibold text-primary">{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Order Contents</p>
                  <p className="text-xs text-muted-foreground">Preview only</p>
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  {selectedOrder.order_item?.length > 0 ? (
                    <div className="divide-y divide-border">
                      {selectedOrder.order_item.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/50">
                            {item.product?.image_url ? (
                              <img
                                src={item.product.image_url}
                                alt={item.product?.name || item.product_name || 'Ordered product'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {item.product?.name || item.product_name || 'Unknown Product'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit || item.product?.unit || 'kg'} x {formatCurrency(item.unit_price)}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-foreground">
                            {formatCurrency(item.total_price || (item.quantity * item.unit_price))}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">No order items found.</div>
                  )}
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )

  if (embedded) {
    return <section>{trackingContent}</section>
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">{isSignedInCustomer ? 'My Orders' : 'Order Tracking'}</h1>
              <p className="text-xs text-muted-foreground">{isSignedInCustomer ? 'Your account order history' : 'Track your orders'}</p>
            </div>
          </div>
          <Link
            to="/public-shop"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md px-3 h-9"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Shop</span>
          </Link>
        </div>
      </header>

      {trackingContent}
    </div>
  )
}

export default OrderTrackingPage
