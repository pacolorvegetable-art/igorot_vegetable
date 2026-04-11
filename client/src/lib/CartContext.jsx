import { useCallback, useEffect, useState } from 'react'
import { CartContext } from './cartContext'
import { useAuth } from './useAuth'
const GUEST_CART_STORAGE_KEY = 'igorot_vegetable_cart_guest'
const CUSTOMER_CART_STORAGE_KEY_PREFIX = 'igorot_vegetable_cart_customer:'
const GUEST_CACHE_TTL_MS = 24 * 60 * 60 * 1000

const parseJson = (value, fallbackValue) => {
  if (!value) return fallbackValue

  try {
    return JSON.parse(value)
  } catch {
    return fallbackValue
  }
}

const readGuestCart = () => {
  if (typeof window === 'undefined') return []

  const payload = parseJson(window.localStorage.getItem(GUEST_CART_STORAGE_KEY), null)
  if (!payload || !Array.isArray(payload.items)) {
    return []
  }

  if (!payload.expiresAt || Date.now() > payload.expiresAt) {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY)
    return []
  }

  return payload.items
}

const writeGuestCart = (items) => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(
    GUEST_CART_STORAGE_KEY,
    JSON.stringify({
      items,
      expiresAt: Date.now() + GUEST_CACHE_TTL_MS
    })
  )
}

const readCustomerCart = (customerId) => {
  if (typeof window === 'undefined' || !customerId) return []

  return parseJson(
    window.localStorage.getItem(`${CUSTOMER_CART_STORAGE_KEY_PREFIX}${customerId}`),
    []
  )
}

const writeCustomerCart = (customerId, items) => {
  if (typeof window === 'undefined' || !customerId) return

  window.localStorage.setItem(
    `${CUSTOMER_CART_STORAGE_KEY_PREFIX}${customerId}`,
    JSON.stringify(items)
  )
}

const mergeCartItems = (baseItems, incomingItems) => {
  const merged = [...baseItems]

  incomingItems.forEach((incomingItem) => {
    const existingIndex = merged.findIndex(
      (item) => item.product?.id === incomingItem.product?.id
    )

    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        quantity: Number(merged[existingIndex].quantity || 0) + Number(incomingItem.quantity || 0)
      }
      return
    }

    merged.push(incomingItem)
  })

  return merged
}

export function CartProvider({ children }) {
  const { user, profile } = useAuth()
  const isSignedInCustomer = Boolean(user?.id) && profile?.role === 'customer'
  const [cartItems, setCartItems] = useState(() => readGuestCart())
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    if (isSignedInCustomer) {
      const customerItems = readCustomerCart(user.id)
      const guestItems = readGuestCart()
      const mergedItems = mergeCartItems(customerItems, guestItems)

      const syncTimer = setTimeout(() => {
        setCartItems(mergedItems)
      }, 0)
      writeCustomerCart(user.id, mergedItems)

      if (guestItems.length > 0 && typeof window !== 'undefined') {
        window.localStorage.removeItem(GUEST_CART_STORAGE_KEY)
      }

      return () => clearTimeout(syncTimer)
    }

    const syncTimer = setTimeout(() => {
      setCartItems(readGuestCart())
    }, 0)

    return () => clearTimeout(syncTimer)
  }, [isSignedInCustomer, user?.id])

  useEffect(() => {
    if (isSignedInCustomer) {
      writeCustomerCart(user.id, cartItems)
      return
    }

    writeGuestCart(cartItems)
  }, [cartItems, isSignedInCustomer, user?.id])

  const addToCart = useCallback((product, quantity) => {
    const qty = parseFloat(quantity)
    if (!qty || qty <= 0) return false

    setCartItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => item.product.id === product.id)
      
      if (existingIndex >= 0) {
        // Update existing item quantity
        const newItems = [...prevItems]
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + qty
        }
        return newItems
      } else {
        // Add new item
        return [...prevItems, { product, quantity: qty }]
      }
    })
    
    return true
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.product.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId, newQuantity) => {
    const qty = parseFloat(newQuantity)
    if (!qty || qty <= 0) {
      removeFromCart(productId)
      return
    }

    setCartItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId
          ? { ...item, quantity: qty }
          : item
      )
    )
  }, [removeFromCart])

  const clearCart = useCallback(() => {
    setCartItems([])
  }, [])

  const getItemCount = useCallback(() => {
    return cartItems.length
  }, [cartItems])

  const getTotalQuantity = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0)
  }, [cartItems])

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((sum, item) => {
      let price = item.quantity >= 10 && item.product.wholesale_price
        ? item.product.wholesale_price
        : item.product.price
      // Apply sale discount
      if (item.product.sale_percent > 0) {
        price = price * (1 - item.product.sale_percent / 100)
      }
      return sum + (item.quantity * price)
    }, 0)
  }, [cartItems])

  const getItemPrice = useCallback((item) => {
    let price = item.quantity >= 10 && item.product.wholesale_price
      ? item.product.wholesale_price
      : item.product.price
    // Apply sale discount
    if (item.product.sale_percent > 0) {
      price = price * (1 - item.product.sale_percent / 100)
    }
    return price
  }, [])

  const value = {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getItemCount,
    getTotalQuantity,
    getCartTotal,
    getItemPrice
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}
