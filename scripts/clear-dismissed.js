// Utility script to clear dismissed notifications from chrome.storage.local
// Run this in the browser console (DevTools) of the extension popup

chrome.storage.local.get('zustand-notifications', (result) => {
  if (!result['zustand-notifications']) {
    console.log('❌ No Zustand storage found')
    return
  }
  
  const parsed = JSON.parse(result['zustand-notifications'])
  const dismissedCount = parsed.state.dismissedNotifications?.length || 0
  
  console.log(`📊 Current state:`)
  console.log(`  - Dismissed notifications: ${dismissedCount}`)
  console.log(`  - Notifications in store: ${parsed.state.notifications?.length || 0}`)
  
  if (dismissedCount === 0) {
    console.log('✅ No dismissed notifications to clear')
    return
  }
  
  // Clear the dismissed list
  parsed.state.dismissedNotifications = []
  
  chrome.storage.local.set(
    { 'zustand-notifications': JSON.stringify(parsed) },
    () => {
      console.log(`✅ Cleared ${dismissedCount} dismissed notifications`)
      console.log('🔄 Refresh the popup to see all notifications')
    }
  )
})
