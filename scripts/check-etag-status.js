// Diagnostic script to check ETag cache status
// Run this in the browser console (popup or service worker)

(async function checkETagStatus() {
  console.log('=== ETag Cache Status Check ===\n')
  
  // Get all storage keys
  const allStorage = await chrome.storage.local.get(null)
  
  // Find ETag keys
  const etagKeys = Object.keys(allStorage).filter(key => key.startsWith('etag:'))
  
  console.log('📦 Total storage keys:', Object.keys(allStorage).length)
  console.log('🏷️  ETag cache entries:', etagKeys.length)
  
  if (etagKeys.length === 0) {
    console.log('\n❌ No ETags found in cache')
    console.log('   This means either:')
    console.log('   1. No API requests have been made yet')
    console.log('   2. The plugin is not storing ETags correctly')
    console.log('\n   Expected after first fetch:')
    console.log('   • etag:https://api.github.com/notifications')
  } else {
    console.log('\n✅ Found ETag entries:\n')
    
    for (const key of etagKeys) {
      const entry = allStorage[key]
      const url = key.replace('etag:', '')
      const age = Date.now() - entry.timestamp
      const ageMinutes = Math.floor(age / 1000 / 60)
      const ageSeconds = Math.floor(age / 1000) % 60
      
      console.log(`📍 URL: ${url}`)
      console.log(`   ETag: ${entry.etag?.substring(0, 30)}...`)
      console.log(`   Last-Modified: ${entry.lastModified || 'N/A'}`)
      console.log(`   Cached: ${ageMinutes}m ${ageSeconds}s ago`)
      console.log(`   Expires: ${7 - Math.floor(age / 1000 / 60 / 60 / 24)} days remaining\n`)
    }
  }
  
  // Check Zustand notifications
  const zustand = allStorage['zustand-notifications']
  if (zustand) {
    const parsed = JSON.parse(zustand)
    const notifCount = parsed?.state?.notifications?.length || 0
    console.log('📬 Cached notifications in Zustand:', notifCount)
  } else {
    console.log('📬 No cached notifications in Zustand')
  }
  
  console.log('\n=== End Status Check ===')
})()
