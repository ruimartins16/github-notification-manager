import { describe, it, expect } from 'vitest'
import { getActiveNotifications } from '../notification-filter'
import type { GitHubNotification, SnoozedNotification } from '../../types/github'

function makeNotification(id: string, updatedAt = '2026-07-10T10:00:00Z'): GitHubNotification {
  return {
    id,
    unread: true,
    reason: 'mention',
    updated_at: updatedAt,
    last_read_at: null,
    subject: {
      title: `Notification ${id}`,
      url: `https://api.github.com/repos/o/r/issues/${id}`,
      latest_comment_url: '',
      type: 'Issue',
    },
    repository: {
      id: 1,
      full_name: 'o/r',
      html_url: 'https://github.com/o/r',
    },
    url: `https://api.github.com/notifications/threads/${id}`,
  } as unknown as GitHubNotification
}

function makeSnoozed(notification: GitHubNotification): SnoozedNotification {
  return {
    notification,
    snoozedAt: Date.now(),
    wakeTime: Date.now() + 3600_000,
    alarmName: `snooze-${notification.id}`,
  } as unknown as SnoozedNotification
}

describe('getActiveNotifications', () => {
  it('returns the raw list untouched when there is no local state', () => {
    const raw = [makeNotification('1'), makeNotification('2')]
    expect(getActiveNotifications(raw, {})).toEqual(raw)
  })

  it('hides archived notifications', () => {
    const raw = [makeNotification('1'), makeNotification('2')]
    const active = getActiveNotifications(raw, {
      archivedNotifications: [{ id: '2' }],
    })
    expect(active.map(n => n.id)).toEqual(['1'])
  })

  it('hides snoozed notifications', () => {
    const raw = [makeNotification('1'), makeNotification('2')]
    const active = getActiveNotifications(raw, {
      snoozedNotifications: [makeSnoozed(raw[0])],
    })
    expect(active.map(n => n.id)).toEqual(['2'])
  })

  it('hides dismissed notifications with no new activity', () => {
    const raw = [makeNotification('1', '2026-07-10T10:00:00Z')]
    const active = getActiveNotifications(raw, {
      dismissedNotifications: [{ id: '1', lastSeenUpdatedAt: '2026-07-10T10:00:00Z' }],
    })
    expect(active).toEqual([])
  })

  it('shows dismissed notifications again when there is new activity', () => {
    const raw = [makeNotification('1', '2026-07-12T09:00:00Z')]
    const active = getActiveNotifications(raw, {
      dismissedNotifications: [{ id: '1', lastSeenUpdatedAt: '2026-07-10T10:00:00Z' }],
    })
    expect(active.map(n => n.id)).toEqual(['1'])
  })

  it('is idempotent: filtering an already-filtered list changes nothing', () => {
    const raw = [makeNotification('1'), makeNotification('2'), makeNotification('3')]
    const local = {
      archivedNotifications: [{ id: '1' }],
      dismissedNotifications: [{ id: '2', lastSeenUpdatedAt: '2026-07-10T10:00:00Z' }],
      snoozedNotifications: [makeSnoozed(raw[2])],
    }
    const once = getActiveNotifications(raw, local)
    const twice = getActiveNotifications(once, local)
    expect(twice).toEqual(once)
  })

  it('applies all three local filters together', () => {
    const raw = [
      makeNotification('1'),
      makeNotification('2'),
      makeNotification('3'),
      makeNotification('4'),
    ]
    const active = getActiveNotifications(raw, {
      archivedNotifications: [{ id: '1' }],
      dismissedNotifications: [{ id: '2', lastSeenUpdatedAt: '2026-07-10T10:00:00Z' }],
      snoozedNotifications: [makeSnoozed(raw[2])],
    })
    expect(active.map(n => n.id)).toEqual(['4'])
  })
})
