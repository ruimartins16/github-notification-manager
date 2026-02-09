# Testing Guide - Critical Notification Staleness Fix

## 🚨 What Was Fixed

**Critical Bug:** Extension was showing stale notifications (same 9 from yesterday) despite having 13 new notifications on GitHub.

**Root Cause:** Background worker writing to `'notifications'` storage key while Zustand was reading from `'zustand-notifications'` storage key. This created a split-brain scenario where fresh data never reached the UI.

**Solution:** Unified storage architecture - single source of truth using `'zustand-notifications'` for everything.

---

## 🧪 Testing the Fix

### Prerequisites

```bash
# 1. Build the extension with the fix
npm run build

# 2. Load extension in Chrome
# chrome://extensions → Developer mode → Load unpacked → select dist/
```

---

### Test 1: Fresh Notifications Appear ✅

**Goal:** Verify popup shows current GitHub notifications

**Steps:**
1. Clear storage to start fresh:
   - Open extension popup
   - Open DevTools (right-click popup → Inspect)
   - Console: `chrome.storage.local.clear(() => console.log('cleared'))`
   - Reload extension: chrome://extensions → reload icon

2. Open popup again
   - Should prompt for GitHub login if needed
   - Complete OAuth flow
   - Wait for notifications to load

3. Check notification count matches GitHub
   - Go to https://github.com/notifications
   - Count unread notifications
   - Compare with popup count
   - **Expected:** Counts should match ✅

4. Check specific notifications
   - Note the first 3 notification titles on GitHub
   - Check they appear in popup
   - **Expected:** Same notifications visible ✅

---

### Test 2: Background Refresh Works ✅

**Goal:** Verify background worker updates notifications every minute

**Steps:**
1. Open extension popup, note current notifications
2. On GitHub (in browser tab):
   - Create a new issue on any repo you have access to
   - This creates a notification
3. Close popup (important!)
4. Wait 60 seconds (background fetch interval)
5. Check badge count on extension icon
   - **Expected:** Badge increments by 1 ✅
6. Open popup
   - **Expected:** New notification appears in list ✅

**Debugging if it fails:**
```javascript
// In popup DevTools console
chrome.storage.local.get('zustand-notifications', (r) => {
  const data = JSON.parse(r['zustand-notifications'])
  console.log('Notifications in storage:', data.state.notifications.length)
  console.log('Last fetched:', new Date(data.state.lastFetched))
})

// Check background worker logs
// chrome://extensions → Service worker (inspect)
// Should see logs like:
// "Background fetch alarm triggered"
// "Background fetch complete: X notifications"
// "Background fetch: updated Zustand storage with X notifications"
```

---

### Test 3: Badge Updates Correctly ✅

**Goal:** Verify badge shows correct count

**Steps:**
1. Open popup, count notifications: `N`
2. Check extension icon badge: should show `N`
3. Mark one notification as done in popup
4. Check badge: should show `N-1`
5. Close popup, wait 60 seconds
6. Create new notification on GitHub
7. Wait another 60 seconds
8. Check badge: should show `N` (one marked done, one added)

**Expected:** Badge always reflects current notification count ✅

---

### Test 4: Mark as Done on GitHub Syncs ✅

**Goal:** Verify changes made on GitHub website sync to extension

**Steps:**
1. Open popup, note a specific notification
2. On GitHub.com, find that notification
3. Click "Done" on GitHub website
4. Close popup, wait 60 seconds (background fetch)
5. Open popup again
6. **Expected:** That notification is gone from list ✅

---

### Test 5: Storage Inspection ✅

**Goal:** Verify unified storage architecture is working

**Steps:**
1. Open DevTools → Application → Storage → chrome.storage.local
2. Find key: `zustand-notifications`
3. Expand and check structure:
   ```json
   {
     "state": {
       "notifications": [...],  // Should have N items
       "lastFetched": 1234567890,
       "snoozedNotifications": [...],
       "archivedNotifications": [...],
       "autoArchiveRules": [...]
     },
     "version": 0
   }
   ```
4. Check `notifications` key (old key):
   - Should either not exist or be stale
   - This key is no longer used ✅

**Expected:** Only `zustand-notifications` contains fresh data ✅

---

### Test 6: Multiple Popup Opens ✅

**Goal:** Verify data persists and stays fresh

**Steps:**
1. Open popup → Note notification count → Close
2. Wait < 5 minutes
3. Open popup again → Should show same count (cached)
4. Wait > 5 minutes  
5. Open popup again → Should refetch fresh data
6. **Expected:** Data is cached for 5 min, then refetches ✅

---

### Test 7: Rapid Open/Close ✅

**Goal:** Verify no race conditions

