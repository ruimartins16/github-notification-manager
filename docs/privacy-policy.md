# Privacy Policy for GitHush

**Last Updated:** February 8, 2026

## Introduction

GitHush ("the Extension") is a Chrome browser extension that helps you manage your GitHub notifications. This privacy policy explains how we handle your data.

## TL;DR (Too Long; Didn't Read)

- ✅ We don't collect, store, or transmit any of your personal data
- ✅ All data stays in your browser locally
- ✅ We only access GitHub APIs that you authorize
- ✅ No analytics, tracking, or third-party services
- ✅ Open source and transparent

## Data Collection

**We do NOT collect any data.** The Extension operates entirely within your browser and does not send any information to external servers (other than GitHub's API, which you authorize).

### What Data We Access

The Extension requests access to:

1. **GitHub Notifications** (via GitHub API)
   - Purpose: To display and manage your GitHub notifications
   - Scope: Read-only access to your notifications
   - Authorization: You explicitly grant this via GitHub's OAuth device flow

2. **GitHub User Information** (via GitHub API)
   - Purpose: To display your username and avatar
   - Scope: Read-only access to your basic profile
   - Authorization: You explicitly grant this via GitHub's OAuth device flow

### What Data We Store Locally

The Extension stores data **only in your browser's local storage** using Chrome's `chrome.storage` API:

1. **Authentication Token**
   - Purpose: To authenticate API requests to GitHub
   - Location: Browser local storage (never transmitted to third parties)
   - Removal: Deleted when you log out or uninstall the extension

2. **Notification Data**
   - Purpose: To display notifications and track read/unread status
   - Location: Browser local storage
   - Removal: Cleared when you log out or uninstall the extension

3. **User Preferences**
   - Purpose: To remember your filter settings, snooze preferences, etc.
   - Location: Browser sync storage (synced across your Chrome browsers if signed in)
   - Removal: Deleted when you uninstall the extension

4. **Snoozed Notifications**
   - Purpose: To remind you about notifications you've snoozed
   - Location: Browser local storage + Chrome alarms API
   - Removal: Cleared when you log out or uninstall the extension

## Data Sharing

**We do NOT share any data with third parties.** All communication happens directly between:
- Your browser ↔ GitHub's API (api.github.com)
- Your browser ↔ GitHub's website (github.com)

No intermediary servers, no analytics services, no tracking.

## Third-Party Services

The Extension communicates with:

1. **GitHub API** (api.github.com)
   - Purpose: To fetch notifications and user data
   - Privacy Policy: https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement
   - Data Sent: Your GitHub OAuth token (which you authorize)

2. **No other third-party services** (except payment processing - see Payment Information below)

## Payment Information

### Payment Processing

GitHush offers optional Pro features through a paid subscription. Payments are processed securely through **ExtensionPay** and **Stripe**:

- **ExtensionPay** (extensionpay.com): Manages subscription billing and licensing
- **Stripe** (stripe.com): Processes credit card payments securely

**Important:** Your payment information (credit card details, billing address) is handled directly by Stripe and is **never** stored in the extension or on our servers.

### What Payment Data We Collect

When you purchase a Pro subscription:

1. **Email Address** (Optional but recommended)
   - Provided to ExtensionPay during checkout
   - Used for: Receipts, subscription management, account recovery
   - Stored by: ExtensionPay (not by us)
   - You can: Use the extension without providing an email (but won't receive receipts)

2. **Subscription Status**
   - Stored locally in your browser (via chrome.storage.local)
   - Used to: Enable/disable Pro features
   - Contains: Pro status (true/false), plan type, subscription date
   - Removal: Cleared when you uninstall the extension

### What Payment Data We DON'T Collect

We **never** collect or have access to:

- ❌ Credit card numbers
- ❌ CVV codes
- ❌ Billing addresses
- ❌ Bank account information
- ❌ Full payment details

All sensitive payment data is handled exclusively by Stripe (PCI DSS Level 1 certified).

### Third-Party Payment Services

When you upgrade to Pro:

1. **ExtensionPay** (extensionpay.com)
   - Purpose: Subscription and license management
   - Privacy Policy: https://extensionpay.com/privacy
   - Data Shared: Email (optional), browser extension ID
   - Manages: Subscription status, billing, license keys

2. **Stripe** (stripe.com)
   - Purpose: Secure payment processing
   - Privacy Policy: https://stripe.com/privacy
   - Data Shared: Payment details you provide during checkout
   - Processes: Credit card transactions, refunds

### Subscription Data Handling

**Local Storage (In Your Browser):**
- Subscription status: `{ isPro: true, plan: "monthly", paidAt: "2026-02-07" }`
- Purpose: Enable Pro features (snooze, custom rules, keyboard shortcuts)
- Stored in: `chrome.storage.local` (never transmitted)
- Cleared: On logout or uninstall

**Multi-Device Access:**
- You can use your Pro subscription on multiple devices
- ExtensionPay Login: Enter your email to sync subscription across devices
- No additional data collected for multi-device access

### Payment Security

- ✅ **PCI DSS Compliant:** Stripe handles all payment data (Level 1 certified)
- ✅ **No Card Storage:** We never see or store your card details
- ✅ **Secure Checkout:** ExtensionPay uses Stripe's secure payment forms
- ✅ **HTTPS Only:** All payment pages use encrypted connections
- ✅ **No Server Storage:** Subscription status stored only in your browser

### Your Payment Rights

**Subscription Management:**
- View subscription: Settings → Account tab in the extension
- Cancel anytime: Click "Manage Subscription" → ExtensionPay portal
- Refunds: Contact support@extensionpay.com (ExtensionPay manages refunds)

**Data Access:**
- Email receipts: Provided by ExtensionPay (if you provided email)
- Subscription history: Available in ExtensionPay management portal
- Delete account: Contact support@extensionpay.com to delete ExtensionPay account

**Questions About Payments:**
- Payment/billing issues: support@extensionpay.com
- Refund requests: support@extensionpay.com
- Payment security: Stripe's security team (via Stripe Support)

### Free vs Pro Data Collection

**Free Users:**
- No payment data collected (same as before monetization)
- Only GitHub API access and local storage (see above sections)

**Pro Users:**
- Same GitHub API access and local storage
- **Plus:** Email (optional) shared with ExtensionPay
- **Plus:** Subscription status stored locally
- **No additional tracking or data collection**

## Permissions Explained

The Extension requests the following Chrome permissions:

| Permission | Purpose |
|------------|---------|
| `identity` | To handle GitHub OAuth device flow authentication |
| `notifications` | To show browser notifications when new GitHub notifications arrive |
| `storage` | To store your preferences, auth token, and notification data locally |
| `alarms` | To wake up snoozed notifications at the scheduled time |
| `https://api.github.com/*` | To fetch notifications from GitHub API |
| `https://github.com/*` | To open notification links on GitHub |

## Your Rights

You have full control over your data:

### Right to Access
- All data is stored locally in your browser
- You can inspect stored data using Chrome DevTools → Application → Storage

### Right to Delete
- **Log out:** Click "Logout" in the extension to clear all stored data
- **Uninstall:** Removing the extension deletes all local data
- **Revoke access:** Revoke OAuth token at https://github.com/settings/applications

### Right to Export
- Data is stored in your browser's local storage (JSON format)
- You can export data manually via Chrome DevTools

## Data Retention

- **Authentication Token:** Stored until you log out or uninstall
- **Notification Data:** Refreshed every 30 minutes, older data overwritten
- **Snoozed Notifications:** Stored until they wake or you unsnooze them
- **User Preferences:** Stored indefinitely until you uninstall

## Security

We take security seriously:

- ✅ **OAuth Device Flow:** No client secret exposed (secure authentication)
- ✅ **No Backend:** No servers to hack (data stays in your browser)
- ✅ **Direct API Access:** Communication only with GitHub's official API
- ✅ **Open Source:** Code is publicly auditable at https://github.com/ruimartins16/github-notification-manager
- ✅ **Minimal Permissions:** Only requests necessary permissions

### In Case of Security Issues

If you discover a security vulnerability, please report it to:
- **Email:** r.martins@ua.pt
- **GitHub Issues:** https://github.com/ruimartins16/github-notification-manager/security

## Children's Privacy

The Extension does not knowingly collect data from anyone, including children under 13. Since we don't collect any data, COPPA compliance is not applicable.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be posted at this URL with an updated "Last Updated" date.

- **Notification:** Significant changes will be announced in the extension's changelog
- **Version History:** Available in the repository's commit history

## Open Source

GitHush is open source:
- **Repository:** https://github.com/ruimartins16/github-notification-manager
- **License:** MIT License
- **Transparency:** You can inspect the code to verify our privacy claims

## Contact

Questions about privacy or data handling?

- **GitHub Issues:** https://github.com/ruimartins16/github-notification-manager/issues
- **Email:** r.martins@ua.pt
- **Repository:** https://github.com/ruimartins16/github-notification-manager

## Compliance

### GDPR (EU)
Since we don't collect personal data, most GDPR requirements don't apply. However:
- ✅ Data minimization: We collect zero data
- ✅ Right to deletion: Log out or uninstall
- ✅ Data portability: Data stays in your browser
- ✅ Transparency: Open source code

### CCPA (California)
We don't sell or share personal information because we don't collect it.

### Chrome Web Store Policies
This extension complies with:
- Chrome Web Store Developer Program Policies
- Limited Use of User Data policy (we don't use user data beyond core functionality)
- No deceptive practices

## Summary

**GitHush is privacy-first:**

✅ No data collection  
✅ No tracking or analytics  
✅ No third-party services  
✅ All data stays local  
✅ Open source and transparent  
✅ You're in full control  

---

**Questions?** Open an issue at https://github.com/ruimartins16/github-notification-manager or email r.martins@ua.pt.
