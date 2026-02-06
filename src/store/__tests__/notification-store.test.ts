import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotificationStore } from '../notification-store'
import { GitHubNotification } from '../../types/github'

// Mock chrome.storage
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}

global.chrome = {
  storage: mockChromeStorage,
} as any

const mockNotification: GitHubNotification = {
  id: '1',
  unread: true,
  reason: 'mention',
  subject: {
    title: 'Test Notification',
    url: 'https://api.github.com/repos/test/repo/issues/1',
    latest_comment_url: 'https://api.github.com/repos/test/repo/issues/comments/1',
    type: 'Issue',
  },
  repository: {
    id: 123,
    name: 'repo',
    full_name: 'test/repo',
    owner: {
      login: 'test',
      avatar_url: 'https://example.com/avatar.png',
    },
    html_url: 'https://github.com/test/repo',
  },
  updated_at: '2024-01-01T00:00:00Z',
  last_read_at: null,
  url: 'https://api.github.com/notifications/threads/1',
  subscription_url: 'https://api.github.com/notifications/threads/1/subscription',
}

describe('useNotificationStore', () => {
  beforeEach(() => {
    // Reset store state
    useNotificationStore.setState({
      notifications: [],
      isLoading: false,
      error: null,
      lastFetched: null,
    })

    // Reset mocks
    vi.clearAllMocks()
    mockChromeStorage.local.get.mockResolvedValue({})
    mockChromeStorage.local.set.mockResolvedValue(undefined)
    mockChromeStorage.local.remove.mockResolvedValue(undefined)
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useNotificationStore())

      expect(result.current.notifications).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.lastFetched).toBe(null)
    })
  })

  describe('setNotifications', () => {
    it('should update notifications', () => {
      const { result } = renderHook(() => useNotificationStore())

      act(() => {
        result.current.setNotifications([mockNotification])
      })

      expect(result.current.notifications).toEqual([mockNotification])
      expect(result.current.error).toBe(null)
    })

    it('should clear error when setting notifications', () => {
      const { result } = renderHook(() => useNotificationStore())

      act(() => {
        result.current.setError('Test error')
      })

      expect(result.current.error).toBe('Test error')

      act(() => {
        result.current.setNotifications([mockNotification])
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('setLoading', () => {
    it('should update loading state', () => {
      const { result } = renderHook(() => useNotificationStore())

      act(() => {
        result.current.setLoading(true)
      })

      expect(result.current.isLoading).toBe(true)

      act(() => {
        result.current.setLoading(false)
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('setError', () => {
    it('should set error and stop loading', () => {
      const { result } = renderHook(() => useNotificationStore())

      act(() => {
        result.current.setLoading(true)
        result.current.setError('Test error')
      })

      expect(result.current.error).toBe('Test error')
      expect(result.current.isLoading).toBe(false)
    })

    it('should allow clearing error', () => {
      const { result } = renderHook(() => useNotificationStore())

      act(() => {
        result.current.setError('Test error')
      })

      expect(result.current.error).toBe('Test error')

      act(() => {
        result.current.setError(null)
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('clearNotifications', () => {
    it('should clear all state', () => {
      const { result } = renderHook(() => useNotificationStore())

      // Set some state
      act(() => {
        result.current.setNotifications([mockNotification])
        result.current.setError('Test error')
        result.current.updateLastFetched()
      })

      expect(result.current.notifications.length).toBe(1)
      expect(result.current.error).toBe('Test error')
      expect(result.current.lastFetched).not.toBe(null)

      // Clear
      act(() => {
        result.current.clearNotifications()
      })

      expect(result.current.notifications).toEqual([])
      expect(result.current.error).toBe(null)
      expect(result.current.lastFetched).toBe(null)
    })
  })

  describe('markAsRead', () => {
    it('should remove notification by id', () => {
      const { result } = renderHook(() => useNotificationStore())

      const notification2: GitHubNotification = {
        ...mockNotification,
        id: '2',
      }

      act(() => {
        result.current.setNotifications([mockNotification, notification2])
      })

      expect(result.current.notifications.length).toBe(2)

      act(() => {
        result.current.markAsRead('1')
      })

      expect(result.current.notifications.length).toBe(1)
      expect(result.current.notifications[0].id).toBe('2')
    })

    it('should handle marking non-existent notification', () => {
      const { result } = renderHook(() => useNotificationStore())

      act(() => {
        result.current.setNotifications([mockNotification])
      })

      act(() => {
        result.current.markAsRead('non-existent')
      })

      expect(result.current.notifications.length).toBe(1)
    })
  })

  describe('updateLastFetched', () => {
    it('should update lastFetched timestamp', () => {
      const { result } = renderHook(() => useNotificationStore())

      const beforeTimestamp = Date.now()

      act(() => {
        result.current.updateLastFetched()
      })

      const afterTimestamp = Date.now()

      expect(result.current.lastFetched).not.toBe(null)
      expect(result.current.lastFetched).toBeGreaterThanOrEqual(beforeTimestamp)
      expect(result.current.lastFetched).toBeLessThanOrEqual(afterTimestamp)
    })
  })

  describe('Persistence', () => {
    it('should persist notifications to chrome.storage', async () => {
      const { result } = renderHook(() => useNotificationStore())

      act(() => {
        result.current.setNotifications([mockNotification])
      })

      // Wait for async storage write
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockChromeStorage.local.set).toHaveBeenCalled()
      const callArgs = mockChromeStorage.local.set.mock.calls[0][0]
      expect(callArgs).toHaveProperty('zustand-notifications')
      
      const storedData = JSON.parse(callArgs['zustand-notifications'])
      expect(storedData.state.notifications).toEqual([mockNotification])
    })

    it('should persist lastFetched timestamp', async () => {
      const { result } = renderHook(() => useNotificationStore())

      act(() => {
        result.current.updateLastFetched()
      })

      // Wait for async storage write
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockChromeStorage.local.set).toHaveBeenCalled()
      const callArgs = mockChromeStorage.local.set.mock.calls[0][0]
      const storedData = JSON.parse(callArgs['zustand-notifications'])
      expect(storedData.state.lastFetched).not.toBe(null)
    })

    it('should NOT persist loading and error states', async () => {
      const { result } = renderHook(() => useNotificationStore())

      act(() => {
        result.current.setLoading(true)
        result.current.setError('Test error')
      })

      // Wait for async storage write
      await new Promise((resolve) => setTimeout(resolve, 100))

      if (mockChromeStorage.local.set.mock.calls.length > 0) {
        const callArgs = mockChromeStorage.local.set.mock.calls[0]
        if (callArgs && callArgs[0]) {
          const storedData = JSON.parse(callArgs[0]['zustand-notifications'])
          expect(storedData.state).not.toHaveProperty('isLoading')
          expect(storedData.state).not.toHaveProperty('error')
        }
      }
    })
  })
})
