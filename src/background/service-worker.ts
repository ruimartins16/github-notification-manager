// Background service worker for GitHub Notification Manager
// Handles: notification fetching, alarms, badge updates, OAuth polling, payment management

// ExtPay MUST be initialized first, before any other imports or code
import ExtPay from 'extpay'

// Initialize ExtPay with extension ID from environment
const EXTENSION_ID = import.meta.env.VITE_EXTPAY_EXTENSION_ID || 'github-notification-manager'
export const extpay = ExtPay(EXTENSION_ID)

// Start ExtPay background service immediately
extpay.startBackground()
console.log('[ExtPay] Background service initialized with extension ID:', EXTENSION_ID)

// Now import other services
import { AuthService } from '../utils/auth-service'
import { NotificationService } from '../utils/notification-service'
import { BadgeService } from '../utils/badge-service'
import { getActiveNotifications } from '../utils/notification-filter'

// Storage key for Zustand persisted state (single source of truth)
const ZUSTAND_STORAGE_KEY = 'zustand-notifications'
import { applyRules } from '../utils/rule-matcher'
import { AutoArchiveRule } from '../types/rules'
import type { GitHubNotification } from '../types/github'
import { extPayService } from '../utils/extpay-service'
import { validateLicense, updateCacheOnPayment } from '../utils/license-validator'
import { trackEvent, ANALYTICS_EVENTS } from '../utils/analytics'

console.log('GitHub Notification Manager: Background service worker loaded')

// Preload user license status on startup (fire and forget)
extPayService.preloadUser().catch(console.error)

// Listen for payment events and update cache
extPayService.onPaid(async (user) => {
  console.log('[ExtPay] User paid! Updating cache...', user.plan)
  await updateCacheOnPayment(user)
  
  // Set payment pending flag for popup to detect on next open
  await chrome.storage.local.set({ payment_pending: true })
  console.log('[ExtPay] Payment pending flag set')
  
  // Notify popup of Pro status change (if open)
  chrome.runtime.sendMessage({
    type: 'PRO_STATUS_CHANGED',
    isPro: user.isPro,
    plan: user.plan,
  }).catch(() => {
    // Popup not open - payment_pending flag will handle it
    console.log('[ExtPay] Popup not open, payment_pending flag will notify on next open')
  })
})

// Track active polling
let isPolling = false

// Alarm name for periodic notification fetching
const FETCH_ALARM_NAME = 'fetch-notifications'

// Alarm name for periodic subscription status check
const SUB_STATUS_ALARM_NAME = 'check-subscription-status'

// Storage key for settings (chrome.storage.sync, managed by Zustand persist)
const SETTINGS_STORAGE_KEY = 'gnm-settings'

/**
 * Read the user's refreshInterval setting from chrome.storage.sync.
 * Returns the interval in minutes, clamped to Chrome's minimum (1 minute).
 * Falls back to 1 minute if the setting is missing or unreadable.
 */
async function getRefreshIntervalMinutes(): Promise<number> {
  try {
    const result = await chrome.storage.sync.get(SETTINGS_STORAGE_KEY)
    if (result[SETTINGS_STORAGE_KEY]) {
      const parsed = JSON.parse(result[SETTINGS_STORAGE_KEY])
      const intervalSeconds: number = parsed?.state?.refreshInterval
      if (typeof intervalSeconds === 'number' && intervalSeconds > 0) {
        // Chrome alarms minimum period is 1 minute in production
        return Math.max(1, intervalSeconds / 60)
      }
    }
  } catch (error) {
    console.error('[Background] Failed to read refreshInterval setting:', error)
  }
  return 1 // Default: 1 minute
}

/**
 * Create or recreate the notification fetch alarm with the user's configured interval.
 */
