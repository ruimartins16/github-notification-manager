import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNotifications, useUnreadCount } from '../useNotifications'
import { useNotificationStore } from '../../store/notification-store'
import React from 'react'

// Create a shared mock instance that we can access in tests
const mockAPIInstance = {
  initialize: vi.fn(),
  fetchNotifications: vi.fn(),
  isInitialized: vi.fn().mockReturnValue(true),
}

// Mock GitHubAPI with singleton pattern
vi.mock('../../utils/github-api', () => {
  return {
    GitHubAPI: {
      getInstance: vi.fn(() => mockAPIInstance),
    },
  }
})

// Mock useAuth
vi.mock('../useAuth', () => ({
  useAuth: vi.fn(() => ({
    token: 'gho_test_token',
    isAuthenticated: true,
  })),
}))

// Mock chrome.storage API
const mockStorage = {
  onChanged: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  local: {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}

global.chrome = {
  storage: mockStorage,
} as any

describe('useNotifications', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    // Reset Zustand store
    useNotificationStore.setState({
      notifications: [],
      isLoading: false,
      error: null,
      lastFetched: null,
    })

    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries in tests
        },
      },
    })
    vi.clearAllMocks()
    // Reset mock implementations
    mockAPIInstance.initialize.mockClear()
    mockAPIInstance.fetchNotifications.mockClear()
    mockAPIInstance.isInitialized.mockReturnValue(true)
    
    mockStorage.local.set.mockResolvedValue(undefined)
    mockStorage.local.get.mockResolvedValue({})
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  )

  it('should fetch notifications successfully', async () => {
    const mockNotifications = [
      {
        id: '1',
        unread: true,
        reason: 'mention',
        updated_at: '2024-01-01T00:00:00Z',
        subject: {
          title: 'Test notification',
          url: 'https://api.github.com/repos/test/test/issues/1',
          latest_comment_url: 'https://api.github.com/repos/test/test/issues/comments/1',
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
        },
        url: 'https://api.github.com/notifications/threads/1',
        subscription_url: 'https://api.github.com/notifications/threads/1/subscription',
        last_read_at: null,
      },
    ]

    mockAPIInstance.initialize.mockResolvedValueOnce(undefined)
    mockAPIInstance.fetchNotifications.mockResolvedValueOnce(mockNotifications)

    const { result } = renderHook(() => useNotifications(), { wrapper })

    await waitFor(() => {
      expect(result.current.notifications.length).toBeGreaterThan(0)
    })

    expect(result.current.notifications).toEqual(mockNotifications)
    expect(mockAPIInstance.initialize).toHaveBeenCalledWith('gho_test_token')
    expect(mockAPIInstance.fetchNotifications).toHaveBeenCalled()
  })

  it('should handle fetch errors', async () => {
    // Mock initialize to succeed
    mockAPIInstance.initialize.mockResolvedValue(undefined)
    // Mock fetchNotifications to fail
    const testError = new Error('API Error')
    mockAPIInstance.fetchNotifications.mockRejectedValue(testError)

    const { result } = renderHook(() => useNotifications(), { wrapper })

    // Wait for error to be set
    await waitFor(() => {
      expect(mockAPIInstance.fetchNotifications).toHaveBeenCalled()
    })

    // Error should be propagated to the hook
    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })
  })

  it('should not fetch if not authenticated', async () => {
    const { useAuth } = await import('../useAuth')
    ;(useAuth as any).mockReturnValueOnce({
      token: null,
      isAuthenticated: false,
    })

    const { result } = renderHook(() => useNotifications(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockAPIInstance.fetchNotifications).not.toHaveBeenCalled()
  })

  it('should respect custom options', async () => {
    mockAPIInstance.initialize.mockResolvedValueOnce(undefined)
    mockAPIInstance.fetchNotifications.mockResolvedValueOnce([])

    renderHook(
      () =>
        useNotifications({
          all: true,
          participating: true,
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(mockAPIInstance.fetchNotifications).toHaveBeenCalledWith({
        all: true,
        participating: true,
      })
    })
  })

  it('should be disabled when enabled option is false', async () => {
    const { result } = renderHook(
      () => useNotifications({ enabled: false }),
      { wrapper }
    )

    expect(result.current.isLoading).toBe(false)
    expect(mockAPIInstance.fetchNotifications).not.toHaveBeenCalled()
  })

  it('should provide refresh function', async () => {
    mockAPIInstance.initialize.mockResolvedValue(undefined)
    mockAPIInstance.fetchNotifications.mockResolvedValue([])

    const { result } = renderHook(() => useNotifications(), { wrapper })

    expect(result.current.refresh).toBeDefined()
    expect(typeof result.current.refresh).toBe('function')
  })

  it('should provide markAsRead function', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper })

    expect(result.current.markAsRead).toBeDefined()
    expect(typeof result.current.markAsRead).toBe('function')
  })
})

describe('useUnreadCount', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    // Reset Zustand store
    useNotificationStore.setState({
      notifications: [],
      isLoading: false,
      error: null,
      lastFetched: null,
    })

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
    // Reset mock implementations
    mockAPIInstance.initialize.mockClear()
    mockAPIInstance.fetchNotifications.mockClear()
    mockAPIInstance.isInitialized.mockReturnValue(true)
    
    mockStorage.local.set.mockResolvedValue(undefined)
    mockStorage.local.get.mockResolvedValue({})
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  )

  it('should return 0 when no notifications', () => {
    const { result } = renderHook(() => useUnreadCount(), { wrapper })

    expect(result.current).toBe(0)
  })

  it('should count unread notifications', () => {
    // Set up store with notifications
    act(() => {
      useNotificationStore.setState({
        notifications: [
          { id: '1', unread: true } as any,
          { id: '2', unread: false } as any,
          { id: '3', unread: true } as any,
        ],
      })
    })

    const { result } = renderHook(() => useUnreadCount(), { wrapper })

    expect(result.current).toBe(2)
  })

  it('should return 0 when notifications data is undefined', () => {
    const { result} = renderHook(() => useUnreadCount(), { wrapper })

    expect(result.current).toBe(0)
  })
})
