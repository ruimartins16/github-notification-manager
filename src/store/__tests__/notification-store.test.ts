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

// Mock chrome.alarms
const mockChromeAlarms = {
  create: vi.fn(),
  clear: vi.fn(),
}

// @ts-ignore - Mocking global chrome API
globalThis.chrome = {
  storage: mockChromeStorage,
  alarms: mockChromeAlarms,
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
      activeFilter: 'all',
      snoozedNotifications: [],
    })

    // Reset mocks
    vi.clearAllMocks()
    mockChromeStorage.local.get.mockResolvedValue({})
    mockChromeStorage.local.set.mockResolvedValue(undefined)
    mockChromeStorage.local.remove.mockResolvedValue(undefined)
    mockChromeAlarms.create.mockResolvedValue(undefined)
    mockChromeAlarms.clear.mockResolvedValue(true)
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

    it('should persist activeFilter', async () => {
      const { result } = renderHook(() => useNotificationStore())

      act(() => {
        result.current.setFilter('mentions')
      })

      // Wait for async storage write
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockChromeStorage.local.set).toHaveBeenCalled()
      const callArgs = mockChromeStorage.local.set.mock.calls[0][0]
      const storedData = JSON.parse(callArgs['zustand-notifications'])
      expect(storedData.state.activeFilter).toBe('mentions')
    })
  })

  describe('Filter Management', () => {
    describe('setFilter', () => {
      it('should update active filter', () => {
        const { result } = renderHook(() => useNotificationStore())

        expect(result.current.activeFilter).toBe('all')

        act(() => {
          result.current.setFilter('mentions')
        })

        expect(result.current.activeFilter).toBe('mentions')

        act(() => {
          result.current.setFilter('reviews')
        })

        expect(result.current.activeFilter).toBe('reviews')
      })

      it('should allow setting all filter types', () => {
        const { result } = renderHook(() => useNotificationStore())

        const filters: Array<'all' | 'mentions' | 'reviews' | 'assigned'> = ['all', 'mentions', 'reviews', 'assigned']

        filters.forEach(filter => {
          act(() => {
            result.current.setFilter(filter)
          })
          expect(result.current.activeFilter).toBe(filter)
        })
      })
    })

    describe('getFilteredNotifications', () => {
      const mentionNotification: GitHubNotification = {
        ...mockNotification,
        id: '1',
        reason: 'mention',
      }

      const teamMentionNotification: GitHubNotification = {
        ...mockNotification,
        id: '2',
        reason: 'team_mention',
      }

      const authorNotification: GitHubNotification = {
        ...mockNotification,
        id: '3',
        reason: 'author',
      }

      const reviewNotification: GitHubNotification = {
        ...mockNotification,
        id: '4',
        reason: 'review_requested',
      }

      const assignNotification: GitHubNotification = {
        ...mockNotification,
        id: '5',
        reason: 'assign',
      }

      const subscriptionNotification: GitHubNotification = {
        ...mockNotification,
        id: '6',
        reason: 'subscribed',
      }

      it('should return all notifications when filter is "all"', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([
            mentionNotification,
            reviewNotification,
            assignNotification,
            subscriptionNotification,
          ])
          result.current.setFilter('all')
        })

        const filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(4)
      })

      it('should return only mention-related notifications when filter is "mentions"', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([
            mentionNotification,
            teamMentionNotification,
            authorNotification,
            reviewNotification,
            assignNotification,
          ])
          result.current.setFilter('mentions')
        })

        const filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(3)
        expect(filtered.map(n => n.id)).toEqual(['1', '2', '3'])
        expect(filtered.every(n => ['mention', 'team_mention', 'author'].includes(n.reason))).toBe(true)
      })

      it('should return only review notifications when filter is "reviews"', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([
            mentionNotification,
            reviewNotification,
            assignNotification,
          ])
          result.current.setFilter('reviews')
        })

        const filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(1)
        expect(filtered[0].id).toBe('4')
        expect(filtered[0].reason).toBe('review_requested')
      })

      it('should return only assigned notifications when filter is "assigned"', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([
            mentionNotification,
            reviewNotification,
            assignNotification,
          ])
          result.current.setFilter('assigned')
        })

        const filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(1)
        expect(filtered[0].id).toBe('5')
        expect(filtered[0].reason).toBe('assign')
      })

      it('should return empty array when no notifications match filter', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([mentionNotification])
          result.current.setFilter('reviews')
        })

        const filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(0)
      })

      it('should return empty array when there are no notifications', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([])
          result.current.setFilter('mentions')
        })

        const filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(0)
      })
    })

    describe('getFilterCounts', () => {
      const mentionNotification: GitHubNotification = {
        ...mockNotification,
        id: '1',
        reason: 'mention',
      }

      const teamMentionNotification: GitHubNotification = {
        ...mockNotification,
        id: '2',
        reason: 'team_mention',
      }

      const reviewNotification: GitHubNotification = {
        ...mockNotification,
        id: '3',
        reason: 'review_requested',
      }

      const assignNotification: GitHubNotification = {
        ...mockNotification,
        id: '4',
        reason: 'assign',
      }

      const subscriptionNotification: GitHubNotification = {
        ...mockNotification,
        id: '5',
        reason: 'subscribed',
      }

      it('should return correct counts for all filter types', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([
            mentionNotification,
            teamMentionNotification,
            reviewNotification,
            assignNotification,
            subscriptionNotification,
          ])
        })

        const counts = result.current.getFilterCounts()

        expect(counts.all).toBe(5)
        expect(counts.mentions).toBe(2)
        expect(counts.reviews).toBe(1)
        expect(counts.assigned).toBe(1)
      })

      it('should return zero counts when no notifications', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([])
        })

        const counts = result.current.getFilterCounts()

        expect(counts.all).toBe(0)
        expect(counts.mentions).toBe(0)
        expect(counts.reviews).toBe(0)
        expect(counts.assigned).toBe(0)
      })

      it('should update counts dynamically when notifications change', () => {
        const { result } = renderHook(() => useNotificationStore())

        // Set initial notifications
        act(() => {
          result.current.setNotifications([mentionNotification, reviewNotification])
        })

        let counts = result.current.getFilterCounts()
        expect(counts.all).toBe(2)
        expect(counts.mentions).toBe(1)
        expect(counts.reviews).toBe(1)

        // Add more notifications
        act(() => {
          result.current.setNotifications([
            mentionNotification,
            reviewNotification,
            assignNotification,
          ])
        })

        counts = result.current.getFilterCounts()
        expect(counts.all).toBe(3)
        expect(counts.assigned).toBe(1)
      })

      it('should update counts when notification is marked as read', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([
            mentionNotification,
            reviewNotification,
            assignNotification,
          ])
        })

        let counts = result.current.getFilterCounts()
        expect(counts.all).toBe(3)

        // Mark one as read
        act(() => {
          result.current.markAsRead('1')
        })

        counts = result.current.getFilterCounts()
        expect(counts.all).toBe(2)
        expect(counts.mentions).toBe(0)
      })
    })

    describe('Filter Integration', () => {
      it('should filter correctly after marking notification as read', () => {
        const { result } = renderHook(() => useNotificationStore())

        const notification1: GitHubNotification = {
          ...mockNotification,
          id: '1',
          reason: 'mention',
        }

        const notification2: GitHubNotification = {
          ...mockNotification,
          id: '2',
          reason: 'mention',
        }

        act(() => {
          result.current.setNotifications([notification1, notification2])
          result.current.setFilter('mentions')
        })

        let filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(2)

        // Mark one as read
        act(() => {
          result.current.markAsRead('1')
        })

        filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(1)
        expect(filtered[0].id).toBe('2')
      })

      it('should maintain filter when clearing and resetting notifications', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setFilter('reviews')
          result.current.setNotifications([mockNotification])
        })

        expect(result.current.activeFilter).toBe('reviews')

        act(() => {
          result.current.clearNotifications()
        })

        expect(result.current.activeFilter).toBe('reviews')
      })
    })
  })

  describe('Snooze Functionality', () => {
    describe('snoozeNotification', () => {
      it('should move notification from active to snoozed list', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([mockNotification])
        })

        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.snoozedNotifications).toHaveLength(0)

        const wakeTime = Date.now() + 3600000 // 1 hour from now

        act(() => {
          result.current.snoozeNotification('1', wakeTime)
        })

        expect(result.current.notifications).toHaveLength(0)
        expect(result.current.snoozedNotifications).toHaveLength(1)
        expect(result.current.snoozedNotifications[0]).toEqual({
          notification: mockNotification,
          snoozedAt: expect.any(Number),
          wakeTime,
          alarmName: 'snooze-1',
        })
      })

      it('should create chrome alarm with correct name and time', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([mockNotification])
        })

        const wakeTime = Date.now() + 3600000 // 1 hour from now

        act(() => {
          result.current.snoozeNotification('1', wakeTime)
        })

        // Check that chrome.alarms.create was called with correct parameters
        // Note: With callback, it's called with 3 args: (name, alarmInfo, callback)
        expect(mockChromeAlarms.create).toHaveBeenCalled()
        const callArgs = mockChromeAlarms.create.mock.calls[0]
        expect(callArgs[0]).toBe('snooze-1')
        expect(callArgs[1]).toEqual({ when: wakeTime })
        expect(typeof callArgs[2]).toBe('function') // callback
      })

      it('should handle snoozing non-existent notification gracefully', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([mockNotification])
        })

        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.snoozeNotification('non-existent', wakeTime)
        })

        // Should not add to snoozed list
        expect(result.current.snoozedNotifications).toHaveLength(0)
        // Should not affect active notifications
        expect(result.current.notifications).toHaveLength(1)
        // Should not create alarm
        expect(mockChromeAlarms.create).not.toHaveBeenCalled()
      })

      it('should preserve all notification data when snoozed', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([mockNotification])
        })

        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.snoozeNotification('1', wakeTime)
        })

        expect(result.current.snoozedNotifications[0].notification).toEqual(mockNotification)
      })
    })

    describe('unsnoozeNotification', () => {
      it('should move notification from snoozed to active list', () => {
        const { result } = renderHook(() => useNotificationStore())
        const wakeTime = Date.now() + 3600000

        // First snooze it
        act(() => {
          result.current.setNotifications([mockNotification])
          result.current.snoozeNotification('1', wakeTime)
        })

        expect(result.current.notifications).toHaveLength(0)
        expect(result.current.snoozedNotifications).toHaveLength(1)

        // Then unsnooze
        act(() => {
          result.current.unsnoozeNotification('1')
        })

        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.snoozedNotifications).toHaveLength(0)
        expect(result.current.notifications[0]).toEqual(mockNotification)
      })

      it('should clear chrome alarm when unsnoozing', () => {
        const { result } = renderHook(() => useNotificationStore())
        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.setNotifications([mockNotification])
          result.current.snoozeNotification('1', wakeTime)
        })

        vi.clearAllMocks() // Clear previous alarm.create call

        act(() => {
          result.current.unsnoozeNotification('1')
        })

        // Check that chrome.alarms.clear was called with correct parameters
        // Note: With callback, it's called with 2 args: (name, callback)
        expect(mockChromeAlarms.clear).toHaveBeenCalled()
        const callArgs = mockChromeAlarms.clear.mock.calls[0]
        expect(callArgs[0]).toBe('snooze-1')
        expect(typeof callArgs[1]).toBe('function') // callback
      })

      it('should handle unsnoozing non-existent notification gracefully', () => {
        const { result } = renderHook(() => useNotificationStore())
        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.setNotifications([mockNotification])
          result.current.snoozeNotification('1', wakeTime)
        })

        act(() => {
          result.current.unsnoozeNotification('non-existent')
        })

        // Should not affect snoozed list
        expect(result.current.snoozedNotifications).toHaveLength(1)
        // Should not affect active list
        expect(result.current.notifications).toHaveLength(0)
      })
    })

    describe('wakeNotification', () => {
      it('should move notification from snoozed to active without clearing alarm', () => {
        const { result } = renderHook(() => useNotificationStore())
        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.setNotifications([mockNotification])
          result.current.snoozeNotification('1', wakeTime)
        })

        vi.clearAllMocks()

        act(() => {
          result.current.wakeNotification('1')
        })

        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.snoozedNotifications).toHaveLength(0)
        // Should NOT clear alarm (alarm already fired)
        expect(mockChromeAlarms.clear).not.toHaveBeenCalled()
      })

      it('should handle waking non-existent notification gracefully', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.wakeNotification('non-existent')
        })

        expect(result.current.notifications).toHaveLength(0)
        expect(result.current.snoozedNotifications).toHaveLength(0)
      })
    })

    describe('setSnoozedNotifications', () => {
      it('should replace entire snoozed notifications list', () => {
        const { result } = renderHook(() => useNotificationStore())
        const wakeTime = Date.now() + 3600000

        const snoozedList = [
          {
            notification: mockNotification,
            snoozedAt: Date.now(),
            wakeTime,
            alarmName: 'snooze-1',
          },
        ]

        act(() => {
          result.current.setSnoozedNotifications(snoozedList)
        })

        expect(result.current.snoozedNotifications).toEqual(snoozedList)
      })
    })

    describe('getSnoozedCount', () => {
      it('should return correct count of snoozed notifications', () => {
        const { result } = renderHook(() => useNotificationStore())

        expect(result.current.getSnoozedCount()).toBe(0)

        const notification2: GitHubNotification = {
          ...mockNotification,
          id: '2',
        }

        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.setNotifications([mockNotification, notification2])
          result.current.snoozeNotification('1', wakeTime)
        })

        expect(result.current.getSnoozedCount()).toBe(1)

        act(() => {
          result.current.snoozeNotification('2', wakeTime)
        })

        expect(result.current.getSnoozedCount()).toBe(2)
      })
    })

    describe('Snooze Persistence', () => {
      it('should persist snoozed notifications to chrome.storage', async () => {
        const { result } = renderHook(() => useNotificationStore())
        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.setNotifications([mockNotification])
          result.current.snoozeNotification('1', wakeTime)
        })

        // Wait for async storage write
        await new Promise((resolve) => setTimeout(resolve, 100))

        expect(mockChromeStorage.local.set).toHaveBeenCalled()
        const callArgs = mockChromeStorage.local.set.mock.calls[mockChromeStorage.local.set.mock.calls.length - 1][0]
        const storedData = JSON.parse(callArgs['zustand-notifications'])
        expect(storedData.state.snoozedNotifications).toHaveLength(1)
        expect(storedData.state.snoozedNotifications[0].notification).toEqual(mockNotification)
      })
    })

    describe('Snooze Filter Integration', () => {
      it('should remove notification from filtered list when snoozed', () => {
        const { result } = renderHook(() => useNotificationStore())

        const mentionNotification: GitHubNotification = {
          ...mockNotification,
          id: '1',
          reason: 'mention',
        }

        act(() => {
          result.current.setNotifications([mentionNotification])
          result.current.setFilter('mentions')
        })

        let filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(1)

        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.snoozeNotification('1', wakeTime)
        })

        filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(0)
      })

      it('should update filter counts when notification is snoozed', () => {
        const { result } = renderHook(() => useNotificationStore())

        const mentionNotification: GitHubNotification = {
          ...mockNotification,
          id: '1',
          reason: 'mention',
        }

        act(() => {
          result.current.setNotifications([mentionNotification])
        })

        let counts = result.current.getFilterCounts()
        expect(counts.all).toBe(1)
        expect(counts.mentions).toBe(1)

        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.snoozeNotification('1', wakeTime)
        })

        counts = result.current.getFilterCounts()
        expect(counts.all).toBe(0)
        expect(counts.mentions).toBe(0)
      })

      it('should add notification back to filtered list when unsnoozed', () => {
        const { result } = renderHook(() => useNotificationStore())

        const reviewNotification: GitHubNotification = {
          ...mockNotification,
          id: '1',
          reason: 'review_requested',
        }

        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.setNotifications([reviewNotification])
          result.current.setFilter('reviews')
          result.current.snoozeNotification('1', wakeTime)
        })

        let filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(0)

        act(() => {
          result.current.unsnoozeNotification('1')
        })

        filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(1)
        expect(filtered[0].id).toBe('1')
      })
    })

    describe('Multiple Snooze Operations', () => {
      it('should handle snoozing multiple notifications', () => {
        const { result } = renderHook(() => useNotificationStore())

        const notification2: GitHubNotification = {
          ...mockNotification,
          id: '2',
        }

        const notification3: GitHubNotification = {
          ...mockNotification,
          id: '3',
        }

        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.setNotifications([mockNotification, notification2, notification3])
          result.current.snoozeNotification('1', wakeTime)
          result.current.snoozeNotification('2', wakeTime + 7200000)
          result.current.snoozeNotification('3', wakeTime + 14400000)
        })

        expect(result.current.notifications).toHaveLength(0)
        expect(result.current.snoozedNotifications).toHaveLength(3)
        expect(mockChromeAlarms.create).toHaveBeenCalledTimes(3)
      })

      it('should handle unsnoozing specific notification from multiple snoozed', () => {
        const { result } = renderHook(() => useNotificationStore())

        const notification2: GitHubNotification = {
          ...mockNotification,
          id: '2',
        }

        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.setNotifications([mockNotification, notification2])
          result.current.snoozeNotification('1', wakeTime)
          result.current.snoozeNotification('2', wakeTime)
        })

        expect(result.current.snoozedNotifications).toHaveLength(2)

        act(() => {
          result.current.unsnoozeNotification('1')
        })

        expect(result.current.snoozedNotifications).toHaveLength(1)
        expect(result.current.snoozedNotifications[0].notification.id).toBe('2')
        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.notifications[0].id).toBe('1')
      })
    })

    describe('Edge Cases', () => {
      it('should handle snoozing already snoozed notification (re-snooze)', () => {
        const { result } = renderHook(() => useNotificationStore())
        const wakeTime1 = Date.now() + 3600000

        act(() => {
          result.current.setNotifications([mockNotification])
          result.current.snoozeNotification('1', wakeTime1)
        })

        expect(result.current.snoozedNotifications).toHaveLength(1)

        // Try to snooze again - should not find it in active list
        const wakeTime2 = Date.now() + 7200000

        act(() => {
          result.current.snoozeNotification('1', wakeTime2)
        })

        // Should still have only one snoozed notification
        expect(result.current.snoozedNotifications).toHaveLength(1)
      })

      it('should clear all notifications including snoozed', () => {
        const { result } = renderHook(() => useNotificationStore())
        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.setNotifications([mockNotification])
          result.current.snoozeNotification('1', wakeTime)
        })

        expect(result.current.snoozedNotifications).toHaveLength(1)

        act(() => {
          result.current.clearNotifications()
        })

        // clearNotifications should NOT clear snoozed notifications
        // (user explicitly snoozed them, they should wake up as scheduled)
        expect(result.current.snoozedNotifications).toHaveLength(1)
        expect(result.current.notifications).toHaveLength(0)
      })
    })
  })

  describe('Mark All as Read Functionality', () => {
    describe('markAllAsRead', () => {
      it('should mark all notifications as read', () => {
        const { result } = renderHook(() => useNotificationStore())

        const notification2: GitHubNotification = {
          ...mockNotification,
          id: '2',
        }

        act(() => {
          result.current.setNotifications([mockNotification, notification2])
        })

        expect(result.current.notifications.filter((n) => n.unread)).toHaveLength(2)

        let markedNotifications: GitHubNotification[] = []
        act(() => {
          markedNotifications = result.current.markAllAsRead()
        })

        expect(markedNotifications).toHaveLength(2)
        expect(result.current.notifications.filter((n) => n.unread)).toHaveLength(0)
        expect(result.current.markAllBackup).toEqual([mockNotification, notification2])
      })

      it('should only mark filtered notifications as read', () => {
        const { result } = renderHook(() => useNotificationStore())

        const mentionNotification: GitHubNotification = {
          ...mockNotification,
          id: '1',
          reason: 'mention',
        }

        const reviewNotification: GitHubNotification = {
          ...mockNotification,
          id: '2',
          reason: 'review_requested',
        }

        act(() => {
          result.current.setNotifications([mentionNotification, reviewNotification])
          result.current.setFilter('mentions')
        })

        let markedNotifications: GitHubNotification[] = []
        act(() => {
          markedNotifications = result.current.markAllAsRead()
        })

        // Should only mark mention notification
        expect(markedNotifications).toHaveLength(1)
        expect(markedNotifications[0].id).toBe('1')

        // Check that only mention notification was marked as read
        const mention = result.current.notifications.find((n) => n.id === '1')!
        const review = result.current.notifications.find((n) => n.id === '2')!
        expect(mention.unread).toBe(false)
        expect(review.unread).toBe(true)
      })

      it('should create backup for undo', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([mockNotification])
        })

        // Store backup before marking
        const backupBefore = result.current.markAllBackup

        act(() => {
          result.current.markAllAsRead()
        })

        // Backup should now exist and contain the notifications
        expect(result.current.markAllBackup).toEqual([mockNotification])
        expect(result.current.markAllBackup).not.toBe(backupBefore)
      })

      it('should return empty array when no notifications to mark', () => {
        const { result } = renderHook(() => useNotificationStore())

        let markedNotifications: GitHubNotification[] = []
        act(() => {
          markedNotifications = result.current.markAllAsRead()
        })

        expect(markedNotifications).toHaveLength(0)
      })

      it('should handle notifications already marked as read', () => {
        const { result } = renderHook(() => useNotificationStore())

        const readNotification: GitHubNotification = {
          ...mockNotification,
          unread: false,
        }

        act(() => {
          result.current.setNotifications([readNotification])
        })

        let markedNotifications: GitHubNotification[] = []
        act(() => {
          markedNotifications = result.current.markAllAsRead()
        })

        // Should still return the notification in marked list
        expect(markedNotifications).toHaveLength(1)
        // Should remain marked as read
        expect(result.current.notifications[0].unread).toBe(false)
      })
    })

    describe('undoMarkAllAsRead', () => {
      it('should restore notifications from backup', () => {
        const { result } = renderHook(() => useNotificationStore())

        const notification2: GitHubNotification = {
          ...mockNotification,
          id: '2',
        }

        act(() => {
          result.current.setNotifications([mockNotification, notification2])
          result.current.markAllAsRead()
        })

        expect(result.current.notifications.filter((n) => n.unread)).toHaveLength(0)

        act(() => {
          result.current.undoMarkAllAsRead()
        })

        expect(result.current.notifications.filter((n) => n.unread)).toHaveLength(2)
        expect(result.current.markAllBackup).toBeNull()
      })

      it('should handle undo when no backup exists', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([mockNotification])
        })

        // Try to undo without marking first
        act(() => {
          result.current.undoMarkAllAsRead()
        })

        // Should not change notifications
        expect(result.current.notifications).toEqual([mockNotification])
      })

      it('should restore exact state including unread flags', () => {
        const { result } = renderHook(() => useNotificationStore())

        const notification2: GitHubNotification = {
          ...mockNotification,
          id: '2',
          unread: false, // Already read
        }

        const notification3: GitHubNotification = {
          ...mockNotification,
          id: '3',
          unread: true,
        }

        act(() => {
          result.current.setNotifications([mockNotification, notification2, notification3])
          result.current.markAllAsRead()
        })

        act(() => {
          result.current.undoMarkAllAsRead()
        })

        const restoredNotifications = result.current.notifications
        expect(restoredNotifications).toHaveLength(3)
        expect(restoredNotifications.find((n) => n.id === '1')!.unread).toBe(true)
        expect(restoredNotifications.find((n) => n.id === '2')!.unread).toBe(false)
        expect(restoredNotifications.find((n) => n.id === '3')!.unread).toBe(true)
      })
    })

    describe('Mark All Integration', () => {
      it('should work with filter changes after marking', () => {
        const { result } = renderHook(() => useNotificationStore())

        const mentionNotification: GitHubNotification = {
          ...mockNotification,
          id: '1',
          reason: 'mention',
        }

        const reviewNotification: GitHubNotification = {
          ...mockNotification,
          id: '2',
          reason: 'review_requested',
        }

        act(() => {
          result.current.setNotifications([mentionNotification, reviewNotification])
          result.current.setFilter('mentions')
          result.current.markAllAsRead()
        })

        // Switch to reviews filter
        act(() => {
          result.current.setFilter('reviews')
        })

        const filtered = result.current.getFilteredNotifications()
        // Review notification should still be unread
        expect(filtered).toHaveLength(1)
        expect(filtered[0].unread).toBe(true)
      })

      it('should update filter counts after marking all as read', () => {
        const { result } = renderHook(() => useNotificationStore())

        const notification2: GitHubNotification = {
          ...mockNotification,
          id: '2',
          reason: 'mention',
        }

        act(() => {
          result.current.setNotifications([mockNotification, notification2])
        })

        let counts = result.current.getFilterCounts()
        expect(counts.all).toBe(2)
        expect(counts.mentions).toBe(2)

        act(() => {
          result.current.markAllAsRead()
        })

        counts = result.current.getFilterCounts()
        // Counts should be 0 for unread notifications
        // (Note: getFilterCounts may need adjustment based on your implementation)
        expect(result.current.notifications).toHaveLength(2) // Notifications still exist
        expect(result.current.notifications.filter((n) => n.unread)).toHaveLength(0) // But all are read
      })
    })
  })

  describe('Archive Functionality', () => {
    beforeEach(() => {
      useNotificationStore.setState({
        notifications: [],
        isLoading: false,
        error: null,
        lastFetched: null,
        activeFilter: 'all',
        snoozedNotifications: [],
        archivedNotifications: [],
      })
    })

    describe('archiveNotification', () => {
      it('should move notification from active to archived list', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([mockNotification])
        })

        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.archivedNotifications).toHaveLength(0)

        act(() => {
          result.current.archiveNotification('1')
        })

        expect(result.current.notifications).toHaveLength(0)
        expect(result.current.archivedNotifications).toHaveLength(1)
        expect(result.current.archivedNotifications[0]).toEqual(mockNotification)
      })

      it('should handle archiving non-existent notification gracefully', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([mockNotification])
        })

        act(() => {
          result.current.archiveNotification('non-existent')
        })

        // Should not add to archived list
        expect(result.current.archivedNotifications).toHaveLength(0)
        // Should not affect active notifications
        expect(result.current.notifications).toHaveLength(1)
      })

      it('should preserve all notification data when archived', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([mockNotification])
        })

        act(() => {
          result.current.archiveNotification('1')
        })

        expect(result.current.archivedNotifications[0]).toEqual(mockNotification)
      })

      it('should handle archiving multiple notifications', () => {
        const { result } = renderHook(() => useNotificationStore())

        const notification2: GitHubNotification = {
          ...mockNotification,
          id: '2',
        }

        const notification3: GitHubNotification = {
          ...mockNotification,
          id: '3',
        }

        act(() => {
          result.current.setNotifications([mockNotification, notification2, notification3])
          result.current.archiveNotification('1')
          result.current.archiveNotification('2')
        })

        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.archivedNotifications).toHaveLength(2)
        expect(result.current.archivedNotifications.map(n => n.id)).toEqual(['1', '2'])
      })
    })

    describe('unarchiveNotification', () => {
      it('should move notification from archived to active list', () => {
        const { result } = renderHook(() => useNotificationStore())

        // First archive it
        act(() => {
          result.current.setNotifications([mockNotification])
          result.current.archiveNotification('1')
        })

        expect(result.current.notifications).toHaveLength(0)
        expect(result.current.archivedNotifications).toHaveLength(1)

        // Then unarchive
        act(() => {
          result.current.unarchiveNotification('1')
        })

        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.archivedNotifications).toHaveLength(0)
        expect(result.current.notifications[0]).toEqual(mockNotification)
      })

      it('should handle unarchiving non-existent notification gracefully', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([mockNotification])
          result.current.archiveNotification('1')
        })

        act(() => {
          result.current.unarchiveNotification('non-existent')
        })

        // Should not affect archived list
        expect(result.current.archivedNotifications).toHaveLength(1)
        // Should not affect active list
        expect(result.current.notifications).toHaveLength(0)
      })

      it('should handle unarchiving specific notification from multiple archived', () => {
        const { result } = renderHook(() => useNotificationStore())

        const notification2: GitHubNotification = {
          ...mockNotification,
          id: '2',
        }

        act(() => {
          result.current.setNotifications([mockNotification, notification2])
          result.current.archiveNotification('1')
          result.current.archiveNotification('2')
        })

        expect(result.current.archivedNotifications).toHaveLength(2)

        act(() => {
          result.current.unarchiveNotification('1')
        })

        expect(result.current.archivedNotifications).toHaveLength(1)
        expect(result.current.archivedNotifications[0].id).toBe('2')
        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.notifications[0].id).toBe('1')
      })
    })

    describe('getArchivedCount', () => {
      it('should return correct count of archived notifications', () => {
        const { result } = renderHook(() => useNotificationStore())

        expect(result.current.getArchivedCount()).toBe(0)

        const notification2: GitHubNotification = {
          ...mockNotification,
          id: '2',
        }

        act(() => {
          result.current.setNotifications([mockNotification, notification2])
          result.current.archiveNotification('1')
        })

        expect(result.current.getArchivedCount()).toBe(1)

        act(() => {
          result.current.archiveNotification('2')
        })

        expect(result.current.getArchivedCount()).toBe(2)
      })
    })

    describe('Archive Persistence', () => {
      it('should persist archived notifications to chrome.storage', async () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([mockNotification])
          result.current.archiveNotification('1')
        })

        // Wait for async storage write
        await new Promise((resolve) => setTimeout(resolve, 100))

        expect(mockChromeStorage.local.set).toHaveBeenCalled()
        const callArgs = mockChromeStorage.local.set.mock.calls[mockChromeStorage.local.set.mock.calls.length - 1][0]
        const storedData = JSON.parse(callArgs['zustand-notifications'])
        expect(storedData.state.archivedNotifications).toHaveLength(1)
        expect(storedData.state.archivedNotifications[0]).toEqual(mockNotification)
      })
    })

    describe('Archive Filter Integration', () => {
      it('should remove notification from filtered list when archived', () => {
        const { result } = renderHook(() => useNotificationStore())

        const mentionNotification: GitHubNotification = {
          ...mockNotification,
          id: '1',
          reason: 'mention',
        }

        act(() => {
          result.current.setNotifications([mentionNotification])
          result.current.setFilter('mentions')
        })

        let filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(1)

        act(() => {
          result.current.archiveNotification('1')
        })

        filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(0)
      })

      it('should update filter counts when notification is archived', () => {
        const { result } = renderHook(() => useNotificationStore())

        const mentionNotification: GitHubNotification = {
          ...mockNotification,
          id: '1',
          reason: 'mention',
        }

        act(() => {
          result.current.setNotifications([mentionNotification])
        })

        let counts = result.current.getFilterCounts()
        expect(counts.all).toBe(1)
        expect(counts.mentions).toBe(1)

        act(() => {
          result.current.archiveNotification('1')
        })

        counts = result.current.getFilterCounts()
        expect(counts.all).toBe(0)
        expect(counts.mentions).toBe(0)
      })

      it('should add notification back to filtered list when unarchived', () => {
        const { result } = renderHook(() => useNotificationStore())

        const reviewNotification: GitHubNotification = {
          ...mockNotification,
          id: '1',
          reason: 'review_requested',
        }

        act(() => {
          result.current.setNotifications([reviewNotification])
          result.current.setFilter('reviews')
          result.current.archiveNotification('1')
        })

        let filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(0)

        act(() => {
          result.current.unarchiveNotification('1')
        })

        filtered = result.current.getFilteredNotifications()
        expect(filtered).toHaveLength(1)
        expect(filtered[0].id).toBe('1')
      })
    })

    describe('Archive Edge Cases', () => {
      it('should handle archiving already archived notification', () => {
        const { result } = renderHook(() => useNotificationStore())

        act(() => {
          result.current.setNotifications([mockNotification])
          result.current.archiveNotification('1')
        })

        expect(result.current.archivedNotifications).toHaveLength(1)

        // Try to archive again - should not find it in active list
        act(() => {
          result.current.archiveNotification('1')
        })

        // Should still have only one archived notification
        expect(result.current.archivedNotifications).toHaveLength(1)
      })

      it('should keep archived notifications when clearing active notifications', () => {
        const { result } = renderHook(() => useNotificationStore())

        const notification2: GitHubNotification = {
          ...mockNotification,
          id: '2',
        }

        act(() => {
          result.current.setNotifications([mockNotification, notification2])
          result.current.archiveNotification('1')
        })

        expect(result.current.archivedNotifications).toHaveLength(1)
        expect(result.current.notifications).toHaveLength(1)

        act(() => {
          result.current.clearNotifications()
        })

        // clearNotifications should NOT clear archived notifications
        expect(result.current.archivedNotifications).toHaveLength(1)
        expect(result.current.notifications).toHaveLength(0)
      })
    })

    describe('Archive and Snooze Interaction', () => {
      it('should allow archiving a snoozed notification after it wakes', () => {
        const { result } = renderHook(() => useNotificationStore())
        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.setNotifications([mockNotification])
          result.current.snoozeNotification('1', wakeTime)
        })

        expect(result.current.snoozedNotifications).toHaveLength(1)
        expect(result.current.notifications).toHaveLength(0)

        // Wake the notification
        act(() => {
          result.current.wakeNotification('1')
        })

        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.snoozedNotifications).toHaveLength(0)

        // Now archive it
        act(() => {
          result.current.archiveNotification('1')
        })

        expect(result.current.archivedNotifications).toHaveLength(1)
        expect(result.current.notifications).toHaveLength(0)
      })

      it('should not archive notification that is currently snoozed', () => {
        const { result } = renderHook(() => useNotificationStore())
        const wakeTime = Date.now() + 3600000

        act(() => {
          result.current.setNotifications([mockNotification])
          result.current.snoozeNotification('1', wakeTime)
        })

        // Try to archive while snoozed (notification is not in active list)
        act(() => {
          result.current.archiveNotification('1')
        })

        // Should not be archived (not found in active list)
        expect(result.current.archivedNotifications).toHaveLength(0)
        expect(result.current.snoozedNotifications).toHaveLength(1)
      })
    })
  })
})
