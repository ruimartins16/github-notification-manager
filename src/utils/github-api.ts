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
    })
  }

  /**
   * Fetch notifications for the authenticated user
   * 
   * @param options - Fetch options
   * @param options.all - If true, show notifications marked as read (default: false)
   * @param options.participating - If true, only show notifications user is participating in (default: false)
   * @param options.perPage - Number of results per page (default: 50, max: 100)
   * @returns Promise<Array> - Array of notification objects
   * @throws Error if not initialized or request fails
   */
  async fetchNotifications(options?: {
    all?: boolean
    participating?: boolean
    perPage?: number
  }) {
    if (!this.octokit) {
      throw new Error('GitHubAPI not initialized. Call initialize() first.')
    }

    const { data } = await this.octokit.rest.activity.listNotificationsForAuthenticatedUser({
      all: options?.all ?? false, // Only unread by default
      participating: options?.participating ?? false, // All notifications, not just mentions
      per_page: options?.perPage ?? 50,
    })

    return data
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
