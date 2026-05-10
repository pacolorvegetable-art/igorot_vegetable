import { supabase } from '../lib/supabaseClient'
import { invalidateCacheTags } from './api'

export async function getConversationsForCustomer(customerId) {
  if (!customerId) return []

  const { data, error } = await supabase
    .from('conversation')
    .select('*')
    .eq('customer_id', customerId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getConversationsForSeller(sellerId) {
  if (!sellerId) return []

  const { data, error } = await supabase
    .from('conversation')
    .select('*')
    .eq('seller_id', sellerId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getOrCreateConversation({ customerId, sellerId }) {
  if (!customerId || !sellerId) {
    throw new Error('customerId and sellerId are required')
  }

  const { data, error } = await supabase
    .from('conversation')
    .upsert({
      customer_id: customerId,
      seller_id: sellerId
    }, {
      onConflict: 'customer_id,seller_id'
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function getConversationMessages(conversationId) {
  if (!conversationId) return []

  const { data, error } = await supabase
    .from('message')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function sendConversationMessage({ conversationId, senderId, receiverId, content }) {
  const trimmedContent = String(content || '').trim()
  if (!trimmedContent) {
    throw new Error('Message content is required')
  }

  const { data, error } = await supabase
    .from('message')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      receiver_id: receiverId,
      content: trimmedContent
    })
    .select('*')
    .single()

  if (error) throw error

  await invalidateCacheTags(['notifications'])
  return data
}

export async function markConversationAsRead({ conversationId, userId }) {
  if (!conversationId || !userId) return

  const { error } = await supabase
    .from('message')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('conversation_id', conversationId)
    .eq('receiver_id', userId)
    .eq('is_read', false)

  if (error) throw error
}

export async function getUnreadConversationCounts(userId) {
  if (!userId) return {}

  const { data, error } = await supabase
    .from('message')
    .select('conversation_id')
    .eq('receiver_id', userId)
    .eq('is_read', false)

  if (error) throw error

  return (data || []).reduce((counts, row) => {
    const key = row.conversation_id
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, {})
}
