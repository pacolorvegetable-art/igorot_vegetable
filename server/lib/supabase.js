import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

function assertSupabaseEnv() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables for the server. Set SUPABASE_URL/SUPABASE_ANON_KEY or provide VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY in an env file the server can load.'
    )
  }
}

export function getAccessTokenFromRequest(req) {
  const authorizationHeader = req.headers.authorization

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null
  }

  return authorizationHeader.slice('Bearer '.length).trim() || null
}

export function createSupabaseServerClient(accessToken = null) {
  assertSupabaseEnv()

  const headers = {
    Accept: 'application/json'
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    },
    global: {
      headers
    }
  })
}

export async function getAuthenticatedUser(supabase, accessToken) {
  if (!accessToken) {
    return null
  }

  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error) {
    throw error
  }

  return data.user ?? null
}
