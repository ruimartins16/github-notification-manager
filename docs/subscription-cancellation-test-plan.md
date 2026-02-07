# GNM-039: Subscription Cancellation Flow Test Plan

## Overview

**Story:** Test that users can cancel their Pro subscription and that the extension correctly handles canceled subscription states.

**Priority:** P1 (Should Have)  
**Story Points:** 3

---

## Prerequisites

Before testing, ensure:

1. ✅ **ExtPay Test Mode Enabled**
   - Login to https://extensionpay.com/
   - Ensure test mode is ON for your extension
   - Test card: `4242 4242 4242 4242`

2. ✅ **Extension Built & Loaded**
   ```bash
   npm run build
   ```
   - Load unpacked extension from `dist/` folder in Chrome
   - Verify extension loads without errors

3. ✅ **Test User Account**
   - Create a test subscription (monthly or annual)
   - Verify Pro features are accessible
   - Note the billing date

---

## Test Scenarios

### ✅ Test Scenario 1: Access Cancellation Flow

**Goal:** Verify users can access the cancellation interface via ExtPay.

**Steps:**
1. Open extension popup
2. Navigate to Settings page (⚙️ icon)
3. Scroll to "Subscription" section
4. Verify you see:
   - Current plan name (Monthly/Annual/Lifetime)
   - Billing amount and interval
   - Next billing date (if recurring)
   - **"Manage Subscription" button**
5. Click **"Manage Subscription"** button

**Expected Results:**
- ✅ ExtPay management page opens in new tab
- ✅ Shows current subscription details
- ✅ "Cancel Subscription" button is visible
- ✅ Page shows billing information

**Actual Results:**
- [ ] Pass
- [ ] Fail - Describe issue:

---

### ✅ Test Scenario 2: Cancel Monthly Subscription

**Goal:** Cancel a monthly subscription and verify behavior.

**Steps:**
1. **Create Test Subscription:**
   - Use ExtPay test mode
   - Subscribe to Monthly plan ($3/month)
   - Note the next billing date (should be ~30 days from now)

2. **Cancel Subscription:**
   - Click "Manage Subscription" in Settings
   - Click "Cancel Subscription" on ExtPay page
   - Confirm cancellation when prompted

3. **Verify Canceled State:**
   - Return to extension Settings page
   - Refresh subscription status (may need to reopen popup)
   - Check SubscriptionStatus component displays

**Expected Results:**
- ✅ Subscription status shows `canceled`
- ✅ Gray notice box appears with:
   - "Your subscription will end on [date]"
   - Days remaining until end
   - **"Resubscribe"** button
- ✅ `isPro` is still `true` (Pro retained until end date)
- ✅ Pro features remain accessible (snooze, auto-archive)
- ✅ No payment due warnings

**Actual Results:**
- [ ] Pass
- [ ] Fail - Describe issue:

**Screenshot Location:** `docs/test-screenshots/scenario-2-*.png`

---

### ✅ Test Scenario 3: Cancel Annual Subscription

**Goal:** Cancel an annual subscription and verify long-term access.

**Steps:**
1. **Create Test Subscription:**
   - Subscribe to Annual plan ($30/year) in test mode
   - Note the next billing date (should be ~365 days from now)

2. **Cancel Subscription:**
   - Click "Manage Subscription"
   - Cancel subscription on ExtPay page

3. **Verify Canceled State:**
   - Check Settings page subscription section
   - Verify long-term access message

**Expected Results:**
- ✅ Shows "Your subscription will end in X days" (large number ~365)
- ✅ Pro access retained for full remaining period
- ✅ Annual plan details still shown
- ✅ "Resubscribe" button available

**Actual Results:**
- [ ] Pass
- [ ] Fail - Describe issue:

---

### ✅ Test Scenario 4: Pro Features During Canceled Period

**Goal:** Verify all Pro features work during the canceled period (before expiration).