**Steps:**
1. Open popup → close immediately
2. Repeat 5-10 times rapidly
3. Open and leave open
4. **Expected:** Notifications load correctly, no errors ✅

**Check console for errors:**
- No "Failed to parse Zustand storage" errors
- No race condition warnings

---

## 🔍 What to Look For

### ✅ Success Indicators

- Notification count matches GitHub.com
- Badge updates within ~60 seconds of changes
- Notifications marked as done on GitHub disappear from popup
- No console errors about storage parsing
- `zustand-notifications` in storage has fresh `lastFetched` timestamp

### ❌ Failure Indicators

- Notification count stuck at old value
- Badge doesn't update after 2-3 minutes
- Console errors: "Failed to parse Zustand storage"
- `lastFetched` timestamp is more than 2 minutes old
- Old `notifications` key still being written to

---

## 🐛 Debugging Commands

### Check Storage State

```javascript
// In popup DevTools console
chrome.storage.local.get(['zustand-notifications'], (r) => {
  const data = JSON.parse(r['zustand-notifications'])
  console.log('=== STORAGE STATE ===')
  console.log('Notifications:', data.state.notifications?.length || 0)
  console.log('Snoozed:', data.state.snoozedNotifications?.length || 0)
  console.log('Archived:', data.state.archivedNotifications?.length || 0)
  console.log('Rules:', data.state.autoArchiveRules?.length || 0)
  console.log('Last Fetched:', new Date(data.state.lastFetched))
  console.log('Minutes ago:', Math.round((Date.now() - data.state.lastFetched) / 60000))
})
```

### Force Background Fetch

```javascript
// In service worker DevTools console (chrome://extensions → service worker inspect)
// This is internal, but you can trigger alarm manually:
chrome.alarms.create('fetch-notifications', { when: Date.now() + 1000 })
console.log('Background fetch triggered in 1 second')
```

### Check Old Storage Key

```javascript
// Verify old key is not being used
chrome.storage.local.get(['notifications'], (r) => {
  if (r.notifications) {
    console.warn('⚠️ Old "notifications" key still exists!')
    console.log('Old data:', r.notifications)
  } else {
    console.log('✅ Old key removed/not in use')
  }
})
```

### Clear Everything and Test Fresh

```javascript
// Complete reset
chrome.storage.local.clear(() => {
  localStorage.clear()
  console.log('✅ All storage cleared')
  location.reload()
})
```

---

## 📊 Expected Behavior Summary

| Scenario | Before Fix | After Fix |
|----------|------------|-----------|
| Open popup | Shows 9 stale notifications | Shows 13 current notifications ✅ |
| Badge count | Wrong (stuck at 9) | Correct (13) ✅ |
| Background refresh | Writes to wrong key, popup never sees it | Writes to Zustand key, popup shows fresh data ✅ |
| Mark as done on GitHub | Doesn't sync | Syncs within 60 seconds ✅ |
| Storage inspection | Data split between 2 keys | Single source of truth ✅ |

---

## 🎯 Critical Success Criteria

For this fix to be considered successful, **ALL** of the following must be true:

1. ✅ Notification count matches GitHub.com (test 1)
2. ✅ Background fetch updates popup data (test 2)
3. ✅ Badge reflects current count (test 3)
4. ✅ Changes on GitHub.com sync to extension (test 4)
5. ✅ Only `zustand-notifications` key is actively used (test 5)
6. ✅ No console errors during normal usage (all tests)
7. ✅ Build succeeds with no TypeScript errors ✅ (already confirmed)

---

## 🚀 If All Tests Pass

**You're ready to proceed with:**
1. ✅ Take Chrome Web Store screenshots
2. ✅ Enable GitHub Pages for privacy policy
3. ✅ Submit to Chrome Web Store

**The critical blocking bug is FIXED!** 🎉

---

## 📞 If Tests Fail

**Debugging Steps:**
1. Check service worker console for errors
2. Verify `ZUSTAND_STORAGE_KEY = 'zustand-notifications'` in service-worker.ts
3. Ensure `fetchNotificationsInBackground()` writes to Zustand key
4. Check badge listener parses Zustand format correctly
5. Verify broken storage sync listener was removed from notification-store.ts

**Report:**
- Which test failed
- Console error messages
- Storage state (use debugging commands above)
- Background worker logs

---

## 🎓 What Changed Technically

**Before (Broken):**
```
Background Worker → writes to 'notifications'
                         ↓ (no sync!)
Popup → reads from 'zustand-notifications' (stale)
```

**After (Fixed):**
```
Background Worker → writes to 'zustand-notifications'
                         ↓ (same key!)
Popup → reads from 'zustand-notifications' (fresh!)
```

**Key architectural change:** Single source of truth eliminates split-brain scenario.

---

Good luck testing! This fix should resolve the critical staleness issue. 🚀
