/**
 * BadgeService - Centralized badge management for extension icon
 * 
 * This service handles:
 * - Formatting badge count (99+ for large numbers)
 * - Setting badge color (blue for unread, green for priority)
 * - Detecting priority mentions (mention, team_mention, review_requested)
 * - Clearing badge when no notifications
 * 
 * Usage:
 * ```typescript
 * BadgeService.updateBadge(notifications)
 * ```
 */

import type { GitHubNotification, NotificationReason } from '../types/github'

/**
 * Notification reasons considered high priority (green badge)
 */
const PRIORITY_REASONS: NotificationReason[] = [
  'mention',
  'team_mention',
  'review_requested',
]

/**
 * GitHub-themed badge colors
 */
const BADGE_COLORS = {
  unread: '#0969DA', // GitHub blue (accent)
  priority: '#238636', // GitHub green (success)
} as const

export class BadgeService {
  /**
   * Update extension badge based on notifications
   * 
   * @param notifications - Array of GitHub notifications
   */
  static updateBadge(notifications: GitHubNotification[]): void {
    // Only count unread notifications
    const unreadNotifications = notifications.filter(n => n.unread)
    const count = unreadNotifications.length

    if (count === 0) {
      this.clearBadge()
      return
    }

    // Check for priority mentions
    const hasPriority = this.detectPriorityMentions(unreadNotifications)

    // Format count for display
    const text = this.formatBadgeCount(count)

    // Set badge color based on priority
    const color = hasPriority ? BADGE_COLORS.priority : BADGE_COLORS.unread

    // Update badge
    chrome.action.setBadgeText({ text })
    chrome.action.setBadgeBackgroundColor({ color })
  }

  /**
   * Clear the badge (no notifications)
   */
  static clearBadge(): void {
    chrome.action.setBadgeText({ text: '' })
  }

  /**
   * Format badge count for display
   * 
   * Rules:
   * - 0: empty string (no badge)
   * - 1-99: show number
   * - 100+: show "99+"
   * 
   * @param count - Number of unread notifications
   * @returns Formatted string for badge display
   */
  static formatBadgeCount(count: number): string {
    if (count === 0) return ''
    if (count <= 99) return count.toString()
    return '99+'
  }

  /**
   * Detect if any notifications are high priority
   * 
   * Priority reasons:
   * - mention: Direct mention (@username)
   * - team_mention: Team mention (@org/team)
   * - review_requested: Pull request review requested
   * 
   * @param notifications - Array of notifications to check
   * @returns True if any priority notifications exist
   */
  static detectPriorityMentions(notifications: GitHubNotification[]): boolean {
    return notifications.some(n => PRIORITY_REASONS.includes(n.reason))
  }
}
