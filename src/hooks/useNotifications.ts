/**
 * useNotifications - Hook for accessing GitHub notifications from Zustand store
 * 
 * This hook provides:
 * - Real-time access to notifications state (synced with background worker)
 * - Loading, error, and data states from Zustand
 * - Automatic syncing with chrome.storage via persist middleware
 * - Manual refresh capability
 * 
 * Background worker handles:
 * - Periodic fetching every 60 seconds
 * - Badge updates
 * - Storing data in chrome.storage (which syncs to Zustand)
 * 
 * Usage:
 * ```typescript
 * const { notifications, isLoading, error, refresh } = useNotifications()
 * ```
 */

import { useCallback, useState } from 'react'
import { NotificationService } from '../utils/notification-service'
import { useNotificationStore } from '../store/notification-store'
import { useAuth } from './useAuth'
import type { GitHubNotification } from '../types/github'

export interface UseNotificationsOptions {
  /**
   * If true, show notifications marked as read
   * @default false
   */
  all?: boolean
  /**
   * If true, only show notifications user is participating in
   * @default true
   */
  participating?: boolean
  /**
   * Enable/disable the query
   * @default true (auto-enabled when authenticated)
   */
  enabled?: boolean
}

export interface UseNotificationsResult {
  notifications: GitHubNotification[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  markAsRead: (notificationId: string) => void
}

export function useNotifications(_options?: UseNotificationsOptions): UseNotificationsResult {
  const { token } = useAuth()
  
  // Get state and actions from Zustand store (single source of truth)
  const { 
    notifications, 
    isLoading: storeLoading, 
    error: storeError,
    setNotifications,
    setLoading,
    setError,
    markAsRead,
    updateLastFetched,
  } = useNotificationStore()

  // Local state for tracking refresh operation
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Manual refresh function - fetches from GitHub API and updates store
  const refresh = useCallback(async () => {
    if (!token) {
      console.warn('[useNotifications] Cannot refresh: no token')
      return
    }

    setIsRefreshing(true)
    setLoading(true)

    try {
      console.log('[useNotifications] Manual refresh triggered')
      
      // Fetch fresh notifications from GitHub API
      const fetchedNotifications = await NotificationService.fetchNotifications(token)
      
      // Update Zustand store (which persists to chrome.storage)
      // Store will automatically apply smart dismiss filtering
      setNotifications(fetchedNotifications)
      updateLastFetched()
      
      console.log('[useNotifications] Refresh complete:', fetchedNotifications.length, 'notifications')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications'
      console.error('[useNotifications] Refresh failed:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [token, setNotifications, setLoading, setError, updateLastFetched])

  return {
    notifications, // From Zustand store (synced with background worker)
    isLoading: storeLoading || isRefreshing,
    error: storeError,
    refresh,
    markAsRead,
  }
}

/**
 * Hook to get unread notification count
 * 
 * Usage:
 * ```typescript
 * const unreadCount = useUnreadCount()
 * ```
 */
export function useUnreadCount(): number {
  const notifications = useNotificationStore(state => state.notifications)
  
  if (!notifications) return 0
  
  return notifications.filter((n: GitHubNotification) => n.unread).length
}