async function createFetchAlarm() {
  const periodInMinutes = await getRefreshIntervalMinutes()
  console.log(`[Background] Creating fetch alarm with interval: ${periodInMinutes} minute(s)`)
  await chrome.alarms.clear(FETCH_ALARM_NAME)
  chrome.alarms.create(FETCH_ALARM_NAME, {
    delayInMinutes: periodInMinutes,
    periodInMinutes,
  })
}

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed:', details.reason)
  
  if (details.reason === 'install' || details.reason === 'update') {
    // Set initial badge
    chrome.action.setBadgeBackgroundColor({ color: '#0969da' })
    chrome.action.setBadgeText({ text: '' })

    // Create/recreate alarm for periodic notification fetching
    // Uses the user's configured refreshInterval (defaults to 1 minute)
    // Alarms are cleared on extension update, so we recreate them
    createFetchAlarm()
    
    // Create alarm for periodic subscription status check (every 60 minutes)
    // This ensures we catch subscription changes like payment failures or cancellations
    chrome.alarms.create(SUB_STATUS_ALARM_NAME, {
      delayInMinutes: 5, // First check after 5 minutes
      periodInMinutes: 60, // Then every hour
    })
    
    console.log('GitHub Notification Manager initialized with background polling')
    
    // Trigger an immediate background fetch so the user doesn't have to wait
    // for the first alarm to fire (up to refreshInterval minutes).
    // Fire-and-forget: don't block the listener on the fetch result.
    fetchNotificationsInBackground().catch((error) => {
      console.error('[Background] Immediate fetch on', details.reason, 'failed:', error)
    })
  }
})

// Ensure alarm exists on browser startup
chrome.runtime.onStartup.addListener(async () => {
  // Preload license on startup
  validateLicense().catch(console.error)

  // Recreate notification fetch alarm if missing (uses user's configured interval)
  const alarm = await chrome.alarms.get(FETCH_ALARM_NAME)
  if (!alarm) {
    console.log('Recreating notification fetch alarm on startup')
    await createFetchAlarm()
  }
  
  // Recreate subscription status alarm if missing
  const subAlarm = await chrome.alarms.get(SUB_STATUS_ALARM_NAME)
  if (!subAlarm) {
    console.log('Recreating subscription status check alarm on startup')
    chrome.alarms.create(SUB_STATUS_ALARM_NAME, {
      delayInMinutes: 5,
      periodInMinutes: 60,
    })
  }
  
  // Recover snooze alarms from persisted state
  try {
    const result = await chrome.storage.local.get(ZUSTAND_STORAGE_KEY)
    if (result[ZUSTAND_STORAGE_KEY]) {
      const parsed = JSON.parse(result[ZUSTAND_STORAGE_KEY])
      const snoozedNotifications = parsed.state?.snoozedNotifications || []
      
      console.log('Recovering snooze alarms:', snoozedNotifications.length)
      
      // Recreate alarms for snoozed notifications
      for (const snoozed of snoozedNotifications) {
        const { alarmName, wakeTime, notification } = snoozed
        
        if (wakeTime > Date.now()) {
          // Alarm hasn't fired yet, recreate it
          await chrome.alarms.create(alarmName, { when: wakeTime })
          console.log('Recreated alarm:', alarmName)
        } else {
          // Alarm should have fired already, wake it up immediately
          console.log('Alarm expired, queuing immediate wake-up:', notification.id)
          await queuePendingWakeUp(notification.id)
        }
      }
    }
  } catch (error) {
    console.error('Failed to recover snooze alarms:', error)
  }
})

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_DEVICE_POLLING') {
    // Start polling for device authorization in background
    if (isPolling) {
      sendResponse({ success: false, error: 'Already polling' })
      return true
    }

    isPolling = true

    AuthService.completeDeviceAuth()
      .then((token) => {
        isPolling = false
        
        // Notify popup that auth is complete
        chrome.runtime.sendMessage({ 
          type: 'AUTH_COMPLETE', 
          success: true,
          token: token 
        }).catch(() => {
          // Popup not open, token already saved to storage
        })
      })
      .catch((error) => {
        isPolling = false
        
        // Notify popup of error
        chrome.runtime.sendMessage({ 
          type: 'AUTH_COMPLETE', 
          success: false,
          error: error.message 
        }).catch(() => {
          // Popup not open, error logged
        })
      })

    sendResponse({ success: true })
    return true // Keep message channel open for async response
  }

  if (message.type === 'CHECK_POLLING_STATUS') {
    sendResponse({ isPolling })
    return true
  }

  return false // Not a message we handle
})

// Handle extension icon click
chrome.action.onClicked.addListener(() => {
  console.log('Extension icon clicked')
})

