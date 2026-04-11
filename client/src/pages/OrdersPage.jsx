import { useCallback, useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ShoppingCart,
  Search,
  CheckCircle2,
  XCircle,
  Package,
  Loader2,
  Phone,
  Mail,
  User,
  CreditCard,
  RefreshCw,
  Trash2,
  MapPin,
  Calendar,
  X
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { getOrders, updateOrderStatus, updateOrderPaymentStatus, deleteOrder } from '../services/settingsService'
import {
  ORDER_STATUS_OPTIONS,
  ORDER_STATUS_BADGE_CLASSNAMES,
  formatOrderStatusLabel
} from '../lib/orderStatus'

const PAYMENT_STATUS_COLORS = {
  unpaid: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

const PAYMENT_STATUS_OPTIONS = ['unpaid', 'paid', 'refunded']

const formatCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`

const formatPaymentMethodLabel = (paymentMethod) => {
  const labels = {
    gcash: 'GCash',
    maya: 'Maya',
    bank: 'Bank Transfer',
    cod: 'Cash on Delivery'
  }

  return labels[paymentMethod] || paymentMethod || 'Not specified'
}

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [statusActionLoading, setStatusActionLoading] = useState('')
  const [paymentActionLoading, setPaymentActionLoading] = useState('')
  const [deleteModalOrder, setDeleteModalOrder] = useState(null)
  const [deletingOrderId, setDeletingOrderId] = useState('')
  const targetOrderId = searchParams.get('order')

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    if (loading || !targetOrderId) return

    const matchedOrder = orders.find((order) => order.id === targetOrderId)
    if (matchedOrder) {
      setSelectedOrder(matchedOrder)
    }
  }, [loading, orders, targetOrderId])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await getOrders()
      setOrders(data)
    } catch (err) {
      console.error('Failed to load orders:', err)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const closeSelectedOrder = useCallback(() => {
    setSelectedOrder(null)

    if (!searchParams.has('order')) return

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('order')
    setSearchParams(nextSearchParams, { replace: true })
  }, [searchParams, setSearchParams])

  const handleOrderSelect = useCallback((order) => {
    setSelectedOrder(order)
  }, [])

  const handleStatusChange = async (orderId, newStatus) => {
    setStatusActionLoading(newStatus)

    try {
      await updateOrderStatus(orderId, newStatus)
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      )
      toast.success(`Order ${newStatus === 'confirmed' ? 'confirmed' : 'rejected'}`)
      closeSelectedOrder()
    } catch (err) {
      console.error('Failed to update status:', err)
      toast.error('Failed to update order status')
    } finally {
      setStatusActionLoading('')
    }
  }

  const handlePaymentStatusChange = async (orderId, newStatus) => {
    setPaymentActionLoading(newStatus)

    try {
      await updateOrderPaymentStatus(orderId, newStatus)
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? { ...order, payment_status: newStatus } : order
        )
      )
      setSelectedOrder((currentOrder) =>
        currentOrder?.id === orderId ? { ...currentOrder, payment_status: newStatus } : currentOrder
      )
      toast.success(`Payment status updated to ${newStatus}`)
    } catch (err) {
      console.error('Failed to update payment status:', err)
      toast.error('Failed to update payment status')
    } finally {
      setPaymentActionLoading('')
    }
  }

  const handleDeleteOrder = async (orderId) => {
    setDeletingOrderId(orderId)

    try {
      await deleteOrder(orderId)
      setOrders((currentOrders) => currentOrders.filter((order) => order.id !== orderId))
      setDeleteModalOrder(null)
      closeSelectedOrder()
      toast.success('Order deleted successfully')
    } catch (err) {
      console.error('Failed to delete order:', err)
      toast.error('Failed to delete order')
    } finally {
      setDeletingOrderId('')
    }
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesSearch = normalizedSearchQuery.length === 0 ||
      order.customer_name?.toLowerCase().includes(normalizedSearchQuery) ||
      order.customer_phone?.includes(searchQuery) ||
      order.id.toLowerCase().includes(normalizedSearchQuery)
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  }), [orders, normalizedSearchQuery, searchQuery, statusFilter])

  const orderCards = useMemo(() => filteredOrders.map((order) => (
    <button
      key={order.id}
      type="button"
      className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
      onClick={() => handleOrderSelect(order)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">
              {order.customer_name || 'Walk-in Customer'}
            </p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              ORDER_STATUS_BADGE_CLASSNAMES[order.status] || ORDER_STATUS_BADGE_CLASSNAMES.pending
            }`}>
              {formatOrderStatusLabel(order.status)}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PAYMENT_STATUS_COLORS[order.payment_status]}`}>
              {order.payment_status}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="font-mono text-xs">#{order.id.slice(0, 8)}</span>
            <span>{new Date(order.created_at).toLocaleString()}</span>
            <span>{order.order_item?.length || 0} item(s)</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-primary">{formatCurrency(order.total_amount)}</p>
          <p className="text-xs text-muted-foreground">Tap to preview</p>
        </div>
      </div>
    </button>
  )), [filteredOrders, handleOrderSelect])

  const canAcceptOrder = selectedOrder && selectedOrder.status !== 'confirmed'
  const canRejectOrder = selectedOrder && selectedOrder.status !== 'rejected'

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage customer orders and confirm or reject them
            </p>
          </div>
          <button
            onClick={loadOrders}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, phone, or order ID..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              All
            </button>
            {ORDER_STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {formatOrderStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 py-16 text-center">
            <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-foreground">No orders found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Orders will appear here when customers place them'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orderCards}
          </div>
        )}

        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close order preview"
              className="absolute inset-0 bg-black/55"
              onClick={closeSelectedOrder}
            />
            <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-background shadow-lg">
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedOrder.customer_name || 'Walk-in Customer'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono text-xs">#{selectedOrder.id.slice(0, 8)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(selectedOrder.created_at).toLocaleString()}
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
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                    ORDER_STATUS_BADGE_CLASSNAMES[selectedOrder.status] || ORDER_STATUS_BADGE_CLASSNAMES.pending
                  }`}>
                    {formatOrderStatusLabel(selectedOrder.status)}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${PAYMENT_STATUS_COLORS[selectedOrder.payment_status]}`}>
                    {selectedOrder.payment_status}
                  </span>
                  {selectedOrder.payment_method && (
                    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                      {formatPaymentMethodLabel(selectedOrder.payment_method)}
                    </span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
                    <div className="mt-2 space-y-2 text-sm">
                      {selectedOrder.customer_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedOrder.customer_name}</span>
                        </div>
                      )}
                      {selectedOrder.customer_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedOrder.customer_phone}</span>
                        </div>
                      )}
                      {selectedOrder.customer_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="break-all">{selectedOrder.customer_email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivery</p>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <span>{selectedOrder.delivery_address || 'No delivery address provided'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">
                          {formatPaymentMethodLabel(selectedOrder.payment_method)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Order Items</p>
                    <p className="text-sm font-semibold text-primary">{formatCurrency(selectedOrder.total_amount)}</p>
                  </div>
                  <div className="divide-y divide-border rounded-lg border border-border bg-card">
                    {selectedOrder.order_item?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit} × {formatCurrency(item.unit_price)}
                            </p>
                          </div>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-foreground">{formatCurrency(item.total_price)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t border-border bg-muted/20 p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedOrder.id, 'confirmed')}
                    disabled={!canAcceptOrder || Boolean(statusActionLoading)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {statusActionLoading === 'confirmed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedOrder.id, 'rejected')}
                    disabled={!canRejectOrder || Boolean(statusActionLoading)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {statusActionLoading === 'rejected' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Reject
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Payment:</span>
                    <select
                      value={selectedOrder.payment_status}
                      onChange={(event) => handlePaymentStatusChange(selectedOrder.id, event.target.value)}
                      disabled={Boolean(paymentActionLoading)}
                      className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {PAYMENT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status} className="capitalize">
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ml-auto">
                    <button
                      type="button"
                      onClick={() => setDeleteModalOrder(selectedOrder)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteModalOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close delete confirmation"
              className="absolute inset-0 bg-black/55"
              onClick={() => {
                if (!deletingOrderId) {
                  setDeleteModalOrder(null)
                }
              }}
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-foreground">Delete order?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This will permanently remove order #{deleteModalOrder.id.slice(0, 8)} for{' '}
                    {deleteModalOrder.customer_name || 'this customer'}.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOrder(null)}
                  disabled={Boolean(deletingOrderId)}
                  className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteOrder(deleteModalOrder.id)}
                  disabled={Boolean(deletingOrderId)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
                >
                  {deletingOrderId === deleteModalOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
