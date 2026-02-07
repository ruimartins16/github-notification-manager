import { useEffect, useCallback, useRef } from 'react'
import { useNotificationStore } from '../store/notification-store'

export interface KeyboardShortcut {
  key: string
  description: string
  action: () => void
  category: 'navigation' | 'actions' | 'filters' | 'global'
  requiresShift?: boolean
}

interface UseKeyboardShortcutsOptions {
  /** Currently focused notification index */
  focusedIndex: number
  /** Function to update focused index */
  setFocusedIndex: (index: number) => void
  /** Total number of notifications */
  notificationCount: number
  /** Callback when opening focused notification */
  onOpenFocused?: () => void
  /** Callback when marking focused as done */
  onMarkFocusedDone?: () => void
  /** Callback when archiving focused */
  onArchiveFocused?: () => void
  /** Callback when snoozing focused */
  onSnoozeFocused?: () => void
  /** Callback when marking all as read */
  onMarkAllRead?: () => void
  /** Callback when opening help modal */
  onOpenHelp?: () => void
  /** Whether shortcuts are enabled */
  enabled?: boolean
}

/**
 * Hook to manage keyboard shortcuts for notifications
 * 
 * Provides comprehensive keyboard navigation and actions:
 * - J/K: Navigate up/down
 * - D: Mark as done
 * - A: Archive
 * - S: Snooze
 * - O: Open notification
 * - 1-4: Filter tabs
 * - Shift+D: Mark all as read
 * - ?: Show help
 */