// Listen for storage changes to update badge.
// The badge always reflects the LAST write (no debounce dropping the trailing
// update — a stale badge was one symptom of the old architecture).
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[ZUSTAND_STORAGE_KEY]) {
    // Parse Zustand's persisted format
    const newValue = changes[ZUSTAND_STORAGE_KEY].newValue

    if (newValue && typeof newValue === 'string') {
      try {
        const parsed = JSON.parse(newValue)
        const notifications: GitHubNotification[] = parsed.state?.notifications || []

        // The store persists the RAW GitHub list; apply the same read-time
        // filtering the popup uses so badge count === Active tab count.
        const badgeNotifications = getActiveNotifications(notifications, {
          dismissedNotifications: parsed.state?.dismissedNotifications || [],
          archivedNotifications: parsed.state?.archivedNotifications || [],
          snoozedNotifications: parsed.state?.snoozedNotifications || [],
        })

        console.log('Badge update:', notifications.length, 'raw,', badgeNotifications.length, 'active')
        BadgeService.updateBadge(badgeNotifications)
      } catch (error) {
        console.error('Failed to parse Zustand storage for badge update:', error)
      }
    } else {
      // Notifications cleared
      BadgeService.clearBadge()
    }
  }
})

// Listen for settings changes (chrome.storage.sync) to update the fetch alarm interval
// and re-fetch when the participating filter changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes[SETTINGS_STORAGE_KEY]) {
    // Handle async operations in a self-invoking function
    const settingsChange = changes[SETTINGS_STORAGE_KEY]
    ;(async () => {
      try {
        const newValue = settingsChange.newValue
        const oldValue = settingsChange.oldValue
        
        if (newValue && typeof newValue === 'string') {
          const newParsed = JSON.parse(newValue)
          const oldParsed = oldValue ? JSON.parse(oldValue) : null
          
          const newInterval = newParsed?.state?.refreshInterval
          const oldInterval = oldParsed?.state?.refreshInterval
          
          if (newInterval !== oldInterval && typeof newInterval === 'number') {
            console.log(`[Background] refreshInterval changed: ${oldInterval}s -> ${newInterval}s, recreating alarm`)
            await createFetchAlarm()
          }

          // When the participating filter changes, re-fetch immediately so the
          // list reflects the new setting without waiting for the next alarm.
          const newParticipating = newParsed?.state?.showParticipatingOnly
          const oldParticipating = oldParsed?.state?.showParticipatingOnly

          if (newParticipating !== oldParticipating && typeof newParticipating === 'boolean') {
            console.log(`[Background] showParticipatingOnly changed: ${oldParticipating} -> ${newParticipating}, refetching`)
            await fetchNotificationsInBackground()
          }
        }
      } catch (error) {
        console.error('[Background] Failed to process settings change:', error)
      }
    })()
  }
})

// Handle alarms for background notification fetching, snooze wake-ups, and subscription checks
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === FETCH_ALARM_NAME) {
    console.log('Background fetch alarm triggered')
    await fetchNotificationsInBackground()
  } else if (alarm.name === SUB_STATUS_ALARM_NAME) {
    console.log('Subscription status check alarm triggered')
    await checkSubscriptionStatus()
  } else if (alarm.name.startsWith('snooze-')) {
    // Handle snooze wake-up
    const notificationId = alarm.name.replace('snooze-', '')
    console.log('Snooze alarm triggered for notification:', notificationId)
    await handleSnoozeWakeUp(notificationId)
  }
})

/**
 * Fetch notifications in background (called by alarm)
 * Only fetches if user is authenticated
 * Applies auto-archive rules after fetching
 *
 * Every fetch is a plain, uncached request — the result always mirrors what
 * GitHub's notifications page shows right now.
 */
async function fetchNotificationsInBackground() {
  try {
    // Check if user is authenticated
    const token = await AuthService.getStoredToken()

    if (!token) {
      console.log('No token found, skipping background fetch')
      return
    }

    console.log('Fetching notifications in background...')

    const notifications = await NotificationService.fetchNotifications(token)
    console.log('Background fetch complete:', notifications.length, 'notifications')

    // Write the raw list into Zustand's storage key (single source of truth).
    // Local state (dismissed/archived/snoozed) is applied at READ time by the
    // store and the badge listener — the raw list is never filtered on write.
    //
    // IMPORTANT: We re-read storage immediately before writing to prevent race conditions.
    // If the popup wrote dismissedNotifications/archivedNotifications/snoozedNotifications
    // between our fetch start and now, we must preserve those changes (not overwrite with stale data).
    const result = await chrome.storage.local.get(ZUSTAND_STORAGE_KEY)
    const existingData = result[ZUSTAND_STORAGE_KEY]
    const parsed = existingData ? JSON.parse(existingData) : { state: {}, version: 0 }

    // Only overwrite notifications and lastFetched — preserve all other state fields
    // (dismissedNotifications, archivedNotifications, snoozedNotifications, autoArchiveRules, etc.)
    // that may have been modified by the popup between our fetch and this write.
    parsed.state = {
      ...parsed.state,
      notifications: notifications,
      lastFetched: Date.now(),
    }

    await chrome.storage.local.set({
      [ZUSTAND_STORAGE_KEY]: JSON.stringify(parsed),
    })

    console.log('Background fetch: updated Zustand storage with', notifications.length, 'notifications (raw)')
    
    // Try to notify UI to apply rules (if open)
    const sent = await chrome.runtime.sendMessage({
      type: 'APPLY_AUTO_ARCHIVE_RULES',
    }).catch(() => null)
    
    if (!sent) {
      // UI not open, apply rules in background
      await applyAutoArchiveRulesInBackground(notifications)
    }
    
    // Badge will be updated automatically by storage listener
  } catch (error) {
    console.error('Background fetch failed:', error)
    // Don't throw - we'll retry on next alarm
  }
}

