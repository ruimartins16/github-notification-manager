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
   * - It has a last_read_at timestamp (user marked it as read)
   * - AND last_read_at >= updated_at (no new activity since user read it)
   * 
   * If updated_at > last_read_at, there was a genuine new update (comment, push, etc.)
   * after the user read it, so we should still show it.
   * 
   * @param notifications - Array of notifications from GitHub API
   * @returns Filtered array without zombie notifications
   */
  private static filterZombieNotifications(notifications: GitHubNotification[]): GitHubNotification[] {
    return notifications.filter(n => {
      // Never read = genuinely unread
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
   * @param token - GitHub access token
   * @returns Array of unread notifications (dismissed IDs filtered by store, zombies filtered out)
   * @throws Error if API request fails
   */
  static async fetchNotifications(token: string): Promise<GitHubNotification[]> {
    const api = GitHubAPI.getInstance()
    await api.initialize(token)

    // Fetch only unread notifications (all=false is default)
    // Store's setNotifications will filter out dismissed notification IDs
    const notifications = await api.fetchNotifications({
      all: false,
      participating: false,
    })

    // Filter out zombie notifications (GitHub API bug for review_requested)
    const filtered = this.filterZombieNotifications(notifications as unknown as GitHubNotification[])

    return filtered
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
