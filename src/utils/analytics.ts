/**
 * Analytics Service
 * 
 * Privacy-first local analytics for tracking user behavior and conversion metrics.
 * All events are stored locally in chrome.storage.local and never sent to external services.
 * 
 * @module analytics
 */

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
  /** Event name (e.g., "upgrade_button_clicked") */
  event: string
  /** Optional event properties/metadata */
  properties?: Record<string, unknown>
  /** Unix timestamp in milliseconds */
  timestamp: number
  /** Session ID for grouping related events */
  sessionId?: string
}

/**
 * Upgrade flow event names
 */
export const ANALYTICS_EVENTS = {
  // Upgrade button clicks
  UPGRADE_BUTTON_CLICKED: 'upgrade_button_clicked',
  
  // Modal interactions
  UPGRADE_MODAL_SHOWN: 'upgrade_modal_shown',
  UPGRADE_MODAL_DISMISSED: 'upgrade_modal_dismissed',
  
  // Payment flow
  PAYMENT_PAGE_OPENED: 'payment_page_opened',
  PAYMENT_COMPLETED: 'payment_completed',
  
  // Subscription lifecycle
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  SUBSCRIPTION_REACTIVATED: 'subscription_reactivated',
} as const

const ANALYTICS_KEY = 'analytics_events'
const SESSION_KEY = 'analytics_session_id'
const MAX_EVENTS = 1000 // Keep last 1000 events to prevent unbounded growth

/**
 * Generate or retrieve current session ID
 * Session expires after 30 minutes of inactivity
 */
async function getSessionId(): Promise<string> {
  const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  
  try {
    const result = await chrome.storage.local.get([SESSION_KEY, `${SESSION_KEY}_timestamp`])
    const existingSessionId = result[SESSION_KEY] as string | undefined
    const lastActivity = result[`${SESSION_KEY}_timestamp`] as number | undefined
    
    const now = Date.now()
    
    // Reuse session if it exists and hasn't expired
    if (existingSessionId && lastActivity && (now - lastActivity) < SESSION_TIMEOUT) {
      // Update last activity timestamp
      await chrome.storage.local.set({ [`${SESSION_KEY}_timestamp`]: now })
      return existingSessionId
    }
    
    // Create new session
    const newSessionId = `session_${now}_${Math.random().toString(36).substr(2, 9)}`
    await chrome.storage.local.set({
      [SESSION_KEY]: newSessionId,
      [`${SESSION_KEY}_timestamp`]: now,
    })
    
    return newSessionId
  } catch (error) {
    console.error('[Analytics] Failed to get/create session ID:', error)
    // Fallback to timestamp-based session ID
    return `session_${Date.now()}`
  }
}

/**
 * Track an analytics event
 * 
 * @param event - Event name (use ANALYTICS_EVENTS constants)
 * @param properties - Optional event properties/metadata
 * 
 * @example
 * ```typescript
 * trackEvent(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED, { location: 'header' })
 * trackEvent(ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN, { feature: 'snooze' })
 * trackEvent(ANALYTICS_EVENTS.PAYMENT_PAGE_OPENED)
 * ```
 */
export async function trackEvent(
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  try {
    const sessionId = await getSessionId()
    
    const newEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now(),
      sessionId,
    }
    
    // Retrieve existing events
    const result = await chrome.storage.local.get(ANALYTICS_KEY)
    const existingEvents = (result[ANALYTICS_KEY] as AnalyticsEvent[]) || []
    
    // Add new event and keep only the last MAX_EVENTS
    const updatedEvents = [...existingEvents, newEvent].slice(-MAX_EVENTS)
    
    // Save back to storage
    await chrome.storage.local.set({ [ANALYTICS_KEY]: updatedEvents })
    
    // Log for debugging (only in development)
    if (import.meta.env.DEV) {
      console.log('[Analytics]', event, properties)
    }
  } catch (error) {
    // Silent fail - don't break user experience for analytics
    console.error('[Analytics] Failed to track event:', error)
  }
}

/**
 * Get all stored analytics events
 * 
 * @returns Array of all analytics events
 */
