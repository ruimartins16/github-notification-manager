import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationService, NOTIFICATIONS_STORAGE_KEY, LAST_FETCH_STORAGE_KEY } from '../notification-service'
import { GitHubAPI } from '../github-api'
import type { GitHubNotification } from '../../types/github'

// Mock GitHubAPI
vi.mock('../github-api', () => ({
  GitHubAPI: {
    getInstance: vi.fn(() => ({
      initialize: vi.fn(),
      fetchNotifications: vi.fn(),
    })),
  },
}))

// Mock chrome.storage API
const mockStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
  },
}

global.chrome = {
  storage: mockStorage,
} as any

describe('NotificationService', () => {
  const mockToken = 'test-token-123'
  let mockApi: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock API
    mockApi = {
      initialize: vi.fn(),
      fetchNotifications: vi.fn(),
    }
    
    vi.mocked(GitHubAPI.getInstance).mockReturnValue(mockApi)
    mockStorage.local.set.mockResolvedValue(undefined)
    mockStorage.local.get.mockResolvedValue({})
  })

  describe('fetchNotifications', () => {
    it('should fetch notifications from GitHub API', async () => {
      const mockNotifications = [
        createMockNotification({ id: '1' }),
        createMockNotification({ id: '2' }),
      ]
      
      mockApi.fetchNotifications.mockResolvedValue(mockNotifications)

      const result = await NotificationService.fetchNotifications(mockToken)

      expect(mockApi.initialize).toHaveBeenCalledWith(mockToken)
      expect(mockApi.fetchNotifications).toHaveBeenCalledWith({
        all: false,
        participating: true,
      })
      expect(result).toEqual(mockNotifications)
    })

    it('should throw error if API fetch fails', async () => {
      mockApi.fetchNotifications.mockRejectedValue(new Error('API Error'))

      await expect(NotificationService.fetchNotifications(mockToken)).rejects.toThrow(
        'API Error'
      )
    })
  })

  describe('fetchAndStore', () => {
    it('should fetch notifications and store in chrome.storage', async () => {
      const mockNotifications = [
        createMockNotification({ id: '1' }),
        createMockNotification({ id: '2' }),
      ]
      
      mockApi.fetchNotifications.mockResolvedValue(mockNotifications)

      const result = await NotificationService.fetchAndStore(mockToken)

      expect(mockApi.fetchNotifications).toHaveBeenCalled()
      expect(mockStorage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          [NOTIFICATIONS_STORAGE_KEY]: mockNotifications,
          [LAST_FETCH_STORAGE_KEY]: expect.any(Number),
        })
      )
      expect(result).toEqual(mockNotifications)
    })

    it('should store timestamp when fetching', async () => {
      const mockNotifications = [createMockNotification()]
      mockApi.fetchNotifications.mockResolvedValue(mockNotifications)

      const beforeTimestamp = Date.now()
      await NotificationService.fetchAndStore(mockToken)
      const afterTimestamp = Date.now()

      const storedData = mockStorage.local.set.mock.calls[0][0]
      const timestamp = storedData[LAST_FETCH_STORAGE_KEY]

      expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp)
      expect(timestamp).toBeLessThanOrEqual(afterTimestamp)
    })

    it('should throw error and log if fetch fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockApi.fetchNotifications.mockRejectedValue(new Error('Network error'))

      await expect(NotificationService.fetchAndStore(mockToken)).rejects.toThrow(
        'Network error'
      )
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch and store notifications:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('getStoredNotifications', () => {
    it('should return stored notifications from chrome.storage', async () => {
      const mockNotifications = [
        createMockNotification({ id: '1' }),
        createMockNotification({ id: '2' }),
      ]
      
      mockStorage.local.get.mockResolvedValue({
        [NOTIFICATIONS_STORAGE_KEY]: mockNotifications,
      })

      const result = await NotificationService.getStoredNotifications()

      expect(mockStorage.local.get).toHaveBeenCalledWith(NOTIFICATIONS_STORAGE_KEY)
      expect(result).toEqual(mockNotifications)
    })

    it('should return empty array if no notifications stored', async () => {
      mockStorage.local.get.mockResolvedValue({})

      const result = await NotificationService.getStoredNotifications()

      expect(result).toEqual([])
    })

    it('should return empty array and log error if storage fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockStorage.local.get.mockRejectedValue(new Error('Storage error'))

      const result = await NotificationService.getStoredNotifications()

      expect(result).toEqual([])
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get stored notifications:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('getLastFetchTimestamp', () => {
    it('should return timestamp from storage', async () => {
      const timestamp = 1234567890
      mockStorage.local.get.mockResolvedValue({
        [LAST_FETCH_STORAGE_KEY]: timestamp,
      })

      const result = await NotificationService.getLastFetchTimestamp()

      expect(mockStorage.local.get).toHaveBeenCalledWith(LAST_FETCH_STORAGE_KEY)
      expect(result).toBe(timestamp)
    })

    it('should return null if no timestamp stored', async () => {
      mockStorage.local.get.mockResolvedValue({})

      const result = await NotificationService.getLastFetchTimestamp()

      expect(result).toBeNull()
    })

    it('should return null and log error if storage fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockStorage.local.get.mockRejectedValue(new Error('Storage error'))

      const result = await NotificationService.getLastFetchTimestamp()

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get last fetch timestamp:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
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
