/**
 * Tests for Payment and Subscription Tracking Integration
 * 
 * Tests tracking of payment events and subscription status changes through
 * ExtPayService and background service worker.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ANALYTICS_EVENTS, getEvents, getEventsByName, clearEvents } from '../analytics'

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
  runtime: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
  alarms: {
    create: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  action: {
    setBadgeBackgroundColor: vi.fn(),
    setBadgeText: vi.fn(),
  },
} as any

describe('Payment and Subscription Tracking', () => {
  beforeEach(async () => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    vi.clearAllMocks()
    await clearEvents()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Payment Completion Tracking', () => {
    it('should track payment_completed event with plan details', async () => {
      // Import analytics to track directly (simulating what extpay-service does)
      const { trackEvent } = await import('../analytics')
      
      // Simulate payment completion with plan details
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED, {
        plan: 'Pro Monthly',
        interval: 'month',
        amount: 5,
        currency: 'usd',
      })
      
      const events = await getEventsByName(ANALYTICS_EVENTS.PAYMENT_COMPLETED)
      expect(events).toHaveLength(1)
      expect(events[0]?.properties).toEqual({
        plan: 'Pro Monthly',
        interval: 'month',
        amount: 5,
        currency: 'usd',
      })
    })

    it('should track payment_completed for annual plan', async () => {
      const { trackEvent } = await import('../analytics')
      
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED, {
        plan: 'Pro Annual',
        interval: 'year',
        amount: 50,
        currency: 'usd',
      })
      
      const events = await getEventsByName(ANALYTICS_EVENTS.PAYMENT_COMPLETED)
      expect(events).toHaveLength(1)
      expect(events[0]?.properties?.interval).toBe('year')
      expect(events[0]?.properties?.amount).toBe(50)
    })

    it('should track payment_completed for lifetime plan', async () => {
      const { trackEvent } = await import('../analytics')
      
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED, {
        plan: 'Lifetime',
        interval: 'once',
        amount: 100,
        currency: 'usd',
      })
      
      const events = await getEventsByName(ANALYTICS_EVENTS.PAYMENT_COMPLETED)
      expect(events).toHaveLength(1)
      expect(events[0]?.properties?.interval).toBe('once')
    })
  })

  describe('Subscription Started Tracking', () => {
    it('should track subscription_started event', async () => {
      const { trackEvent } = await import('../analytics')
      
      await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_STARTED, {
        plan: 'Pro Monthly',
        interval: 'month',
      })
      
      const events = await getEventsByName(ANALYTICS_EVENTS.SUBSCRIPTION_STARTED)
      expect(events).toHaveLength(1)
      expect(events[0]?.properties?.plan).toBe('Pro Monthly')
    })

    it('should track subscription_started after payment', async () => {
      const { trackEvent } = await import('../analytics')
      
      // Simulate payment flow: payment completed -> subscription started
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED, {
        plan: 'Pro Monthly',
        interval: 'month',
        amount: 5,
        currency: 'usd',
      })
      
      await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_STARTED, {
        plan: 'Pro Monthly',
        interval: 'month',
      })
      
      const allEvents = await getEvents()
      expect(allEvents).toHaveLength(2)
      expect(allEvents[0]?.event).toBe(ANALYTICS_EVENTS.PAYMENT_COMPLETED)
      expect(allEvents[1]?.event).toBe(ANALYTICS_EVENTS.SUBSCRIPTION_STARTED)
    })
  })

  describe('Subscription Cancellation Tracking', () => {
    it('should track subscription_canceled event', async () => {
      const { trackEvent } = await import('../analytics')
      
      await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_CANCELED, {
        previousStatus: 'active',
        cancelAt: new Date('2025-12-31').toISOString(),
      })
      
      const events = await getEventsByName(ANALYTICS_EVENTS.SUBSCRIPTION_CANCELED)
      expect(events).toHaveLength(1)
      expect(events[0]?.properties?.previousStatus).toBe('active')
      expect(events[0]?.properties?.cancelAt).toBeDefined()
    })

    it('should track cancellation from past_due status', async () => {
      const { trackEvent } = await import('../analytics')
      
      await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_CANCELED, {
        previousStatus: 'past_due',
        cancelAt: new Date().toISOString(),
      })
      
      const events = await getEventsByName(ANALYTICS_EVENTS.SUBSCRIPTION_CANCELED)
      expect(events).toHaveLength(1)
      expect(events[0]?.properties?.previousStatus).toBe('past_due')
    })
  })

  describe('Subscription Reactivation Tracking', () => {
    it('should track subscription_reactivated event', async () => {
      const { trackEvent } = await import('../analytics')
      
      await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_REACTIVATED, {
        plan: 'Pro Monthly',
        interval: 'month',
      })
      
      const events = await getEventsByName(ANALYTICS_EVENTS.SUBSCRIPTION_REACTIVATED)
      expect(events).toHaveLength(1)
      expect(events[0]?.properties?.plan).toBe('Pro Monthly')
    })

    it('should track reactivation after cancellation', async () => {
      const { trackEvent } = await import('../analytics')
      
      // Simulate: active -> canceled -> reactivated
      await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_STARTED, {
        plan: 'Pro Monthly',
        interval: 'month',
      })
      
      await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_CANCELED, {
        previousStatus: 'active',
        cancelAt: new Date().toISOString(),
      })
      
      await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_REACTIVATED, {
        plan: 'Pro Monthly',
        interval: 'month',
      })
      
      const allEvents = await getEvents()
      expect(allEvents).toHaveLength(3)
      expect(allEvents[0]?.event).toBe(ANALYTICS_EVENTS.SUBSCRIPTION_STARTED)
      expect(allEvents[1]?.event).toBe(ANALYTICS_EVENTS.SUBSCRIPTION_CANCELED)
      expect(allEvents[2]?.event).toBe(ANALYTICS_EVENTS.SUBSCRIPTION_REACTIVATED)
    })
  })

  describe('Complete User Journey Tracking', () => {
    it('should track complete upgrade journey', async () => {
      const { trackEvent } = await import('../analytics')
      
      // Complete user flow: button -> modal -> payment page -> completed -> subscription
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED, { location: 'header' })
      await trackEvent(ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN)
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_PAGE_OPENED)
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED, {
        plan: 'Pro Monthly',
        interval: 'month',
        amount: 5,
        currency: 'usd',
      })
      await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_STARTED, {
        plan: 'Pro Monthly',
        interval: 'month',
      })
      
      const allEvents = await getEvents()
      expect(allEvents).toHaveLength(5)
      
      // Verify order of events
      expect(allEvents[0]?.event).toBe(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED)
      expect(allEvents[1]?.event).toBe(ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN)
      expect(allEvents[2]?.event).toBe(ANALYTICS_EVENTS.PAYMENT_PAGE_OPENED)
      expect(allEvents[3]?.event).toBe(ANALYTICS_EVENTS.PAYMENT_COMPLETED)
      expect(allEvents[4]?.event).toBe(ANALYTICS_EVENTS.SUBSCRIPTION_STARTED)
    })

    it('should track subscription lifecycle', async () => {
      const { trackEvent } = await import('../analytics')
      
      // Complete lifecycle: start -> cancel -> reactivate
      await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_STARTED, {
        plan: 'Pro Annual',
        interval: 'year',
      })
      
      // Some time passes... user cancels
      await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_CANCELED, {
        previousStatus: 'active',
        cancelAt: new Date('2025-12-31').toISOString(),
      })
      
      // User reactivates before end date
      await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_REACTIVATED, {
        plan: 'Pro Annual',
        interval: 'year',
      })
      
      const allEvents = await getEvents()
      expect(allEvents).toHaveLength(3)
      
      const starts = await getEventsByName(ANALYTICS_EVENTS.SUBSCRIPTION_STARTED)
      const cancels = await getEventsByName(ANALYTICS_EVENTS.SUBSCRIPTION_CANCELED)
      const reactivates = await getEventsByName(ANALYTICS_EVENTS.SUBSCRIPTION_REACTIVATED)
      
      expect(starts).toHaveLength(1)
      expect(cancels).toHaveLength(1)
      expect(reactivates).toHaveLength(1)
    })
  })

  describe('Conversion Rate Calculation with Payments', () => {
    it('should calculate conversion rate including payments', async () => {
      const { trackEvent, calculateConversionRate } = await import('../analytics')
      
      // 10 modal shows, 2 payments = 20% conversion
      for (let i = 0; i < 10; i++) {
        await trackEvent(ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN)
      }
      
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED, {
        plan: 'Pro Monthly',
        interval: 'month',
        amount: 5,
        currency: 'usd',
      })
      
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED, {
        plan: 'Pro Annual',
        interval: 'year',
        amount: 50,
        currency: 'usd',
      })
      
      const rate = await calculateConversionRate()
      expect(rate).toBe(20) // 2/10 = 20%
    })
  })

  describe('Error Handling', () => {
    it('should handle tracking errors gracefully', async () => {
      const { trackEvent } = await import('../analytics')
      
      // Mock storage.set to throw error
      vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('Storage error'))
      
      // Should not throw
      await expect(
        trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED, {
          plan: 'Pro Monthly',
          interval: 'month',
          amount: 5,
          currency: 'usd',
        })
      ).resolves.not.toThrow()
    })
  })

  describe('Payment Plan Variations', () => {
    it('should track multiple payment plan types', async () => {
      const { trackEvent } = await import('../analytics')
      
      // Track payments for different plans
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED, {
        plan: 'Pro Monthly',
        interval: 'month',
        amount: 5,
        currency: 'usd',
      })
      
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED, {
        plan: 'Pro Annual',
        interval: 'year',
        amount: 50,
        currency: 'usd',
      })
      
      await trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED, {
        plan: 'Lifetime',
        interval: 'once',
        amount: 100,
        currency: 'usd',
      })
      
      const payments = await getEventsByName(ANALYTICS_EVENTS.PAYMENT_COMPLETED)
      expect(payments).toHaveLength(3)
      
      const plans = payments.map(e => e.properties?.plan)
      expect(plans).toContain('Pro Monthly')
      expect(plans).toContain('Pro Annual')
      expect(plans).toContain('Lifetime')
    })
  })
})
