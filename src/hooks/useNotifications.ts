/**
 * useNotifications - React Query hook for GitHub notifications
 * 
 * This hook provides:
 * - Automatic polling every 60 seconds
 * - Smart caching with 30s stale time
 * - Auto refetch on window focus and reconnect
 * - Loading, error, and data states
 * - Retry logic with exponential backoff
 * 
 * Usage:
 * ```typescript
 * const { data: notifications, isLoading, error } = useNotifications()
 * ```
 */

import { useQuery } from '@tanstack/react-query'
import { GitHubAPI } from '../utils/github-api'
import { useAuth } from './useAuth'
import type { GitHubNotification } from '../types/github'

const POLL_INTERVAL = 60 * 1000 // 60 seconds - respects GitHub's X-Poll-Interval recommendation
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

  return useQuery<GitHubNotification[], Error>({
    queryKey: ['notifications', { all: options?.all, participating: options?.participating }],
    queryFn: async () => {
      // Use singleton to prevent memory leaks from polling
      const api = GitHubAPI.getInstance()
      await api.initialize(token!) // Non-null assertion safe due to enabled check
      
      const notifications = await api.fetchNotifications({
        all: options?.all,
        participating: options?.participating,
      })

      // Octokit returns the data in the correct format, cast to our type
      return notifications as unknown as GitHubNotification[]
    },
    // Only fetch if authenticated AND token exists (prevents race condition)
    enabled: (options?.enabled ?? true) && isAuthenticated && !!token,
    // Polling configuration
    refetchInterval: options?.refetchInterval ?? POLL_INTERVAL,
    staleTime: STALE_TIME,
    // These are set globally in QueryClient but can be overridden here
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
  })
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
