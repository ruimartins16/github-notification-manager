import { describe, it, expect } from 'vitest'
import { matchesRule, applyRules, getRuleDescription } from '../rule-matcher'
import { createRepositoryRule, createAgeRule, createReasonRule } from '../../types/rules'
import { GitHubNotification } from '../../types/github'

// Helper to create a mock notification
const createMockNotification = (overrides: Partial<GitHubNotification>): GitHubNotification => ({
  id: '1',
  unread: true,
  reason: 'mention',
  updated_at: new Date().toISOString(),
  last_read_at: null,
  subject: {
    title: 'Test Notification',
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
      avatar_url: 'https://github.com/test.png',
    },
    html_url: 'https://github.com/test/repo',
  },
  url: 'https://api.github.com/notifications/threads/1',
  subscription_url: 'https://api.github.com/notifications/threads/1/subscription',
  ...overrides,
})

describe('matchesRule', () => {
  describe('Repository Rules', () => {
    it('should match notification from specified repository', () => {
      const rule = createRepositoryRule('test/repo')
      const notification = createMockNotification({
        repository: {
          id: 1,
          name: 'repo',
          full_name: 'test/repo',
          owner: { login: 'test', avatar_url: 'https://github.com/test.png' },
          html_url: 'https://github.com/test/repo',
        },
      })

      expect(matchesRule(notification, rule)).toBe(true)
    })

    it('should not match notification from different repository', () => {
      const rule = createRepositoryRule('other/repo')
      const notification = createMockNotification({
        repository: {
          id: 1,
          name: 'repo',
          full_name: 'test/repo',
          owner: { login: 'test', avatar_url: 'https://github.com/test.png' },
          html_url: 'https://github.com/test/repo',
        },
      })

      expect(matchesRule(notification, rule)).toBe(false)
    })

    it('should not match if rule is disabled', () => {
      const rule = { ...createRepositoryRule('test/repo'), enabled: false }
      const notification = createMockNotification({
        repository: {
          id: 1,
          name: 'repo',
          full_name: 'test/repo',
          owner: { login: 'test', avatar_url: 'https://github.com/test.png' },
          html_url: 'https://github.com/test/repo',
        },
      })

      expect(matchesRule(notification, rule)).toBe(false)
    })
  })

  describe('Age Rules', () => {
    it('should match notification older than specified days', () => {
      const rule = createAgeRule(7)
      const eightDaysAgo = new Date()
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)
      
      const notification = createMockNotification({
        updated_at: eightDaysAgo.toISOString(),
      })

      expect(matchesRule(notification, rule)).toBe(true)
    })

    it('should not match notification newer than specified days', () => {
      const rule = createAgeRule(7)
      const sixDaysAgo = new Date()
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
      
      const notification = createMockNotification({
        updated_at: sixDaysAgo.toISOString(),
      })

      expect(matchesRule(notification, rule)).toBe(false)
    })

    it('should not match if rule is disabled', () => {
      const rule = { ...createAgeRule(7), enabled: false }
      const tenDaysAgo = new Date()
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
      
      const notification = createMockNotification({
        updated_at: tenDaysAgo.toISOString(),
      })

      expect(matchesRule(notification, rule)).toBe(false)
    })
  })

  describe('Reason Rules', () => {
    it('should match notification with specified reason', () => {
      const rule = createReasonRule(['mention', 'review_requested'])
      const notification = createMockNotification({
        reason: 'mention',
      })

      expect(matchesRule(notification, rule)).toBe(true)
    })

    it('should not match notification with different reason', () => {
      const rule = createReasonRule(['mention', 'review_requested'])
      const notification = createMockNotification({
        reason: 'comment',
      })

      expect(matchesRule(notification, rule)).toBe(false)
    })

    it('should not match if rule is disabled', () => {
      const rule = { ...createReasonRule(['mention']), enabled: false }
      const notification = createMockNotification({
        reason: 'mention',
      })

      expect(matchesRule(notification, rule)).toBe(false)
    })
  })
})

describe('applyRules', () => {
  it('should separate notifications into archive and keep lists', () => {
    const rules = [
      createRepositoryRule('archive/me'),
      createAgeRule(7),
    ]

    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

    const notifications = [
      createMockNotification({
        id: '1',
        repository: {
          id: 1,
          name: 'me',
          full_name: 'archive/me',
          owner: { login: 'archive', avatar_url: 'https://github.com/archive.png' },
          html_url: 'https://github.com/archive/me',
        },
      }),
      createMockNotification({
        id: '2',
        updated_at: tenDaysAgo.toISOString(),
      }),
      createMockNotification({
        id: '3',
        repository: {
          id: 2,
          name: 'repo',
          full_name: 'keep/repo',
          owner: { login: 'keep', avatar_url: 'https://github.com/keep.png' },
          html_url: 'https://github.com/keep/repo',
        },
      }),
    ]

    const { toArchive, toKeep, ruleMatches } = applyRules(notifications, rules)

    expect(toArchive).toHaveLength(2)
    expect(toKeep).toHaveLength(1)
    expect(toArchive.map(n => n.id)).toEqual(['1', '2'])
    expect(toKeep.map(n => n.id)).toEqual(['3'])

    // Check rule matches
    const rule0Matches = ruleMatches.get(rules[0]!.id)
    const rule1Matches = ruleMatches.get(rules[1]!.id)
    expect(rule0Matches).toBeDefined()
    expect(rule1Matches).toBeDefined()
    expect(rule0Matches).toEqual(['1'])
    expect(rule1Matches).toEqual(['2'])
  })

  it('should handle empty rules list', () => {
    const notifications = [createMockNotification({ id: '1' })]
    const { toArchive, toKeep } = applyRules(notifications, [])

    expect(toArchive).toHaveLength(0)
    expect(toKeep).toHaveLength(1)
  })

  it('should handle disabled rules', () => {
    const rule = { ...createRepositoryRule('test/repo'), enabled: false }
    const notifications = [
      createMockNotification({
        repository: {
          id: 1,
          name: 'repo',
          full_name: 'test/repo',
          owner: { login: 'test', avatar_url: 'https://github.com/test.png' },
          html_url: 'https://github.com/test/repo',
        },
      }),
    ]

    const { toArchive, toKeep } = applyRules(notifications, [rule])

    expect(toArchive).toHaveLength(0)
    expect(toKeep).toHaveLength(1)
  })
})

describe('getRuleDescription', () => {
  it('should return description for repository rule', () => {
    const rule = createRepositoryRule('facebook/react')
    expect(getRuleDescription(rule)).toBe('Archive notifications from facebook/react')
  })

  it('should return description for age rule (singular)', () => {
    const rule = createAgeRule(1)
    expect(getRuleDescription(rule)).toBe('Archive notifications older than 1 day')
  })

  it('should return description for age rule (plural)', () => {
    const rule = createAgeRule(7)
    expect(getRuleDescription(rule)).toBe('Archive notifications older than 7 days')
  })

  it('should return description for reason rule', () => {
    const rule = createReasonRule(['mention', 'review_requested'])
    expect(getRuleDescription(rule)).toBe('Archive notifications with reason: mention, review_requested')
  })
})
