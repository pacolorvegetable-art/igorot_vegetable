const sanitizeEnvValue = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.replace(/^['"]|['"]$/g, '').trim()
}

const isPlaceholderValue = (value) => {
  if (!value) {
    return true
  }

  const lowered = value.toLowerCase()
  return (
    lowered.includes('your-project-ref') ||
    lowered.includes('your-anon-key') ||
    lowered.includes('<your-')
  )
}

const decodeBase64Url = (value) => {
  if (!value) return ''

  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (padded.length % 4)) % 4
  const normalized = `${padded}${'='.repeat(padLength)}`

  try {
    if (typeof atob === 'function') {
      return atob(normalized)
    }
  } catch {
    // Fall through to empty return.
  }

  return ''
}

const getSupabaseRefFromUrl = (supabaseUrl) => {
  try {
    const parsedUrl = new URL(supabaseUrl)
    const hostname = parsedUrl.hostname || ''
    const [projectRef] = hostname.split('.')
    return projectRef || null
  } catch {
    return null
  }
}

const getSupabaseRefFromAnonKey = (anonKey) => {
  const payloadSegment = anonKey?.split('.')?.[1]
  if (!payloadSegment) {
    return null
  }

  try {
    const decodedPayload = decodeBase64Url(payloadSegment)
    const parsedPayload = JSON.parse(decodedPayload)
    return parsedPayload?.ref || null
  } catch {
    return null
  }
}

const assertSupabaseConfig = (supabaseUrl, supabaseAnonKey) => {
  if (isPlaceholderValue(supabaseUrl) || isPlaceholderValue(supabaseAnonKey)) {
    throw new Error(
      'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel/Render and redeploy.'
    )
  }

  if (!/^https?:\/\//i.test(supabaseUrl)) {
    throw new Error('VITE_SUPABASE_URL must start with https://')
  }

  const urlRef = getSupabaseRefFromUrl(supabaseUrl)
  const keyRef = getSupabaseRefFromAnonKey(supabaseAnonKey)

  if (urlRef && keyRef && urlRef !== keyRef) {
    throw new Error(
      `Supabase config mismatch: VITE_SUPABASE_URL points to "${urlRef}" but VITE_SUPABASE_ANON_KEY belongs to "${keyRef}". Ensure both values come from the same Supabase project.`
    )
  }
}

let missingApiBaseWarned = false

export const resolveSupabaseConfig = () => {
  const supabaseUrl = sanitizeEnvValue(import.meta.env.VITE_SUPABASE_URL)
  const supabaseAnonKey = sanitizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY)

  assertSupabaseConfig(supabaseUrl, supabaseAnonKey)

  return {
    supabaseUrl,
    supabaseAnonKey
  }
}

export const resolveApiBaseUrl = () => {
  const configuredBaseUrl = sanitizeEnvValue(import.meta.env.VITE_API_BASE_URL)

  if (!configuredBaseUrl) {
    if (
      import.meta.env.PROD &&
      typeof window !== 'undefined' &&
      window.location.hostname.endsWith('vercel.app') &&
      !missingApiBaseWarned
    ) {
      console.warn(
        'VITE_API_BASE_URL is not set in production. The app will fallback to /api and requires a valid Vercel rewrite to your Render service.'
      )
      missingApiBaseWarned = true
    }

    return '/api'
  }

  const withoutTrailingSlash = configuredBaseUrl.replace(/\/+$/, '')
  return withoutTrailingSlash.endsWith('/api')
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`
}

