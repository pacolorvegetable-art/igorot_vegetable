import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCart } from '../lib/useCart'
import { useAuth } from '../lib/useAuth'
import { getPaymentMethods } from '../services/settingsService'
import { createOrder } from '../services/settingsService'
import { updateCustomer } from '../services/customerService'
import {
  X,
  Check,
  User,
  Phone,
  Mail,
  MapPin,
  StickyNote,
  Truck,
  Package,
  Clock,
  QrCode,
  Building2,
  Info,
  ShieldCheck,
  Leaf,
  RefreshCw,
  CircleCheck,
  Loader2
} from 'lucide-react'

const EMPTY_FORM_DATA = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  deliveryMethod: 'delivery',
  paymentMethod: 'gcash',
  referenceNumber: ''
}

const CASH_ON_DELIVERY_METHOD = {
  id: 'cash-on-delivery',
  type: 'cod',
  account_name: 'Cash on Delivery',
  account_number: 'Pay after delivery',
  qr_code_url: '',
  is_active: true
}

const PAYMENT_METHOD_LABELS = {
  gcash: 'GCash',
  maya: 'Maya',
  bank: 'Bank Transfer',
  cod: 'Cash on Delivery'
}

const PAYMENT_METHOD_OPTION_LABELS = {
  gcash: 'GCash',
  maya: 'Maya',
  bank: 'Bank',
  cod: 'COD'
}

const PAYMENT_METHOD_ICONS = {
  gcash: QrCode,
  maya: QrCode,
  bank: Building2,
  cod: Package
}

const NOTE_CARD_CLASS_NAME = 'flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed'
const WARNING_NOTE_CLASS_NAME = `${NOTE_CARD_CLASS_NAME} border-amber-200 bg-amber-50/70 text-amber-800`
const NEUTRAL_NOTE_CLASS_NAME = `${NOTE_CARD_CLASS_NAME} border-border/70 bg-background text-muted-foreground`
const SUCCESS_NOTE_CLASS_NAME = `${NOTE_CARD_CLASS_NAME} border-emerald-200 bg-emerald-50/70 text-emerald-800`

