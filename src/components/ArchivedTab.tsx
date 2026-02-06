import { memo } from 'react'
import { useNotificationStore } from '../store/notification-store'
import { NotificationItem } from './NotificationItem'

export const ArchivedTab = memo(() => {
  const archivedNotifications = useNotificationStore(state => state.archivedNotifications)
  const unarchiveNotification = useNotificationStore(state => state.unarchiveNotification)

  if (archivedNotifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <svg
          className="w-16 h-16 text-github-fg-muted mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        <h3 className="text-sm font-medium text-github-fg-default mb-2">
          No archived notifications
        </h3>
        <p className="text-xs text-github-fg-muted text-center">
          Notifications you archive will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {archivedNotifications.map((notification) => (
        <div key={notification.id} className="relative">
          <NotificationItem
            notification={notification}
            showSnoozeButton={false}
            showActions={false}
          />
          
          {/* Unarchive button overlay */}
          <div className="absolute top-2 right-2 bg-github-canvas-subtle border border-github-border-default rounded-github px-3 py-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                unarchiveNotification(notification.id)
              }}
              className="
                text-xs font-medium
                text-github-accent-fg hover:text-github-accent-emphasis
                transition-colors
              "
              aria-label="Unarchive notification"
            >
              Unarchive
            </button>
          </div>
        </div>
      ))}
    </div>
  )
})

ArchivedTab.displayName = 'ArchivedTab'
