import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BadgeService } from '../badge-service'
import type { GitHubNotification } from '../../types/github'

// Mock chrome.action API
const mockChrome = {
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
}

global.chrome = mockChrome as any

describe('BadgeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatBadgeCount', () => {
    it('should return empty string for 0 notifications', () => {
      expect(BadgeService.formatBadgeCount(0)).toBe('')
    })

    it('should return the number as string for 1-99 notifications', () => {
      expect(BadgeService.formatBadgeCount(1)).toBe('1')
      expect(BadgeService.formatBadgeCount(50)).toBe('50')
      expect(BadgeService.formatBadgeCount(99)).toBe('99')
    })

    it('should return "99+" for 100+ notifications', () => {
      expect(BadgeService.formatBadgeCount(100)).toBe('99+')
      expect(BadgeService.formatBadgeCount(150)).toBe('99+')
      expect(BadgeService.formatBadgeCount(999)).toBe('99+')
    })
  })

  describe('detectPriorityMentions', () => {
    it('should return true for mention reason', () => {
      const notifications: GitHubNotification[] = [
        createMockNotification({ reason: 'mention', unread: true }),
      ]
      expect(BadgeService.detectPriorityMentions(notifications)).toBe(true)
    })

    it('should return true for team_mention reason', () => {
      const notifications: GitHubNotification[] = [
        createMockNotification({ reason: 'team_mention', unread: true }),
      ]
      expect(BadgeService.detectPriorityMentions(notifications)).toBe(true)
    })

    it('should return true for review_requested reason', () => {
      const notifications: GitHubNotification[] = [
        createMockNotification({ reason: 'review_requested', unread: true }),
      ]
      expect(BadgeService.detectPriorityMentions(notifications)).toBe(true)
    })

    it('should return false for non-priority reasons', () => {
      const notifications: GitHubNotification[] = [
        createMockNotification({ reason: 'assign', unread: true }),
        createMockNotification({ reason: 'comment', unread: true }),
        createMockNotification({ reason: 'subscribed', unread: true }),
      ]
      expect(BadgeService.detectPriorityMentions(notifications)).toBe(false)
    })

    it('should return false for empty array', () => {
      expect(BadgeService.detectPriorityMentions([])).toBe(false)
    })

    it('should return true if any notification is priority', () => {
      const notifications: GitHubNotification[] = [
        createMockNotification({ reason: 'comment', unread: true }),
        createMockNotification({ reason: 'mention', unread: true }), // Priority
        createMockNotification({ reason: 'subscribed', unread: true }),
      ]
      expect(BadgeService.detectPriorityMentions(notifications)).toBe(true)
    })
  })

  describe('clearBadge', () => {
    it('should clear badge text', () => {
      BadgeService.clearBadge()

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' })
    })
  })

  describe('updateBadge', () => {
    it('should clear badge when no notifications', () => {
      BadgeService.updateBadge([])

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' })
    })

    it('should clear badge when all notifications are read', () => {
      const notifications: GitHubNotification[] = [
        createMockNotification({ unread: false }),
        createMockNotification({ unread: false }),
      ]

      BadgeService.updateBadge(notifications)

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' })
    })

    it('should show count for unread notifications with blue badge', () => {
      const notifications: GitHubNotification[] = [
        createMockNotification({ unread: true, reason: 'comment' }),
        createMockNotification({ unread: true, reason: 'subscribed' }),
        createMockNotification({ unread: false, reason: 'comment' }),
      ]

      BadgeService.updateBadge(notifications)

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '2' })
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#0969DA', // Blue
      })
    })

    it('should show green badge for priority notifications', () => {
      const notifications: GitHubNotification[] = [
        createMockNotification({ unread: true, reason: 'mention' }), // Priority
        createMockNotification({ unread: true, reason: 'comment' }),
      ]

      BadgeService.updateBadge(notifications)

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '2' })
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#238636', // Green
      })
    })

    it('should show "99+" for 100+ unread notifications', () => {
      const notifications: GitHubNotification[] = Array.from({ length: 150 }, () =>
        createMockNotification({ unread: true, reason: 'comment' })
      )

      BadgeService.updateBadge(notifications)

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '99+' })
    })

    it('should only count unread notifications, not all', () => {
      const notifications: GitHubNotification[] = [
        createMockNotification({ unread: true, reason: 'comment' }),
        createMockNotification({ unread: false, reason: 'comment' }),
        createMockNotification({ unread: true, reason: 'comment' }),
        createMockNotification({ unread: false, reason: 'comment' }),
        createMockNotification({ unread: true, reason: 'comment' }),
      ]

      BadgeService.updateBadge(notifications)

      // Should only count the 3 unread
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3' })
    })
  })
})

/**
 * Helper to create mock notification for testing
 */
function createMockNotification(
  overrides?: Partial<GitHubNotification>
): GitHubNotification {
  return {
    id: '1',
    unread: true,
    reason: 'comment',
    updated_at: '2026-02-06T12:00:00Z',
    last_read_at: null,
    subject: {
      title: 'Test notification',
      url: 'https://api.github.com/repos/test/repo/issues/1',
      latest_comment_url: 'https://api.github.com/repos/test/repo/issues/comments/1',
      type: 'Issue',
    },
    repository: {
      id: 1,
      name: 'repo',
      full_name: 'test/repo',
      owner: {
        login: 'test',
        avatar_url: 'https://avatars.githubusercontent.com/u/1',
      },
      html_url: 'https://github.com/test/repo',
    },
    url: 'https://api.github.com/notifications/threads/1',
    subscription_url: 'https://api.github.com/notifications/threads/1/subscription',
    ...overrides,
  }
}
