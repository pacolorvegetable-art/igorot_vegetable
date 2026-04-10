import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const serverDir = path.resolve(currentDir, '..')
const rootDir = path.resolve(serverDir, '..')

const envPaths = [
  path.join(serverDir, '.env'),
  path.join(rootDir, '.env'),
  path.join(rootDir, 'client', '.env')
]

for (const envPath of envPaths) {
  dotenv.config({ path: envPath, override: false })
}

const cleanEnvValue = (value) => {
  if (typeof value !== 'string') return value
  return value.replace(/^['"]|['"]$/g, '').trim()
}

export const env = {
  port: Number(process.env.PORT || 5000),
  clientOrigin: cleanEnvValue(process.env.CLIENT_ORIGIN) || 'http://localhost:5173',
  supabaseUrl: cleanEnvValue(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
  supabaseAnonKey: cleanEnvValue(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
  upstashRedisUrl: cleanEnvValue(process.env.UPSTASH_REDIS_REST_URL),
  upstashRedisToken: cleanEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN)
}
