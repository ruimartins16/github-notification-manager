import { memo, useCallback, useEffect } from 'react'
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

export const FilterBar = memo(() => {
  const activeFilter = useNotificationStore(state => state.activeFilter)
  const setFilter = useNotificationStore(state => state.setFilter)
  const getFilterCounts = useNotificationStore(state => state.getFilterCounts)
  const filterCounts = getFilterCounts()

  const handleFilterClick = useCallback((filter: NotificationFilter) => {
    setFilter(filter)
  }, [setFilter])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const shortcutMap: Record<string, NotificationFilter> = {
        '1': 'all',
        '2': 'mentions',
        '3': 'reviews',
        '4': 'assigned',
      }

      const filter = shortcutMap[e.key]
      if (filter) {
        e.preventDefault()
        setFilter(filter)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setFilter])

  return (
    <div 
      className="flex items-center gap-1 p-2 border-b border-github-border-default bg-github-canvas-default"
      role="tablist"
      aria-label="Notification filters"
    >
      {FILTER_TABS.map((tab) => {
        const count = filterCounts[tab.id]
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
              relative px-4 py-2 rounded-github text-sm font-medium transition-all
              focus:outline-none focus:ring-2 focus:ring-github-accent-emphasis focus:ring-offset-2
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
                  {count}
                </span>
              )}
            </span>
            
            {/* Keyboard shortcut hint */}
            <span
              className={`
                absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center
                rounded text-[10px] font-bold
                ${
                  isActive
                    ? 'bg-white text-github-accent-emphasis'
                    : 'bg-github-canvas-subtle text-github-fg-muted border border-github-border-default'
                }
              `}
              aria-hidden="true"
            >
              {tab.shortcut}
            </span>
          </button>
        )
      })}
    </div>
  )
})

FilterBar.displayName = 'FilterBar'