**Steps:**
1. With a **canceled** subscription (from Scenario 2 or 3):
2. Test each Pro feature:
   - **Snooze:** Click snooze on a notification → verify modal opens
   - **Auto-Archive:** Open Settings → verify auto-archive rules are editable
   - **Keyboard Shortcuts:** Press `?` → verify Pro shortcuts visible
3. Verify no upgrade prompts appear

**Expected Results:**
- ✅ Snooze modal opens (not upgrade prompt)
- ✅ Auto-archive rules are editable
- ✅ Keyboard shortcuts show all Pro features
- ✅ No "Upgrade to Pro" nags or blocks
- ✅ Extension behaves as if fully Pro

**Actual Results:**
- [ ] Pass
- [ ] Fail - Describe issue:

---

### ✅ Test Scenario 5: Resubscribe After Cancellation

**Goal:** Verify users can reactivate their subscription after canceling.

**Steps:**
1. With a **canceled** subscription:
2. Navigate to Settings → Subscription section
3. Click **"Resubscribe"** button in the canceled notice

**Expected Results:**
- ✅ ExtPay payment page opens
- ✅ Shows available plans (Monthly/Annual/Lifetime)
- ✅ Can select and purchase a plan
- ✅ After payment, subscription status changes to `active`
- ✅ Canceled notice disappears
- ✅ Shows next billing date (new date from today)

**Actual Results:**
- [ ] Pass
- [ ] Fail - Describe issue:

---

### ✅ Test Scenario 6: Subscription Expiration (Simulate)

**Goal:** Verify what happens when a canceled subscription expires.

**Note:** This is difficult to test in real-time. We can simulate by:
- Using ExtPay test mode to create a subscription that ends immediately
- OR document expected behavior based on code review

**Expected Behavior (from code review):**
- When `subscriptionCancelAt` date passes:
  - `isPro` should become `false`
  - Pro features should be gated with upgrade prompts
  - SubscriptionStatus notice should disappear
  - Settings should show "Upgrade to Pro" button

**Code Review Verification:**
- [ ] Reviewed `extpay-service.ts` - ProUser interface includes `subscriptionCancelAt`
- [ ] Reviewed `SubscriptionStatus.tsx` - Handles edge case of expired canceled subs
- [ ] Reviewed `useProStatus.ts` - Relies on `user.isPro` from ExtPay

**Actual Results:**
- [ ] Code review pass - logic looks correct
- [ ] Need manual test (if possible in test mode)

---

### ✅ Test Scenario 7: Lifetime Plan (No Cancellation)

**Goal:** Verify lifetime plans don't show cancellation warnings.

**Steps:**
1. Subscribe to Lifetime plan ($100) in test mode
2. Check Settings → Subscription section

**Expected Results:**
- ✅ Shows "Lifetime" plan
- ✅ No "Next billing date" shown
- ✅ No cancellation warnings
- ✅ "Manage Subscription" button still available (for viewing receipt)
- ✅ No SubscriptionStatus notice (status should be `active` forever)

**Actual Results:**
- [ ] Pass
- [ ] Fail - Describe issue:

---

### ✅ Test Scenario 8: Status Refresh Timing

**Goal:** Verify subscription status updates appear within reasonable time.

**Steps:**
1. With active subscription, cancel via ExtPay
2. Immediately return to extension popup
3. Check if status has updated
4. If not, wait 1 minute (background check interval)
5. Close and reopen popup

**Expected Results:**
- ✅ Status updates within 1 minute (background alarm runs every 60min)
- ✅ OR status updates immediately on popup reopen (cache invalidation)
- ✅ No need to reload extension completely

**Actual Results:**
- Time to update: _____ (seconds/minutes)
- [ ] Pass (< 1 minute)
- [ ] Pass (on popup reopen)
- [ ] Fail - took too long or didn't update

---

### ✅ Test Scenario 9: Multiple Cancellation/Resubscribe Cycles

