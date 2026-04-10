export const getTimestamp = (value) => {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

export const sortNotifications = (items) => {
  return [...items].sort((firstItem, secondItem) => {
    return getTimestamp(secondItem.created_at) - getTimestamp(firstItem.created_at)
  })
}

export const formatNotificationTime = (value) => {
  if (!value) return 'Just now'
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Just now'

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export const extractNotificationOrderId = (notification) => {
  if (notification?.order_id) return notification.order_id

  const notificationText = `${notification?.title || ''} ${notification?.message || ''}`
  const orderIdMatch = notificationText.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
  )

  return orderIdMatch?.[0] || null
}

export const matchesNotificationAudience = (notification, recipientRole, recipientUserId) => {
  if (!notification) return false

  const notificationRole = notification.recipient_role || 'staff'
  if (notificationRole !== recipientRole) return false

  if (recipientRole === 'customer') {
    return notification.recipient_user_id === recipientUserId
  }

  return true
}
