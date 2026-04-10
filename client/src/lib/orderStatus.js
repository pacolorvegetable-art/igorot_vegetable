export const ORDER_STATUS_OPTIONS = ['pending', 'confirmed', 'rejected']

export const ACTIVE_ORDER_STATUSES = ['pending', 'confirmed']

export const ORDER_STATUS_BADGE_CLASSNAMES = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
}

export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  rejected: 'Rejected'
}

export function formatOrderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || 'Unknown'
}
