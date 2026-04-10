import { CheckCheck } from 'lucide-react'
import { extractNotificationOrderId, formatNotificationTime } from '../lib/notificationUtils'

function NotificationMessage({ notification }) {
  const title = notification.title || notification.message || 'A new update is available.'
  const details = notification.title && notification.message ? notification.message : null

  return (
    <div className="min-w-0 flex-1">
      <p className="break-words text-sm font-medium leading-5 text-foreground">
        {title}
      </p>
      {details && (
        <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
          {details}
        </p>
      )}
    </div>
  )
}

export default function NotificationsPanel({
  open,
  onClose,
  panelClassName,
  backdropClassName = 'fixed inset-0 z-10 cursor-default',
  notifications,
  notificationsLoading,
  unreadCount,
  hasUnread,
  isMarkingAllRead,
  onMarkAllAsRead,
  onNotificationClick,
  emptyMessage = 'No notifications yet.'
}) {
  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="Close notifications"
        className={backdropClassName}
        onClick={onClose}
      />

      <div className={panelClassName}>
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {hasUnread ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>

          <button
            type="button"
            onClick={onMarkAllAsRead}
            disabled={!hasUnread || isMarkingAllRead}
            className="inline-flex w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {isMarkingAllRead ? 'Marking...' : 'Mark all as read'}
          </button>
        </div>

        <div className="max-h-[min(70vh,24rem)] overflow-y-auto divide-y divide-border sm:max-h-96">
          {notificationsLoading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            notifications.map((notification) => {
              const orderId = extractNotificationOrderId(notification)

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => onNotificationClick(notification)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    notification.is_read
                      ? 'bg-card hover:bg-muted/50'
                      : 'border-l-4 border-l-emerald-500 bg-emerald-50/60 hover:bg-emerald-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <NotificationMessage notification={notification} />
                    {!notification.is_read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    )}
                  </div>

                  {orderId && (
                    <p className="mt-1 break-all text-xs font-mono text-muted-foreground">
                      Order #{String(orderId).slice(0, 8)}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatNotificationTime(notification.created_at)}
                  </p>
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
