import { createContext, useContext, useState, useCallback } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)

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

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
