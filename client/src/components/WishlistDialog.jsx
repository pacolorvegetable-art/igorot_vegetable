import { useEffect } from 'react'
import { useWishlist } from '../lib/useWishlist'
import { useCart } from '../lib/useCart'
import { toast } from 'sonner'
import {
  Heart,
  X,
  Package,
  Trash2,
  ShoppingCart,
  Plus,
  Check
} from 'lucide-react'

function WishlistDialog({ isOpen, onClose }) {
  const { wishlistItems, removeFromWishlist, clearWishlist, getWishlistCount } = useWishlist()
  const { addToCart } = useCart()

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleAddToCart = (product) => {
    const success = addToCart(product, '1')
    if (success) {
      toast.success(
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Check className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Added to cart!</p>
            <p className="text-xs text-muted-foreground">
              1 {product.unit || 'kg'} {product.name}
            </p>
          </div>
        </div>,
        { duration: 3000 }
      )
    }
  }

  const handleRemove = (product) => {
    removeFromWishlist(product.id)
    toast.success(`${product.name} removed from wishlist`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div 
        role="dialog"
        data-state="open"
        className="fixed z-50 grid w-[calc(100%-2rem)] max-w-lg gap-4 border bg-background p-6 shadow-lg rounded-xl duration-200 overflow-y-auto left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[85vh] lg:max-w-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-md"
        tabIndex={-1}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div className="flex flex-col space-y-1.5 text-center sm:text-left pr-6">
          <h2 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Wishlist ({getWishlistCount()})
          </h2>
        </div>

        {/* Content */}
        {wishlistItems.length === 0 ? (
          <div className="text-center py-8">
            <Heart className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No saved items yet</p>
            <p className="text-xs text-muted-foreground mt-1">Tap the heart icon on products to save them</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wishlistItems.map((product) => {
              const hasSale = product.sale_percent > 0
              const salePrice = hasSale ? (product.price * (1 - product.sale_percent / 100)) : product.price

              return (
                <div 
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20"
                >
                  {/* Product icon/image */}
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="h-full w-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-primary" />
                    )}
                  </div>

                  {/* Product details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <div className="flex items-center gap-2">
                      {hasSale ? (
                        <>
                          <p className="text-sm font-bold text-red-500">₱{salePrice.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground line-through">₱{product.price?.toFixed(2)}</p>
                        </>
                      ) : (
                        <p className="text-sm font-bold text-primary">₱{product.price?.toFixed(2)}</p>
                      )}
                      <span className="text-xs text-muted-foreground">/{product.unit || 'kg'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="inline-flex items-center justify-center rounded-md h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      title="Add to cart"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemove(product)}
                      className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Clear all button */}
            {wishlistItems.length > 1 && (
              <button
                onClick={() => {
                  clearWishlist()
                  toast.success('Wishlist cleared')
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-destructive transition-colors py-2"
              >
                Clear all items
              </button>
            )}
          </div>
        )}

        {/* Close button */}
        <button 
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  )
}

export default WishlistDialog
