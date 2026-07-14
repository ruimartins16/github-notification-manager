/**
 * GitHubAPI - Service for interacting with GitHub REST API
 * 
 * This service uses Octokit (official GitHub REST API client) to fetch
 * notifications and interact with the GitHub API.
 * 
 * Features:
 * - Fetch notifications for authenticated user
 * - Mark notifications as read
 * - Mark all notifications as read
 * 
 * Usage:
 * ```typescript
 * const api = new GitHubAPI()
 * await api.initialize(token)
 * const notifications = await api.fetchNotifications()
 * ```
 */

import { Octokit } from '@octokit/rest'
import type { GitHubUser } from '../types/github'

/**
 * Safety cap on how many notifications we paginate through per fetch.
 * GitHub's inbox rarely exceeds this; the cap bounds API usage for
 * accounts with enormous backlogs.
 */
const MAX_NOTIFICATIONS = 500

export class GitHubAPI {
  private static instance: GitHubAPI | null = null
  private octokit: Octokit | null = null
  private currentToken: string | null = null

  /**
   * Get singleton instance of GitHubAPI
   * Prevents memory leaks from creating multiple instances during polling
   * 
   * @returns GitHubAPI singleton instance
   */
  static getInstance(): GitHubAPI {
    if (!GitHubAPI.instance) {
      GitHubAPI.instance = new GitHubAPI()
    }
    return GitHubAPI.instance
  }

  /**
   * Initialize the GitHub API client with an auth token
   * Only reinitializes if the token has changed
   * 
   * @param token - GitHub personal access token
   * @throws Error if token is invalid
   */
  async initialize(token: string): Promise<void> {
    // Only reinitialize if token changed (prevents unnecessary Octokit instances)
    if (this.currentToken === token && this.octokit) {
      return
    }

    if (!token) {
      throw new Error('GitHub token is required')
    }

    this.currentToken = token
    this.octokit = new Octokit({ 
      auth: token,
      userAgent: 'GitHush v1.0.0',
      request: {
        fetch: (url: string | Request, opts?: RequestInit) => {
          // Use 'no-store' to completely bypass the browser's HTTP cache.
          // Anything weaker lets the browser attach its own If-None-Match header
          // and serve 304s from a cache we cannot invalidate, which makes the
          // extension drift out of sync with GitHub's notifications page.
          return fetch(url, {
            ...opts,
            cache: 'no-store'
          })
        }
      }
    })
  }

  /**
   * Fetch notifications for the authenticated user
   *
   * Paginates through all pages (up to MAX_NOTIFICATIONS) so the result
   * mirrors GitHub's notifications inbox, not just the first page.
   *
   * @param options - Fetch options
   * @param options.all - If true, show notifications marked as read (default: false)
   * @param options.participating - If true, only show notifications user is participating in (default: false, matching GitHub's inbox)
   * @returns Promise<Array> - Array of notification objects
   * @throws Error if not initialized or request fails
   */
  async fetchNotifications(options?: {
    all?: boolean
    participating?: boolean
  }) {
    if (!this.octokit) {
      throw new Error('GitHubAPI not initialized. Call initialize() first.')
    }

    let fetched = 0
    return this.octokit.paginate(
      this.octokit.rest.activity.listNotificationsForAuthenticatedUser,
      {
        all: options?.all ?? false, // Only unread by default
        participating: options?.participating ?? false, // All notifications by default, matching GitHub's inbox
        per_page: 100,
      },
      (response, done) => {
        fetched += response.data.length
        if (fetched >= MAX_NOTIFICATIONS) {
          done()
        }
        return response.data
      }
    )
  }

  /**
   * Mark a specific notification thread as read
   * 
   * @param threadId - The notification thread ID
   * @throws Error if not initialized or request fails
   */
  async markAsRead(threadId: string): Promise<void> {
    if (!this.octokit) {
      throw new Error('GitHubAPI not initialized. Call initialize() first.')
    }

    await this.octokit.rest.activity.markThreadAsRead({
      thread_id: parseInt(threadId, 10),
    })
  }

  /**
   * Mark all notifications as read
   * 
   * @throws Error if not initialized or request fails
   */
  async markAllAsRead(): Promise<void> {
    if (!this.octokit) {
      throw new Error('GitHubAPI not initialized. Call initialize() first.')
    }

    await this.octokit.rest.activity.markNotificationsAsRead()
  }

  /**
   * Unsubscribe from a notification thread (ignore future notifications)
   * 
   * @param threadId - The notification thread ID
   * @throws Error if not initialized or request fails
   */
  async unsubscribe(threadId: string): Promise<void> {
    if (!this.octokit) {
      throw new Error('GitHubAPI not initialized. Call initialize() first.')
    }

    await this.octokit.rest.activity.setThreadSubscription({
      thread_id: parseInt(threadId, 10),
      ignored: true,
    })
  }

  /**
   * Get authenticated user information
   * 
   * @returns Promise<GitHubUser> - User profile data (login, avatar_url, etc.)
   * @throws Error if not initialized or request fails
   */
  async getAuthenticatedUser(): Promise<GitHubUser> {
    if (!this.octokit) {
      throw new Error('GitHubAPI not initialized. Call initialize() first.')
    }

    const { data } = await this.octokit.rest.users.getAuthenticated()
    return data
  }

  /**
   * Check if the API client is initialized
   * 
   * @returns boolean - True if initialized
   */
  isInitialized(): boolean {
    return this.octokit !== null
  }
}
