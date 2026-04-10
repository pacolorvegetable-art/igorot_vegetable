import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Mountain,
  Carrot,
  MapPin,
  ThumbsUp,
  Eye,
  EyeOff,
  ShoppingBasket,
  UserPlus,
  ArrowLeft
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { isCustomerUser } from '../lib/portalMembership'

function AuthRetailPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState(null)

  // Customer portal should always land on the public shop after auth succeeds.
  useEffect(() => {
    const enforceCustomerAccess = async () => {
      if (!user || !profile) {
        return
      }

      if (profile.role === 'customer') {
        navigate('/public-shop', { replace: true })
        return
      }

      await supabase.auth.signOut()
      setFormMessage({
        type: 'error',
        text: 'This account is registered for Management portal. Please sign in at Management portal.'
      })
    }

    enforceCustomerAccess()
  }, [user, profile, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormMessage(null)

    if (activeTab === 'signup' && !fullName) {
      setFormMessage({ type: 'error', text: 'Full name is required.' })
      return
    }

    if (activeTab === 'signup' && !phone.trim()) {
      setFormMessage({ type: 'error', text: 'Mobile number is required.' })
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

        const canAccessCustomerPortal = await isCustomerUser(data?.user?.id)
        if (!canAccessCustomerPortal) {
          await supabase.auth.signOut()
          setFormMessage({
            type: 'error',
            text: 'This account is registered for Management portal. Please sign in at Management portal.'
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
            phone: phone.trim(),
            role: 'customer' // Customer portal defaults to customer
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
      {/* Left Hero Section - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-green-600/10 via-green-500/5 to-background">
        {/* Background blurs */}
        <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-green-600/10 blur-3xl" />
        <div className="absolute bottom-8 right-8 h-44 w-44 rounded-full bg-green-500/8 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-10">
          {/* Brand */}
          <div className="text-center mb-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-white mb-3 shadow-lg">
              <ShoppingBasket className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Igorot Vegetable</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Highland fresh produce delivered</p>
          </div>

          {/* Illustration */}
          <ShopIllustration />

          {/* Feature Pills */}
          <div className="mt-4 flex gap-3 w-full max-w-sm">
            <FeaturePill icon={Carrot} label="Highland Grown" />
            <FeaturePill icon={MapPin} label="Local Delivery" />
            <FeaturePill icon={ThumbsUp} label="Top Quality" />
          </div>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-md">
          {/* Mobile Brand - visible only on small screens */}
          <div className="mb-5 flex flex-col items-center lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-600 text-white mb-2 shadow-md">
              <ShoppingBasket className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Igorot Vegetable</h1>
            <p className="text-xs text-muted-foreground">Highland fresh produce delivered</p>
          </div>

          {/* Auth Card */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 shadow-xl overflow-hidden">
            {activeTab === 'signin' ? (
              <div className="animate-fade-in-up">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-bold text-foreground">Customer Sign In</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Access your orders and account details
                  </p>
                </div>

                {/* Sign In Form */}
                <form className="space-y-3" onSubmit={handleSubmit}>
                  <div className="space-y-1.5 animate-fade-in-up animation-delay-100">
                    <label className="font-medium text-xs" htmlFor="retail-email">
                      Email
                    </label>
                    <input
                      type="email"
                      id="retail-email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 h-10 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1.5 animate-fade-in-up animation-delay-150">
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-xs" htmlFor="retail-password">
                        Password
                      </label>
                      <button
                        type="button"
                        className="text-xs text-green-600 hover:text-green-500 font-medium transition-colors"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="retail-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 h-10 pr-10 transition-all duration-200"
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

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center w-full h-10 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in-up animation-delay-200 active:scale-[0.98]"
                  >
                    {isSubmitting ? 'Please wait...' : 'Sign In'}
                  </button>

                  {formMessage ? (
                    <p
                      className={`text-xs animate-fade-in ${
                        formMessage.type === 'error' ? 'text-destructive' : 'text-green-600'
                      }`}
                    >
                      {formMessage.text}
                    </p>
                  ) : null}
                </form>

                {/* Create Account */}
                <div className="mt-4 space-y-2.5 animate-fade-in-up animation-delay-250">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-[11px]">
                      <span className="bg-card px-2 text-muted-foreground">New here?</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signup')
                      setFormMessage(null)
                    }}
                    className="inline-flex items-center justify-center w-full h-9 rounded-lg text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-all duration-200 gap-2 active:scale-[0.98]"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Create a Customer Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in-up">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-bold text-foreground">Create Account</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sign up as a Customer
                  </p>
                </div>

                <div className="mb-3 rounded-lg border border-green-600/20 bg-green-600/5 p-2.5 animate-fade-in-up animation-delay-100">
                  <p className="text-xs text-muted-foreground text-center">
                    <span className="font-medium text-foreground">New accounts</span> are assigned the{' '}
                    <span className="font-semibold text-green-600">Customer</span> role with access to
                    the shop, order tracking, and loyalty rewards.
                  </p>
                </div>

                {/* Sign Up Form */}
                <form className="space-y-3" onSubmit={handleSubmit}>
                  <div className="space-y-1.5 animate-fade-in-up animation-delay-150">
                    <label className="font-medium text-xs" htmlFor="signup-name">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="signup-name"
                      placeholder="Juan Dela Cruz"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 h-10 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1.5 animate-fade-in-up animation-delay-200">
                    <label className="font-medium text-xs" htmlFor="signup-phone">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      id="signup-phone"
                      placeholder="09XX XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 h-10 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1.5 animate-fade-in-up animation-delay-250">
                    <label className="font-medium text-xs" htmlFor="signup-email">
                      Email
                    </label>
                    <input
                      type="email"
                      id="signup-email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 h-10 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1.5 animate-fade-in-up animation-delay-300">
                    <label className="font-medium text-xs" htmlFor="signup-password">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="signup-password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 h-10 pr-10 transition-all duration-200"
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

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center w-full h-10 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in-up animation-delay-350 active:scale-[0.98]"
                  >
                    {isSubmitting ? 'Please wait...' : 'Create Account'}
                  </button>

                  {formMessage ? (
                    <p
                      className={`text-xs animate-fade-in ${
                        formMessage.type === 'error' ? 'text-destructive' : 'text-green-600'
                      }`}
                    >
                      {formMessage.text}
                    </p>
                  ) : null}
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin')
                    setFormMessage(null)
                  }}
                  className="inline-flex items-center justify-center w-full h-10 rounded-lg font-medium hover:bg-accent hover:text-accent-foreground transition-all duration-200 mt-3 text-xs gap-2 animate-fade-in-up animation-delay-350 active:scale-[0.98]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Already have an account? Sign in
                </button>
              </div>
            )}
          </div>

          {/* Portal Links */}
          <div className="mt-4 space-y-2">
            <p className="text-[11px] text-muted-foreground text-center">
              Looking for a different portal?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <PortalLink to="/auth" icon={Mountain} label="Management" />
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
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600/10">
        <Icon className="h-3.5 w-3.5 text-green-600" />
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

function ShopIllustration() {
  return (
    <div className="flex items-center justify-center w-[220px] h-[220px] relative select-none">
      {/* Background circle */}
      <div className="absolute inset-4 rounded-full bg-green-600/5 border border-green-600/10" />

      {/* Basket with vegetables */}
      <div className="absolute" style={{ left: 65, top: 45 }}>
        <svg width="90" height="85" viewBox="0 0 90 85" fill="none">
          {/* Basket body */}
          <path
            d="M15 35 L10 75 Q10 80 15 80 L75 80 Q80 80 80 75 L75 35 Z"
            fill="hsl(142, 50%, 45%)"
            fillOpacity="0.15"
            stroke="hsl(142, 50%, 45%)"
            strokeWidth="2"
          />
          {/* Basket weave lines */}
          <path d="M20 45 H70" stroke="hsl(142, 50%, 45%)" strokeWidth="1.5" />
          <path d="M18 55 H72" stroke="hsl(142, 50%, 45%)" strokeWidth="1.5" />
          <path d="M16 65 H74" stroke="hsl(142, 50%, 45%)" strokeWidth="1.5" />
          {/* Basket handle */}
          <path
            d="M25 35 Q45 5 65 35"
            stroke="hsl(142, 50%, 45%)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Carrot */}
          <path
            d="M35 30 L30 45 L40 45 Z"
            fill="hsl(25, 90%, 55%)"
            stroke="hsl(25, 90%, 45%)"
            strokeWidth="1"
          />
          <path d="M35 25 L33 18 M35 25 L37 17 M35 25 L35 16" stroke="hsl(142, 60%, 40%)" strokeWidth="1.5" strokeLinecap="round" />
          {/* Cabbage */}
          <circle cx="55" cy="32" r="12" fill="hsl(142, 50%, 55%)" fillOpacity="0.6" stroke="hsl(142, 50%, 40%)" strokeWidth="1.5" />
          <path d="M50 30 Q55 25 60 30" stroke="hsl(142, 50%, 35%)" strokeWidth="1" fill="none" />
          <path d="M48 34 Q55 28 62 34" stroke="hsl(142, 50%, 35%)" strokeWidth="1" fill="none" />
        </svg>
      </div>

      {/* Mountain badge */}
      <div className="absolute" style={{ right: 25, top: 35 }}>
        <div className="w-10 h-10 rounded-full bg-green-600 shadow-lg shadow-green-600/30 flex items-center justify-center">
          <Mountain className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Fresh badge */}
      <div className="absolute" style={{ left: 30, bottom: 35 }}>
        <div className="px-2 py-1 rounded-full bg-green-600/20 border border-green-600/30 text-green-700 text-xs font-bold">
          Fresh
        </div>
      </div>

      {/* Decorative dots */}
      <div className="absolute w-2 h-2 rounded-full bg-green-500/40" style={{ left: 40, top: 50 }} />
      <div className="absolute w-1.5 h-1.5 rounded-full bg-green-500/30" style={{ right: 35, bottom: 55 }} />
    </div>
  )
}

export default AuthRetailPage
