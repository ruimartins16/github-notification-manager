import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GitHubAPI } from '../github-api'

// Create shared mock functions that will be used across all tests
const mockListNotifications = vi.fn()
const mockMarkThreadAsRead = vi.fn()
const mockMarkNotificationsAsRead = vi.fn()
const mockGetAuthenticated = vi.fn()

// Mock Octokit to return the same mock instance
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      activity: {
        listNotificationsForAuthenticatedUser: mockListNotifications,
        markThreadAsRead: mockMarkThreadAsRead,
        markNotificationsAsRead: mockMarkNotificationsAsRead,
      },
      users: {
        getAuthenticated: mockGetAuthenticated,
      },
    },
  })),
}))

describe('GitHubAPI', () => {
  let api: GitHubAPI
  
  beforeEach(() => {
    // Use getInstance to get singleton instance
    api = GitHubAPI.getInstance()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Reset singleton instance after each test
    ;(GitHubAPI as any).instance = null
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

      mockListNotifications.mockResolvedValueOnce({ data: mockNotifications })

      await api.initialize('gho_test_token')
      const result = await api.fetchNotifications()

      expect(result).toEqual(mockNotifications)
      expect(mockListNotifications).toHaveBeenCalledWith({
        all: false,
        participating: false,
        per_page: 50,
      })
    })

    it('should fetch notifications with custom options', async () => {
      mockListNotifications.mockResolvedValueOnce({ data: [] })

      await api.initialize('gho_test_token')
      await api.fetchNotifications({
        all: true,
        participating: true,
        perPage: 100,
      })

      expect(mockListNotifications).toHaveBeenCalledWith({
        all: true,
        participating: true,
        per_page: 100,
      })
    })

    it('should handle API errors', async () => {
      mockListNotifications.mockRejectedValueOnce(new Error('API Error'))

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
      mockMarkThreadAsRead.mockResolvedValueOnce({})

      await api.initialize('gho_test_token')
      await api.markAsRead('123')

      expect(mockMarkThreadAsRead).toHaveBeenCalledWith({
        thread_id: 123,
      })
    })

    it('should handle string thread IDs', async () => {
      mockMarkThreadAsRead.mockResolvedValueOnce({})

      await api.initialize('gho_test_token')
      await api.markAsRead('456')

      expect(mockMarkThreadAsRead).toHaveBeenCalledWith({
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
      mockMarkNotificationsAsRead.mockResolvedValueOnce({})

      await api.initialize('gho_test_token')
      await api.markAllAsRead()

      expect(mockMarkNotificationsAsRead).toHaveBeenCalled()
    })
  })

  describe('getAuthenticatedUser', () => {
    it('should throw error if not initialized', async () => {
      await expect(api.getAuthenticatedUser()).rejects.toThrow(
        'GitHubAPI not initialized. Call initialize() first.'
      )
    })

    it('should get authenticated user information', async () => {
      const mockUser = {
        login: 'testuser',
        avatar_url: 'https://avatars.githubusercontent.com/u/123456',
        id: 123456,
        name: 'Test User',
      }

      mockGetAuthenticated.mockResolvedValueOnce({ data: mockUser })

      await api.initialize('gho_test_token')
      const result = await api.getAuthenticatedUser()

      expect(result).toEqual(mockUser)
      expect(mockGetAuthenticated).toHaveBeenCalled()
    })

    it('should handle API errors', async () => {
      mockGetAuthenticated.mockRejectedValueOnce(new Error('API Error'))

      await api.initialize('gho_test_token')
      
      await expect(api.getAuthenticatedUser()).rejects.toThrow('API Error')
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
