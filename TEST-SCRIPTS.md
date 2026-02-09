# Pro Downgrade Cleanup - Test Scripts

Copy and paste these scripts into the browser console (DevTools) one at a time.

## Script 1: Check Current Storage Format

This checks how the data is stored (string vs object):

```js
chrome.storage.local.get('notifications', (result) => {
  console.log('=== STORAGE FORMAT CHECK ===')
  console.log('Raw result:', result)
  console.log('Value type:', typeof result.notifications)
  
  if (!result.notifications) {
    console.log('❌ No notifications data in storage')
    return
  }
  
  if (typeof result.notifications === 'string') {
    console.log('✅ Data is STRING (Zustand persist format)')
    const parsed = JSON.parse(result.notifications)
    console.log('Has state wrapper?', !!parsed.state)
    console.log('Rule count:', parsed.state?.autoArchiveRules?.length || parsed.autoArchiveRules?.length || 0)
  } else if (typeof result.notifications === 'object') {
    console.log('✅ Data is OBJECT (direct format)')
    console.log('Has state wrapper?', !!result.notifications.state)
    console.log('Rule count:', result.notifications.state?.autoArchiveRules?.length || result.notifications.autoArchiveRules?.length || 0)
  }
})
```

## Script 2: View All Rules

```js
chrome.storage.local.get('notifications', (result) => {
  if (!result.notifications) {
    console.log('❌ No data')
    return
  }
  
  const data = typeof result.notifications === 'string' 
    ? JSON.parse(result.notifications) 
    : result.notifications
  
  const state = data.state || data
  const rules = state.autoArchiveRules || []
  
  console.log('=== AUTO-ARCHIVE RULES ===')
  console.log(`Total: ${rules.length} rules`)
  rules.forEach((rule, i) => {
    console.log(`\nRule ${i+1}:`)
    console.log('  Repository:', rule.repository)
    console.log('  Type:', rule.type)
    console.log('  Value:', rule.value)
    console.log('  Enabled:', rule.enabled)
    console.log('  Created:', new Date(rule.createdAt || 0).toLocaleString())
  })
})
```

## Script 3: Set as Pro User

```js
console.log('=== SETTING AS PRO USER ===')
localStorage.setItem('gnm-pro-cache', JSON.stringify({
  isPro: true,
  plan: 'Pro',
  timestamp: Date.now()
}))
console.log('✅ Set as Pro user')
console.log('📝 Now:')
console.log('  1. Reload the popup')
console.log('  2. Go to Settings → Auto-Archive Rules')
console.log('  3. Create 2-3 rules')
console.log('  4. Come back and run Script 2 to verify')
```

## Script 4: Verify Rules Created

```js
chrome.storage.local.get('notifications', (result) => {
  if (!result.notifications) {
    console.log('❌ No data in storage')
    return
  }
  
  const data = typeof result.notifications === 'string' 
    ? JSON.parse(result.notifications) 
    : result.notifications
  
  const state = data.state || data
  const rules = state.autoArchiveRules || []
  
  console.log('=== VERIFICATION ===')
  console.log(`✅ Found ${rules.length} rules`)
  
  if (rules.length >= 2) {
    console.log('✅ Ready for downgrade test!')
    console.log('📝 Run Script 5 next')
  } else {
    console.log('⚠️ Need at least 2 rules. Create more rules first.')
  }
})
```

## Script 5: Trigger Downgrade

```js
console.log('=== TRIGGERING DOWNGRADE ===')

// Set as free user
localStorage.setItem('gnm-pro-cache', JSON.stringify({
  isPro: false,
  plan: null,
  timestamp: Date.now()
}))

// Trigger status refresh
chrome.storage.local.set({ status_changed: true }, () => {
  console.log('✅ Downgrade triggered!')
  console.log('📝 Now:')
  console.log('  1. CLOSE the popup completely')
  console.log('  2. REOPEN the popup')
  console.log('  3. Open DevTools console')
  console.log('  4. Watch for cleanup logs')
  console.log('  5. Run Script 6 to verify cleanup')
})
```

## Script 6: Check Cleanup Result

