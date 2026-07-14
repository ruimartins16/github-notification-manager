/**
 * NotificationService - Service for fetching GitHub notifications
 *
 * This service provides:
 * - Reusable notification fetching logic
 * - Works in both background service worker and React components
 * - Uses GitHubAPI singleton to prevent memory leaks
 * - Stores notifications in chrome.storage for persistence
 *
 * Design: GitHub's API is the single source of truth. Every fetch is a plain
 * request (no conditional-request/ETag caching) and the response is returned
 * unmodified. Local concerns (dismissed, archived, snoozed) are applied at
 * read time by the notification store, never here.
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
   * Fetch unread notifications from GitHub API.
   *
   * Returns exactly what GitHub reports as unread — no client-side
   * "zombie" heuristics. If GitHub's notifications page shows it, we show it.
   *
   * @param token - GitHub access token
   * @returns Array of unread notifications as reported by GitHub
   * @throws Error if API request fails
   */
  static async fetchNotifications(token: string): Promise<GitHubNotification[]> {
    const api = GitHubAPI.getInstance()
    await api.initialize(token)

    // Read the participating setting from chrome.storage.sync
    let participating = false // default: all notifications, matching GitHub's inbox
    try {
      const settingsResult = await chrome.storage.sync.get('gnm-settings')
      if (settingsResult['gnm-settings']) {
        const parsed = JSON.parse(settingsResult['gnm-settings'])
        const showParticipatingOnly = parsed?.state?.showParticipatingOnly
        if (typeof showParticipatingOnly === 'boolean') {
          participating = showParticipatingOnly
        }
      }
    } catch (error) {
      console.error('[NotificationService] Failed to read participating setting, using default:', error)
    }

    const notifications = await api.fetchNotifications({
      all: false,
      participating,
    })

    console.log('[NotificationService] Fetched', notifications.length, 'unread notifications from GitHub')
    return notifications as unknown as GitHubNotification[]
  }

  /**
   * Force fetch fresh notifications.
   *
   * Kept for API compatibility with callers that previously needed to bypass
   * the ETag cache. Every fetch is now uncached, so this is a plain fetch.
   *
   * @param token - GitHub access token
   * @returns Array of fresh notifications from GitHub API
   * @throws Error if API request fails
   */
  static async forceRefreshNotifications(token: string): Promise<GitHubNotification[]> {
    return this.fetchNotifications(token)
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
