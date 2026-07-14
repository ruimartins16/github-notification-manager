import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { FilterBar } from '../FilterBar'
import { useNotificationStore } from '../../store/notification-store'
import type { GitHubNotification } from '../../types/github'

function makeNotification(id: string, reason = 'mention'): GitHubNotification {
  return {
    id,
    unread: true,
    reason,
    updated_at: '2026-07-10T10:00:00Z',
    last_read_at: null,
    subject: {
      title: `Test notification ${id}`,
      url: `https://api.github.com/repos/user/test/issues/${id}`,
      latest_comment_url: null,
      type: 'Issue',
    },
    repository: {
      id: 1,
      full_name: 'user/test',
      html_url: 'https://github.com/user/test',
    },
    url: `https://api.github.com/notifications/threads/${id}`,
  } as unknown as GitHubNotification
}

describe('FilterBar', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      dismissedNotifications: [],
      archivedNotifications: [],
      snoozedNotifications: [],
      activeFilter: 'all',
      markAllBackup: null,
    })
  })

  it('shows counts based on the active list', () => {
    useNotificationStore.setState({
      notifications: [makeNotification('1', 'mention'), makeNotification('2', 'review_requested')],
    })

    render(<FilterBar />)

    expect(screen.getByRole('tab', { name: /All \(2 notifications\)/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Mentions \(1 notifications\)/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Reviews \(1 notifications\)/ })).toBeInTheDocument()
  })

  it('updates the All counter when a notification is marked as read (regression)', () => {
    // markAsRead only mutates dismissedNotifications — the raw notifications
    // array intentionally keeps the item until the next GitHub fetch. The
    // counter must reflect the ACTIVE list, not the raw list.
    useNotificationStore.setState({ notifications: [makeNotification('1')] })

    render(<FilterBar />)
    expect(screen.getByRole('tab', { name: /All \(1 notifications\)/ })).toBeInTheDocument()

    act(() => {
      useNotificationStore.getState().markAsRead('1')
    })

    expect(screen.getByRole('tab', { name: /All \(0 notifications\)/ })).toBeInTheDocument()
    // Raw list is intentionally untouched
    expect(useNotificationStore.getState().notifications).toHaveLength(1)
  })

  it('excludes archived and snoozed notifications from counts', () => {
    const n1 = makeNotification('1')
    const n2 = makeNotification('2')
    const n3 = makeNotification('3')
    useNotificationStore.setState({
      notifications: [n1, n2, n3],
      archivedNotifications: [n2],
      snoozedNotifications: [
        { notification: n3, snoozedAt: Date.now(), wakeTime: Date.now() + 1000, alarmName: 'snooze-3' } as any,
      ],
    })

    render(<FilterBar />)

    expect(screen.getByRole('tab', { name: /All \(1 notifications\)/ })).toBeInTheDocument()
  })
})
