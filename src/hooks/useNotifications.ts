/**
 * useNotifications - Hook for accessing GitHub notifications from Zustand store
 * 
 * This hook provides:
 * - Real-time access to notifications state (synced with background worker)
 * - Loading, error, and data states from Zustand
 * - Automatic syncing with chrome.storage via persist middleware
 * - Manual refresh capability via React Query
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

import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { GitHubAPI } from '../utils/github-api'
import { useNotificationStore } from '../store/notification-store'
import { useAuth } from './useAuth'
import type { GitHubNotification } from '../types/github'

const STALE_TIME = 30 * 1000 // 30 seconds - data considered fresh for 30s

export interface UseNotificationsOptions {
  /**
   * If true, show notifications marked as read
   * @default false
   */
  all?: boolean
  /**
   * If true, only show notifications user is participating in
   * @default false
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

export function useNotifications(options?: UseNotificationsOptions): UseNotificationsResult {
  const { token, isAuthenticated } = useAuth()
  
  // Get state and actions from Zustand store
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

  // React Query for manual refresh capability
  const query = useQuery<GitHubNotification[], Error>({
    queryKey: ['notifications', { all: options?.all, participating: options?.participating }],
    queryFn: async () => {
      if (!token) {
        throw new Error('Token is required but not available')
      }

      setLoading(true)

      try {
        const api = GitHubAPI.getInstance()
        await api.initialize(token)
        
        const fetchedNotifications = await api.fetchNotifications({
          all: options?.all,
          participating: options?.participating,
        })

        const typedNotifications = fetchedNotifications as unknown as GitHubNotification[]
        
        // Update Zustand store (which persists to chrome.storage)
        setNotifications(typedNotifications)
        updateLastFetched()
        
        return typedNotifications
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    // Only fetch if authenticated AND token exists (prevents race condition)
    enabled: (options?.enabled ?? true) && isAuthenticated && !!token,
    // Don't poll - background service worker handles periodic fetching
    refetchInterval: false,
    staleTime: STALE_TIME,
    // Manual refresh on window focus
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
  })

  // Manual refresh function
  const refresh = useCallback(async () => {
    await query.refetch()
  }, [query])

  return {
    notifications,
    isLoading: storeLoading || query.isFetching,
    error: storeError || (query.error?.message ?? null),
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
  const { notifications } = useNotifications({ all: false })
  
  if (!notifications) return 0
  
  return notifications.filter((n: GitHubNotification) => n.unread).length
}
