/**
 * NotificationService - Service for fetching GitHub notifications
 * 
 * This service provides:
 * - Reusable notification fetching logic
 * - Works in both background service worker and React components
 * - Uses GitHubAPI singleton to prevent memory leaks
 * - Stores notifications in chrome.storage for persistence
 * 
 * Usage:
 * ```typescript
 * const notifications = await NotificationService.fetchAndStore(token)
 * ```
 */

import { GitHubAPI } from './github-api'
import { isNotModifiedError } from './conditional-request-plugin'
import type { GitHubNotification } from '../types/github'

/**
 * Storage key for notifications in chrome.storage.local
 * @deprecated Background worker now writes to 'zustand-notifications' instead.
 * This key is kept for test compatibility and may be removed in future versions.
 */
export const NOTIFICATIONS_STORAGE_KEY = 'notifications'

/**
 * Storage key for last fetch timestamp
 */
export const LAST_FETCH_STORAGE_KEY = 'lastFetchTimestamp'

export class NotificationService {
  /**
   * Filter out "zombie" notifications that GitHub API incorrectly returns as unread.
   * 
   * GitHub's API has a known behavior where review_requested notifications remain
   * unread even after marking as read, until you submit a review or the PR closes.
   * 
   * A notification is a "zombie" (falsely unread) when:
   * - GitHub marks it as read (unread: false)
   * - BUT it has a last_read_at timestamp
   * - AND last_read_at >= updated_at (no new activity since user read it)
   * 
   * Important: If GitHub marks a notification as unread (unread: true), we ALWAYS
   * keep it, regardless of timestamps. This handles edge cases like bulk "mark all
   * as read" where timestamps might be unreliable.
   * 
   * If updated_at > last_read_at, there was a genuine new update (comment, push, etc.)
   * after the user read it, so we should still show it.
   * 
   * @param notifications - Array of notifications from GitHub API
   * @returns Filtered array without zombie notifications
   */
  private static filterZombieNotifications(notifications: GitHubNotification[]): GitHubNotification[] {
    return notifications.filter(n => {
      // If GitHub says it's unread, trust that - always keep it
      // This handles edge cases like bulk "mark all as read" where new notifications
      // arrive with confusing timestamps (last_read_at set but unread: true)
      if (n.unread) return true
      
      // If marked as read by GitHub (unread: false), check if it's a zombie
      // Never read = genuinely unread (should not happen if unread: false, but be safe)
      if (!n.last_read_at) return true
      
      // Has been read - check if there's new activity since then
      const lastRead = new Date(n.last_read_at)
      const updated = new Date(n.updated_at)
      
      // If updated > lastRead, there's new activity - show it
      // If updated <= lastRead, nothing new - filter it out (zombie)
      return updated > lastRead
    })
  }

