import crypto from 'node:crypto'
import { Redis } from '@upstash/redis'
import { env } from './env.js'

const CACHE_NAMESPACE = 'igorot-vegetable'

const redis = env.upstashRedisUrl && env.upstashRedisToken
  ? new Redis({
      url: env.upstashRedisUrl,
      token: env.upstashRedisToken
    })
  : null

const hashValue = (value) => {
  return crypto.createHash('sha1').update(value).digest('hex')
}

const normalizeTags = (tags = []) => {
  return Array.from(new Set(tags.filter(Boolean))).sort()
}

const tagVersionKey = (tag) => `${CACHE_NAMESPACE}:tag-version:${tag}`

const createDataKey = (key, tagVersions) => {
  return `${CACHE_NAMESPACE}:data:${hashValue(JSON.stringify({ key, tagVersions }))}`
}

async function getTagVersions(tags) {
  if (!redis || tags.length === 0) {
    return {}
  }

  const versionKeys = tags.map(tagVersionKey)
  const versionValues = await redis.mget(...versionKeys)

  return tags.reduce((accumulator, tag, index) => {
    accumulator[tag] = String(versionValues[index] ?? 0)
    return accumulator
  }, {})
}

export function isCacheConfigured() {
  return Boolean(redis)
}

export async function getCachedOrLoad({ key, ttlSeconds = 60, tags = [], loader }) {
  if (!redis) {
    return loader()
  }

  const normalizedTags = normalizeTags(tags)

  try {
    const tagVersions = await getTagVersions(normalizedTags)
    const cacheKey = createDataKey(key, tagVersions)
    const cachedValue = await redis.get(cacheKey)

    if (cachedValue !== null && cachedValue !== undefined) {
      return cachedValue
    }

    const freshValue = await loader()
    await redis.set(cacheKey, freshValue, { ex: ttlSeconds })
    return freshValue
  } catch (error) {
    console.warn(`Cache read failed for ${key}:`, error.message)
    return loader()
  }
}

export async function invalidateCacheTags(tags = []) {
  if (!redis) {
    return
  }

  const normalizedTags = normalizeTags(tags)
  if (normalizedTags.length === 0) {
    return
  }

  try {
    await Promise.all(normalizedTags.map((tag) => redis.incr(tagVersionKey(tag))))
  } catch (error) {
    console.warn('Cache invalidation failed:', error.message)
  }
}