**Goal:** Verify repeated cancel → resubscribe cycles work correctly.

**Steps:**
1. Cancel subscription → verify canceled state
2. Resubscribe → verify active state
3. Cancel again → verify canceled state again
4. Check for any data inconsistencies

**Expected Results:**
- ✅ Each transition works smoothly
- ✅ No stuck states or errors
- ✅ Dates update correctly each time
- ✅ No cached stale data

**Actual Results:**
- [ ] Pass
- [ ] Fail - Describe issue:

---

## Edge Cases to Test

### ⚠️ Edge Case 1: Past Due Status (Payment Failed)

**Setup:** Simulate failed payment (ExtPay test mode)

**Expected:**
- Red alert box: "Your payment has failed"
- "Update Payment Method" button
- `isPro` likely still `true` (grace period)
- `subscriptionStatus: 'past_due'`

**Actual:**
- [ ] Tested - Pass
- [ ] Not tested (requires payment failure simulation)

---

### ⚠️ Edge Case 2: Canceled with Negative Days

**Setup:** Manually test or simulate a canceled subscription past expiration

**Expected:**
- `subscriptionCancelAt` in the past
- SubscriptionStatus shows "0 days" (not negative)
- OR status notice disappears entirely
- `isPro` becomes `false`

**Code handles this:**
```typescript
const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)))
```

**Actual:**
- [ ] Verified in code review
- [ ] Tested manually (if possible)

---

## Acceptance Criteria Verification

From backlog GNM-039:

- [ ] ✅ Cancel button accessible from Settings
  - Via "Manage Subscription" → ExtPay page → "Cancel"
  
- [ ] ✅ Cancel flow handled by ExtensionPay
  - Extension opens ExtPay page, cancellation happens there
  
- [ ] ✅ User retains Pro until end of billing period
  - `isPro` remains `true` during canceled period
  
- [ ] ✅ UI shows cancellation date
  - SubscriptionStatus component displays "ends on [date]"
  
- [ ] ✅ Can resubscribe after cancellation
  - "Resubscribe" button opens payment page
  
- [ ] ✅ E2E test for cancellation flow
  - This test plan document serves as E2E test guide

---

## Test Environment Details

**Extension Version:** (check manifest.json)  
**ExtPay Mode:** Test Mode  
**Browser:** Chrome (version: _______)  
**Test Date:** __________  
**Tester:** __________

---

## Results Summary

### Test Pass Rate

**Scenarios Tested:** ___ / 9  
**Passed:** ___  
**Failed:** ___  
**Blocked:** ___

### Critical Issues Found

1. 
2. 
3. 

### Minor Issues Found

1. 
2. 
3. 

### Recommendations

1. 
2. 
3. 

---

## Sign-Off

### Testing Complete

- [ ] All critical scenarios tested
- [ ] All acceptance criteria verified
- [ ] Screenshots captured (if applicable)
- [ ] Issues documented
- [ ] Ready to mark GNM-039 as complete

**Tested by:** __________  
**Date:** __________  
**Approved by:** __________

---

## Additional Notes

(Add any observations, ExtPay behavior notes, or suggestions for improvement)

---

## References

- **Backlog:** `BACKLOG.md` (line 2458, GNM-039)
- **Implementation:** 
  - `src/components/SubscriptionStatus.tsx`
  - `src/components/SettingsPage.tsx` (line 348-357)
  - `src/utils/extpay-service.ts`
  - `src/background/service-worker.ts` (subscription check alarm)
- **Related Stories:**
  - GNM-038: Subscription management UI
  - GNM-040: Handle subscription status changes ✅ (already complete)

---

**Next Steps After Testing:**
1. Fill out test results in this document
2. Capture screenshots in `docs/test-screenshots/`
3. Document any bugs found as new backlog items
4. Update `BACKLOG.md` to mark GNM-039 as complete
5. Commit this test plan with results
