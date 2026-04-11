import express from 'express'
import cors from 'cors'
import { env } from './lib/env.js'
import { getCachedOrLoad, invalidateCacheTags, isCacheConfigured } from './lib/cache.js'
import {
  createSupabaseServerClient,
  getAccessTokenFromRequest,
  getAuthenticatedUser
} from './lib/supabase.js'

const app = express()

const ORDERS_LIST_SELECT = `
  *,
  order_item (*)
`

const ORDER_HISTORY_SELECT = `
  *,
  order_item (
    id,
    product_id,
    product_name,
    quantity,
    unit,
    unit_price,
    total_price,
    product (
      name,
      unit,
      image_url
    )
  )
`

const asyncHandler = (handler) => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

const normalizePhone = (value = '') => value.trim()

const uniqueValues = (values = []) => {
  return Array.from(new Set(values.filter(Boolean)))
}

const toSortedOrders = (ordersMap) => {
  return Array.from(ordersMap.values()).sort(
    (firstOrder, secondOrder) =>
      new Date(secondOrder.created_at) - new Date(firstOrder.created_at)
  )
}

const isValidMonthFilter = (value = '') => /^\d{4}-\d{2}$/.test(value)

const getMonthRangeFromFilter = (monthFilter) => {
  const [yearString, monthString] = monthFilter.split('-')
  const year = Number(yearString)
  const monthIndex = Number(monthString) - 1

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0))

  return { start, end }
}

async function getCustomerPhone(supabase, userId, fallbackPhone = '') {
  if (!userId) {
    return fallbackPhone || ''
  }

  try {
    const { data, error } = await supabase
      .from('customer')
      .select('phone')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data?.phone || fallbackPhone || ''
  } catch {
    return fallbackPhone || ''
  }
}

async function getCurrentUserOrderHistory(supabase, accessToken, user = null) {
  const currentUser = user ?? await getAuthenticatedUser(supabase, accessToken)
  const resolvedUser = currentUser
  if (!resolvedUser) {
    return []
  }

  const profilePhone = await getCustomerPhone(
    supabase,
    resolvedUser.id,
    resolvedUser.user_metadata?.phone || ''
  )

  const filters = uniqueValues([
    resolvedUser.id ? `customer_id:${resolvedUser.id}` : null,
    resolvedUser.email ? `customer_email:${resolvedUser.email}` : null,
    profilePhone ? `customer_phone:${profilePhone}` : null
  ]).map((filter) => {
    const [column, ...rest] = filter.split(':')
    return {
      column,
      value: rest.join(':')
    }
  })

  if (filters.length === 0) {
    return []
  }

  const responses = await Promise.all(
    filters.map(({ column, value }) =>
      supabase
        .from('orders')
        .select(ORDER_HISTORY_SELECT)
        .eq(column, value)
        .order('created_at', { ascending: false })
    )
  )

  const ordersMap = new Map()

  for (const response of responses) {
    if (response.error) {
      throw response.error
    }

    for (const order of response.data || []) {
      if (!ordersMap.has(order.id)) {
        ordersMap.set(order.id, order)
      }
    }
  }

  return toSortedOrders(ordersMap)
}

const allowedOrigins = env.clientOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`CORS blocked for origin: ${origin}`))
  },
  credentials: true
}))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    cacheConfigured: isCacheConfigured()
  })
})

