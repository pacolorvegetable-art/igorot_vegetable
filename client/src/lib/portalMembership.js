import { apiGet } from '../services/api'

async function userExistsInTable(tableName, userId) {
  if (!userId) {
    return false
  }

  const { exists } = await apiGet('/auth/user-exists', {
    params: {
      tableName,
      userId
    },
    cache: {
      ttlMs: 5 * 60 * 1000,
      tags: ['membership', `membership:${userId}`]
    }
  })

  return Boolean(exists)
}

export async function isSellerUser(userId) {
  return userExistsInTable('seller', userId)
}

export async function isCustomerUser(userId) {
  return userExistsInTable('customer', userId)
}
