import { createClient } from '@supabase/supabase-js'
import { resolveSupabaseConfig } from './runtimeConfig'

const { supabaseUrl, supabaseAnonKey } = resolveSupabaseConfig()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'igorot-vegetable-auth'
  },
  global: {
    headers: {
      'Accept': 'application/json'
    }
  }
})

export const supabaseAuthStorageKey = 'igorot-vegetable-auth'
