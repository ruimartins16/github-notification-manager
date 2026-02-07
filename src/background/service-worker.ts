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
import { NotificationService, NOTIFICATIONS_STORAGE_KEY } from '../utils/notification-service'
import { BadgeService } from '../utils/badge-service'
import { applyRules } from '../utils/rule-matcher'
import { AutoArchiveRule } from '../types/rules'
import type { GitHubNotification } from '../types/github'
import { extPayService } from '../utils/extpay-service'
import { validateLicense, updateCacheOnPayment } from '../utils/license-validator'

console.log('GitHub Notification Manager: Background service worker loaded')

// Preload user license status on startup (fire and forget)
extPayService.preloadUser().catch(console.error)

// Listen for payment events and update cache
extPayService.onPaid(async (user) => {
  console.log('[ExtPay] User paid! Updating cache...', user.plan)
  await updateCacheOnPayment(user)
  
  // Notify popup of Pro status change (if open)
  chrome.runtime.sendMessage({
    type: 'PRO_STATUS_CHANGED',
    isPro: user.isPro,
    plan: user.plan,
  }).catch(() => {
    // Popup not open - that's okay
  })
})

// Track active polling
let isPolling = false

// Alarm name for periodic notification fetching
const FETCH_ALARM_NAME = 'fetch-notifications'

// Initialize extension on install or update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason)
  
  if (details.reason === 'install' || details.reason === 'update') {
    // Set initial badge
    chrome.action.setBadgeBackgroundColor({ color: '#0969da' })
    chrome.action.setBadgeText({ text: '' })
    
    // Create/recreate alarm for periodic notification fetching (every 1 minute)
    // Alarms are cleared on extension update, so we recreate them
    chrome.alarms.create(FETCH_ALARM_NAME, {
      delayInMinutes: 1,
      periodInMinutes: 1,
    })
    
    console.log('GitHub Notification Manager initialized with background polling')
  }
})

// Ensure alarm exists on browser startup
chrome.runtime.onStartup.addListener(async () => {
  // Preload license on startup
  validateLicense().catch(console.error)
  
  // Recreate notification fetch alarm if missing
  const alarm = await chrome.alarms.get(FETCH_ALARM_NAME)
  if (!alarm) {
    console.log('Recreating notification fetch alarm on startup')
    chrome.alarms.create(FETCH_ALARM_NAME, {
      delayInMinutes: 1,
      periodInMinutes: 1,
    })
  }
  
  // Recover snooze alarms from persisted state
  try {
    const result = await chrome.storage.local.get('zustand-notifications')
    if (result['zustand-notifications']) {
      const parsed = JSON.parse(result['zustand-notifications'])
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

// Listen for storage changes to update badge
// Debounced to prevent redundant updates when storage is written multiple times rapidly
let lastBadgeUpdateTimestamp = 0
const BADGE_UPDATE_DEBOUNCE_MS = 100

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[NOTIFICATIONS_STORAGE_KEY]) {
    // Debounce rapid updates (e.g., when background fetch writes immediately after popup)
    const now = Date.now()
    if (now - lastBadgeUpdateTimestamp < BADGE_UPDATE_DEBOUNCE_MS) {
      return
    }
    lastBadgeUpdateTimestamp = now

    const newNotifications = changes[NOTIFICATIONS_STORAGE_KEY].newValue as GitHubNotification[] | undefined
    
    if (newNotifications) {
      console.log('Notifications updated, refreshing badge:', newNotifications.length)
      BadgeService.updateBadge(newNotifications)
    } else {
      // Notifications cleared
      BadgeService.clearBadge()
    }
  }
})

// Handle alarms for background notification fetching and snooze wake-ups
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === FETCH_ALARM_NAME) {
    console.log('Background fetch alarm triggered')
    await fetchNotificationsInBackground()
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
    const notifications = await NotificationService.fetchAndStore(token)
    console.log('Background fetch complete:', notifications.length, 'notifications')
    
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
 * Apply auto-archive rules to notifications in background (only when UI is closed)
 * Uses a lock-free approach to avoid race conditions with the UI
 */
async function applyAutoArchiveRulesInBackground(notifications: GitHubNotification[]) {
  try {
    // Get auto-archive rules from storage
    const result = await chrome.storage.local.get('zustand-notifications')
    if (!result['zustand-notifications']) {
      return
    }

    const parsed = JSON.parse(result['zustand-notifications'])
    const rules: AutoArchiveRule[] = parsed.state?.autoArchiveRules || []

    if (rules.length === 0) {
      return
    }

    console.log('Applying', rules.length, 'auto-archive rules in background')

    // Apply rules
    const { toArchive, toKeep, ruleMatches } = applyRules(notifications, rules)

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

    // Get current archived notifications
    const archivedNotifications: GitHubNotification[] = parsed.state?.archivedNotifications || []

    // IMPORTANT: Read storage again to ensure we have the latest state
    // This prevents overwriting changes made by the UI between reads
    const latestResult = await chrome.storage.local.get('zustand-notifications')
    const latestParsed = latestResult['zustand-notifications'] 
      ? JSON.parse(latestResult['zustand-notifications'])
      : parsed

    // Update storage with filtered notifications and updated rules
    latestParsed.state = {
      ...latestParsed.state,
      notifications: toKeep,
      archivedNotifications: [...archivedNotifications, ...toArchive],
      autoArchiveRules: updatedRules,
    }

    // Write atomically - both keys in one operation
    await chrome.storage.local.set({
      'zustand-notifications': JSON.stringify(latestParsed),
      [NOTIFICATIONS_STORAGE_KEY]: toKeep,
    })

    console.log('Auto-archive complete:', toArchive.length, 'archived,', toKeep.length, 'kept')
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
