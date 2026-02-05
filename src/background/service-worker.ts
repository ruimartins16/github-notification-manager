// Background service worker for GitHub Notification Manager
// Handles: notification fetching, alarms, badge updates, OAuth polling

import { AuthService } from '../utils/auth-service'

console.log('GitHub Notification Manager: Background service worker loaded')

// Track active polling
let isPolling = false

// Initialize extension on install
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason)
  
  if (details.reason === 'install') {
    // Set initial badge
    chrome.action.setBadgeBackgroundColor({ color: '#0969da' })
    chrome.action.setBadgeText({ text: '' })
    
    console.log('GitHub Notification Manager initialized')
  }
})

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Service Worker] Message received:', message)

  if (message.type === 'START_DEVICE_POLLING') {
    // Start polling for device authorization in background
    if (isPolling) {
      console.log('[Service Worker] Already polling, ignoring duplicate request')
      sendResponse({ success: false, error: 'Already polling' })
      return true
    }

    isPolling = true
    console.log('[Service Worker] Starting device flow polling...')

    AuthService.completeDeviceAuth()
      .then((token) => {
        console.log('[Service Worker] ✅ Token received:', token.substring(0, 10) + '...')
        isPolling = false
        
        // Notify popup that auth is complete
        chrome.runtime.sendMessage({ 
          type: 'AUTH_COMPLETE', 
          success: true,
          token: token 
        }).catch(() => {
          console.log('[Service Worker] Popup not open, token saved to storage')
        })
      })
      .catch((error) => {
        console.error('[Service Worker] ❌ Polling failed:', error)
        isPolling = false
        
        // Notify popup of error
        chrome.runtime.sendMessage({ 
          type: 'AUTH_COMPLETE', 
          success: false,
          error: error.message 
        }).catch(() => {
          console.log('[Service Worker] Popup not open, error logged')
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

// Placeholder for future alarm handlers (for snooze functionality)
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm fired:', alarm.name)
  // TODO: Handle snooze wake-up in GNM-008
})

// Keep service worker alive
let keepAliveInterval: number | undefined

function keepAlive() {
  keepAliveInterval = setInterval(() => {
    // Ping to keep service worker active
  }, 20000) // Every 20 seconds
}

keepAlive()

// Clean up on shutdown
self.addEventListener('unload', () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
  }
})

export {}