export function useKeyboardShortcuts({
  focusedIndex,
  setFocusedIndex,
  notificationCount,
  onOpenFocused,
  onMarkFocusedDone,
  onArchiveFocused,
  onSnoozeFocused,
  onMarkAllRead,
  onOpenHelp,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const setFilter = useNotificationStore(state => state.setFilter)
  const listRef = useRef<HTMLDivElement | null>(null)

  /**
   * Navigate to next notification (J key)
   */
  const navigateNext = useCallback(() => {
    if (focusedIndex < notificationCount - 1) {
      setFocusedIndex(focusedIndex + 1)
    }
  }, [focusedIndex, notificationCount, setFocusedIndex])

  /**
   * Navigate to previous notification (K key)
   */
  const navigatePrevious = useCallback(() => {
    if (focusedIndex > 0) {
      setFocusedIndex(focusedIndex - 1)
    } else if (focusedIndex === -1 && notificationCount > 0) {
      // If nothing focused, focus first item
      setFocusedIndex(0)
    }
  }, [focusedIndex, notificationCount, setFocusedIndex])

  /**
   * Scroll focused item into view
   */
  const scrollToFocused = useCallback(() => {
    if (focusedIndex >= 0 && focusedIndex < notificationCount && listRef.current) {
      const element = listRef.current.querySelector(`[data-notification-index="${focusedIndex}"]`)
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    }
  }, [focusedIndex, notificationCount])

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        !enabled
      ) {
        return
      }

      // Filter shortcuts (1-4)
      if (!e.shiftKey) {
        const filterMap: Record<string, 'all' | 'mentions' | 'reviews' | 'assigned'> = {
          '1': 'all',
          '2': 'mentions',
          '3': 'reviews',
          '4': 'assigned',
        }
        
        const filter = filterMap[e.key]
        if (filter) {
          e.preventDefault()
          setFilter(filter)
          // Blur the currently focused element to remove the focus ring
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
          return
        }
      }

      // Navigation shortcuts (lowercase only, Shift+J/K should not trigger)
      if (e.key === 'j' && !e.shiftKey) {
        e.preventDefault()
        navigateNext()
        return
      }

      if (e.key === 'k' && !e.shiftKey) {
        e.preventDefault()
        navigatePrevious()
        return
      }

      // Action shortcuts (only if an item is focused)
      if (focusedIndex >= 0) {
        if (e.key === 'd' && !e.shiftKey) {
          e.preventDefault()
          onMarkFocusedDone?.()
          return
        }

        if ((e.key === 'a' || e.key === 'A') && !e.shiftKey) {
          e.preventDefault()
          onArchiveFocused?.()
          return
        }

        if ((e.key === 's' || e.key === 'S') && !e.shiftKey) {
          e.preventDefault()
          onSnoozeFocused?.()
          return
        }

        if ((e.key === 'o' || e.key === 'O') && !e.shiftKey) {
          e.preventDefault()
          onOpenFocused?.()
          return
        }
      }

      // Global shortcuts
      if (e.key === 'D' && e.shiftKey) {
        e.preventDefault()
        onMarkAllRead?.()
        return
      }

      if (e.key === '?' && e.shiftKey) {
        e.preventDefault()
        onOpenHelp?.()
        return
      }
    },
    [
      enabled,
      focusedIndex,
      navigateNext,
      navigatePrevious,
      onMarkFocusedDone,
      onArchiveFocused,
      onSnoozeFocused,
      onOpenFocused,
      onMarkAllRead,
      onOpenHelp,
    ]
  )

  /**
   * Store the latest callback in a ref to avoid re-adding listeners
   */
  const handleKeyDownRef = useRef(handleKeyDown)
  useEffect(() => {
    handleKeyDownRef.current = handleKeyDown
  }, [handleKeyDown])

  /**
   * Setup event listeners (stable - only changes when enabled changes)
   */
  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => handleKeyDownRef.current(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled])

  /**
   * Auto-scroll to focused item
   */
  useEffect(() => {
    if (enabled && focusedIndex >= 0) {
      scrollToFocused()
    }
  }, [focusedIndex, enabled, scrollToFocused])

  /**
   * Get all available shortcuts (for help modal)
   */
  const getShortcuts = useCallback((): KeyboardShortcut[] => {
    return [
      // Navigation
      {
        key: 'J',
        description: 'Navigate to next notification',
        action: navigateNext,
        category: 'navigation',
      },
      {
        key: 'K',
        description: 'Navigate to previous notification',
        action: navigatePrevious,
        category: 'navigation',
      },
      // Actions on focused item
      {
        key: 'D',
        description: 'Mark focused notification as done',
        action: () => onMarkFocusedDone?.(),
        category: 'actions',
      },
      {
        key: 'A',
        description: 'Archive focused notification',
        action: () => onArchiveFocused?.(),
        category: 'actions',
      },
      {
        key: 'S',
        description: 'Snooze focused notification',
        action: () => onSnoozeFocused?.(),
        category: 'actions',
      },
      {
        key: 'O',
        description: 'Open focused notification in GitHub',
        action: () => onOpenFocused?.(),
        category: 'actions',
      },
      // Filters
      {
        key: '1',
        description: 'Show all notifications',
        action: () => setFilter('all'),
        category: 'filters',
      },
      {
        key: '2',
        description: 'Show mentions only',
        action: () => setFilter('mentions'),
        category: 'filters',
      },
      {
        key: '3',
        description: 'Show review requests',
        action: () => setFilter('reviews'),
        category: 'filters',
      },
      {
        key: '4',
        description: 'Show assigned issues',
        action: () => setFilter('assigned'),
        category: 'filters',
      },
      // Global
      {
        key: 'Shift + D',
        description: 'Mark all as read',
        action: () => onMarkAllRead?.(),
        category: 'global',
        requiresShift: true,
      },
      {
        key: '?',
        description: 'Show keyboard shortcuts help',
        action: () => onOpenHelp?.(),
        category: 'global',
        requiresShift: true,
      },
    ]
  }, [
    navigateNext,
    navigatePrevious,
    onMarkFocusedDone,
    onArchiveFocused,
    onSnoozeFocused,
    onOpenFocused,
    onMarkAllRead,
    onOpenHelp,
    setFilter,
  ])

  return {
    focusedIndex,
    navigateNext,
    navigatePrevious,
    getShortcuts,
    listRef,
  }
}