app.get('/api/products', asyncHandler(async (req, res) => {
  const accessToken = getAccessTokenFromRequest(req)
  const supabase = createSupabaseServerClient(accessToken)
  const availableOnly = req.query.availableOnly === 'true'
  const sortBy = ['name', 'created_at'].includes(req.query.sortBy)
    ? req.query.sortBy
    : (availableOnly ? 'name' : 'created_at')
  const sortOrder = req.query.sortOrder === 'asc'
    ? 'asc'
    : (sortBy === 'name' ? 'asc' : 'desc')

  const products = await getCachedOrLoad({
    key: `products:${JSON.stringify({ availableOnly, sortBy, sortOrder })}`,
    ttlSeconds: 300,
    tags: ['products'],
    loader: async () => {
      let query = supabase
        .from('product')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' })

      if (availableOnly) {
        query = query.eq('is_available', true)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    }
  })

  res.json(products)
}))

app.get('/api/dashboard/kpis', asyncHandler(async (req, res) => {
  const accessToken = getAccessTokenFromRequest(req)
  const supabase = createSupabaseServerClient(accessToken)

  const kpis = await getCachedOrLoad({
    key: 'dashboard:kpis:today',
    ttlSeconds: 60,
    tags: ['orders', 'spoilage', 'dashboard'],
    loader: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const todayDate = today.toISOString().split('T')[0]

      const [
        revenueResponse,
        pendingOrdersResponse,
        spoilageResponse
      ] = await Promise.all([
        supabase
          .from('revenue')
          .select('amount')
          .gte('recognized_at', today.toISOString())
          .lt('recognized_at', tomorrow.toISOString()),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('spoilage')
          .select('total_loss')
          .eq('recorded_at', todayDate)
      ])

      if (revenueResponse.error) throw revenueResponse.error
      if (pendingOrdersResponse.error) throw pendingOrdersResponse.error
      if (spoilageResponse.error) throw spoilageResponse.error

      const todayRevenue = (revenueResponse.data || []).reduce(
        (total, revenue) => total + parseFloat(revenue.amount || 0),
        0
      )

      const todaySpoilageLoss = (spoilageResponse.data || []).reduce(
        (total, item) => total + parseFloat(item.total_loss || 0),
        0
      )

      return {
        todayRevenue,
        pendingOrders: pendingOrdersResponse.count || 0,
        todaySpoilageLoss
      }
    }
  })

  res.json(kpis)
}))

app.get('/api/revenue', asyncHandler(async (req, res) => {
  const accessToken = getAccessTokenFromRequest(req)
  const supabase = createSupabaseServerClient(accessToken)
  const month = String(req.query.month || '')

  if (!isValidMonthFilter(month)) {
    res.status(400).json({ error: 'month is required in YYYY-MM format.' })
    return
  }

  const { start, end } = getMonthRangeFromFilter(month)

  const revenueSummary = await getCachedOrLoad({
    key: `revenue:month:${month}`,
    ttlSeconds: 60,
    tags: ['orders', 'revenue', 'dashboard'],
    loader: async () => {
      const { data, error } = await supabase
        .from('revenue')
        .select('amount, recognized_at, order_id')
        .gte('recognized_at', start.toISOString())
        .lt('recognized_at', end.toISOString())

      if (error) throw error

      const rows = data || []
      const totalRevenue = rows.reduce(
        (total, item) => total + parseFloat(item.amount || 0),
        0
      )

      return {
        month,
        totalRevenue,
        totalOrders: rows.length,
        items: rows
      }
    }
  })

  res.json(revenueSummary)
}))

app.get('/api/orders', asyncHandler(async (req, res) => {
  const accessToken = getAccessTokenFromRequest(req)
  const supabase = createSupabaseServerClient(accessToken)
  const { status = '', payment_status = '', date = '' } = req.query

  const orders = await getCachedOrLoad({
    key: `orders:list:${JSON.stringify({ status, payment_status, date })}`,
    ttlSeconds: 60,
    tags: ['orders'],
    loader: async () => {
      let query = supabase
        .from('orders')
        .select(ORDERS_LIST_SELECT)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      if (payment_status) {
        query = query.eq('payment_status', payment_status)
      }

      if (date) {
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString())
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    }
  })

  res.json(orders)
}))