/**
 * Check subscription status in background (called by alarm)
 * Refreshes user's Pro status and notifies UI of any changes
 * Helps catch subscription changes like payment failures or cancellations
 */
async function checkSubscriptionStatus() {
  try {
    console.log('[SubStatus] Checking subscription status...')
    
    // Get previous status to detect changes
    const previousUser = extPayService.getCachedUser()
    
    // Force refresh to get latest status from ExtensionPay
    const user = await validateLicense(true)
    
    console.log('[SubStatus] Status check complete:', {
      isPro: user.isPro,
      status: user.subscriptionStatus,
      cancelAt: user.subscriptionCancelAt
    })
    
    // Track subscription status changes (only if we have a previous status to compare)
    if (previousUser) {
      const statusChanged = previousUser.subscriptionStatus !== user.subscriptionStatus
      const proStatusChanged = previousUser.isPro !== user.isPro
      
      if (statusChanged || proStatusChanged) {
        console.log('[SubStatus] Status changed:', previousUser.subscriptionStatus, '->', user.subscriptionStatus)
        
        // Set status changed flag for popup to detect on next open
        await chrome.storage.local.set({ status_changed: true })
        console.log('[SubStatus] Status changed flag set')
        
        if (user.subscriptionStatus === 'canceled') {
          trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_CANCELED, {
            previousStatus: previousUser.subscriptionStatus,
            cancelAt: user.subscriptionCancelAt?.toISOString(),
          }).catch(error => {
            console.error('[SubStatus] Failed to track cancellation:', error)
          })
        } else if (previousUser.subscriptionStatus === 'canceled' && user.subscriptionStatus === 'active') {
          trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_REACTIVATED, {
            plan: user.plan?.nickname || 'unknown',
            interval: user.plan?.interval,
          }).catch(error => {
            console.error('[SubStatus] Failed to track reactivation:', error)
          })
        }
      }
    } else {
      // First check - no previous status to compare, log current status
      console.log('[SubStatus] First status check:', {
        isPro: user.isPro,
        status: user.subscriptionStatus,
      })
    }
    
    // Detect status changes that need user attention
    const needsAttention = user.isPro && (
      user.subscriptionStatus === 'past_due' || 
      user.subscriptionStatus === 'canceled'
    )
    
    // Notify popup of status (if open)
    chrome.runtime.sendMessage({
      type: 'PRO_STATUS_CHANGED',
      isPro: user.isPro,
      status: user.subscriptionStatus,
      needsAttention,
    }).catch(() => {
      // Popup not open - status_changed flag will handle it
      console.log('[SubStatus] Popup not open, status_changed flag will notify on next open')
    })
  } catch (error) {
    console.error('[SubStatus] Failed to check subscription status:', error)
    // Don't throw - we'll retry on next alarm
  }
}

/**
 * Apply auto-archive rules to notifications in background (only when UI is closed)
 * Uses a lock-free approach to avoid race conditions with the UI
 */
