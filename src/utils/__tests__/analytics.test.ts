/**
 * Tests for Analytics Service
 * 
 * Tests privacy-first local analytics tracking, event storage, and conversion metrics.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  trackEvent,
  getEvents,
  getEventsByName,
  getEventsByTimeRange,
  getEventsBySession,
  exportEvents,
  calculateConversionRate,
  getAnalyticsSummary,
  clearEvents,
  clearSession,
  ANALYTICS_EVENTS,
} from '../analytics'

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {}

global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys) => {
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: mockStorage[keys] })
        }
        if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {}
          keys.forEach(key => {
            if (mockStorage[key] !== undefined) {
              result[key] = mockStorage[key]
            }
          })
          return Promise.resolve(result)
        }
        return Promise.resolve(mockStorage)
      }),
      set: vi.fn((items) => {
        Object.assign(mockStorage, items)
        return Promise.resolve()
      }),
      remove: vi.fn((keys) => {
        const keysArray = Array.isArray(keys) ? keys : [keys]
        keysArray.forEach(key => delete mockStorage[key])
        return Promise.resolve()
      }),
    },
  },
} as any

describe('Analytics Service', () => {
  beforeEach(async () => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    vi.clearAllMocks()
    await clearEvents()
    await clearSession()
  })

  describe('trackEvent', () => {
    it('should track an event with timestamp', async () => {
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED)
      
      const events = await getEvents()
      expect(events).toHaveLength(1)
      expect(events[0]?.event).toBe(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED)
      expect(events[0]?.timestamp).toBeGreaterThan(0)
      expect(events[0]?.sessionId).toBeDefined()
    })

    it('should track event with properties', async () => {
      const properties = { location: 'header', isPro: false }
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED, properties)
      
      const events = await getEvents()
      expect(events[0]?.properties).toEqual(properties)
    })

    it('should track multiple events', async () => {
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED, { location: 'header' })
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN, { feature: 'snooze' })
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_PAGE_OPENED)
      
      const events = await getEvents()
      expect(events).toHaveLength(3)
    })

    it('should maintain event order', async () => {
      await trackEvent('event1')
      await trackEvent('event2')
      await trackEvent('event3')
      
      const events = await getEvents()
      expect(events[0]?.event).toBe('event1')
      expect(events[1]?.event).toBe('event2')
      expect(events[2]?.event).toBe('event3')
    })

    it('should limit to MAX_EVENTS (1000)', async () => {
      // Track 1050 events
      for (let i = 0; i < 1050; i++) {
        await trackEvent(`event${i}`)
      }
      
      const events = await getEvents()
      expect(events).toHaveLength(1000)
      // Should keep the most recent 1000
      expect(events[0]?.event).toBe('event50')
      expect(events[999]?.event).toBe('event1049')
    })

    it('should handle errors gracefully', async () => {
      // Mock storage.set to throw error
      vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('Storage error'))
      
      // Should not throw
      await expect(trackEvent('test_event')).resolves.not.toThrow()
    })
  })

  describe('getEvents', () => {
    it('should return empty array when no events', async () => {
      const events = await getEvents()
      expect(events).toEqual([])
    })

    it('should return all stored events', async () => {
      await trackEvent('event1')
      await trackEvent('event2')
      
      const events = await getEvents()
      expect(events).toHaveLength(2)
    })
  })

  describe('getEventsByName', () => {
    it('should filter events by name', async () => {
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED, { location: 'header' })
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN, { feature: 'snooze' })
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED, { location: 'settings' })
      
      const buttonClicks = await getEventsByName(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED)
      expect(buttonClicks).toHaveLength(2)
      expect(buttonClicks[0]?.properties?.location).toBe('header')
      expect(buttonClicks[1]?.properties?.location).toBe('settings')
    })

    it('should return empty array when no matching events', async () => {
      await trackEvent('event1')
      const results = await getEventsByName('nonexistent')
      expect(results).toEqual([])
    })
  })

  describe('getEventsByTimeRange', () => {
    it('should filter events by time range', async () => {
      const now = Date.now()
      const hourAgo = now - (60 * 60 * 1000)
      const halfHourAgo = now - (30 * 60 * 1000)
      
      // Manually set timestamps for testing
      await trackEvent('old_event')
      await trackEvent('recent_event')
      
      const events = await getEvents()
      // Modify timestamps (simulating events at different times)
      if (events[0] && events[1]) {
        events[0].timestamp = hourAgo
        events[1].timestamp = halfHourAgo
        await chrome.storage.local.set({ analytics_events: events })
      }
      
      const recentEvents = await getEventsByTimeRange(halfHourAgo - 1000, now)
      expect(recentEvents).toHaveLength(1)
      expect(recentEvents[0]?.event).toBe('recent_event')
    })
  })

  describe('getEventsBySession', () => {
    it('should filter events by session ID', async () => {
      await trackEvent('event1')
      await trackEvent('event2')
      
      const events = await getEvents()
      const sessionId = events[0]?.sessionId
      
      if (sessionId) {
        const sessionEvents = await getEventsBySession(sessionId)
        expect(sessionEvents).toHaveLength(2)
      }
    })
  })

  describe('exportEvents', () => {
    it('should export events as JSON string', async () => {
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED, { location: 'header' })
      
      const json = await exportEvents()
      expect(json).toContain(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED)
      expect(json).toContain('location')
      expect(json).toContain('header')
      
      // Should be valid JSON
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
    })
  })

  describe('calculateConversionRate', () => {
    it('should calculate conversion rate correctly', async () => {
      // 4 modal shows, 1 payment
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN)
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN)
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN)
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN)
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED)
      
      const rate = await calculateConversionRate()
      expect(rate).toBe(25) // 1/4 = 25%
    })

    it('should return 0 when no modal shows', async () => {
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED)
      const rate = await calculateConversionRate()
      expect(rate).toBe(0)
    })

    it('should return 0 when no events', async () => {
      const rate = await calculateConversionRate()
      expect(rate).toBe(0)
    })
  })

  describe('getAnalyticsSummary', () => {
    it('should return summary statistics', async () => {
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED, { location: 'header' })
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED, { location: 'settings' })
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN, { feature: 'snooze' })
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_MODAL_DISMISSED)
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_PAGE_OPENED)
      
      const summary = await getAnalyticsSummary()
      
      expect(summary.totalEvents).toBe(5)
      expect(summary.upgradeButtonClicks).toBe(2)
      expect(summary.modalShown).toBe(1)
      expect(summary.modalDismissed).toBe(1)
      expect(summary.paymentPageOpened).toBe(1)
      expect(summary.paymentCompleted).toBe(0)
      expect(summary.uniqueSessions).toBeGreaterThanOrEqual(1)
    })

    it('should return zeros for empty analytics', async () => {
      const summary = await getAnalyticsSummary()
      
      expect(summary.totalEvents).toBe(0)
      expect(summary.upgradeButtonClicks).toBe(0)
      expect(summary.modalShown).toBe(0)
      expect(summary.conversionRate).toBe(0)
    })
  })

  describe('clearEvents', () => {
    it('should clear all events', async () => {
      await trackEvent('event1')
      await trackEvent('event2')
      
      let events = await getEvents()
      expect(events).toHaveLength(2)
      
      await clearEvents()
      
      events = await getEvents()
      expect(events).toEqual([])
    })
  })

  describe('clearSession', () => {
    it('should clear session data', async () => {
      await trackEvent('event1')
      
      await clearSession()
      
      // Next event should have a new session ID
      await trackEvent('event2')
      const events = await getEvents()
      
      // Should have both events but potentially different session IDs
      expect(events).toHaveLength(2)
    })
  })

  describe('Session ID Management', () => {
    it('should reuse session ID within timeout period', async () => {
      await trackEvent('event1')
      await trackEvent('event2')
      
      const events = await getEvents()
      expect(events[0]?.sessionId).toBe(events[1]?.sessionId)
    })

    it('should include session ID in all events', async () => {
      await trackEvent('event1')
      await trackEvent('event2')
      await trackEvent('event3')
      
      const events = await getEvents()
      events.forEach(event => {
        expect(event.sessionId).toBeDefined()
        expect(typeof event.sessionId).toBe('string')
      })
    })
  })

  describe('ANALYTICS_EVENTS constants', () => {
    it('should have all required event types', () => {
      expect(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED).toBe('upgrade_button_clicked')
      expect(ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN).toBe('upgrade_modal_shown')
      expect(ANALYTICS_EVENTS.UPGRADE_MODAL_DISMISSED).toBe('upgrade_modal_dismissed')
      expect(ANALYTICS_EVENTS.PAYMENT_PAGE_OPENED).toBe('payment_page_opened')
      expect(ANALYTICS_EVENTS.PAYMENT_COMPLETED).toBe('payment_completed')
      expect(ANALYTICS_EVENTS.SUBSCRIPTION_STARTED).toBe('subscription_started')
      expect(ANALYTICS_EVENTS.SUBSCRIPTION_CANCELED).toBe('subscription_canceled')
      expect(ANALYTICS_EVENTS.SUBSCRIPTION_REACTIVATED).toBe('subscription_reactivated')
    })
  })
})
