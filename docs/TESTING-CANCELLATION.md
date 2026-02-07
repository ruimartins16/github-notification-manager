# Testing GNM-039: Subscription Cancellation

## Quick Start Guide

### 1. Setup (5 minutes)

```bash
# Build the extension
npm run build

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer Mode
# 3. Click "Load unpacked"
# 4. Select the `dist/` folder
```

### 2. Create Test Subscription (2 minutes)

1. Open extension popup
2. Click "Upgrade to Pro" (or "Manage Subscription" if already Pro)
3. In ExtPay page, select **Monthly Plan ($3)**
4. Use test card: `4242 4242 4242 4242`
5. Complete purchase
6. Verify Pro badge appears in extension

### 3. Test Cancellation Flow (3 minutes)

1. Open Settings (⚙️ icon in extension)
2. Scroll to "Subscription" section
3. Click **"Manage Subscription"** button
4. On ExtPay page, click **"Cancel Subscription"**
5. Confirm cancellation

### 4. Verify Canceled State (2 minutes)

1. Return to extension Settings
2. Reopen popup to refresh status
3. **Check for:**
   - ✅ Gray notice box: "Your subscription will end in X days"
   - ✅ "Resubscribe" button visible
   - ✅ Pro features still work (try snoozing a notification)
   - ✅ No red warnings

### 5. Test Resubscription (2 minutes)

1. Click **"Resubscribe"** button in the canceled notice
2. Select a plan and purchase
3. Verify:
   - ✅ Canceled notice disappears
   - ✅ Shows active subscription with new billing date

---

## Expected UI States

### Active Subscription
```
┌─────────────────────────────────┐
│ Subscription                    │
├─────────────────────────────────┤
│ Plan: Monthly                   │
│ Price: $3.00 / month            │
│ Next billing: March 7, 2026     │
│                                 │
│ [Manage Subscription]           │
└─────────────────────────────────┘
```

### Canceled Subscription
```
┌─────────────────────────────────┐
│ Subscription                    │
├─────────────────────────────────┤
│ ⓘ Your subscription will end    │
│    in 28 days on March 7, 2026  │
│                                 │
│    [Resubscribe]                │
│                                 │
│ Plan: Monthly                   │
│ Price: $3.00 / month            │
│                                 │
│ [Manage Subscription]           │
└─────────────────────────────────┘
```

### Past Due (Payment Failed)
```
┌─────────────────────────────────┐
│ Subscription                    │
├─────────────────────────────────┤
│ ⚠️ Your payment has failed.      │
│    Please update your payment   │
│    method to continue using Pro.│
│                                 │
│    [Update Payment Method]      │
│                                 │
│ Plan: Monthly                   │
│ Price: $3.00 / month            │
│                                 │
│ [Manage Subscription]           │
└─────────────────────────────────┘
```

---

## Test Checklist

Use this quick checklist while testing:

- [ ] Can access cancellation via "Manage Subscription"
- [ ] Cancellation UI is clear and handled by ExtPay
- [ ] After canceling, gray notice appears in Settings
- [ ] Notice shows correct end date and days remaining
- [ ] Pro features still work during canceled period
  - [ ] Snooze button works (no upgrade prompt)
  - [ ] Auto-archive rules editable
  - [ ] Keyboard shortcuts accessible
- [ ] "Resubscribe" button opens payment page
- [ ] After resubscribing, canceled notice disappears
- [ ] Status updates within 1 minute (or on popup reopen)

---

## Reporting Results

After testing, update the test plan document:

```bash
# Edit this file with results
open docs/subscription-cancellation-test-plan.md
```

Fill in:
- ✅ Pass/Fail for each scenario
- Screenshots (optional, save to `docs/test-screenshots/`)
- Any issues or bugs found
- Overall test summary

---

## Common Issues & Solutions

### Issue: "Manage Subscription" button does nothing
**Solution:** Check browser console for errors. ExtPay may not be initialized.

### Issue: Canceled status not showing
**Solution:** 
1. Close and reopen popup (refreshes cache)
2. Wait 1 minute (background alarm checks status)
3. Check DevTools console for errors

### Issue: Pro features blocked after cancellation
**Solution:** This is a bug! `isPro` should be true until end date. Check:
- ExtPay user object: `subscriptionStatus` should be `'canceled'`
- ExtPay user object: `paid` should still be `true`
- Report bug with console logs

---

## Detailed Test Plan

For comprehensive testing instructions, see:
📄 **`docs/subscription-cancellation-test-plan.md`**

This includes:
- 9 detailed test scenarios
- Edge cases
- Expected vs actual results template
- Sign-off checklist

---

## Quick Links

- **ExtPay Dashboard:** https://extensionpay.com/
- **Test Plan:** `docs/subscription-cancellation-test-plan.md`
- **Backlog:** `BACKLOG.md` (GNM-039, line 2458)
- **Implementation Files:**
  - `src/components/SubscriptionStatus.tsx`
  - `src/components/SettingsPage.tsx`
  - `src/utils/extpay-service.ts`

---

**Estimated Time:** 15-20 minutes for full test suite

**Ready to test?** Build the extension and follow the Quick Start Guide above! 🚀
