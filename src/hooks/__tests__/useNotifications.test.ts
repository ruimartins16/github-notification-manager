import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotifications, useUnreadCount } from '../useNotifications'
import { useNotificationStore } from '../../store/notification-store'
import { NotificationService } from '../../utils/notification-service'
import type { GitHubNotification } from '../../types/github'

// Hoisted so the vi.mock factories below can reference it
const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }))

// Mock useAuth - the hook only needs a token
vi.mock('../useAuth', () => ({
  useAuth: mockUseAuth,
}))

// Mock NotificationService - the hook calls its static fetch methods
vi.mock('../../utils/notification-service', () => ({
  NotificationService: {
    fetchNotifications: vi.fn(),
    forceRefreshNotifications: vi.fn(),
  },
}))

const mockFetchNotifications = vi.mocked(NotificationService.fetchNotifications)
const mockForceRefreshNotifications = vi.mocked(NotificationService.forceRefreshNotifications)

function makeNotification(id: string, overrides: Partial<GitHubNotification> = {}): GitHubNotification {
  return {
    id,
    unread: true,
    reason: 'mention',
    updated_at: '2024-01-01T00:00:00Z',
    last_read_at: null,
    subject: {
      title: `Test notification ${id}`,
      url: `https://api.github.com/repos/user/test/issues/${id}`,
      latest_comment_url: null,
      type: 'Issue',
    },
    repository: {
      id: 1,
      name: 'test',
      full_name: 'user/test',
      owner: {
        login: 'user',
        avatar_url: 'https://avatars.githubusercontent.com/u/1',
      },
      html_url: 'https://github.com/user/test',
      description: null,
    },
    url: `https://api.github.com/notifications/threads/${id}`,
    subscription_url: `https://api.github.com/notifications/threads/${id}/subscription`,
    ...overrides,
  } as GitHubNotification
}

function resetStore() {
  useNotificationStore.setState({
    notifications: [],
    snoozedNotifications: [],
    archivedNotifications: [],
    dismissedNotifications: [],
    isLoading: false,
    error: null,
    lastFetched: null,
    activeFilter: 'all',
    markAllBackup: null,
    selectedNotificationIds: new Set<string>(),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resetStore()
  mockUseAuth.mockReturnValue({ token: 'gho_test_token', isAuthenticated: true })
})

describe('useNotifications', () => {
  it('exposes notifications state and actions', () => {
    const { result } = renderHook(() => useNotifications())

    expect(result.current.notifications).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.refresh).toBe('function')
    expect(typeof result.current.forceRefresh).toBe('function')
    expect(typeof result.current.markAsRead).toBe('function')
  })

  it('reflects notifications already in the Zustand store', () => {
    const stored = [makeNotification('1'), makeNotification('2')]
    act(() => {
      useNotificationStore.setState({ notifications: stored })
    })

    const { result } = renderHook(() => useNotifications())

    expect(result.current.notifications).toEqual(stored)
  })

  describe('refresh', () => {
    it('fetches notifications and updates the store on success', async () => {
      const fetched = [makeNotification('1'), makeNotification('2')]
      mockFetchNotifications.mockResolvedValue(fetched)

      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockFetchNotifications).toHaveBeenCalledWith('gho_test_token')
      expect(result.current.notifications).toEqual(fetched)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()

      const storeState = useNotificationStore.getState()
      expect(storeState.notifications).toEqual(fetched)
      expect(storeState.lastFetched).not.toBeNull()
    })

    it('sets the store error when the fetch fails', async () => {
      mockFetchNotifications.mockRejectedValue(new Error('API Error'))

      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.error).toBe('API Error')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.notifications).toEqual([])
      expect(useNotificationStore.getState().error).toBe('API Error')
    })

    it('does not fetch when there is no token', async () => {
      mockUseAuth.mockReturnValue({ token: null, isAuthenticated: false })

      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockFetchNotifications).not.toHaveBeenCalled()
    })
  })

  describe('forceRefresh', () => {
    it('fetches via forceRefreshNotifications and updates the store', async () => {
      const fetched = [makeNotification('42')]
      mockForceRefreshNotifications.mockResolvedValue(fetched)

      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await result.current.forceRefresh()
      })

      expect(mockForceRefreshNotifications).toHaveBeenCalledWith('gho_test_token')
      expect(mockFetchNotifications).not.toHaveBeenCalled()
      expect(result.current.notifications).toEqual(fetched)
      expect(useNotificationStore.getState().lastFetched).not.toBeNull()
    })

    it('sets the store error when the force fetch fails', async () => {
      mockForceRefreshNotifications.mockRejectedValue(new Error('Force API Error'))

      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await result.current.forceRefresh()
      })

      expect(result.current.error).toBe('Force API Error')
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('markAsRead', () => {
    it('records a smart-dismiss entry and hides the notification from the active list', () => {
      act(() => {
        useNotificationStore.setState({
          notifications: [makeNotification('1'), makeNotification('2')],
        })
      })

      const { result } = renderHook(() => useNotifications())

      act(() => {
        result.current.markAsRead('1')
      })

      const storeState = useNotificationStore.getState()
      // Raw list is untouched; dismissal is applied at read time
      expect(storeState.notifications).toHaveLength(2)
      expect(storeState.dismissedNotifications.map(d => d.id)).toContain('1')
      expect(storeState.getActiveNotifications().map(n => n.id)).toEqual(['2'])
    })
  })
})

describe('useUnreadCount', () => {
  it('returns 0 when there are no notifications', () => {
    const { result } = renderHook(() => useUnreadCount())

    expect(result.current).toBe(0)
  })

  it('counts active notifications (raw list minus dismissed/archived/snoozed)', () => {
    act(() => {
      useNotificationStore.setState({
        notifications: [
          makeNotification('1'),
          makeNotification('2'),
          makeNotification('3'),
        ],
        dismissedNotifications: [
          { id: '2', dismissedAt: Date.now(), lastSeenUpdatedAt: '2024-01-01T00:00:00Z' },
        ],
        archivedNotifications: [makeNotification('3')],
      })
    })

    const { result } = renderHook(() => useUnreadCount())

    expect(result.current).toBe(1)
  })

  it('updates when notifications change in the store', () => {
    const { result } = renderHook(() => useUnreadCount())

    expect(result.current).toBe(0)

    act(() => {
      useNotificationStore.setState({
        notifications: [makeNotification('1'), makeNotification('2')],
      })
    })

    expect(result.current).toBe(2)
  })
})
