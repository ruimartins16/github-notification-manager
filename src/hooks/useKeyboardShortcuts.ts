import { useEffect, useCallback, useRef } from 'react'
import { useNotificationStore } from '../store/notification-store'
import { useProStatus } from './useProStatus'

export interface KeyboardShortcut {
  key: string
  description: string
  action: () => void
  category: 'navigation' | 'actions' | 'filters' | 'global'
  requiresShift?: boolean
  isPro?: boolean
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
  /** Callback to show upgrade prompt */
  onShowUpgrade?: (feature: string) => void
  /** Whether shortcuts are enabled */
  enabled?: boolean
}

/**
 * Hook to manage keyboard shortcuts for notifications
 * 
 * Provides comprehensive keyboard navigation and actions:
 * - J/K: Navigate up/down (Pro)
 * - D: Mark as done (Pro)
 * - A: Archive (Pro)
 * - S: Snooze (Pro)
 * - O: Open notification (Pro)
 * - 1-4: Filter tabs (Pro)
 * - Shift+D: Mark all as read (Pro)
 * - ?: Show help (Free - always available)
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
  onShowUpgrade,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const setFilter = useNotificationStore(state => state.setFilter)
  const listRef = useRef<HTMLDivElement | null>(null)
  const { isPro } = useProStatus()

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

      // Help shortcut (always free)
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault()
        onOpenHelp?.()
        return
      }

      // All other shortcuts require Pro
      // Filter shortcuts (1-4) - PRO
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
          if (!isPro) {
            return
          }
          setFilter(filter)
          // Blur the currently focused element to remove the focus ring
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
          return
        }
      }

      // Navigation shortcuts (lowercase only, Shift+J/K should not trigger) - PRO
      if (e.key === 'j' && !e.shiftKey) {
        e.preventDefault()
        if (!isPro) {
          return
        }
        navigateNext()
        return
      }

      if (e.key === 'k' && !e.shiftKey) {
        e.preventDefault()
        if (!isPro) {
          return
        }
        navigatePrevious()
        return
      }

      // Action shortcuts (only if an item is focused)
      if (focusedIndex >= 0) {
        if (e.key === 'd' && !e.shiftKey) {
          e.preventDefault()
          if (!isPro) {
            return
          }
          onMarkFocusedDone?.()
          return
        }

        if ((e.key === 'a' || e.key === 'A') && !e.shiftKey) {
          e.preventDefault()
          if (!isPro) {
            return
          }
          onArchiveFocused?.()
          return
        }

        if ((e.key === 's' || e.key === 'S') && !e.shiftKey) {
          e.preventDefault()
          if (!isPro) {
            return
          }
          onSnoozeFocused?.()
          return
        }

        if ((e.key === 'o' || e.key === 'O') && !e.shiftKey) {
          e.preventDefault()
          if (!isPro) {
            return
          }
          onOpenFocused?.()
          return
        }
      }

      // Global shortcuts - PRO
      if (e.key === 'D' && e.shiftKey) {
        e.preventDefault()
        if (!isPro) {
          return
        }
        onMarkAllRead?.()
        return
      }
    },
    [
      enabled,
      focusedIndex,
      isPro,
      navigateNext,
      navigatePrevious,
      onMarkFocusedDone,
      onArchiveFocused,
      onSnoozeFocused,
      onOpenFocused,
      onMarkAllRead,
      onOpenHelp,
      onShowUpgrade,
      setFilter,
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
      // Navigation - PRO
      {
        key: 'J',
        description: 'Navigate to next notification',
        action: navigateNext,
        category: 'navigation',
        isPro: true,
      },
      {
        key: 'K',
        description: 'Navigate to previous notification',
        action: navigatePrevious,
        category: 'navigation',
        isPro: true,
      },
      // Actions on focused item - PRO
      {
        key: 'D',
        description: 'Mark focused notification as done',
        action: () => onMarkFocusedDone?.(),
        category: 'actions',
        isPro: true,
      },
      {
        key: 'A',
        description: 'Archive focused notification',
        action: () => onArchiveFocused?.(),
        category: 'actions',
        isPro: true,
      },
      {
        key: 'S',
        description: 'Snooze focused notification',
        action: () => onSnoozeFocused?.(),
        category: 'actions',
        isPro: true,
      },
      {
        key: 'O',
        description: 'Open focused notification in GitHub',
        action: () => onOpenFocused?.(),
        category: 'actions',
        isPro: true,
      },
      // Filters - PRO
      {
        key: '1',
        description: 'Show all notifications',
        action: () => setFilter('all'),
        category: 'filters',
        isPro: true,
      },
      {
        key: '2',
        description: 'Show mentions only',
        action: () => setFilter('mentions'),
        category: 'filters',
        isPro: true,
      },
      {
        key: '3',
        description: 'Show review requests',
        action: () => setFilter('reviews'),
        category: 'filters',
        isPro: true,
      },
      {
        key: '4',
        description: 'Show assigned issues',
        action: () => setFilter('assigned'),
        category: 'filters',
        isPro: true,
      },
      // Global - PRO except help
      {
        key: 'Shift + D',
        description: 'Mark all as read',
        action: () => onMarkAllRead?.(),
        category: 'global',
        requiresShift: true,
        isPro: true,
      },
      {
        key: '?',
        description: 'Show keyboard shortcuts help',
        action: () => onOpenHelp?.(),
        category: 'global',
        requiresShift: true,
        isPro: false,
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