export async function getEvents(): Promise<AnalyticsEvent[]> {
  try {
    const result = await chrome.storage.local.get(ANALYTICS_KEY)
    return (result[ANALYTICS_KEY] as AnalyticsEvent[]) || []
  } catch (error) {
    console.error('[Analytics] Failed to get events:', error)
    return []
  }
}

/**
 * Get events filtered by event name
 * 
 * @param eventName - Event name to filter by
 * @returns Filtered array of events
 */
export async function getEventsByName(eventName: string): Promise<AnalyticsEvent[]> {
  const events = await getEvents()
  return events.filter(e => e.event === eventName)
}

/**
 * Get events within a time range
 * 
 * @param startTime - Start timestamp (inclusive)
 * @param endTime - End timestamp (inclusive)
 * @returns Filtered array of events
 */
export async function getEventsByTimeRange(
  startTime: number,
  endTime: number
): Promise<AnalyticsEvent[]> {
  const events = await getEvents()
  return events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime)
}

/**
 * Get events for a specific session
 * 
 * @param sessionId - Session ID to filter by
 * @returns Filtered array of events
 */
export async function getEventsBySession(sessionId: string): Promise<AnalyticsEvent[]> {
  const events = await getEvents()
  return events.filter(e => e.sessionId === sessionId)
}

/**
 * Export all events as JSON string
 * Useful for debugging or manual analysis
 * 
 * @returns JSON string of all events
 */
export async function exportEvents(): Promise<string> {
  const events = await getEvents()
  return JSON.stringify(events, null, 2)
}

/**
 * Calculate conversion rate from upgrade modal shown to payment completed
 * 
 * @returns Conversion rate as a percentage (0-100)
 */
export async function calculateConversionRate(): Promise<number> {
  const events = await getEvents()
  
  const modalShownCount = events.filter(
    e => e.event === ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN
  ).length
  
  const paymentCompletedCount = events.filter(
    e => e.event === ANALYTICS_EVENTS.PAYMENT_COMPLETED
  ).length
  
  if (modalShownCount === 0) {
    return 0
  }
  
  return (paymentCompletedCount / modalShownCount) * 100
}

/**
 * Get analytics summary statistics
 * 
 * @returns Summary object with counts and conversion metrics
 */
export async function getAnalyticsSummary(): Promise<{
  totalEvents: number
  upgradeButtonClicks: number
  modalShown: number
  modalDismissed: number
  paymentPageOpened: number
  paymentCompleted: number
  conversionRate: number
  uniqueSessions: number
}> {
  const events = await getEvents()
  
  const upgradeButtonClicks = events.filter(
    e => e.event === ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED
  ).length
  
  const modalShown = events.filter(
    e => e.event === ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN
  ).length
  
  const modalDismissed = events.filter(
    e => e.event === ANALYTICS_EVENTS.UPGRADE_MODAL_DISMISSED
  ).length
  
  const paymentPageOpened = events.filter(
    e => e.event === ANALYTICS_EVENTS.PAYMENT_PAGE_OPENED
  ).length
  
  const paymentCompleted = events.filter(
    e => e.event === ANALYTICS_EVENTS.PAYMENT_COMPLETED
  ).length
  
  const uniqueSessions = new Set(events.map(e => e.sessionId).filter(Boolean)).size
  
  const conversionRate = await calculateConversionRate()
  
  return {
    totalEvents: events.length,
    upgradeButtonClicks,
    modalShown,
    modalDismissed,
    paymentPageOpened,
    paymentCompleted,
    conversionRate,
    uniqueSessions,
  }
}

/**
 * Clear all analytics events
 * Useful for testing or privacy compliance
 */
export async function clearEvents(): Promise<void> {
  try {
    await chrome.storage.local.remove(ANALYTICS_KEY)
    console.log('[Analytics] Events cleared')
  } catch (error) {
    console.error('[Analytics] Failed to clear events:', error)
  }
}

/**
 * Clear session data
 */
export async function clearSession(): Promise<void> {
  try {
    await chrome.storage.local.remove([SESSION_KEY, `${SESSION_KEY}_timestamp`])
  } catch (error) {
    console.error('[Analytics] Failed to clear session:', error)
  }
}
