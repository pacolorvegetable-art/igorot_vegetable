import { supabase, supabaseAuthStorageKey } from './supabaseClient'

const DEFAULT_SESSION_TIMEOUT_MS = 4000

let sessionSnapshot = null
let sessionSnapshotResolved = false
let sessionLookupPromise = null

const getStorageCandidates = () => {
  if (typeof window === 'undefined') {
    return []
  }

  return [window.localStorage, window.sessionStorage].filter(Boolean)
}

const hasPersistedAuthState = () => {
  const storages = getStorageCandidates()
  if (storages.length === 0) {
    return false
  }

  for (const storage of storages) {
    try {
      if (storage.getItem(supabaseAuthStorageKey) !== null) {
        return true
      }
    } catch {
      // Ignore storage access errors and keep checking other stores.
    }
  }

  return false
}

const clearPersistedAuthState = () => {
  const storages = getStorageCandidates()
  if (storages.length === 0) {
    return
  }

  for (const storage of storages) {
    try {
      storage.removeItem(supabaseAuthStorageKey)
    } catch {
      // Ignore storage failures and continue without auth state.
    }
  }
}

const withTimeout = (promise, timeoutMs) => {
  let timerId

  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error('Supabase session lookup timed out'))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timerId)
  })
}

export const syncSupabaseSession = (session) => {
  sessionSnapshot = session ?? null
  sessionSnapshotResolved = true
}

export const clearSupabaseSessionCache = () => {
  sessionSnapshot = null
  sessionSnapshotResolved = false
}

export async function resolveSupabaseSession({ timeoutMs = DEFAULT_SESSION_TIMEOUT_MS, forceRefresh = false } = {}) {
  if (sessionSnapshotResolved && !forceRefresh) {
    return sessionSnapshot
  }

  if (sessionLookupPromise && !forceRefresh) {
    return sessionLookupPromise
  }

  sessionLookupPromise = (async () => {
    try {
      const { data, error } = await withTimeout(supabase.auth.getSession(), timeoutMs)

      if (error) {
        throw error
      }

      sessionSnapshot = data?.session ?? null
      sessionSnapshotResolved = true
      return sessionSnapshot
    } catch (error) {
      const hadPersistedAuthState = hasPersistedAuthState()

      if (hadPersistedAuthState) {
        console.warn(
          'Supabase session lookup timed out against persisted auth state; clearing stale local auth data.',
          error
        )
        clearPersistedAuthState()
      } else {
        console.warn('Supabase session lookup failed; continuing without an auth session.', error)
      }

      sessionSnapshot = null
      sessionSnapshotResolved = true
      return null
    } finally {
      sessionLookupPromise = null
    }
  })()

  return sessionLookupPromise
}