app.get('/api/orders/history', asyncHandler(async (req, res) => {
  const accessToken = getAccessTokenFromRequest(req)
  const supabase = createSupabaseServerClient(accessToken)
  const phone = normalizePhone(String(req.query.phone || ''))

  if (!phone && !accessToken) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }

  const currentUser = phone ? null : await getAuthenticatedUser(supabase, accessToken)

  if (!phone && !currentUser) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }

  const orders = await getCachedOrLoad({
    key: phone
      ? `orders:history:phone:${phone}`
      : `orders:history:user:${currentUser.id}`,
    ttlSeconds: 60,
    tags: ['orders'],
    loader: async () => {
      if (phone) {
        const { data, error } = await supabase
          .from('orders')
          .select(ORDER_HISTORY_SELECT)
          .eq('customer_phone', phone)
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      }

      return getCurrentUserOrderHistory(supabase, accessToken, currentUser)
    }
  })

  res.json(orders)
}))

app.get('/api/customers', asyncHandler(async (req, res) => {
  const accessToken = getAccessTokenFromRequest(req)
  const supabase = createSupabaseServerClient(accessToken)

  const customers = await getCachedOrLoad({
    key: 'customers:list',
    ttlSeconds: 300,
    tags: ['customers'],
    loader: async () => {
      const { data, error } = await supabase
        .from('customer')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    }
  })

  res.json(customers)
}))

app.get('/api/customers/:customerId/orders', asyncHandler(async (req, res) => {
  const accessToken = getAccessTokenFromRequest(req)
  const supabase = createSupabaseServerClient(accessToken)
  const { customerId } = req.params

  const orders = await getCachedOrLoad({
    key: `customers:${customerId}:orders`,
    ttlSeconds: 120,
    tags: ['orders', 'customers', `customer:${customerId}`],
    loader: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDERS_LIST_SELECT)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    }
  })

  res.json(orders)
}))

app.get('/api/customers/:customerId/stats', asyncHandler(async (req, res) => {
  const accessToken = getAccessTokenFromRequest(req)
  const supabase = createSupabaseServerClient(accessToken)
  const { customerId } = req.params

  const stats = await getCachedOrLoad({
    key: `customers:${customerId}:stats`,
    ttlSeconds: 300,
    tags: ['orders', 'customers', `customer:${customerId}`],
    loader: async () => {
      const [ordersResponse, spentResponse] = await Promise.all([
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customerId),
        supabase
          .from('orders')
          .select('total_amount')
          .eq('customer_id', customerId)
          .eq('payment_status', 'paid')
      ])

      if (ordersResponse.error) throw ordersResponse.error
      if (spentResponse.error) throw spentResponse.error

      const totalSpent = (spentResponse.data || []).reduce(
        (total, order) => total + parseFloat(order.total_amount || 0),
        0
      )

      return {
        totalOrders: ordersResponse.count || 0,
        totalSpent
      }
    }
  })

  res.json(stats)
}))

