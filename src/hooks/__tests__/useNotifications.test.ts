import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNotifications, useUnreadCount } from '../useNotifications'
import { GitHubAPI } from '../../utils/github-api'
import React from 'react'

// Mock GitHubAPI
vi.mock('../../utils/github-api', () => ({
  GitHubAPI: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    fetchNotifications: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(true),
  })),
}))

// Mock useAuth
vi.mock('../useAuth', () => ({
  useAuth: vi.fn(() => ({
    token: 'gho_test_token',
    isAuthenticated: true,
  })),
}))

describe('useNotifications', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries in tests
        },
      },
    })
    vi.clearAllMocks()
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

    const mockAPI = new GitHubAPI()
    ;(mockAPI.fetchNotifications as any).mockResolvedValueOnce(mockNotifications)

    const { result } = renderHook(() => useNotifications(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockNotifications)
    expect(mockAPI.initialize).toHaveBeenCalledWith('gho_test_token')
    expect(mockAPI.fetchNotifications).toHaveBeenCalled()
  })

  it('should handle fetch errors', async () => {
    const mockAPI = new GitHubAPI()
    ;(mockAPI.fetchNotifications as any).mockRejectedValueOnce(new Error('API Error'))

    const { result } = renderHook(() => useNotifications(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(new Error('API Error'))
  })

  it('should not fetch if not authenticated', async () => {
    const { useAuth } = await import('../useAuth')
    ;(useAuth as any).mockReturnValueOnce({
      token: null,
      isAuthenticated: false,
    })

    const mockAPI = new GitHubAPI()

    const { result } = renderHook(() => useNotifications(), { wrapper })

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false)
    })

    expect(mockAPI.fetchNotifications).not.toHaveBeenCalled()
  })

  it('should respect custom options', async () => {
    const mockAPI = new GitHubAPI()
    ;(mockAPI.fetchNotifications as any).mockResolvedValueOnce([])

    renderHook(
      () =>
        useNotifications({
          all: true,
          participating: true,
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(mockAPI.fetchNotifications).toHaveBeenCalledWith({
        all: true,
        participating: true,
      })
    })
  })

  it('should be disabled when enabled option is false', async () => {
    const mockAPI = new GitHubAPI()

    const { result } = renderHook(
      () => useNotifications({ enabled: false }),
      { wrapper }
    )

    expect(result.current.isFetching).toBe(false)
    expect(mockAPI.fetchNotifications).not.toHaveBeenCalled()
  })
})

describe('useUnreadCount', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  )

  it('should return 0 when no notifications', async () => {
    const mockAPI = new GitHubAPI()
    ;(mockAPI.fetchNotifications as any).mockResolvedValueOnce([])

    const { result } = renderHook(() => useUnreadCount(), { wrapper })

    await waitFor(() => {
      expect(result.current).toBe(0)
    })
  })

  it('should count unread notifications', async () => {
    const mockNotifications = [
      { id: '1', unread: true },
      { id: '2', unread: false },
      { id: '3', unread: true },
    ]

    const mockAPI = new GitHubAPI()
    ;(mockAPI.fetchNotifications as any).mockResolvedValueOnce(mockNotifications)

    const { result } = renderHook(() => useUnreadCount(), { wrapper })

    await waitFor(() => {
      expect(result.current).toBe(2)
    })
  })

  it('should return 0 when notifications data is undefined', () => {
    const { result } = renderHook(() => useUnreadCount(), { wrapper })

    expect(result.current).toBe(0)
  })
})
