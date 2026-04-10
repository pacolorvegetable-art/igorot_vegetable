import axios from 'axios'
import { supabase } from '../lib/supabaseClient'

const resolveApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (!configuredBaseUrl) {
    return '/api'
  }

  const withoutTrailingSlash = configuredBaseUrl.replace(/\/+$/, '')
  return withoutTrailingSlash.endsWith('/api')
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`
}

const api = axios.create({ baseURL: resolveApiBaseUrl() })
const requestCache = new Map()
const cacheTagIndex = new Map()

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.access_token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${session.access_token}`
  }

  return config
})

const isPlainObject = (value) => {
  return Object.prototype.toString.call(value) === '[object Object]'
}

const normalizeCacheValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeCacheValue)
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((normalizedValue, key) => {
        const nextValue = value[key]

        if (nextValue === undefined) {
          return normalizedValue
        }

        normalizedValue[key] = normalizeCacheValue(nextValue)
        return normalizedValue
      }, {})
  }

  return value
}

const cloneCacheValue = (value) => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value))
}

const normalizeTags = (tags = []) => {
  return Array.from(new Set((tags || []).filter(Boolean)))
}

const buildCacheKey = ({ method, path, params, data, key }) => {
  if (key) {
    return key
  }

  return JSON.stringify({
    method: method.toUpperCase(),
    path,
    params: normalizeCacheValue(params || {}),
    data: normalizeCacheValue(data || null)
  })
}

const removeCacheEntry = (cacheKey) => {
  const existingEntry = requestCache.get(cacheKey)
  if (!existingEntry) {
    return
  }

  requestCache.delete(cacheKey)

  for (const tag of existingEntry.tags) {
    const taggedKeys = cacheTagIndex.get(tag)
    if (!taggedKeys) continue

    taggedKeys.delete(cacheKey)
    if (taggedKeys.size === 0) {
      cacheTagIndex.delete(tag)
    }
  }
}

const registerCacheKeyForTags = (cacheKey, tags = []) => {
  for (const tag of normalizeTags(tags)) {
    const taggedKeys = cacheTagIndex.get(tag) || new Set()
    taggedKeys.add(cacheKey)
    cacheTagIndex.set(tag, taggedKeys)
  }
}

const storeCacheEntry = ({ cacheKey, value, ttlMs, tags }) => {
  const normalizedTags = normalizeTags(tags)
  const nextEntry = {
    hasValue: true,
    value: cloneCacheValue(value),
    promise: null,
    expiresAt: Date.now() + ttlMs,
    tags: normalizedTags
  }

  requestCache.set(cacheKey, nextEntry)
  registerCacheKeyForTags(cacheKey, normalizedTags)
}

const getValidCacheEntry = (cacheKey) => {
  const existingEntry = requestCache.get(cacheKey)
  if (!existingEntry) {
    return null
  }

  if (existingEntry.expiresAt <= Date.now()) {
    removeCacheEntry(cacheKey)
    return null
  }

  return existingEntry
}

const requestWithOptionalCache = async ({ method, path, data, options = {} }) => {
  const { cache, ...requestOptions } = options

  if (!cache?.ttlMs) {
    const response = await api.request({
      url: path,
      method,
      data,
      ...requestOptions
    })

    return response.data
  }

  const cacheKey = buildCacheKey({
    method,
    path,
    params: requestOptions.params,
    data,
    key: cache.key
  })
  const existingEntry = getValidCacheEntry(cacheKey)

  if (existingEntry?.hasValue) {
    return cloneCacheValue(existingEntry.value)
  }

  if (existingEntry?.promise) {
    return existingEntry.promise
  }

  const requestToken = Symbol(cacheKey)
  const requestPromise = api.request({
    url: path,
    method,
    data,
    ...requestOptions
  })
    .then((response) => {
      const currentEntry = requestCache.get(cacheKey)
      if (currentEntry?.token !== requestToken) {
        return cloneCacheValue(response.data)
      }

      storeCacheEntry({
        cacheKey,
        value: response.data,
        ttlMs: cache.ttlMs,
        tags: cache.tags
      })

      return cloneCacheValue(response.data)
    })
    .catch((error) => {
      const currentEntry = requestCache.get(cacheKey)
      if (currentEntry?.token === requestToken) {
        removeCacheEntry(cacheKey)
      }

      throw error
    })

  const normalizedTags = normalizeTags(cache.tags)

  requestCache.set(cacheKey, {
    hasValue: false,
    value: undefined,
    promise: requestPromise,
    expiresAt: Date.now() + cache.ttlMs,
    tags: normalizedTags,
    token: requestToken
  })
  registerCacheKeyForTags(cacheKey, normalizedTags)

  return requestPromise
}

export async function apiGet(path, options = {}) {
  return requestWithOptionalCache({
    method: 'get',
    path,
    options
  })
}

export async function apiPost(path, body = {}, options = {}) {
  return requestWithOptionalCache({
    method: 'post',
    path,
    data: body,
    options
  })
}

export function setCachedResponse(path, { method = 'get', params, data, value, cache } = {}) {
  if (!cache?.ttlMs) {
    return
  }

  const cacheKey = buildCacheKey({
    method,
    path,
    params,
    data,
    key: cache.key
  })

  removeCacheEntry(cacheKey)
  storeCacheEntry({
    cacheKey,
    value,
    ttlMs: cache.ttlMs,
    tags: cache.tags
  })
}

export async function invalidateCacheTags(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return
  }

  const normalizedTags = normalizeTags(tags)

  for (const tag of normalizedTags) {
    const taggedKeys = Array.from(cacheTagIndex.get(tag) || [])
    for (const cacheKey of taggedKeys) {
      removeCacheEntry(cacheKey)
    }
  }

  try {
    await api.post('/cache/invalidate', { tags: normalizedTags })
  } catch (error) {
    console.warn('Cache invalidation request failed:', error)
  }
}

export const getHealth = () => apiGet('/health')

export default api
