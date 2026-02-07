# ExtensionPay Setup Documentation

## Overview

GitHub Notification Manager uses [ExtensionPay](https://extensionpay.com) for handling premium subscriptions. ExtensionPay is a payment provider specifically designed for browser extensions with no backend required.

## Account Information

- **ExtensionPay Dashboard:** https://extensionpay.com
- **Extension ID:** `github-notification-manager`
- **Platform:** Chrome Web Store
- **Payment Processor:** Stripe (for payouts)

## Setup Completed (GNM-018)

✅ ExtensionPay account created  
✅ Extension registered with ID: `github-notification-manager`  
✅ Extension ID documented in `.env.local`  
✅ Test mode enabled (for development)  

## Environment Configuration

### For Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. The extension ID is already configured:
   ```
   VITE_EXTPAY_EXTENSION_ID=github-notification-manager
   ```

3. **Never commit `.env.local`** - it's already in `.gitignore`

### For Production

The extension ID will be bundled into the production build via Vite environment variables. No runtime configuration needed.

## ExtensionPay Features

### Pricing Plans (GNM-020)

- **Monthly:** $3/month
- **Annual:** $30/year (save 16%)
- **Lifetime:** $100 one-time payment (pay once, use forever)
- **Free Tier:** Basic features
- **No Trial Period:** Users start on free tier

All paid plans (Monthly, Annual, and Lifetime) provide full Pro feature access.

### Feature Gates

| Feature | Free | Pro |
|---------|------|-----|
| View notifications | ✅ | ✅ |
| Basic filters | ✅ | ✅ |
| Mark as read | ✅ | ✅ |
| Archive | ✅ | ✅ |
| Auto-refresh | ✅ | ✅ |
| Badge count | ✅ | ✅ |
| **Snooze notifications** | ❌ | ✅ |
| **Custom rules engine** | ❌ | ✅ |
| **Keyboard shortcuts** | ❌ | ✅ |

## Integration Architecture

### Components

1. **Background Service Worker** (`src/background/service-worker.ts`)
   - Initialize ExtPay on extension startup
   - Listen for payment events
   - Cache user status in chrome.storage

2. **ExtPay Service** (GNM-024)
   - Wrapper around ExtPay API
   - License validation
   - User status management

3. **React Hook** (GNM-027)
   - `useProStatus()` hook for components
   - Real-time subscription status
   - Loading and error states

4. **UI Components**
   - `UpgradeModal` (GNM-029) - Payment flow
   - `ProBadge` (GNM-030) - Feature indicators
   - Upgrade prompts on locked features

### Data Flow

```
User Action
    ↓
Component checks useProStatus()
    ↓
If free tier + pro feature
    ↓
Show UpgradeModal
    ↓
ExtPay handles payment
    ↓
Background worker receives event
    ↓
Update cached status
    ↓
UI re-renders with pro access
```

## Test Mode

ExtensionPay test mode is enabled for development:

- **Test payments** don't charge real money
- **Test cards** provided by ExtensionPay
- **Simulate** subscription lifecycle (paid, cancelled, expired)
- **Reset** test data anytime in dashboard

### Test Card Information

ExtensionPay provides test mode cards for development. Check the dashboard for current test card numbers.

## Dashboard Access

### Key Sections

1. **Overview** - Extension stats, revenue, user count
2. **Users** - Individual user subscriptions
3. **Settings** - Extension configuration, test mode toggle
4. **Pricing** - Monthly/annual plan configuration (GNM-020)
5. **Analytics** - Revenue tracking, conversion rates (GNM-041, GNM-042)

### Important Settings

- **Test Mode:** ON (for development)
- **Pricing:** $3/month, $30/year
- **Trial Period:** None
- **Multi-device:** Enabled (users can log in across devices)

## Stripe Integration (GNM-019)

ExtensionPay uses Stripe for payment processing and payouts.

### Setup Steps (Next)

1. Connect Stripe account in ExtensionPay dashboard
2. Complete Stripe onboarding
3. Set payout schedule (daily, weekly, monthly)
4. Verify test mode works with Stripe test keys

### Payout Information

- **Transaction Fee:** 5% (ExtensionPay) + Stripe fees
- **Payout Schedule:** Configurable (daily, weekly, monthly)
- **Minimum Payout:** Set by Stripe
- **Currency:** USD (can be changed in Stripe dashboard)

## Security & Privacy

### What ExtensionPay Collects

- User email (for account management)
- Payment information (handled by Stripe, not stored by us)
- Subscription status (active, cancelled, expired)
- Extension usage (for license validation only)

### What We DON'T Collect

- GitHub tokens or credentials
- Notification content
- User browsing data
- Personal information beyond email

### Privacy Policy Updates

The privacy policy (`docs/privacy-policy.html`) will be updated in GNM-044 to include:
- Payment processing via ExtensionPay and Stripe
- Subscription data collection
- License validation requirements

## Troubleshooting

### Extension ID Not Working

1. Verify extension ID in ExtensionPay dashboard
2. Check `.env.local` has correct ID
3. Restart Vite dev server
4. Clear chrome.storage in extension

### Test Payments Failing

1. Confirm test mode is ON in dashboard
2. Use ExtensionPay-provided test cards
3. Check browser console for errors
4. Verify ExtPay library is loaded

### License Validation Errors

1. Check network tab for ExtensionPay API calls
2. Verify extension ID matches dashboard
3. Clear cached license status
4. Check ExtensionPay service status

## Next Steps

### Immediate (Sprint F1)

- [x] GNM-018: Account setup and registration ✅
- [ ] GNM-019: Connect Stripe account
- [ ] GNM-020: Configure pricing plans ($3/mo, $30/yr)
- [ ] GNM-021: Install `@extpay/extpay` npm package
- [ ] GNM-022: Integrate ExtPay in background worker
- [ ] GNM-023: Update manifest.json permissions
- [ ] GNM-024: Create ExtPay service wrapper
- [ ] GNM-025: Implement license validation
- [ ] GNM-026: Cache user status in chrome.storage
- [ ] GNM-027: Create `useProStatus()` React hook
- [ ] GNM-028: Handle offline/error states

### UI & Feature Gating (Sprint F2)

- [ ] GNM-029: UpgradeModal component
- [ ] GNM-030: ProBadge component
- [ ] GNM-031: Header upgrade button
- [ ] GNM-032-034: Gate snooze/rules/shortcuts
- [ ] GNM-035-036: Pro badges and upgrade prompts
- [ ] GNM-037: Settings/Account page
- [ ] GNM-038: Handle onPaid callback

### Testing & Launch (Sprint F3)

- [ ] GNM-039-040: Cancellation/status handling
- [ ] GNM-041-042: Analytics integration
- [ ] GNM-043: Update Chrome Web Store listing
- [ ] GNM-044: Update privacy policy
- [ ] GNM-045-047: E2E testing for payment flows

## Resources

- **ExtensionPay Docs:** https://extensionpay.com/docs
- **ExtensionPay Dashboard:** https://extensionpay.com
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Support:** support@extensionpay.com

## Changelog

- **2024-01-XX:** Initial ExtensionPay account setup and registration (GNM-018) ✅
