import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './lib/AuthContext'
import { CartProvider } from './lib/CartContext'
import { WishlistProvider } from './lib/WishlistContext'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import AuthPage from './pages/AuthPage'
import AuthRetailPage from './pages/AuthRetailPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import OrdersPage from './pages/OrdersPage'
import CustomersPage from './pages/CustomersPage'
import SettingsPage from './pages/SettingsPage'
import PublicShopPage from './pages/PublicShopPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import OrderTrackingPage from './pages/OrderTrackingPage'
import AccountPage from './pages/AccountPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
          <Toaster 
            position="top-center" 
            richColors 
            closeButton
            toastOptions={{
              duration: 3000,
              className: 'font-sans'
            }}
          />
        <Routes>
          {/* Public auth routes */}
          <Route
            path="/auth"
            element={
              <PublicRoute portalType="management">
                <AuthPage />
              </PublicRoute>
            }
          />
          <Route
            path="/auth/retail"
            element={
              <PublicRoute portalType="customer">
                <AuthRetailPage />
              </PublicRoute>
            }
          />

          {/* Public shop (no auth required) */}
          <Route path="/public-shop" element={<PublicShopPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
          <Route path="/track-order" element={<OrderTrackingPage />} />
          
          {/* Account page (requires login) */}
          <Route
            path="/account"
            element={
              <ProtectedRoute
                allowedRoles={['customer']}
                unauthenticatedRedirectTo="/auth/retail"
              >
                <AccountPage />
              </ProtectedRoute>
            }
          />

          {/* Protected management routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/products"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/orders"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/customers"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <CustomersPage />
              </ProtectedRoute>
            }
          />

          {/* Placeholder for customer shop (to be implemented) */}
          <Route
            path="/shop"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <div className="min-h-screen flex items-center justify-center bg-background">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Customer Shop</h1>
                    <p className="text-muted-foreground">Coming soon...</p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Default redirects */}
          <Route path="/" element={<Navigate to="/auth/retail" replace />} />
          <Route path="*" element={<Navigate to="/auth/retail" replace />} />
        </Routes>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
