import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitHubAPI } from '../github-api'

// Mock Octokit
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      activity: {
        listNotificationsForAuthenticatedUser: vi.fn(),
        markThreadAsRead: vi.fn(),
        markNotificationsAsRead: vi.fn(),
      },
    },
  })),
}))

describe('GitHubAPI', () => {
  let api: GitHubAPI
  
  beforeEach(() => {
    api = new GitHubAPI()
    vi.clearAllMocks()
  })

  describe('initialize', () => {
    it('should initialize with a valid token', async () => {
      await expect(api.initialize('gho_test_token')).resolves.toBeUndefined()
      expect(api.isInitialized()).toBe(true)
    })

    it('should throw error if token is empty', async () => {
      await expect(api.initialize('')).rejects.toThrow('GitHub token is required')
    })

    it('should throw error if token is missing', async () => {
      await expect(api.initialize(null as any)).rejects.toThrow('GitHub token is required')
    })
  })

  describe('fetchNotifications', () => {
    it('should throw error if not initialized', async () => {
      await expect(api.fetchNotifications()).rejects.toThrow(
        'GitHubAPI not initialized. Call initialize() first.'
      )
    })

    it('should fetch notifications with default options', async () => {
      const mockNotifications = [
        {
          id: '1',
          unread: true,
          reason: 'mention',
          subject: { title: 'Test notification', type: 'Issue' },
        },
      ]

      const { Octokit } = await import('@octokit/rest')
      const mockOctokit = new Octokit()
      ;(mockOctokit.rest.activity.listNotificationsForAuthenticatedUser as any)
        .mockResolvedValueOnce({ data: mockNotifications })

      await api.initialize('gho_test_token')
      const result = await api.fetchNotifications()

      expect(result).toEqual(mockNotifications)
      expect(
        mockOctokit.rest.activity.listNotificationsForAuthenticatedUser
      ).toHaveBeenCalledWith({
        all: false,
        participating: false,
        per_page: 50,
      })
    })

    it('should fetch notifications with custom options', async () => {
      const { Octokit } = await import('@octokit/rest')
      const mockOctokit = new Octokit()
      ;(mockOctokit.rest.activity.listNotificationsForAuthenticatedUser as any)
        .mockResolvedValueOnce({ data: [] })

      await api.initialize('gho_test_token')
      await api.fetchNotifications({
        all: true,
        participating: true,
        perPage: 100,
      })

      expect(
        mockOctokit.rest.activity.listNotificationsForAuthenticatedUser
      ).toHaveBeenCalledWith({
        all: true,
        participating: true,
        per_page: 100,
      })
    })

    it('should handle API errors', async () => {
      const { Octokit } = await import('@octokit/rest')
      const mockOctokit = new Octokit()
      ;(mockOctokit.rest.activity.listNotificationsForAuthenticatedUser as any)
        .mockRejectedValueOnce(new Error('API Error'))

      await api.initialize('gho_test_token')
      
      await expect(api.fetchNotifications()).rejects.toThrow('API Error')
    })
  })

  describe('markAsRead', () => {
    it('should throw error if not initialized', async () => {
      await expect(api.markAsRead('123')).rejects.toThrow(
        'GitHubAPI not initialized. Call initialize() first.'
      )
    })

    it('should mark a notification as read', async () => {
      const { Octokit } = await import('@octokit/rest')
      const mockOctokit = new Octokit()
      ;(mockOctokit.rest.activity.markThreadAsRead as any)
        .mockResolvedValueOnce({})

      await api.initialize('gho_test_token')
      await api.markAsRead('123')

      expect(mockOctokit.rest.activity.markThreadAsRead).toHaveBeenCalledWith({
        thread_id: 123,
      })
    })

    it('should handle string thread IDs', async () => {
      const { Octokit } = await import('@octokit/rest')
      const mockOctokit = new Octokit()
      ;(mockOctokit.rest.activity.markThreadAsRead as any)
        .mockResolvedValueOnce({})

      await api.initialize('gho_test_token')
      await api.markAsRead('456')

      expect(mockOctokit.rest.activity.markThreadAsRead).toHaveBeenCalledWith({
        thread_id: 456,
      })
    })
  })

  describe('markAllAsRead', () => {
    it('should throw error if not initialized', async () => {
      await expect(api.markAllAsRead()).rejects.toThrow(
        'GitHubAPI not initialized. Call initialize() first.'
      )
    })

    it('should mark all notifications as read', async () => {
      const { Octokit } = await import('@octokit/rest')
      const mockOctokit = new Octokit()
      ;(mockOctokit.rest.activity.markNotificationsAsRead as any)
        .mockResolvedValueOnce({})

      await api.initialize('gho_test_token')
      await api.markAllAsRead()

      expect(mockOctokit.rest.activity.markNotificationsAsRead).toHaveBeenCalled()
    })
  })

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      expect(api.isInitialized()).toBe(false)
    })

    it('should return true after initialization', async () => {
      await api.initialize('gho_test_token')
      expect(api.isInitialized()).toBe(true)
    })
  })
})