app.get('/api/payment-methods', asyncHandler(async (req, res) => {
  const accessToken = getAccessTokenFromRequest(req)
  const supabase = createSupabaseServerClient(accessToken)
  const activeOnly = req.query.activeOnly === 'true'

  const paymentMethods = await getCachedOrLoad({
    key: `payment-methods:${activeOnly ? 'active' : 'all'}`,
    ttlSeconds: 1800,
    tags: ['payment-methods'],
    loader: async () => {
      let query = supabase
        .from('payment_method')
        .select('*')
        .order('display_order', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    }
  })

  res.json(paymentMethods)
}))

app.get('/api/operating-hours', asyncHandler(async (req, res) => {
  const accessToken = getAccessTokenFromRequest(req)
  const supabase = createSupabaseServerClient(accessToken)

  const operatingHours = await getCachedOrLoad({
    key: 'operating-hours:list',
    ttlSeconds: 1800,
    tags: ['operating-hours'],
    loader: async () => {
      const { data, error } = await supabase
        .from('operating_hours')
        .select('*')
        .order('day_of_week', { ascending: true })

      if (error) throw error
      return data || []
    }
  })

  res.json(operatingHours)
}))

app.get('/api/notifications', asyncHandler(async (req, res) => {
  const accessToken = getAccessTokenFromRequest(req)
  const supabase = createSupabaseServerClient(accessToken)
  const recipientRole = String(req.query.recipientRole || 'staff')
  const recipientUserId = String(req.query.recipientUserId || '')

  if (recipientRole === 'customer' && !recipientUserId) {
    res.status(400).json({ error: 'recipientUserId is required for customer notifications.' })
    return
  }

  const notifications = await getCachedOrLoad({
    key: `notifications:${JSON.stringify({ recipientRole, recipientUserId })}`,
    ttlSeconds: 15,
    tags: ['notifications', `notifications:${recipientRole}:${recipientUserId || 'shared'}`],
    loader: async () => {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('recipient_role', recipientRole)
        .order('created_at', { ascending: false })

      if (recipientRole === 'customer') {
        query = query.eq('recipient_user_id', recipientUserId)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    }
  })

  res.json(notifications)
}))

app.post('/api/auth/profile', asyncHandler(async (req, res) => {
  const { userId, userEmail, userMetadata } = req.body || {}

  if (!userId) {
    res.status(400).json({ error: 'userId is required.' })
    return
  }

  const fallbackProfile = {
    id: userId,
    email: userEmail,
    role: userMetadata?.role || 'customer',
    name: userMetadata?.full_name || '',
    phone: userMetadata?.phone || '',
    delivery_address: ''
  }

  try {
    const accessToken = getAccessTokenFromRequest(req)
    const supabase = createSupabaseServerClient(accessToken)
    const preferredRole = userMetadata?.role === 'staff' ? 'staff' : 'customer'
    const profileTableOrder = preferredRole === 'staff'
      ? ['seller', 'customer']
      : ['customer', 'seller']

    const loadProfileFromTable = async (tableName) => {
      const selectColumns = tableName === 'seller'
        ? 'id, name, email, phone'
        : 'id, name, email, phone, delivery_address'

      const { data, error } = await supabase
        .from(tableName)
        .select(selectColumns)
        .eq('id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) {
        return null
      }

      return {
        ...fallbackProfile,
        ...data,
        role: tableName === 'seller' ? 'staff' : 'customer',
        delivery_address: tableName === 'customer'
          ? data.delivery_address || ''
          : ''
      }
    }

    for (const tableName of profileTableOrder) {
      try {
        const resolvedProfile = await loadProfileFromTable(tableName)
        if (resolvedProfile) {
          res.json(resolvedProfile)
          return
        }
      } catch (error) {
        console.warn(
          `Profile lookup failed for ${tableName}:${userId}; using fallback profile.`,
          error.message
        )
        res.json(fallbackProfile)
        return
      }
    }

    res.json(fallbackProfile)
  } catch (error) {
    console.warn(`Profile resolution failed for ${userId}; using fallback profile.`, error.message)
    res.json(fallbackProfile)
  }
}))

app.get('/api/auth/user-exists', asyncHandler(async (req, res) => {
  const accessToken = getAccessTokenFromRequest(req)
  const supabase = createSupabaseServerClient(accessToken)
  const tableName = String(req.query.tableName || '')
  const userId = String(req.query.userId || '')

  if (!['seller', 'customer'].includes(tableName)) {
    res.status(400).json({ error: 'Unsupported table.' })
    return
  }

  if (!userId) {
    res.json({ exists: false })
    return
  }

  const result = await getCachedOrLoad({
    key: `auth:user-exists:${tableName}:${userId}`,
    ttlSeconds: 300,
    tags: ['membership', `membership:${userId}`],
    loader: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return {
        exists: Boolean(data?.id)
      }
    }
  })

  res.json(result)
}))

app.post('/api/cache/invalidate', asyncHandler(async (req, res) => {
  const tags = Array.isArray(req.body?.tags) ? req.body.tags : []
  await invalidateCacheTags(tags)

  res.json({
    invalidated: tags.filter(Boolean)
  })
}))

app.use((error, req, res, next) => {
  console.error('Server error:', error)

  res.status(error.status || 500).json({
    error: error.message || 'Internal server error'
  })
})

app.listen(env.port, () => {
  console.log(`Server running on :${env.port}`)
})
