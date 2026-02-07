# End-to-End Payment Flow Testing Plan

**Story**: GNM-045 (5 SP)  
**Priority**: P0 (Must Have)  
**Dependencies**: All GNM-018 to GNM-044

This document provides a comprehensive test plan for validating the complete payment flow before Chrome Web Store launch.

## Test Environment Setup

### Prerequisites
- [ ] Extension built and loaded in Chrome (`npm run build` → Load unpacked)
- [ ] ExtensionPay configured in test mode
- [ ] GitHub account for testing
- [ ] Access to Chrome DevTools for debugging

### Test Mode Setup
ExtensionPay automatically uses test mode in development. Verify:
```javascript
// In src/utils/extpay-service.ts
const extpay = ExtPay('github-notification-manager')
console.log('ExtPay test mode:', extpay.test) // Should be true in dev
```

---

## Test Scenarios

### 1. Free User Experience

**Objective**: Verify free tier functionality and Pro feature gates.

#### 1.1 Fresh Install
- [ ] Install extension (load unpacked from `dist/`)
- [ ] Complete GitHub OAuth authentication
- [ ] Verify notifications load correctly
- [ ] Verify free features work:
  - [ ] View all notifications
  - [ ] Filter by type (All, Mentions, Reviews, Assigned)
  - [ ] Mark as read (single notification)
  - [ ] Mark all as done (Shift+D)
  - [ ] Archive notifications
  - [ ] Auto-refresh (30 min default)
  - [ ] Badge counter on extension icon

**Expected**: All free features work without restrictions.

#### 1.2 Pro Feature Gates
- [ ] Click snooze button → See Pro modal
- [ ] Press `s` key (snooze shortcut) → See Pro modal
- [ ] Try to create auto-archive rule → See Pro modal
- [ ] Press `j`/`k` keys (navigation) → See Pro modal
- [ ] Press `1`/`2`/`3`/`4` (filter shortcuts) → See Pro modal

**Expected**: All Pro features show upgrade modal with clear messaging.

#### 1.3 Pro Modal Content
Verify the upgrade modal displays:
- [ ] "Upgrade to Pro" heading
- [ ] Feature being gated (e.g., "Snooze notifications")
- [ ] Pricing: $3/month, $30 lifetime
- [ ] "Upgrade Now" button that opens payment page
- [ ] "Maybe Later" button to dismiss
- [ ] Analytics tracked: `upgrade_modal_shown` with location

**Expected**: Modal is clear, informative, and provides easy upgrade path.

#### 1.4 Payment Page Opening
- [ ] Click "Upgrade Now" in modal
- [ ] Verify ExtensionPay payment page opens in new tab
- [ ] Verify page shows test mode indicator
- [ ] Verify analytics tracked: `payment_page_opened`

**Expected**: Payment page opens correctly in test mode.

---

### 2. Upgrade Flow

**Objective**: Test complete subscription purchase flow.

#### 2.1 Monthly Subscription (Test Mode)
- [ ] Open payment page from upgrade modal
- [ ] Select "Monthly" plan ($3/month)
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Expiry: Any future date (e.g., 12/34)
- [ ] CVC: Any 3 digits (e.g., 123)
- [ ] Complete payment
- [ ] Verify redirect back to extension
- [ ] Verify success message appears
- [ ] Verify analytics tracked: `payment_completed`, `subscription_started`

**Expected**: Payment completes successfully, user is now Pro.

#### 2.2 Lifetime Purchase (Test Mode)
- [ ] Reset test (cancel subscription if needed)
- [ ] Open payment page
- [ ] Select "Lifetime" plan ($30)
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Complete payment
- [ ] Verify analytics tracked: `payment_completed` (no `subscription_started` for lifetime)

**Expected**: Lifetime purchase activates, no subscription renewal.

#### 2.3 Payment Errors
Test error handling:

**Declined Card**:
- [ ] Use test card: `4000 0000 0000 0002` (declined)
- [ ] Verify error message from Stripe
- [ ] Verify user remains on payment page
- [ ] Verify analytics: `payment_failed` tracked
- [ ] Verify can retry with valid card

**Insufficient Funds**:
- [ ] Use test card: `4000 0000 0000 9995`
- [ ] Verify error message
- [ ] Verify can retry

**Expected**: Errors are handled gracefully, user can retry.

---

### 3. Pro User Experience

**Objective**: Verify all Pro features work after upgrade.

