import { memo, useCallback, useMemo } from 'react'
import { useNotificationStore, type NotificationFilter } from '../store/notification-store'

interface FilterTab {
  id: NotificationFilter
  label: string
  shortcut: string
}

const FILTER_TABS: FilterTab[] = [
  { id: 'all', label: 'All', shortcut: '1' },
  { id: 'mentions', label: 'Mentions', shortcut: '2' },
  { id: 'reviews', label: 'Reviews', shortcut: '3' },
  { id: 'assigned', label: 'Assigned', shortcut: '4' },
]

// Reason mappings for filters (must match notification-store.ts)
const MENTION_REASONS = ['mention', 'team_mention', 'author']
const REVIEW_REASONS = ['review_requested']
const ASSIGNED_REASONS = ['assign']

export const FilterBar = memo(() => {
  const activeFilter = useNotificationStore(state => state.activeFilter)
  const setFilter = useNotificationStore(state => state.setFilter)
  
  // Subscribe to notifications array directly so component re-renders on changes
  const notifications = useNotificationStore(state => state.notifications)
  
  // Compute filter counts from notifications array
  const filterCounts = useMemo(() => {
    return {
      all: notifications.length,
      mentions: notifications.filter(n => MENTION_REASONS.includes(n.reason)).length,
      reviews: notifications.filter(n => REVIEW_REASONS.includes(n.reason)).length,
      assigned: notifications.filter(n => ASSIGNED_REASONS.includes(n.reason)).length,
    }
  }, [notifications])

  const handleFilterClick = useCallback((filter: NotificationFilter) => {
    setFilter(filter)
  }, [setFilter])

  // Note: Keyboard shortcuts (1-4) are handled by useKeyboardShortcuts hook in App.tsx

  return (
    <div 
      className="overflow-x-auto border-b border-github-border-default bg-github-canvas-default mb-2"
      role="tablist"
      aria-label="Notification filters"
    >
      <div className="flex items-center gap-1 px-2 py-2 min-w-max">
        {FILTER_TABS.map((tab) => {
          const count = filterCounts[tab.id] ?? 0
          const isActive = activeFilter === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => handleFilterClick(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls="notification-list"
              aria-label={`${tab.label} (${count} notifications) - Press ${tab.shortcut}`}
              className={`
                relative px-3 py-1.5 rounded-github text-xs font-medium transition-all flex-shrink-0
                focus:outline-none focus:ring-2 focus:ring-github-accent-emphasis
                ${
                  isActive
                    ? 'bg-github-accent-emphasis text-white shadow-sm'
                    : 'text-github-fg-default hover:bg-github-canvas-subtle hover:text-github-fg-default'
                }
              `}
            >
            <span className="flex items-center gap-2">
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`
                    inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold
                    ${
                      isActive
                        ? 'bg-white bg-opacity-20 text-white'
                        : 'bg-github-accent-subtle text-github-accent-fg'
                    }
                  `}
                  aria-label={`${count} notifications`}
                >
                  {Number(count) || 0}
                </span>
              )}
            </span>
          </button>
        )
      })}
      </div>
    </div>
  )
})

FilterBar.displayName = 'FilterBar'
