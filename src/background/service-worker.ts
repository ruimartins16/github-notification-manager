// Background service worker for GitHub Notification Manager
// Handles: notification fetching, alarms, badge updates, OAuth polling

import { AuthService } from '../utils/auth-service'
import { NotificationService, NOTIFICATIONS_STORAGE_KEY } from '../utils/notification-service'
import { BadgeService } from '../utils/badge-service'
import type { GitHubNotification } from '../types/github'

console.log('GitHub Notification Manager: Background service worker loaded')

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
  const alarm = await chrome.alarms.get(FETCH_ALARM_NAME)
  if (!alarm) {
    console.log('Recreating notification fetch alarm on startup')
    chrome.alarms.create(FETCH_ALARM_NAME, {
      delayInMinutes: 1,
      periodInMinutes: 1,
    })
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

// Handle alarms for background notification fetching
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === FETCH_ALARM_NAME) {
    console.log('Background fetch alarm triggered')
    await fetchNotificationsInBackground()
  }
  
  // TODO: Handle snooze wake-up in GNM-008
})

/**
 * Fetch notifications in background (called by alarm)
 * Only fetches if user is authenticated
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
    
    // Badge will be updated automatically by storage listener
  } catch (error) {
    console.error('Background fetch failed:', error)
    // Don't throw - we'll retry on next alarm
  }
}

// Service worker will hibernate when idle and wake up for:
// - chrome.alarms (notification fetching)
// - chrome.storage.onChanged (badge updates)
// - chrome.runtime.onMessage (auth polling, messages from popup)
// No keep-alive needed - Chrome handles lifecycle automatically

export {}
