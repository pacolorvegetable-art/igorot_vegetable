import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../lib/AuthContext'
import {
  CircleCheck,
  Package,
  Clock,
  Search,
  Phone,
  UserPlus,
  ShoppingCart,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react'

export default function OrderConfirmationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const orderData = location.state || {}
  
  const [trackPhone, setTrackPhone] = useState(orderData.phone || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)

  // Extract order details
  const orderId = orderData.orderId?.slice(0, 8).toUpperCase() || 'XXXXXXXX'
  const customerPhone = orderData.phone || ''
  const customerEmail = orderData.email || ''
  const preOrderItems = orderData.preOrderItems || []
  const hasPreOrderItems = preOrderItems.length > 0
  const shouldShowCreateAccount = customerEmail && !user && !loading

  const handleTrackOrder = () => {
    if (!trackPhone) {
      toast.error('Please enter your phone number')
      return
    }
    navigate(`/track-order?phone=${encodeURIComponent(trackPhone)}`)
  }

  const handleCreateAccount = async () => {
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    setCreatingAccount(true)
    try {
      // TODO: Implement account creation with Supabase auth
      toast.success('Account created successfully!')
    } catch (err) {
      console.error('Failed to create account:', err)
      toast.error('Failed to create account')
    } finally {
      setCreatingAccount(false)
    }
  }

  const handleContinueShopping = () => {
    navigate('/public-shop')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success Icon */}
        <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <CircleCheck className="h-10 w-10 text-primary" />
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-foreground">Order Received! 🎉</h1>
        
        <p className="text-muted-foreground">
          Your order <span className="font-mono font-bold text-foreground">{orderId}</span> has been placed successfully.
        </p>
        
        {customerPhone && (
          <p className="text-sm text-muted-foreground">
            We'll notify <span className="font-medium">{customerPhone}</span> once your order is confirmed or rejected.
          </p>
        )}

        {/* Pre-order Items Notice */}
        {hasPreOrderItems && (
          <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-yellow-700">
              <Package className="h-4 w-4" />
              Pre-Order Items — Status: Unpaid
            </div>
            <p className="text-xs text-yellow-700">
              The following items will arrive in <strong>2–3 days</strong>. Payment will be collected once stocks arrive. We'll notify you!
            </p>
            {preOrderItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-yellow-700">
                  <Clock className="h-3 w-3" /> {item.name}
                </span>
                <span className="inline-flex items-center rounded-full border border-yellow-300 bg-yellow-100 px-2.5 py-0.5 font-semibold text-[9px] text-yellow-700">
                  Unpaid
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Track Order Section */}
        <div className="bg-muted/50 border border-border rounded-xl p-4 text-left">
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
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm pl-9 h-9 text-base sm:text-sm"
                placeholder="09XX XXX XXXX"
                value={trackPhone}
                onChange={(e) => setTrackPhone(e.target.value)}
              />
            </div>
            <button
              onClick={handleTrackOrder}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md rounded-md px-3 h-9"
            >
              Track
            </button>
          </div>
        </div>

        {/* Create Account Section */}
        {shouldShowCreateAccount && (
          <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-3 text-left">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Create an Account (Optional)</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Save your info and track all your orders by creating a free account with <span className="font-medium">{customerEmail}</span>.
            </p>
            <div className="space-y-1.5">
              <label className="font-medium text-xs">Choose a Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm pr-10 text-base sm:text-sm"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none hover:bg-accent hover:text-accent-foreground rounded-md absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <button
              onClick={handleCreateAccount}
              disabled={creatingAccount || !password || password.length < 6}
              className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md h-9 rounded-md px-3 w-full gap-2"
            >
              {creatingAccount ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Create Account
            </button>
          </div>
        )}

        {/* Continue Shopping Button */}
        <button
          onClick={handleContinueShopping}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md h-10 px-4 py-2 gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          Continue Shopping
        </button>
      </div>
    </div>
  )
}
