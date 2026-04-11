import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { WishlistContext } from './wishlistContext'

const GUEST_WISHLIST_STORAGE_KEY = 'igorot_vegetable_wishlist_guest'
const CUSTOMER_WISHLIST_STORAGE_KEY_PREFIX = 'igorot_vegetable_wishlist_customer:'
const GUEST_CACHE_TTL_MS = 24 * 60 * 60 * 1000

const parseJson = (value, fallbackValue) => {
  if (!value) return fallbackValue

  try {
    return JSON.parse(value)
  } catch {
    return fallbackValue
  }
}

const readGuestWishlist = () => {
  if (typeof window === 'undefined') return []

  const payload = parseJson(window.localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY), null)
  if (!payload || !Array.isArray(payload.items)) {
    return []
  }

  if (!payload.expiresAt || Date.now() > payload.expiresAt) {
    window.localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY)
    return []
  }

  return payload.items
}

const writeGuestWishlist = (items) => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(
    GUEST_WISHLIST_STORAGE_KEY,
    JSON.stringify({
      items,
      expiresAt: Date.now() + GUEST_CACHE_TTL_MS
    })
  )
}

const readCustomerWishlist = (customerId) => {
  if (typeof window === 'undefined' || !customerId) return []

  return parseJson(
    window.localStorage.getItem(`${CUSTOMER_WISHLIST_STORAGE_KEY_PREFIX}${customerId}`),
    []
  )
}

const writeCustomerWishlist = (customerId, items) => {
  if (typeof window === 'undefined' || !customerId) return

  window.localStorage.setItem(
    `${CUSTOMER_WISHLIST_STORAGE_KEY_PREFIX}${customerId}`,
    JSON.stringify(items)
  )
}

const mergeWishlistItems = (baseItems, incomingItems) => {
  const mergedById = new Map()

  baseItems.forEach((item) => {
    if (item?.id) mergedById.set(item.id, item)
  })

  incomingItems.forEach((item) => {
    if (item?.id && !mergedById.has(item.id)) {
      mergedById.set(item.id, item)
    }
  })

  return Array.from(mergedById.values())
}

export function WishlistProvider({ children }) {
  const { user, profile } = useAuth()
  const isSignedInCustomer = Boolean(user?.id) && profile?.role === 'customer'
  const [wishlistItems, setWishlistItems] = useState(() => readGuestWishlist())

  useEffect(() => {
    if (isSignedInCustomer) {
      const customerItems = readCustomerWishlist(user.id)
      const guestItems = readGuestWishlist()
      const mergedItems = mergeWishlistItems(customerItems, guestItems)

      const syncTimer = setTimeout(() => {
        setWishlistItems(mergedItems)
      }, 0)
      writeCustomerWishlist(user.id, mergedItems)

      if (guestItems.length > 0 && typeof window !== 'undefined') {
        window.localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY)
      }

      return () => clearTimeout(syncTimer)
    }

    const syncTimer = setTimeout(() => {
      setWishlistItems(readGuestWishlist())
    }, 0)

    return () => clearTimeout(syncTimer)
  }, [isSignedInCustomer, user?.id])

  // Persist wishlist based on guest/customer context.
  useEffect(() => {
    if (isSignedInCustomer) {
      writeCustomerWishlist(user.id, wishlistItems)
      return
    }

    writeGuestWishlist(wishlistItems)
  }, [isSignedInCustomer, user?.id, wishlistItems])

  const addToWishlist = (product) => {
    setWishlistItems(prev => {
      // Check if already in wishlist
      if (prev.some(item => item.id === product.id)) {
        return prev
      }
      return [...prev, product]
    })
  }

  const removeFromWishlist = (productId) => {
    setWishlistItems(prev => prev.filter(item => item.id !== productId))
  }

  const toggleWishlist = (product) => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id)
      return false
    } else {
      addToWishlist(product)
      return true
    }
  }

  const isInWishlist = (productId) => {
    return wishlistItems.some(item => item.id === productId)
  }

  const clearWishlist = () => {
    setWishlistItems([])
  }

  const getWishlistCount = () => {
    return wishlistItems.length
  }

  return (
    <WishlistContext.Provider value={{
      wishlistItems,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
      clearWishlist,
      getWishlistCount
    }}>
      {children}
    </WishlistContext.Provider>
  )
}
