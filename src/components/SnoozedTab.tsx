import { memo } from 'react'
import { useNotificationStore } from '../store/notification-store'
import { formatDistanceToNow } from 'date-fns'
import { NotificationItem } from './NotificationItem'

export const SnoozedTab = memo(() => {
  const snoozedNotifications = useNotificationStore(state => state.snoozedNotifications)
  const unsnoozeNotification = useNotificationStore(state => state.unsnoozeNotification)

  if (snoozedNotifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <svg
          className="w-16 h-16 text-github-fg-muted dark:text-github-fg-dark-muted mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-sm font-medium text-github-fg-default dark:text-github-fg-dark-default mb-2">
          No snoozed notifications
        </h3>
        <p className="text-xs text-github-fg-muted dark:text-github-fg-dark-muted text-center">
          Notifications you snooze will appear here until they wake up
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-github-border-default dark:divide-github-border-dark-default">
      {snoozedNotifications.map((snoozed) => (
        <div key={snoozed.notification.id} className="relative">
          <NotificationItem
            notification={snoozed.notification}
            showSnoozeButton={false}
          />
          
          {/* Snooze info overlay */}
          <div className="absolute top-2 right-2 bg-github-canvas-subtle dark:bg-github-canvas-dark-subtle border border-github-border-default dark:border-github-border-dark-default rounded-github px-3 py-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div>
                <div className="text-github-fg-muted dark:text-github-fg-dark-muted">
                  Wakes {formatDistanceToNow(snoozed.wakeTime, { addSuffix: true })}
                </div>
                <div className="text-[10px] text-github-fg-subtle dark:text-github-fg-dark-subtle">
                  {new Date(snoozed.wakeTime).toLocaleString()}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  unsnoozeNotification(snoozed.notification.id)
                }}
                className="
                  px-2 py-1 rounded text-[10px] font-medium
                  text-github-accent-fg dark:text-github-accent-dark-fg hover:bg-github-accent-subtle dark:hover:bg-github-accent-dark-subtle
                  transition-colors
                "
                aria-label="Unsnooze notification"
              >
                Wake Now
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})

SnoozedTab.displayName = 'SnoozedTab'
