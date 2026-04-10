import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { clearSupabaseSessionCache, resolveSupabaseSession, syncSupabaseSession } from './authSession'
import { apiPost } from '../services/api'

const AuthContext = createContext({})

const INITIAL_SESSION_TIMEOUT_MS = 4000

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
  const activeUserIdRef = useRef(null)

  useEffect(() => {
    let mounted = true
    let startupTimer = null

    const finishLoading = () => {
      if (mounted) {
        setLoading(false)
      }
    }

    const applySession = async (session) => {
      if (!mounted) {
        return
      }

      syncSupabaseSession(session)

      if (!session?.user) {
        activeUserIdRef.current = null
        setUser(null)
        setProfile(null)
        finishLoading()
        return
      }

      setUser(session.user)

      if (activeUserIdRef.current !== session.user.id) {
        activeUserIdRef.current = session.user.id
        const profileData = await fetchProfileData(
          session.user.id,
          session.user.email,
          session.user.user_metadata
        )

        if (mounted) {
          setProfile(profileData)
        }
      }

      finishLoading()
    }

    const initAuth = async () => {
      try {
        const session = await resolveSupabaseSession({
          timeoutMs: INITIAL_SESSION_TIMEOUT_MS
        })

        await applySession(session)
      } catch (err) {
        console.error('Auth init error:', err)
        if (mounted) {
          setUser(null)
          setProfile(null)
          finishLoading()
        }
      }
    }

    startupTimer = setTimeout(() => {
      finishLoading()
    }, INITIAL_SESSION_TIMEOUT_MS + 500)

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        syncSupabaseSession(session)

        if (!session?.user) {
          activeUserIdRef.current = null
          setUser(null)
          setProfile(null)
          finishLoading()
          return
        }

        setUser(session.user)

        if (activeUserIdRef.current !== session.user.id || event === 'INITIAL_SESSION') {
          activeUserIdRef.current = session.user.id
          const profileData = await fetchProfileData(
            session.user.id,
            session.user.email,
            session.user.user_metadata
          )

          if (mounted) {
            setProfile(profileData)
          }
        }

        finishLoading()
      }
    )

    return () => {
      mounted = false
      clearTimeout(startupTimer)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    clearSupabaseSessionCache()
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
