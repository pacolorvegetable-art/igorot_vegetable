import { useState } from 'react'
import { useCart } from '../lib/CartContext'
import CheckoutDialog from './CheckoutDialog'
import {
  ShoppingCart,
  Leaf,
  Minus,
  Plus,
  Trash2,
  X,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Package
} from 'lucide-react'

function CartDialog() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    getItemPrice
  } = useCart()

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsCartOpen(false)
    }
  }

  const handleQuantityChange = (productId, value) => {
    const num = parseFloat(value)
    if (value === '' || (!isNaN(num) && num >= 0)) {
      updateQuantity(productId, num || 0)
    }
  }

  const incrementQuantity = (item) => {
    updateQuantity(item.product.id, item.quantity + 0.5)
  }

  const decrementQuantity = (item) => {
    if (item.quantity > 0.5) {
      updateQuantity(item.product.id, item.quantity - 0.5)
    } else {
      removeFromCart(item.product.id)
    }
  }

  // Calculate estimated savings (assuming ~10% savings vs market)
  const estimatedSavings = (getCartTotal() * 0.1).toFixed(2)

  return (
    <>
      {/* Cart Dialog */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />
          
          {/* Dialog */}
          <div 
            role="dialog"
            data-state="open"
            className="fixed z-50 w-[calc(100%-2rem)] max-w-lg border bg-background shadow-lg rounded-xl duration-200 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:max-w-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
            style={{ pointerEvents: 'auto' }}
          >
            {/* Header */}
            <div className="flex flex-col space-y-1.5 text-center sm:text-left shrink-0 px-5 pt-5 pb-3 border-b border-border/50">
              <h2 className="text-lg font-semibold leading-none tracking-tight flex items-center justify-between">
                <span className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Your Cart
                </span>
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                </div>
              </h2>
              <p className="text-sm text-muted-foreground sr-only">Review items in your cart</p>
            </div>

            {/* Cart Items */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-3 space-y-2.5">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Package className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Your cart is empty</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Add some fresh vegetables to get started!</p>
                </div>
              ) : (
                cartItems.map((item) => {
                  const itemPrice = getItemPrice(item)
                  const itemTotal = (item.quantity * itemPrice).toFixed(2)
                  const isWholesale = item.quantity >= 10 && item.product.wholesale_price

                  return (
                    <div key={item.product.id} className="flex gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {item.product.image_url ? (
                          <img 
                            src={item.product.image_url} 
                            alt={item.product.name}
                            className="h-full w-full object-cover rounded-lg"
                          />
                        ) : (
                          <Leaf className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate leading-tight">{item.product.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                ₱{itemPrice.toFixed(2)}/{item.product.unit || 'kg'}
                              </span>
                              {isWholesale && (
                                <span className="text-xs text-emerald-600 font-medium">(wholesale)</span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm font-bold text-foreground whitespace-nowrap">₱{itemTotal}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 bg-background rounded-lg border border-border/60 p-0.5">
                            <button 
                              onClick={() => decrementQuantity(item)}
                              className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive touch-manipulation"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input 
                              type="number"
                              className="flex rounded-md border-input ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm w-12 h-7 text-center text-sm font-semibold p-0 border-0 bg-transparent focus-visible:ring-0"
                              step="0.5"
                              min="0"
                              max="100"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.product.id, e.target.value)}
                            />
                            <button 
                              onClick={() => incrementQuantity(item)}
                              className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary touch-manipulation"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.product.id)}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rounded-md h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="px-5 pb-5 pt-3 space-y-3 border-t border-border/50 shrink-0 bg-muted/30">
                {/* Savings badge */}
                <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-primary/5 border border-primary/10">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs font-medium text-foreground">
                    You're saving approximately <span className="font-bold text-primary">₱{estimatedSavings}</span> vs market prices!
                  </p>
                </div>

                <div data-orientation="horizontal" role="none" className="shrink-0 bg-border h-[1px] w-full" />

                {/* Total */}
                <div className="flex items-center justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">₱{getCartTotal().toFixed(2)}</span>
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

                {/* Checkout button */}
                <button 
                  onClick={() => {
                    setIsCartOpen(false)
                    setIsCheckoutOpen(true)
                  }}
                  className="inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md px-4 py-2 w-full gap-2 h-11 text-base rounded-xl font-semibold shadow-sm"
                >
                  Proceed to Checkout — ₱{getCartTotal().toFixed(2)}
                </button>
              </div>
            )}

            {/* Close button */}
            <button 
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>
      )}

      {/* Checkout Dialog */}
      <CheckoutDialog 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
      />
    </>
  )
}

export default CartDialog