async function applyAutoArchiveRulesInBackground(notifications: GitHubNotification[]) {
  try {
    // Get auto-archive rules from storage
    const result = await chrome.storage.local.get(ZUSTAND_STORAGE_KEY)
    if (!result[ZUSTAND_STORAGE_KEY]) {
      return
    }

    const parsed = JSON.parse(result[ZUSTAND_STORAGE_KEY])
    const rules: AutoArchiveRule[] = parsed.state?.autoArchiveRules || []

    if (rules.length === 0) {
      return
    }

    console.log('Applying', rules.length, 'auto-archive rules in background')

    // Apply rules to the ACTIVE list only (raw minus dismissed/archived/snoozed)
    // so already-handled notifications are never re-archived.
    const activeNotifications = getActiveNotifications(notifications, {
      dismissedNotifications: parsed.state?.dismissedNotifications || [],
      archivedNotifications: parsed.state?.archivedNotifications || [],
      snoozedNotifications: parsed.state?.snoozedNotifications || [],
    })
    const { toArchive, ruleMatches } = applyRules(activeNotifications, rules)

    if (toArchive.length === 0) {
      console.log('No notifications to archive')
      return
    }

    console.log('Auto-archiving', toArchive.length, 'notifications')

    // Update rule statistics
    const updatedRules = rules.map((rule) => {
      const matches = ruleMatches.get(rule.id) || []
      if (matches.length > 0) {
        return {
          ...rule,
          archivedCount: rule.archivedCount + matches.length,
        }
      }
      return rule
    })

    // IMPORTANT: Read storage again to ensure we have the latest state
    // This prevents overwriting changes made by the UI between reads
    const latestResult = await chrome.storage.local.get(ZUSTAND_STORAGE_KEY)
    const latestParsed = latestResult[ZUSTAND_STORAGE_KEY]
      ? JSON.parse(latestResult[ZUSTAND_STORAGE_KEY])
      : parsed

    // Append to the archive and update rule stats. The raw notifications list
    // is left untouched — archived IDs are hidden at read time.
    const latestArchived: GitHubNotification[] = latestParsed.state?.archivedNotifications || []
    const alreadyArchived = new Set(latestArchived.map((n: GitHubNotification) => n.id))
    latestParsed.state = {
      ...latestParsed.state,
      archivedNotifications: [
        ...latestArchived,
        ...toArchive.filter(n => !alreadyArchived.has(n.id)),
      ],
      autoArchiveRules: updatedRules,
    }

    // Write atomically to Zustand storage only (single source of truth)
    await chrome.storage.local.set({
      [ZUSTAND_STORAGE_KEY]: JSON.stringify(latestParsed),
    })

    console.log('Auto-archive complete:', toArchive.length, 'archived')
  } catch (error) {
    console.error('Failed to apply auto-archive rules:', error)
  }
}

/**
 * Handle snooze wake-up (called when snooze alarm fires)
 * Moves snoozed notification back to active notifications
 */
async function handleSnoozeWakeUp(notificationId: string) {
  try {
    console.log('Snooze alarm fired for notification:', notificationId)
    
    // Try to notify popup/store if running
    const sent = await chrome.runtime.sendMessage({
      type: 'SNOOZE_WAKEUP',
      notificationId,
    }).catch(() => {
      // Popup not open, queue wake-up for next time it opens
      return null
    })
    
    if (!sent) {
      // Store pending wake-up to be processed when popup opens
      await queuePendingWakeUp(notificationId)
    }
  } catch (error) {
    console.error('Failed to handle snooze wake-up:', error)
  }
}

/**
 * Queue a pending wake-up for when the popup next opens
 */
async function queuePendingWakeUp(notificationId: string) {
  try {
    const result = await chrome.storage.local.get('pending-wakeups')
    const pending: string[] = result['pending-wakeups'] || []
    
    if (!pending.includes(notificationId)) {
      pending.push(notificationId)
      await chrome.storage.local.set({ 'pending-wakeups': pending })
      console.log('Queued pending wake-up:', notificationId)
    }
  } catch (error) {
    console.error('Failed to queue pending wake-up:', error)
  }
}

/**
 * Process any pending wake-ups (called when popup opens)
 */
export async function processPendingWakeUps() {
  try {
    const result = await chrome.storage.local.get('pending-wakeups')
    const pending: string[] = result['pending-wakeups'] || []
    
    if (pending.length > 0) {
      console.log('Processing pending wake-ups:', pending.length)
      
      // Send wake-up messages for all pending
      for (const notificationId of pending) {
        chrome.runtime.sendMessage({
          type: 'SNOOZE_WAKEUP',
          notificationId,
        }).catch(() => {
          console.warn('Failed to send wake-up for:', notificationId)
        })
      }
      
      // Clear pending wake-ups
      await chrome.storage.local.set({ 'pending-wakeups': [] })
    }
  } catch (error) {
    console.error('Failed to process pending wake-ups:', error)
  }
}

// Service worker will hibernate when idle and wake up for:
// - chrome.alarms (notification fetching)
// - chrome.storage.onChanged (badge updates)
// - chrome.runtime.onMessage (auth polling, messages from popup)
// No keep-alive needed - Chrome handles lifecycle automatically

export {}