function CheckoutDialog({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const { cartItems, getCartTotal, getItemPrice, clearCart } = useCart()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState([])
  const isSignedInCustomer = Boolean(user?.id) && profile?.role === 'customer'
  
  // Form data
  const [formData, setFormData] = useState(EMPTY_FORM_DATA)

  // Load payment methods
  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !isSignedInCustomer) return

    setFormData(currentFormData => ({
      ...currentFormData,
      name: currentFormData.name || profile?.name || user?.user_metadata?.full_name || '',
      phone: currentFormData.phone || profile?.phone || '',
      email: currentFormData.email || user?.email || profile?.email || '',
      address: currentFormData.address || profile?.delivery_address || ''
    }))
  }, [
    isOpen,
    isSignedInCustomer,
    profile?.delivery_address,
    profile?.email,
    profile?.name,
    profile?.phone,
    user?.email,
    user?.user_metadata?.full_name
  ])

  const loadPaymentMethods = async () => {
    try {
      const methods = await getPaymentMethods(true)
      const nextMethods = methods.some(method => method.type === 'cod')
        ? methods
        : [...methods, CASH_ON_DELIVERY_METHOD]

      setPaymentMethods(nextMethods)
      setFormData(prev => ({
        ...prev,
        paymentMethod: nextMethods.some(method => method.type === prev.paymentMethod)
          ? prev.paymentMethod
          : (nextMethods[0]?.type || 'cod')
      }))
    } catch (err) {
      console.error('Failed to load payment methods:', err)
      setPaymentMethods([CASH_ON_DELIVERY_METHOD])
      setFormData(prev => ({ ...prev, paymentMethod: 'cod' }))
    }
  }

  // Close handler with cleanup
  const handleClose = () => {
    setStep(1)
    setLoading(false)
    setFormData(EMPTY_FORM_DATA)
    onClose()
  }

  // Check if cart has pre-order items
  const hasPreOrderItems = cartItems.some(item => item.product.availability_type === 'pre_order')
  const preOrderItems = cartItems.filter(item => item.product.availability_type === 'pre_order')
  const onHandItems = cartItems.filter(item => item.product.availability_type !== 'pre_order')

  // Validate form
  const isFormValid = () => {
    return formData.name && formData.phone && formData.address
  }

  // Handle form submit
  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!formData.referenceNumber && formData.paymentMethod !== 'cod') {
      toast.error('Please enter your payment reference number')
      return
    }

    setLoading(true)
    try {
      const trimmedAddress = formData.address.trim()
      const trimmedName = formData.name.trim()
      const trimmedPhone = formData.phone.trim()
      const trimmedEmail = formData.email.trim() || user?.email || profile?.email || ''
      const savedDeliveryAddress = (profile?.delivery_address || '').trim()
      const isCashOnDelivery = formData.paymentMethod === 'cod'
      const notes = [
        `Delivery: ${formData.deliveryMethod === 'delivery' ? 'Pacolor Delivery' : 'Pickup'}`,
        `Address: ${trimmedAddress}`,
        formData.notes ? `Notes: ${formData.notes}` : null,
        isCashOnDelivery ? 'Payment: Cash on Delivery' : `Ref#: ${formData.referenceNumber}`
      ]
        .filter(Boolean)
        .join('\n')

      const orderData = {
        customer_id: isSignedInCustomer ? user.id : null,
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        customer_email: trimmedEmail,
        delivery_address: trimmedAddress,
        notes,
        payment_method: formData.paymentMethod,
        payment_status: isCashOnDelivery || hasPreOrderItems ? 'unpaid' : 'paid',
        total_amount: getCartTotal(),
        status: 'pending',
        items: cartItems.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit: item.product.unit || 'kg',
          unit_price: getItemPrice(item)
        }))
      }

      const result = await createOrder(orderData)

      let savedAddressUpdateFailed = false
      if (isSignedInCustomer && trimmedAddress !== savedDeliveryAddress) {
        try {
          await updateCustomer(user.id, { delivery_address: trimmedAddress || null })
          await refreshProfile(user)
        } catch (addressError) {
          savedAddressUpdateFailed = true
          console.error('Failed to update saved delivery address:', addressError)
        }
      }
      
      // Prepare confirmation data
      const confirmationData = {
        orderId: result.id,
        phone: trimmedPhone,
        email: trimmedEmail,
        preOrderItems: preOrderItems.map(item => ({
          name: item.product.name,
          quantity: item.quantity
        }))
      }
      
      clearCart()
      handleClose()
      
      // Navigate to confirmation page
      navigate('/order-confirmation', { state: confirmationData })

      if (savedAddressUpdateFailed) {
        toast.info('Order placed, but we could not update your saved delivery address.')
      }
    } catch (err) {
      console.error('Failed to place order:', err)
      toast.error('Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Get selected payment method details
  const selectedPaymentMethod = paymentMethods.find(m => m.type === formData.paymentMethod)
  const formatPaymentMethodLabel = (paymentMethod) => {
    return PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod || 'Not selected'
  }

  const steps = [
    { num: 1, label: 'Details' },
    { num: 2, label: 'Payment' },
    { num: 3, label: 'Confirm' }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <div 
        role="dialog"
        data-state="open"
        className="fixed z-50 grid w-[calc(100%-2rem)] max-w-lg gap-4 border bg-background p-6 shadow-lg rounded-xl duration-200 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:max-w-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-md max-h-[90vh] overflow-y-auto"
        tabIndex={-1}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div className="flex flex-col space-y-1.5 text-center sm:text-left pr-6">
          <h2 className="text-lg font-semibold leading-none tracking-tight">Checkout</h2>
          <p className="text-sm text-muted-foreground">Complete your order in a few steps</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between w-full mb-4">
          {steps.map((s, i) => (
            <div key={s.num} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center gap-1">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step > s.num 
                    ? 'bg-primary text-primary-foreground' 
                    : step === s.num 
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${
                  step >= s.num ? (step === s.num ? 'text-primary' : 'text-foreground') : 'text-muted-foreground'
                }`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                  step > s.num ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Step 1: Details */}
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none flex items-center gap-1">
                  <User className="h-3 w-3" /> Name *
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm text-base sm:text-sm"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone *
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm text-base sm:text-sm"
                  placeholder="09XX XXX XXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email (optional)
                </label>
                <input
                  type="email"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm text-base sm:text-sm"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Delivery Address *
                </label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
                  placeholder="Street, Barangay, City"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
                {isSignedInCustomer && (
                  <p className="text-[11px] text-muted-foreground">
                    Filled from your account. You can update it here before placing the order.
                  </p>
                )}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none flex items-center gap-1">
                  <StickyNote className="h-3 w-3" /> Notes (optional)
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
                  placeholder="Special instructions"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div data-orientation="horizontal" role="none" className="shrink-0 bg-border h-[1px] w-full" />

              {/* Delivery Method */}
              <div className="space-y-2">
                <label className="flex items-center gap-1 text-sm font-semibold">
                  <Truck className="h-3.5 w-3.5" /> Delivery Method *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, deliveryMethod: 'delivery' }))}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-xs font-medium transition-colors ${
                      formData.deliveryMethod === 'delivery'
                        ? 'border-blue-700 bg-blue-50 text-blue-900 ring-2 ring-blue-200 ring-offset-2 ring-offset-background'
                        : 'border-blue-700 bg-blue-50/80 text-blue-900 hover:bg-blue-100'
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                    <span className="font-semibold">Pacolor Delivery</span>
                    <span className="text-[10px] font-medium text-blue-800">Fee shouldered by customer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, deliveryMethod: 'pickup' }))}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-xs font-medium transition-colors ${
                      formData.deliveryMethod === 'pickup'
                        ? 'border-green-700 bg-green-50 text-green-900 ring-2 ring-green-200 ring-offset-2 ring-offset-background'
                        : 'border-green-700 bg-green-50/80 text-green-900 hover:bg-green-100'
                    }`}
                  >
                    <Package className="h-4 w-4" />
                    <span className="font-semibold">Pickup</span>
                    <span className="text-[10px] font-medium text-green-800">Monamon Norte, Bauko</span>
                  </button>
                </div>
              </div>

              {/* Delivery Info */}
              {formData.deliveryMethod === 'delivery' && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 shadow-sm space-y-2 text-blue-950">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Truck className="h-4 w-4" />
                    Pacolor Delivery
                  </div>
                  <p className="text-xs leading-relaxed text-blue-900/80">
                    For deliveries within or near <strong>Mountain Province</strong>, we use <strong>Pacolor Delivery</strong> for same-day delivery. The Pacolor delivery fee will be shouldered by the customer and will be coordinated after order confirmation.
                  </p>
                </div>
              )}

              {/* Pickup Info */}
              {formData.deliveryMethod === 'pickup' && (
                <div className="rounded-xl border border-green-200 bg-green-50/70 p-3.5 shadow-sm space-y-2 text-green-950">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4" />
                    Pickup Location
                  </div>
                  <p className="text-xs leading-relaxed text-green-900/80">
                    Pick up your order at our store in <strong>Monamon Norte, Bauko, Mountain Province</strong>. You will be notified once your order is confirmed and ready for handoff.
                  </p>
                </div>
              )}

              {/* Pre-order Notice */}
              {hasPreOrderItems && (
                <div className="rounded-lg border-2 border-amber-700 bg-amber-50 p-3 space-y-2 text-amber-900">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4" />
                    Pre-Order Notice
                  </div>
                  <p className="text-xs text-amber-800">
                    Your cart includes <strong>pre-order item(s)</strong> that will take <strong>2–3 days</strong> before fresh stocks arrive at our <strong>Monamon Norte, Bauko</strong> store. You will be notified once your pre-order items are available.
                  </p>
                  <div className="space-y-1">
                    {preOrderItems.map(item => (
                      <div key={item.product.id} className="flex items-center gap-2 text-xs text-amber-800">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{item.product.name} × {item.quantity}</span>
                        <div className="ml-auto inline-flex items-center rounded-full border border-amber-700 bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900">
                          Unpaid – Pay after arrival
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <>
              {hasPreOrderItems && (
                <div className="rounded-lg border-2 border-amber-700 bg-amber-50 p-4 space-y-2 text-amber-900">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Clock className="h-4 w-4" />
                    Pre-Order Items in Cart
                  </div>
                  <p className="text-xs text-amber-800">
                    Your cart contains <strong>pre-order items</strong> (expected arrival: 2-3 days). These items stay marked as unpaid until they arrive and your order is settled.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-border/70 bg-background p-4 shadow-sm space-y-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">Choose Payment Method</div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Select how you want to settle this order, then follow the note below for the next step.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {paymentMethods.map(method => {
                    const Icon = PAYMENT_METHOD_ICONS[method.type] || QrCode
                    
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method.type }))}
                        className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-colors ${
                          formData.paymentMethod === method.type
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {PAYMENT_METHOD_OPTION_LABELS[method.type] || method.type}
                      </button>
                    )
                  })}
                </div>

                {paymentMethods.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No payment methods available. Please contact the store.
                  </p>
                )}

                <div className={WARNING_NOTE_CLASS_NAME}>
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>If your chosen payment method has reached its monthly receiving limit, kindly try another option above. Thank you for your understanding! 🙏</span>
                </div>

                {selectedPaymentMethod && formData.paymentMethod !== 'cod' && (
                  <>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Scan the QR code below to send payment. After paying, enter your reference number.
                    </p>

                    {selectedPaymentMethod.qr_code_url && (
                      <div className="flex justify-center">
                        <div className="bg-white rounded-xl p-3 shadow-sm border">
                          <img 
                            src={selectedPaymentMethod.qr_code_url} 
                            alt={`${selectedPaymentMethod.type} QR Code`}
                            className="w-48 h-auto rounded-lg"
                          />
                        </div>
                      </div>
                    )}

                    <div className={NEUTRAL_NOTE_CLASS_NAME}>
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>Your order will only be processed once we verify your payment reference number.</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-medium flex items-center gap-1 text-sm">
                        Reference Number *
                      </label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm text-base sm:text-sm font-mono"
                        placeholder="e.g. 1234 567 890"
                        value={formData.referenceNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                {formData.paymentMethod === 'cod' && (
                  <div className={SUCCESS_NOTE_CLASS_NAME}>
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Cash on Delivery selected. The customer will pay after the order is delivered.</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <>
              <div data-orientation="horizontal" role="none" className="shrink-0 bg-border h-[1px] w-full" />
              
              {/* Order Summary */}
              <div className="space-y-2 text-sm">
                {hasPreOrderItems && (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 pt-1">
                      <Package className="h-3 w-3 text-amber-500" /> Pre-Order Items
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold text-[9px] ml-auto border-amber-400/50 text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400">
                        Unpaid
                      </span>
                    </div>
                    {preOrderItems.map(item => (
                      <div key={item.product.id} className="flex justify-between">
                        <span className="text-amber-600 dark:text-amber-400">{item.product.name} × {item.quantity}</span>
                        <span className="text-amber-600 dark:text-amber-400">₱{(item.quantity * getItemPrice(item)).toFixed(2)}</span>
                      </div>
                    ))}
                  </>
                )}

                {onHandItems.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 pt-1">
                      <Package className="h-3 w-3 text-green-500" /> On-Hand Items
                    </div>
                    {onHandItems.map(item => (
                      <div key={item.product.id} className="flex justify-between">
                        <span>{item.product.name} × {item.quantity}</span>
                        <span>₱{(item.quantity * getItemPrice(item)).toFixed(2)}</span>
                      </div>
                    ))}
                  </>
                )}

                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">₱{getCartTotal().toFixed(2)}</span>
                </div>

                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="font-semibold text-foreground">
                      {formatPaymentMethodLabel(selectedPaymentMethod?.type || formData.paymentMethod)}
                    </span>
                  </div>
                  {formData.paymentMethod === 'cod' && (
                    <p className="mt-2 text-[11px] text-emerald-700">
                      Payment will be collected after the order is delivered.
                    </p>
                  )}
                </div>

                {hasPreOrderItems && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    * Pre-order items will be marked as "Unpaid" until stocks arrive and payment is confirmed.
                  </p>
                )}
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 py-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Secure Checkout</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Leaf className="h-4 w-4 text-primary" />
                  <span>Fresh or Refund</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <span>Easy Returns</span>
                </div>
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-2 pt-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent h-10 px-4 py-2"
              >
                Back
              </button>
            )}
            
            {step < 3 ? (
              <button
                onClick={() => {
                  if (step === 1 && !isFormValid()) {
                    toast.error('Please fill in all required fields')
                    return
                  }
                  if (step === 2 && !formData.referenceNumber && formData.paymentMethod !== 'cod') {
                    toast.error('Please enter your payment reference number')
                    return
                  }
                  setStep(step + 1)
                }}
                disabled={cartItems.length === 0}
                className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md h-10 px-4 py-2 gap-2"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md h-10 px-4 py-2 gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CircleCheck className="h-4 w-4" />
                )}
                Place Order
              </button>
            )}
          </div>
        </div>

        {/* Close button */}
        <button 
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  )
}

export default CheckoutDialog
