import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export function ProtectedRoute({ children, allowedRoles = [], unauthenticatedRedirectTo }) {
  const { user, profile, loading, isStaff, isCustomer } = useAuth()
  const location = useLocation()

  // Show loading while auth is initializing OR profile is being fetched
  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // No user - redirect to appropriate login page
  if (!user) {
    if (unauthenticatedRedirectTo) {
      return <Navigate to={unauthenticatedRedirectTo} state={{ from: location }} replace />
    }

    const requiresCustomerAuth =
      allowedRoles.includes('customer') && !allowedRoles.includes('staff')

    return (
      <Navigate
        to={requiresCustomerAuth ? '/auth/retail' : '/auth'}
        state={{ from: location }}
        replace
      />
    )
  }

  // If specific roles are required, check them
  if (allowedRoles.length > 0 && profile) {
    const hasAccess = allowedRoles.includes(profile.role)
    if (!hasAccess) {
      // Redirect to appropriate section based on their actual role
      if (isStaff) {
        return <Navigate to="/dashboard" replace />
      }
      if (isCustomer) {
        return <Navigate to="/public-shop" replace />
      }
      // Fallback
      return <Navigate to="/auth" replace />
    }
  }

  return children
}

export function PublicRoute({ children, portalType = 'management' }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is logged in and profile loaded, redirect based on their role
  if (user && profile) {
    const from = location.state?.from?.pathname

    if (portalType === 'customer') {
      if (profile.role === 'customer') {
        return <Navigate to="/public-shop" replace />
      }

      return children
    }

    if (from && profile.role === 'staff') {
      return <Navigate to={from} replace />
    }

    if (profile.role === 'staff') {
      return <Navigate to="/dashboard" replace />
    }

    return children
  }

  return children
}
