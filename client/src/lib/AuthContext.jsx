import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { apiPost } from '../services/api'

const AuthContext = createContext({})

const withTimeout = (promise, ms) => {
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Request timeout')), ms)
  )
  return Promise.race([promise, timeout])
}

async function fetchProfileData(userId, userEmail, userMetadata) {
  const fallbackProfile = {
    id: userId,
    email: userEmail,
    role: userMetadata?.role || 'customer',
    name: userMetadata?.full_name || '',
    phone: userMetadata?.phone || '',
    delivery_address: ''
  }

  try {
    return await withTimeout(
      apiPost('/auth/profile', {
        userId,
        userEmail,
        userMetadata
      }, {
        cache: {
          ttlMs: 5 * 60 * 1000,
          tags: ['profiles', `profile:${userId}`]
        }
      }),
      8000
    )
  } catch (error) {
    console.warn('Profile fetch issue, using fallback:', error.message)
    return fallbackProfile
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          8000
        )
        
        if (!mounted) return

        if (error) {
          console.error('Session error:', error)
          setLoading(false)
          return
        }

        if (session?.user) {
          setUser(session.user)
          const profileData = await fetchProfileData(
            session.user.id,
            session.user.email,
            session.user.user_metadata
          )
          if (mounted) {
            setProfile(profileData)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (err) {
        console.error('Auth init error:', err)
        if (mounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        if (event === 'INITIAL_SESSION') return
        
        if (session?.user) {
          setUser(session.user)
          const profileData = await fetchProfileData(
            session.user.id,
            session.user.email,
            session.user.user_metadata
          )
          if (mounted) {
            setProfile(profileData)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async (targetUser = user) => {
    if (!targetUser) {
      setProfile(null)
      return null
    }

    const profileData = await fetchProfileData(
      targetUser.id,
      targetUser.email,
      targetUser.user_metadata
    )

    setProfile(profileData)
    return profileData
  }

  const value = {
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
    isStaff: profile?.role === 'staff',
    isCustomer: profile?.role === 'customer'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
