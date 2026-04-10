import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { matchesNotificationAudience, sortNotifications } from '../lib/notificationUtils'
import { apiGet, invalidateCacheTags, setCachedResponse } from '../services/api'

export function useNotifications({ enabled = true, recipientRole = 'staff', recipientUserId = null }) {
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const notificationsRef = useRef([])
  const notificationQueryParams = useMemo(() => ({
    recipientRole,
    recipientUserId: recipientRole === 'customer' ? recipientUserId : undefined
  }), [recipientRole, recipientUserId])
  const notificationCache = useMemo(() => ({
    ttlMs: 15 * 1000,
    tags: ['notifications', `notifications:${recipientRole}:${recipientUserId || 'shared'}`]
  }), [recipientRole, recipientUserId])

  const cacheNotifications = useCallback((nextNotifications) => {
    if (!enabled || (recipientRole === 'customer' && !recipientUserId)) {
      return
    }

    setCachedResponse('/notifications', {
      params: notificationQueryParams,
      value: nextNotifications,
      cache: notificationCache
    })
  }, [enabled, notificationCache, notificationQueryParams, recipientRole, recipientUserId])

  const setNotificationsWithCache = useCallback((nextNotifications) => {
    const sortedNotifications = sortNotifications(nextNotifications || [])
    notificationsRef.current = sortedNotifications
    setNotifications(sortedNotifications)
    cacheNotifications(sortedNotifications)
  }, [cacheNotifications])

  const loadNotifications = useCallback(async () => {
    if (!enabled || (recipientRole === 'customer' && !recipientUserId)) {
      notificationsRef.current = []
      setNotifications([])
      setNotificationsLoading(false)
      return
    }

    setNotificationsLoading(true)

    try {
      const data = await apiGet('/notifications', {
        params: notificationQueryParams,
        cache: notificationCache
      })
      setNotificationsWithCache(data || [])
    } catch (error) {
      console.error('Failed to load notifications:', error)
      notificationsRef.current = []
      setNotifications([])
    } finally {
      setNotificationsLoading(false)
    }
  }, [
    enabled,
    notificationCache,
    notificationQueryParams,
    recipientRole,
    recipientUserId,
    setNotificationsWithCache
  ])

  useEffect(() => {
    if (!enabled || (recipientRole === 'customer' && !recipientUserId)) {
      notificationsRef.current = []
      setNotifications([])
      setNotificationsLoading(false)
      return undefined
    }

    loadNotifications()

    const channel = supabase
      .channel(`notifications-${recipientRole}-${recipientUserId || 'shared'}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        ({ new: newNotification }) => {
          if (!matchesNotificationAudience(newNotification, recipientRole, recipientUserId)) return

          const currentNotifications = notificationsRef.current
          const alreadyExists = currentNotifications.some((item) => item.id === newNotification.id)
          if (alreadyExists) return

          setNotificationsWithCache([newNotification, ...currentNotifications])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        ({ new: updatedNotification }) => {
          if (!matchesNotificationAudience(updatedNotification, recipientRole, recipientUserId)) return

          const currentNotifications = notificationsRef.current
          const alreadyExists = currentNotifications.some((item) => item.id === updatedNotification.id)

          if (!alreadyExists) {
            setNotificationsWithCache([updatedNotification, ...currentNotifications])
            return
          }

          setNotificationsWithCache(
            currentNotifications.map((item) => (
              item.id === updatedNotification.id ? { ...item, ...updatedNotification } : item
            ))
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        ({ old }) => {
          setNotificationsWithCache(
            notificationsRef.current.filter((item) => item.id !== old.id)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, loadNotifications, recipientRole, recipientUserId, setNotificationsWithCache])

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.is_read).length
  }, [notifications])

  const hasUnread = unreadCount > 0

  const markNotificationAsRead = useCallback(async (notification) => {
    if (!notification || notification.is_read) return true

    setNotificationsWithCache(
      notificationsRef.current.map((item) => {
        return item.id === notification.id ? { ...item, is_read: true } : item
      })
    )

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id)
      .eq('is_read', false)

    if (error) {
      console.error('Failed to mark notification as read:', error)
      await loadNotifications()
      return false
    }

    await invalidateCacheTags(['notifications'])
    cacheNotifications(notificationsRef.current)
    return true
  }, [cacheNotifications, loadNotifications, setNotificationsWithCache])

  const markAllAsRead = useCallback(async () => {
    if (!hasUnread) return true

    setIsMarkingAllRead(true)
    setNotificationsWithCache(
      notificationsRef.current.map((item) => ({ ...item, is_read: true }))
    )

    let query = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_role', recipientRole)
      .eq('is_read', false)

    if (recipientRole === 'customer') {
      query = query.eq('recipient_user_id', recipientUserId)
    }

    const { error } = await query

    if (error) {
      console.error('Failed to mark all notifications as read:', error)
      await loadNotifications()
      setIsMarkingAllRead(false)
      return false
    }

    setIsMarkingAllRead(false)
    await invalidateCacheTags(['notifications'])
    cacheNotifications(notificationsRef.current)
    return true
  }, [
    cacheNotifications,
    hasUnread,
    loadNotifications,
    recipientRole,
    recipientUserId,
    setNotificationsWithCache
  ])

  return {
    notifications,
    notificationsLoading,
    unreadCount,
    hasUnread,
    isMarkingAllRead,
    loadNotifications,
    markNotificationAsRead,
    markAllAsRead
  }
}