```js
chrome.storage.local.get('notifications', (result) => {
  if (!result.notifications) {
    console.log('❌ No data')
    return
  }
  
  const data = typeof result.notifications === 'string' 
    ? JSON.parse(result.notifications) 
    : result.notifications
  
  const state = data.state || data
  const rules = state.autoArchiveRules || []
  const snoozed = state.snoozedNotifications || []
  
  console.log('=== CLEANUP RESULT ===')
  console.log('Rules after cleanup:', rules.length)
  console.log('Snoozed after cleanup:', snoozed.length)
  
  if (rules.length === 1) {
    console.log('✅ SUCCESS! Only 1 rule remains (as expected)')
    console.log('Remaining rule:', rules[0].repository, rules[0].type)
  } else {
    console.log('❌ FAILED! Expected 1 rule, got:', rules.length)
  }
  
  if (snoozed.length === 0) {
    console.log('✅ SUCCESS! All snoozed notifications cleared')
  } else {
    console.log('⚠️ Still have snoozed notifications:', snoozed.length)
  }
})
```

## Script 7: Reset Everything

If you need to start over:

```js
console.log('=== RESETTING EVERYTHING ===')

// Clear Pro cache
localStorage.removeItem('gnm-pro-cache')

// Clear ExtPay cache
chrome.storage.local.remove([
  'extpay_user_cache',
  'status_changed',
  'payment_pending',
  'extpay_payment_pending',
  'extpay_login_pending'
], () => {
  console.log('✅ All caches cleared')
  console.log('📝 Reload popup to start fresh')
})
```

## Expected Console Logs When Downgrade Happens

When you reopen the popup after Script 5, you should see these logs:

```
[useProStatus] 🔄 Fetching user (forceRefresh: true)
[useProStatus] Restored previous Pro status from cache: true
[useProStatus] ✅ User fetched - isPro: false, plan: none
[useProStatus] Previous Pro status: true, Current Pro status: false
[useProStatus] 🔽 Downgrade detected (Pro → Free), triggering cleanup
[ProCleanup] 🧹 Starting Pro-tier data cleanup for free tier
[ProCleanup] Storage key: notifications
[ProCleanup] Storage result: {notifications: {...}}
[ProCleanup] Store data type: object (or string)
[ProCleanup] Data is already an object, using directly (or "Data is string, parsing as JSON...")
[ProCleanup] Parsed store data successfully
[ProCleanup] Current state: {autoArchiveRulesCount: 3, snoozedNotificationsCount: 0}
[ProCleanup] ✂️ Trimmed auto-archive rules from 3 to 1
[ProCleanup] Kept rule: {repository: '...', type: '...', ...}
[ProCleanup] No snoozed notifications to clear
[ProCleanup] Saving updated data to storage...
[ProCleanup] Saving as type: object (or string)
[ProCleanup] ✅ Pro-tier data cleanup completed successfully
[ProCleanup] Broadcasted storage update message
[useProStatus] ✅ Pro-tier data cleanup completed
```

## Troubleshooting

### If you don't see cleanup logs:

1. Make sure you **closed and reopened** the popup (not just refreshed)
2. Check if `status_changed` flag was set: 
   ```js
   chrome.storage.local.get('status_changed', (r) => console.log(r))
   ```
3. Check if previous Pro status was cached:
   ```js
   console.log(localStorage.getItem('gnm-pro-cache'))
   ```

### If cleanup doesn't work:

1. Check for errors in console
2. Run Script 1 to verify data format
3. Try manually triggering cleanup (see below)

### Manual cleanup trigger:

```js
chrome.storage.local.get('notifications', async (result) => {
  const data = typeof result.notifications === 'string' 
    ? JSON.parse(result.notifications) 
    : result.notifications
  
  const state = data.state || data
  
  // Keep only 1 rule (most recent)
  if (state.autoArchiveRules?.length > 1) {
    const sorted = [...state.autoArchiveRules].sort((a, b) => 
      (b.createdAt || 0) - (a.createdAt || 0)
    )
    state.autoArchiveRules = sorted.slice(0, 1)
  }
  
  // Clear snoozed
  state.snoozedNotifications = []
  
  // Save back
  const updated = data.state ? { ...data, state } : state
  const final = typeof result.notifications === 'string' 
    ? JSON.stringify(updated) 
    : updated
  
  chrome.storage.local.set({ notifications: final }, () => {
    console.log('✅ Manual cleanup done!')
  })
})
```
