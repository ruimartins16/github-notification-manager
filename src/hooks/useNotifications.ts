/**
 * useNotifications - React Query hook for GitHub notifications
 * 
 * This hook provides:
 * - Automatic polling every 60 seconds
 * - Smart caching with 30s stale time
 * - Auto refetch on window focus and reconnect
 * - Loading, error, and data states
 * - Retry logic with exponential backoff
 * - Stores notifications in chrome.storage to trigger badge updates
 * 
 * Usage:
 * ```typescript
 * const { data: notifications, isLoading, error } = useNotifications()
 * ```
 */

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { GitHubAPI } from '../utils/github-api'
import { NOTIFICATIONS_STORAGE_KEY } from '../utils/notification-service'
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
   * Polling interval in milliseconds
   * @default 60000 (60 seconds)
   */
  refetchInterval?: number
  /**
   * Enable/disable the query
   * @default true (auto-enabled when authenticated)
   */
  enabled?: boolean
}

export function useNotifications(options?: UseNotificationsOptions) {
  const { token, isAuthenticated } = useAuth()

  const query = useQuery<GitHubNotification[], Error>({
    queryKey: ['notifications', { all: options?.all, participating: options?.participating }],
    queryFn: async () => {
      if (!token) {
        throw new Error('Token is required but not available')
      }

      // Use singleton to prevent memory leaks from polling
      const api = GitHubAPI.getInstance()
      await api.initialize(token)
      
      const notifications = await api.fetchNotifications({
        all: options?.all,
        participating: options?.participating,
      })

      // Octokit returns the data in the correct format, cast to our type
      return notifications as unknown as GitHubNotification[]
    },
    // Only fetch if authenticated AND token exists (prevents race condition)
    enabled: (options?.enabled ?? true) && isAuthenticated && !!token,
    // Don't poll in popup - background service worker handles periodic fetching
    // This prevents duplicate API calls
    refetchInterval: false,
    staleTime: STALE_TIME,
    // Fetch when popup opens/refocuses
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
  })

  // Listen for background updates and sync with React Query cache
  // This keeps the popup in sync when background worker fetches new data
  useEffect(() => {
    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === 'local' && changes[NOTIFICATIONS_STORAGE_KEY]) {
        const newNotifications = changes[NOTIFICATIONS_STORAGE_KEY].newValue as GitHubNotification[] | undefined
        
        if (newNotifications) {
          // Update React Query cache with new data from background fetch
          query.refetch()
        }
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [query])

  return query
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
  const { data: notifications } = useNotifications({ all: false })
  
  if (!notifications) return 0
  
  return notifications.filter(n => n.unread).length
}
