// Background service worker for GitHub Notification Manager
// Handles: notification fetching, alarms, badge updates

console.log('GitHub Notification Manager: Background service worker loaded')

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
