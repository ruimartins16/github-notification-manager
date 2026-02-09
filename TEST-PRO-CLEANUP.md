# Testing Pro Downgrade Cleanup

## How to Test Pro Downgrade Cleanup

### Method 1: Simulate Downgrade (Recommended)

1. **Set yourself as Pro user:**
   ```js
   // In browser console (popup page)
   localStorage.setItem('gnm-pro-cache', JSON.stringify({
     isPro: true,
     plan: 'Pro',
     timestamp: Date.now()
   }))
   ```

2. **Create test data (multiple rules):**
   - Open Settings → Auto-Archive Rules
   - Create 2-3 auto-archive rules
   - The rules should be visible in the UI

3. **Verify data exists:**
   ```js
   // In browser console
   chrome.storage.local.get('notifications', (result) => {
     const data = JSON.parse(result.notifications)
     console.log('Auto-archive rules:', data.state.autoArchiveRules)
     console.log('Rule count:', data.state.autoArchiveRules.length)
   })
   ```

4. **Trigger downgrade:**
   ```js
   // In browser console
   localStorage.setItem('gnm-pro-cache', JSON.stringify({
     isPro: false,
     plan: null,
     timestamp: Date.now()
   }))
   
   // Force refresh Pro status
   await chrome.storage.local.set({ status_changed: true })
   ```

5. **Reload the popup** (click extension icon again)

6. **Check console logs:**
   - Look for: `[useProStatus] 🔽 Downgrade detected (Pro → Free), triggering cleanup`
   - Look for: `[ProCleanup] 🧹 Starting Pro-tier data cleanup`
   - Look for: `[ProCleanup] ✂️ Trimmed auto-archive rules from X to 1`

7. **Verify cleanup worked:**
   ```js
   // In browser console
   chrome.storage.local.get('notifications', (result) => {
     const data = JSON.parse(result.notifications)
     console.log('Rules after cleanup:', data.state.autoArchiveRules.length)
     // Should be 1 (the most recent rule)
   })
   ```

8. **Check UI:**
   - Go to Settings → Auto-Archive Rules
   - You should only see 1 rule (the most recent one)

---

### Method 2: Manual Cleanup Trigger

If automatic cleanup doesn't work, you can trigger it manually:

```js
// In browser console (popup page)
// Note: This requires importing the cleanup function, which may not work in console
// Better to use Method 1 above

// Alternative: Manually clean the data
chrome.storage.local.get('notifications', (result) => {
  const data = JSON.parse(result.notifications)
  
  // Keep only 1 rule (most recent)
  if (data.state.autoArchiveRules.length > 1) {
    const sortedRules = [...data.state.autoArchiveRules].sort((a, b) => {
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
    data.state.autoArchiveRules = sortedRules.slice(0, 1)
  }
  
  // Clear snoozed notifications
  data.state.snoozedNotifications = []
  
  // Save back
  chrome.storage.local.set({ 
    notifications: JSON.stringify(data) 
  }, () => {
    console.log('Manual cleanup complete!')
    // Reload popup to see changes
  })
})
```

---

### Expected Behavior

**When downgrading from Pro to Free:**
1. ✅ Only 1 auto-archive rule remains (most recent)
2. ✅ All snoozed notifications are cleared
3. ✅ Console logs show cleanup process
4. ✅ UI updates to show only 1 rule

**Console Log Sequence:**
```
[useProStatus] 🔄 Fetching user (forceRefresh: true)
[useProStatus] Restored previous Pro status from cache: true
[useProStatus] ✅ User fetched - isPro: false, plan: none
[useProStatus] Previous Pro status: true, Current Pro status: false
[useProStatus] 🔽 Downgrade detected (Pro → Free), triggering cleanup
[ProCleanup] 🧹 Starting Pro-tier data cleanup for free tier
[ProCleanup] Storage key: notifications
[ProCleanup] Current state: {autoArchiveRulesCount: 3, snoozedNotificationsCount: 0}
[ProCleanup] ✂️ Trimmed auto-archive rules from 3 to 1
[ProCleanup] ✅ Pro-tier data cleanup completed successfully
[useProStatus] ✅ Pro-tier data cleanup completed
```

---

### Troubleshooting

**If cleanup doesn't run:**

1. **Check if previousProStatus was set:**
   ```js
   // Should see "Restored previous Pro status from cache: true"
   ```

2. **Check localStorage cache:**
   ```js
   console.log(localStorage.getItem('gnm-pro-cache'))
   ```

3. **Force clear all caches and retry:**
   ```js
   localStorage.removeItem('gnm-pro-cache')
   await chrome.storage.local.remove(['extpay_user_cache', 'status_changed'])
   // Then retry Method 1 from step 1
   ```

4. **Check if rules exist:**
   ```js
   chrome.storage.local.get('notifications', (result) => {
     console.log('Full storage:', result)
   })
   ```

5. **Enable verbose logging:**
   - Open DevTools Console
   - Look for `[useProStatus]` and `[ProCleanup]` logs
   - All steps should be logged

---

### Quick Reset Script

To reset everything and start fresh:

```js
// Clear all Pro-related data
localStorage.removeItem('gnm-pro-cache')
await chrome.storage.local.remove([
  'extpay_user_cache',
  'status_changed',
  'payment_pending',
  'extpay_payment_pending',
  'extpay_login_pending'
])

console.log('✅ Reset complete! Reload popup to start fresh.')
```