  /**
   * Fetch notifications from GitHub API
   * 
   * Handles conditional requests (ETag) automatically via the Octokit plugin:
   * - First request: Returns fresh data with 200 OK, stores ETag
   * - Subsequent requests: If data unchanged, throws NotModifiedError (304), use cached data
   * - If data changed: Returns fresh data with 200 OK, updates ETag
   * 
   * @param token - GitHub access token
   * @returns Array of unread notifications (dismissed IDs filtered by store, zombies filtered out)
   * @throws Error if API request fails
   */
  static async fetchNotifications(token: string): Promise<GitHubNotification[]> {
    const api = GitHubAPI.getInstance()
    await api.initialize(token)

    try {
      // Fetch only unread notifications where user is participating (mentions, assignments, review requests)
      // This reduces noise from watched repo notifications and focuses on actionable items
      // Store's setNotifications will filter out dismissed notification IDs
      const notifications = await api.fetchNotifications({
        all: false,
        participating: true, // Only show notifications where user is directly involved
        perPage: 100, // Fetch max per page to avoid pagination issues
      })

      console.log('[NotificationService] Fresh data received (200 OK) -', notifications.length, 'notifications from GitHub API')
      
      // Log first few notification details for debugging
      if (notifications.length > 0) {
        console.log('[NotificationService] Sample notifications (first 3):')
        notifications.slice(0, 3).forEach((n: any, i: number) => {
          console.log(`  ${i + 1}. ${n.subject.title} | reason: ${n.reason} | unread: ${n.unread} | repo: ${n.repository.full_name}`)
        })
      }

      // Filter out zombie notifications (GitHub API bug for review_requested)
      const filtered = this.filterZombieNotifications(notifications as unknown as GitHubNotification[])
      
      const zombieCount = notifications.length - filtered.length
      if (zombieCount > 0) {
        console.log('[NotificationService] Filtered out', zombieCount, 'zombie notifications')
        // Log which notifications were filtered as zombies
        const zombies = (notifications as unknown as GitHubNotification[]).filter(n => {
          if (n.unread) return false
          if (!n.last_read_at) return false
          const lastRead = new Date(n.last_read_at)
          const updated = new Date(n.updated_at)
          return updated <= lastRead
        })
        zombies.slice(0, 3).forEach((n, i) => {
          console.log(`  Zombie ${i + 1}: ${n.subject.title} | reason: ${n.reason}`)
        })
      }
      console.log('[NotificationService] Returning', filtered.length, 'valid notifications')

      return filtered
      
    } catch (error) {
      // Handle 304 Not Modified response
      if (isNotModifiedError(error)) {
        console.log('[NotificationService] Data not modified (304) - using cached data from storage')
        
        // Get cached notifications from Zustand storage
        const result = await chrome.storage.local.get('zustand-notifications')
        if (result['zustand-notifications']) {
          try {
            const parsed = JSON.parse(result['zustand-notifications'])
            const cachedNotifications = parsed?.state?.notifications || []
            console.log('[NotificationService] Returning', cachedNotifications.length, 'cached notifications')
            return cachedNotifications
          } catch (parseError) {
            console.error('[NotificationService] Failed to parse cached notifications:', parseError)
            // Fall through to re-throw original error
          }
        } else {
          console.warn('[NotificationService] 304 received but no cached data found - returning empty array')
          return []
        }
      }
      
      // Re-throw all other errors
      console.error('[NotificationService] Failed to fetch notifications:', error)
      throw error
    }
  }

  /**
   * Fetch notifications and store in chrome.storage
   * 
   * This triggers storage listeners in the service worker to update the badge
   * 
   * @param token - GitHub access token
   * @returns Array of notifications that were stored
   * @throws Error if fetch or storage fails
   */
  static async fetchAndStore(token: string): Promise<GitHubNotification[]> {
    try {
      const notifications = await this.fetchNotifications(token)

      // Store notifications in chrome.storage.local
      await chrome.storage.local.set({
        [NOTIFICATIONS_STORAGE_KEY]: notifications,
        [LAST_FETCH_STORAGE_KEY]: Date.now(),
      })

      return notifications
    } catch (error) {
      console.error('Failed to fetch and store notifications:', error)
      throw error
    }
  }

  /**
   * Get notifications from chrome.storage
   * 
   * @returns Array of stored notifications, or empty array if none
   */
  static async getStoredNotifications(): Promise<GitHubNotification[]> {
    try {
      const result = await chrome.storage.local.get(NOTIFICATIONS_STORAGE_KEY)
      return result[NOTIFICATIONS_STORAGE_KEY] || []
    } catch (error) {
      console.error('Failed to get stored notifications:', error)
      return []
    }
  }

  /**
   * Get last fetch timestamp from storage
   * 
   * @returns Timestamp of last fetch, or null if never fetched
   */
  static async getLastFetchTimestamp(): Promise<number | null> {
    try {
      const result = await chrome.storage.local.get(LAST_FETCH_STORAGE_KEY)
      return result[LAST_FETCH_STORAGE_KEY] || null
    } catch (error) {
      console.error('Failed to get last fetch timestamp:', error)
      return null
    }
  }
}
