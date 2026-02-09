# FIXED TEST SCRIPTS - Use These!

The storage key was wrong! It's `'zustand-notifications'` not `'notifications'`.

## Script 1: Check Storage (CORRECTED)

```js
chrome.storage.local.get('zustand-notifications', (result) => {
  console.log('=== STORAGE CHECK ===')
  
  if (!result['zustand-notifications']) {
    console.log('❌ No data found')
    return
  }
  
  const data = result['zustand-notifications']
  console.log('Type:', typeof data)
  
  const state = data.state || data
  const rules = state.autoArchiveRules || []
  
  console.log('✅ Found', rules.length, 'rules')
  rules.forEach((rule, i) => {
    console.log(`  ${i+1}. ${rule.repository} - ${rule.type}: ${rule.value}`)
  })
})
```

## Script 2: Set as Pro

```js
localStorage.setItem('gnm-pro-cache', JSON.stringify({
  isPro: true,
  plan: 'Pro',
  timestamp: Date.now()
}))
console.log('✅ Set as Pro - RELOAD popup and create 2-3 rules')
```

## Script 3: Verify Rules Created

```js
chrome.storage.local.get('zustand-notifications', (result) => {
  const data = result['zustand-notifications']
  const state = data.state || data
  const rules = state.autoArchiveRules || []
  
  console.log('=== VERIFICATION ===')
  console.log(`Found ${rules.length} rules`)
  
  if (rules.length >= 2) {
    console.log('✅ Ready for downgrade!')
    console.log('Run Script 4 next')
  } else {
    console.log('⚠️ Create more rules first')
  }
})
```

## Script 4: Trigger Downgrade

```js
console.log('=== TRIGGERING DOWNGRADE ===')

localStorage.setItem('gnm-pro-cache', JSON.stringify({
  isPro: false,
  plan: null,
  timestamp: Date.now()
}))

chrome.storage.local.set({ status_changed: true }, () => {
  console.log('✅ Downgrade set!')
  console.log('🔄 CLOSE and REOPEN popup now')
  console.log('Watch console for cleanup logs')
})
```

## Script 5: Check Result

```js
chrome.storage.local.get('zustand-notifications', (result) => {
  const data = result['zustand-notifications']
  const state = data.state || data
  const rules = state.autoArchiveRules || []
  
  console.log('=== CLEANUP RESULT ===')
  console.log('Rules remaining:', rules.length)
  
  if (rules.length === 1) {
    console.log('✅ SUCCESS! Cleanup worked!')
    console.log('Remaining rule:', rules[0].repository)
  } else {
    console.log('❌ Expected 1 rule, got:', rules.length)
  }
})
```

## Quick All-in-One Test

Copy this entire block and watch it run automatically:

```js
(async () => {
  console.log('=== AUTO TEST SEQUENCE ===\n')
  
  // Step 1: Check current state
  console.log('Step 1: Checking current state...')
  const check1 = await chrome.storage.local.get('zustand-notifications')
  const data1 = check1['zustand-notifications']
  if (data1) {
    const state1 = data1.state || data1
    console.log('  Current rules:', state1.autoArchiveRules?.length || 0)
  }
  
  // Step 2: Set as Pro
  console.log('\nStep 2: Setting as Pro user...')
  localStorage.setItem('gnm-pro-cache', JSON.stringify({
    isPro: true,
    plan: 'Pro',
    timestamp: Date.now()
  }))
  console.log('  ✅ Done')
  console.log('\n📝 NOW:')
  console.log('  1. RELOAD the popup')
  console.log('  2. Create 2-3 auto-archive rules')
  console.log('  3. Come back and paste "TEST STEP 3" below')
  
})()
```

After creating rules, paste this:

```js
// TEST STEP 3
(async () => {
  console.log('\n=== TEST STEP 3: Verify & Downgrade ===')
  
  // Verify rules
  const check = await chrome.storage.local.get('zustand-notifications')
  const data = check['zustand-notifications']
  const state = data.state || data
  const rules = state.autoArchiveRules || []
  
  console.log('Rules found:', rules.length)
  rules.forEach((r, i) => console.log(`  ${i+1}. ${r.repository}`))
  
  if (rules.length < 2) {
    console.log('⚠️ Need at least 2 rules. Create more!')
    return
  }
  
  // Trigger downgrade
  console.log('\nTriggering downgrade...')
  localStorage.setItem('gnm-pro-cache', JSON.stringify({
    isPro: false,
    plan: null,
    timestamp: Date.now()
  }))
  await chrome.storage.local.set({ status_changed: true })
  
  console.log('✅ Downgrade triggered!')
  console.log('\n📝 NOW:')
  console.log('  1. CLOSE popup completely')
  console.log('  2. REOPEN popup')
  console.log('  3. Watch console logs!')
  console.log('  4. Paste "TEST STEP 4" to check result')
})()
```

After reopening popup, paste this:

```js
// TEST STEP 4
chrome.storage.local.get('zustand-notifications', (result) => {
  const data = result['zustand-notifications']
  const state = data.state || data
  const rules = state.autoArchiveRules || []
  
  console.log('\n=== FINAL RESULT ===')
  console.log('Rules after cleanup:', rules.length)
  
  if (rules.length === 1) {
    console.log('✅✅✅ SUCCESS! Cleanup worked perfectly!')
    console.log('Remaining rule:', rules[0].repository)
  } else {
    console.log('❌ FAILED - Expected 1, got:', rules.length)
  }
})
```
