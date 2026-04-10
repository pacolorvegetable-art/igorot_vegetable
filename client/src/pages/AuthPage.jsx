import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Mountain,
  Package,
  TrendingUp,
  Lock,
  Eye,
  EyeOff,
  Store,
  CircleHelp
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { isSellerUser } from '../lib/portalMembership'

function AuthPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState(null)

  // Handle redirect after auth state updates
  useEffect(() => {
    const enforceManagementAccess = async () => {
      if (!user || !profile) {
        return
      }

      if (profile.role === 'staff') {
        navigate('/dashboard', { replace: true })
        return
      }

      await supabase.auth.signOut()
      setFormMessage({
        type: 'error',
        text: 'This account is registered for Customer portal. Please sign in at Customer portal.'
      })
    }

    enforceManagementAccess()
  }, [user, profile, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormMessage(null)

    if (activeTab === 'signup' && !fullName) {
      setFormMessage({ type: 'error', text: 'Full name is required.' })
      return
    }

    if (!email || !password) {
      setFormMessage({ type: 'error', text: 'Email and password are required.' })
      return
    }

    setIsSubmitting(true)

    try {
      if (activeTab === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) {
          throw error
        }

        const canAccessManagement = await isSellerUser(data?.user?.id)
        if (!canAccessManagement) {
          await supabase.auth.signOut()
          setFormMessage({
            type: 'error',
            text: 'This account is registered for Customer portal. Please sign in at Customer portal.'
          })
          return
        }

        setFormMessage({ type: 'success', text: 'Signed in successfully. Redirecting...' })
        // Navigation handled by useEffect when auth state updates
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'staff' // Management portal defaults to staff
          }
        }
      })

      if (error) {
        throw error
      }

      const needsConfirmation = !data?.session
      if (needsConfirmation) {
        setFormMessage({
          type: 'success',
          text: 'Account created. Please check your email to confirm your account.'
        })
      } else {
        setFormMessage({
          type: 'success',
          text: 'Account created! Redirecting...'
        })
        // Navigation handled by useEffect when auth state updates
      }
    } catch (error) {
      setFormMessage({
        type: 'error',
        text: error?.message || 'Authentication failed. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* Help Button */}
      <div className="absolute top-3 right-3 z-10">
        <button
          className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 hover:bg-accent hover:text-accent-foreground h-8 w-8"
          type="button"
        >
          <CircleHelp className="h-4 w-4" />
          <span className="sr-only">Help guide for Sign In</span>
        </button>
      </div>

      {/* Left Hero Section - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-600/10 via-emerald-500/5 to-background">
        {/* Background blurs */}
        <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-emerald-600/10 blur-3xl" />
        <div className="absolute bottom-8 right-8 h-44 w-44 rounded-full bg-emerald-500/8 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-10">
          {/* Brand */}
          <div className="text-center mb-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white mb-3 shadow-lg">
              <Mountain className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Igorot Vegetable</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Highland Produce Management</p>
          </div>

          {/* Illustration */}
          <HeroIllustration />

          {/* Feature Pills */}
          <div className="mt-4 flex gap-3 w-full max-w-sm">
            <FeaturePill icon={Package} label="Stock Control" />
            <FeaturePill icon={TrendingUp} label="Sales Tracking" />
            <FeaturePill icon={Lock} label="Secure Access" />
          </div>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-md">
          {/* Mobile Brand - visible only on small screens */}
          <div className="mb-5 flex flex-col items-center lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white mb-2 shadow-md">
              <Mountain className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Igorot Vegetable</h1>
            <p className="text-xs text-muted-foreground">Highland Produce Management</p>
          </div>

          {/* Auth Card */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 shadow-xl max-h-[calc(100vh-120px)] overflow-y-auto overflow-hidden">
            <div className="text-center mb-4 animate-fade-in-up">
              <h2 className="text-lg font-bold text-foreground">Management Portal</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sign in to manage products, orders & operations
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex rounded-lg bg-muted p-0.5 mb-4 animate-fade-in-up animation-delay-100">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin')
                  setFormMessage(null)
                }}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'signin'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup')
                  setFormMessage(null)
                }}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'signup'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form className="space-y-3" onSubmit={handleSubmit} key={activeTab}>
              {activeTab === 'signup' && (
                <div className="space-y-1.5 animate-fade-in-up">
                  <label className="font-medium text-xs" htmlFor="signup-name">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="signup-name"
                    placeholder="Juan Dela Cruz"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 h-10 transition-all duration-200"
                  />
                </div>
              )}

              <div className="space-y-1.5 animate-fade-in-up animation-delay-100">
                <label className="font-medium text-xs" htmlFor="login-email">
                  Email
                </label>
                <input
                  type="email"
                  id="login-email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 h-10 transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5 animate-fade-in-up animation-delay-150">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-xs" htmlFor="login-password">
                    Password
                  </label>
                  {activeTab === 'signin' && (
                    <button
                      type="button"
                      className="text-xs text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-password"
                    placeholder={activeTab === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 h-10 pr-10 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {activeTab === 'signin' && (
                <div className="flex items-center gap-2 animate-fade-in-up animation-delay-200">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border text-emerald-600 focus:ring-emerald-500/20"
                  />
                  <label
                    htmlFor="remember-me"
                    className="font-medium text-xs text-muted-foreground cursor-pointer select-none"
                  >
                    Stay signed in for 7 days
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center w-full h-10 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in-up animation-delay-250 active:scale-[0.98]"
              >
                {isSubmitting
                  ? 'Please wait...'
                  : activeTab === 'signin'
                    ? 'Sign In'
                    : 'Create Account'}
              </button>

              {activeTab === 'signup' && (
                <div className="rounded-lg border border-emerald-600/20 bg-emerald-600/5 p-2.5 flex items-start gap-2.5 animate-fade-in-up animation-delay-300">
                  <Store className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Staff Account</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      You'll be assigned a staff role. Need a different role? Contact admin.
                    </p>
                  </div>
                </div>
              )}

              {formMessage ? (
                <p
                  className={`text-xs animate-fade-in ${
                    formMessage.type === 'error' ? 'text-destructive' : 'text-emerald-600'
                  }`}
                >
                  {formMessage.text}
                </p>
              ) : null}
            </form>
          </div>

          {/* Portal Links */}
          <div className="mt-4 space-y-2">
            <p className="text-[11px] text-muted-foreground text-center">
              Looking for a different portal?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <PortalLink to="/auth/retail" icon={Store} label="Customer" />
            </div>
            <p className="text-center text-[10px] text-muted-foreground/60 pt-1">
              © 2026 Igorot Vegetable. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeaturePill({ icon: Icon, label }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-card/60 backdrop-blur-sm border border-border/40 text-center">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/10">
        <Icon className="h-3.5 w-3.5 text-emerald-600" />
      </div>
      <p className="text-[11px] font-medium text-foreground leading-tight">{label}</p>
    </div>
  )
}

function PortalLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent hover:border-border/50 transition-all duration-200"
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </Link>
  )
}

function HeroIllustration() {
  const barHeights = [32, 48, 38, 58, 45, 42, 55]

  return (
    <div className="flex items-center justify-center w-[220px] h-[220px] relative select-none">
      {/* Background circle */}
      <div className="absolute inset-4 rounded-full bg-emerald-600/5 border border-emerald-600/10" />

      {/* Main panel with chart */}
      <div className="absolute top-[30px] left-[30px] w-[160px] h-[110px] rounded-xl bg-card border border-border/60 shadow-lg overflow-hidden">
        {/* Panel header */}
        <div className="h-5 bg-emerald-600/10 border-b border-border/40 flex items-center gap-1 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-600/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/20" />
        </div>

        {/* Chart bars */}
        <div className="flex items-end gap-[6px] px-4 pt-3 h-[60px]">
          {barHeights.map((height, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-emerald-500/60"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>

        {/* Skeleton lines */}
        <div className="flex gap-2 px-3 mt-2">
          <div className="flex-1 h-2 rounded-full bg-muted" />
          <div className="flex-1 h-2 rounded-full bg-muted" />
          <div className="flex-1 h-2 rounded-full bg-muted" />
        </div>
      </div>

      {/* Crate icon */}
      <div className="absolute top-[22px] right-[18px] w-10 h-10 rounded-lg bg-emerald-600/15 border border-emerald-600/20 flex items-center justify-center">
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="hsl(152, 60%, 40%)"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <rect x="2" y="6" width="14" height="10" rx="1" />
          <path d="M2 9h14" />
          <path d="M6 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      </div>

      {/* Checkmark badge */}
      <div className="absolute bottom-[30px] right-[25px] w-9 h-9 rounded-full bg-emerald-600 shadow-md shadow-emerald-600/20 flex items-center justify-center">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8.5l3 3 7-7" />
        </svg>
      </div>

      {/* Mountain decoration */}
      <div className="absolute bottom-[25px] left-[25px]">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M4 22L12 8L16 14L22 6L26 22H4Z"
            fill="hsl(152, 60%, 40%)"
            fillOpacity="0.2"
            stroke="hsl(152, 60%, 40%)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Outline ring */}
      <div className="absolute top-[30px] left-[30px] w-[160px] h-[110px] rounded-xl border border-emerald-600/20" />
    </div>
  )
}

export default AuthPage
