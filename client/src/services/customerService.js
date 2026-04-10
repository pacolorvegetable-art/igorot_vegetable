import { supabase } from '../lib/supabaseClient'
import { apiGet, invalidateCacheTags } from './api'

const CUSTOMERS_CACHE = {
  ttlMs: 5 * 60 * 1000,
  tags: ['customers']
}

// Get all customers
export async function getCustomers() {
  return apiGet('/customers', {
    cache: CUSTOMERS_CACHE
  })
}

// Get a single customer by ID
export async function getCustomerById(id) {
  const { data, error } = await supabase
    .from('customer')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Get customer's orders
export async function getCustomerOrders(customerId) {
  return apiGet(`/customers/${customerId}/orders`, {
    cache: {
      ttlMs: 2 * 60 * 1000,
      tags: ['orders', 'customers', `customer:${customerId}`]
    }
  })
}

// Get customer statistics
export async function getCustomerStats(customerId) {
  return apiGet(`/customers/${customerId}/stats`, {
    cache: {
      ttlMs: 5 * 60 * 1000,
      tags: ['orders', 'customers', `customer:${customerId}`]
    }
  })
}

// Update customer information
export async function updateCustomer(id, customerData) {
  const { data, error } = await supabase
    .from('customer')
    .update(customerData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  await invalidateCacheTags(['customers', `profile:${id}`])
  return data
}