#### 3.1 Pro Status Verification
After successful payment:
- [ ] Refresh extension popup
- [ ] Verify Pro badge appears in header (gold star ⭐)
- [ ] Go to Settings → Account
- [ ] Verify "Pro" badge in subscription section
- [ ] Verify email shown (if provided)
- [ ] Verify "Member since" date

**Expected**: Pro status is clearly indicated throughout UI.

#### 3.2 Snooze Feature
- [ ] Click snooze button on notification
- [ ] Verify snooze modal opens (no upgrade modal)
- [ ] Test quick snooze options:
  - [ ] 30 minutes
  - [ ] 1 hour
  - [ ] 3 hours
  - [ ] Tomorrow (9 AM)
  - [ ] Next week (Monday 9 AM)
- [ ] Test custom snooze:
  - [ ] Select specific date/time
  - [ ] Verify validation (can't snooze in past)
- [ ] Snooze a notification
- [ ] Verify it moves to "Snoozed" filter
- [ ] Verify analytics: `notification_snoozed` tracked

**Expected**: All snooze options work correctly, notifications are snoozed.

#### 3.3 Snooze Wake-Up
- [ ] Snooze notification for 1 minute
- [ ] Wait 1 minute
- [ ] Verify notification reappears in inbox
- [ ] Verify snooze label is removed

**Expected**: Snoozed notifications return at scheduled time.

#### 3.4 Auto-Archive Rules
- [ ] Go to Settings → Auto-Archive Rules
- [ ] Create rule: Archive all "Dependabot" notifications
  - [ ] Type: "Pull Request"
  - [ ] Author: "dependabot"
  - [ ] Action: "opened"
- [ ] Save rule
- [ ] Trigger rule (manually or wait for next Dependabot PR)
- [ ] Verify matching notifications are auto-archived

**Expected**: Custom rules work and auto-archive matching notifications.

#### 3.5 Keyboard Shortcuts
Test all Pro keyboard shortcuts:

**Navigation**:
- [ ] Press `j` → Moves to next notification
- [ ] Press `k` → Moves to previous notification
- [ ] Verify visual highlight follows selection

**Quick Actions**:
- [ ] Press `d` → Marks notification as done
- [ ] Press `a` → Archives notification
- [ ] Press `s` → Opens snooze modal
- [ ] Press `o` → Opens notification URL in new tab

**Filters**:
- [ ] Press `1` → Switches to "All" filter
- [ ] Press `2` → Switches to "Mentions" filter
- [ ] Press `3` → Switches to "Reviews" filter
- [ ] Press `4` → Switches to "Assigned" filter

**Bulk Actions**:
- [ ] Press `Shift+D` → Opens bulk mark as done modal
- [ ] Verify modal shows count of notifications
- [ ] Confirm → All visible notifications marked as done

**Expected**: All keyboard shortcuts work correctly for Pro users.

---

### 4. Subscription Management

**Objective**: Test subscription lifecycle and management.

#### 4.1 View Subscription Details
- [ ] Go to Settings → Account → Subscription
- [ ] Verify shows "Pro" badge
- [ ] Verify shows email (if provided)
- [ ] Verify shows "Member since" date
- [ ] Click "Manage Subscription" button
- [ ] Verify opens ExtensionPay management page

**Expected**: Subscription details are accurate and accessible.

#### 4.2 Subscription Status: Active
- [ ] Verify no warning banners appear
- [ ] Verify all Pro features work
- [ ] Verify SubscriptionStatus component returns null (no warnings)

**Expected**: Active subscriptions show no warnings.

#### 4.3 Subscription Status: Past Due
Simulate past due (in ExtensionPay test mode):
- [ ] Mark subscription as `past_due` in ExtensionPay dashboard
- [ ] Refresh extension
- [ ] Verify warning banner appears at top of Settings
- [ ] Verify banner says "Payment Failed"
- [ ] Verify "Update Payment Method" button present
- [ ] Click button → Opens payment update page
- [ ] Verify Pro features still work (grace period)

**Expected**: Warning shown, features still work, clear CTA to fix payment.

#### 4.4 Subscription Status: Canceled
Simulate canceled subscription:
- [ ] Cancel subscription in ExtensionPay dashboard
- [ ] Refresh extension
- [ ] Verify info banner appears
- [ ] Verify shows "ends on [date]"
- [ ] Verify shows days remaining
- [ ] Verify "Resubscribe" button present
- [ ] Verify Pro features still work until end date
- [ ] Wait until after end date (or simulate)
- [ ] Verify Pro features are gated again

**Expected**: User informed of cancellation, features work until end date.

#### 4.5 Cancellation Flow
- [ ] Go to Settings → Manage Subscription
- [ ] Click "Cancel Subscription"
- [ ] Verify confirmation modal
- [ ] Confirm cancellation
- [ ] Verify subscription canceled
- [ ] Verify analytics: `subscription_canceled` tracked
- [ ] Verify can still use Pro features until end date

**Expected**: Cancellation works, features available until end date.

#### 4.6 Resubscription
After cancellation:
- [ ] Before end date, click "Resubscribe"
- [ ] Verify opens payment page
- [ ] Complete payment
- [ ] Verify subscription reactivated
- [ ] Verify analytics: `subscription_reactivated` tracked
- [ ] Verify warning banner disappears

**Expected**: Can resubscribe before end date without issues.

---

### 5. Edge Cases

**Objective**: Test unusual scenarios and error conditions.

#### 5.1 Offline Behavior
- [ ] Disconnect from internet
- [ ] Open extension
- [ ] Verify shows cached notifications
- [ ] Try to mark as read
- [ ] Verify queues action for later
- [ ] Reconnect to internet
- [ ] Verify actions sync

**Expected**: Extension works offline with cached data, syncs when online.

#### 5.2 Network Errors
- [ ] Use Chrome DevTools → Network → Set to "Offline"
- [ ] Try to load payment page
- [ ] Verify graceful error message
- [ ] Reconnect
- [ ] Retry → Should work

**Expected**: Network errors handled gracefully with retry option.

#### 5.3 ExtensionPay Service Unavailable
- [ ] Simulate ExtensionPay API failure (block network request)
- [ ] Open extension
- [ ] Verify extension still works with last known Pro status
- [ ] Verify Pro features work if user was Pro
- [ ] Verify free features work if user was free

**Expected**: Extension degrades gracefully if ExtensionPay is down.

#### 5.4 Multi-Device Login
- [ ] Install extension on Device A
- [ ] Purchase Pro subscription
- [ ] Install extension on Device B (same GitHub account)
- [ ] Log in to ExtensionPay on Device B
- [ ] Verify Pro status syncs
- [ ] Verify Pro features work on both devices

**Expected**: Pro status syncs across devices via ExtensionPay.

#### 5.5 Subscription Expired
- [ ] Let monthly subscription expire (or simulate)
- [ ] Verify Pro features become gated
- [ ] Verify clear message about expiration
- [ ] Verify "Renew Subscription" CTA
- [ ] Renew subscription
- [ ] Verify Pro features unlock immediately

**Expected**: Expired subscriptions handled gracefully with clear renewal path.

#### 5.6 Invalid ExtensionPay Configuration
- [ ] Temporarily change ExtensionPay ID to invalid value
- [ ] Reload extension
- [ ] Verify graceful error message
- [ ] Verify free features still work
- [ ] Restore correct ID
- [ ] Verify Pro features work again

**Expected**: Invalid config doesn't crash extension, shows helpful error.

---

### 6. Analytics Verification

**Objective**: Verify all payment analytics are tracked correctly.

#### 6.1 Upgrade Flow Analytics
Verify these events are tracked:
- [ ] `upgrade_modal_shown` - When Pro modal appears (with location)
- [ ] `upgrade_button_clicked` - When "Upgrade Now" clicked (with location)
- [ ] `payment_page_opened` - When payment page opens (with isPro status)
- [ ] `payment_completed` - When payment succeeds
- [ ] `subscription_started` - When subscription begins (not for lifetime)
- [ ] `payment_failed` - When payment fails

#### 6.2 Subscription Analytics
- [ ] `subscription_canceled` - When user cancels
- [ ] `subscription_reactivated` - When user resubscribes

#### 6.3 Feature Usage Analytics
- [ ] `notification_snoozed` - When Pro user snoozes
- [ ] `keyboard_shortcut_used` - When Pro user uses shortcuts

**Verification Method**:
Open Chrome DevTools → Application → Storage → Local Storage → Check `payment_analytics` key.

**Expected**: All events tracked with correct metadata and timestamps.

---

### 7. Privacy & Security

**Objective**: Verify privacy policy compliance and data handling.

#### 7.1 Data Storage Audit
- [ ] Open Chrome DevTools → Application → Storage
- [ ] Check `chrome.storage.local`
- [ ] Verify NO credit card data stored
- [ ] Verify NO payment tokens stored (except ExtensionPay user ID)
- [ ] Verify email only stored if user provided it
- [ ] Verify subscription status stored locally only
- [ ] Verify analytics stored locally only (no transmission)

**Expected**: No sensitive payment data stored locally.

#### 7.2 Network Traffic Audit
- [ ] Open Chrome DevTools → Network tab
- [ ] Clear network log
- [ ] Complete full upgrade flow
- [ ] Verify network requests:
  - [ ] GitHub API (notifications only)
  - [ ] ExtensionPay API (subscription check)
  - [ ] Stripe API (payment processing, via ExtensionPay)
  - [ ] NO requests to analytics services
  - [ ] NO requests to tracking services

**Expected**: Only necessary API calls, no tracking/analytics services.

#### 7.3 Privacy Policy Verification
- [ ] Go to Settings → About
- [ ] Click "Privacy Policy" link
- [ ] Verify opens privacy policy page
- [ ] Verify payment section is present
- [ ] Verify explains ExtensionPay and Stripe usage
- [ ] Verify clarifies no credit card storage

**Expected**: Privacy policy accessible and accurate.

---

## Test Results Template

For each test scenario, use this template:

```markdown
### Test: [Scenario Name]
**Date**: YYYY-MM-DD  
**Tester**: [Your Name]  
**Result**: ✅ PASS / ❌ FAIL  
**Notes**: [Any observations, issues, or comments]
```

### Example:
```markdown
### Test: 1.1 Fresh Install
**Date**: 2026-02-07  
**Tester**: Jane Doe  
**Result**: ✅ PASS  
**Notes**: All free features worked perfectly. Badge counter showed correct count.
```

---

## Issue Tracking

If any test fails, document the issue:

### Issue Template
```markdown
## Issue #[number]: [Title]
**Severity**: Critical / Major / Minor  
**Test**: [Which test scenario]  
**Steps to Reproduce**:
1. ...
2. ...

**Expected**: [What should happen]  
**Actual**: [What actually happened]  
**Screenshots**: [If applicable]  
**Console Errors**: [If any]  
**Resolution**: [How it was fixed]
```

---

## Pre-Launch Checklist

Before submitting to Chrome Web Store, ensure:

### Critical (Must Pass)
- [ ] All free features work correctly
- [ ] All Pro feature gates work correctly
- [ ] Monthly subscription flow works end-to-end
- [ ] Annual subscription flow works end-to-end
- [ ] Lifetime purchase flow works end-to-end
- [ ] Payment errors handled gracefully
- [ ] All Pro features work after upgrade
- [ ] Subscription management works (view, cancel, resubscribe)
- [ ] Analytics tracked correctly
- [ ] Privacy policy accessible and accurate
- [ ] No sensitive data stored locally
- [ ] Network traffic audit clean

### Important (Should Pass)
- [ ] Offline behavior works correctly
- [ ] Multi-device sync works
- [ ] Edge cases handled gracefully
- [ ] Error messages are user-friendly
- [ ] Keyboard shortcuts work reliably

### Nice to Have (Can Fix Post-Launch)
- [ ] All snooze time options work
- [ ] Auto-archive rules work
- [ ] Subscription status warnings display correctly

---

## Testing Schedule

**Time Required**: ~4 hours for complete testing

**Day 1 (2 hours)**:
- Complete Sections 1-3 (Free, Upgrade, Pro Experience)

**Day 2 (1 hour)**:
- Complete Section 4 (Subscription Management)

**Day 3 (1 hour)**:
- Complete Sections 5-7 (Edge Cases, Analytics, Privacy)

---

## Test Mode Limitations

**Important**: ExtensionPay test mode limitations:
- ✅ Test subscriptions created
- ✅ Test payments processed
- ❌ No real charges
- ❌ Test subscriptions may not persist long-term
- ❌ Some Stripe features limited

**Production Testing**: After Chrome Web Store approval, do ONE real test purchase to verify production environment.

---

## Sign-Off

After all tests pass, complete this sign-off:

```markdown
## Test Completion Sign-Off

**Tester**: [Your Name]  
**Date**: YYYY-MM-DD  
**Total Tests Run**: [Number]  
**Passed**: [Number]  
**Failed**: [Number]  
**Blockers**: [None / List issues]  

**Recommendation**: ✅ READY FOR LAUNCH / ❌ NOT READY

**Signature**: _________________________
```

---

**Testing complete?** Update BACKLOG.md and mark GNM-045 as DONE!
