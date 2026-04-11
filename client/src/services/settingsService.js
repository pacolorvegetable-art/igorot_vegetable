import { supabase } from '../lib/supabaseClient'
import { apiGet, invalidateCacheTags } from './api'

const ORDERS_CACHE = {
  ttlMs: 60 * 1000,
  tags: ['orders']
}

const DASHBOARD_KPIS_CACHE = {
  ttlMs: 60 * 1000,
  tags: ['orders', 'spoilage', 'dashboard']
}

const REVENUE_CACHE = {
  ttlMs: 60 * 1000,
  tags: ['orders', 'revenue', 'dashboard']
}

const PAYMENT_METHODS_CACHE = {
  ttlMs: 30 * 60 * 1000,
  tags: ['payment-methods']
}

const OPERATING_HOURS_CACHE = {
  ttlMs: 30 * 60 * 1000,
  tags: ['operating-hours']
}

// ============================================================================
// ORDERS
// ============================================================================

export async function getOrders(filters = {}) {
  return apiGet('/orders', {
    params: filters,
    cache: ORDERS_CACHE
  })
}

export async function getCurrentUserOrderHistory() {
  return apiGet('/orders/history', {
    cache: ORDERS_CACHE
  })
}

export async function getTrackedOrdersByPhone(phone) {
  return apiGet('/orders/history', {
    params: {
      phone: phone?.trim() || undefined
    },
    cache: ORDERS_CACHE
  })
}

export async function getOrderById(id) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_item (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createOrder(orderData) {
  const { items, ...order } = orderData

  // Generate a UUID for the order on the client side
  const orderId = crypto.randomUUID()
  
  // Create the order without .select() (anon users may not have SELECT permission)
  const { error: orderError } = await supabase
    .from('orders')
    .insert({ ...order, id: orderId })

  if (orderError) throw orderError

  // Create order items
  if (items && items.length > 0) {
    const orderItems = items.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit: item.unit || 'kg',
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price
    }))

    const { error: itemsError } = await supabase
      .from('order_item')
      .insert(orderItems)

    if (itemsError) throw itemsError
  }

  await invalidateCacheTags(['orders', 'notifications'])
  return { id: orderId }
}

export async function updateOrderStatus(id, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  await invalidateCacheTags(['orders', 'notifications'])
  return data
}

export async function updateOrderPaymentStatus(id, payment_status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ payment_status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  await invalidateCacheTags(['orders', 'notifications'])
  return data
}

export async function deleteOrder(id) {
  // Order items will be deleted automatically via CASCADE
  const { data, error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)
    .select('customer_id')
    .maybeSingle()

  if (error) throw error

  const cacheTags = ['orders', 'notifications']
  if (data?.customer_id) {
    cacheTags.push('customers', `customer:${data.customer_id}`)
  }

  await invalidateCacheTags(cacheTags)
}

export async function getDashboardKpis() {
  return apiGet('/dashboard/kpis', {
    cache: DASHBOARD_KPIS_CACHE
  })
}

export async function getRevenueByMonth(month) {
  return apiGet('/revenue', {
    params: {
      month: month?.trim() || undefined
    },
    cache: {
      ...REVENUE_CACHE,
      key: `revenue:${month || ''}`
    }
  })
}

// Get today's revenue
export async function getTodayRevenue() {
  const { todayRevenue } = await getDashboardKpis()
  return todayRevenue || 0
}

// Get pending orders count
export async function getPendingOrdersCount() {
  const { pendingOrders } = await getDashboardKpis()
  return pendingOrders ?? 0
}

// ============================================================================
// SPOILAGE
// ============================================================================

export async function getSpoilage(filters = {}) {
  let query = supabase
    .from('spoilage')
    .select('*')
    .order('recorded_at', { ascending: false })

  if (filters.date) {
    query = query.eq('recorded_at', filters.date)
  }
  if (filters.product_id) {
    query = query.eq('product_id', filters.product_id)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function createSpoilage(spoilageData) {
  const { data, error } = await supabase
    .from('spoilage')
    .insert({
      ...spoilageData,
      total_loss: spoilageData.quantity * spoilageData.unit_price
    })
    .select()
    .single()

  if (error) throw error
  await invalidateCacheTags(['spoilage'])
  return data
}

// Get today's spoilage loss
export async function getTodaySpoilageLoss() {
  const { todaySpoilageLoss } = await getDashboardKpis()
  return todaySpoilageLoss || 0
}

// ============================================================================
// PAYMENT METHODS
// ============================================================================

export async function getPaymentMethods(activeOnly = false) {
  return apiGet('/payment-methods', {
    params: {
      activeOnly: activeOnly ? 'true' : undefined
    },
    cache: PAYMENT_METHODS_CACHE
  })
}

export async function createPaymentMethod(methodData) {
  const { data, error } = await supabase
    .from('payment_method')
    .insert(methodData)
    .select()
    .single()

  if (error) throw error
  await invalidateCacheTags(['payment-methods'])
  return data
}

export async function updatePaymentMethod(id, methodData) {
  const { data, error } = await supabase
    .from('payment_method')
    .update(methodData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  await invalidateCacheTags(['payment-methods'])
  return data
}

export async function deletePaymentMethod(id) {
  const { error } = await supabase
    .from('payment_method')
    .delete()
    .eq('id', id)

  if (error) throw error
  await invalidateCacheTags(['payment-methods'])
}

// ============================================================================
// OPERATING HOURS
// ============================================================================

export async function getOperatingHours() {
  return apiGet('/operating-hours', {
    cache: OPERATING_HOURS_CACHE
  })
}

export async function updateOperatingHours(id, hoursData) {
  const { data, error } = await supabase
    .from('operating_hours')
    .update(hoursData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  await invalidateCacheTags(['operating-hours'])
  return data
}

export async function updateAllOperatingHours(hoursArray) {
  const results = []
  for (const hours of hoursArray) {
    const { id, ...updateData } = hours
    const { data, error } = await supabase
      .from('operating_hours')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    results.push(data)
  }
  await invalidateCacheTags(['operating-hours'])
  return results
}
