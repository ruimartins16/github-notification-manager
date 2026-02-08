# GitHush

> **Quiet the noise.** Snooze, filter, and prioritize your GitHub notifications.

A Chrome extension that helps developers take back control of their GitHub notifications. Stop drowning in notification overwhelm and focus on what matters most.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

### 🔔 **Smart Filtering**
- **All, Mentions, Reviews, Assigned** - Filter notifications by type
- See what matters most, hide the rest
- Stay focused on your priorities

### ⏰ **Snooze Notifications** (Pro)
- Snooze for 30 minutes, 1 hour, 3 hours, tomorrow, or next week
- Custom date picker for perfect timing
- Notifications return when YOU'RE ready

### ⚡ **Keyboard Shortcuts** (Pro)
- Navigate with **J/K** (just like Gmail)
- Quick actions: **D** (done), **A** (archive), **S** (snooze), **O** (open)
- Filter switching with **1-4** keys
- Power user? You'll feel at home
- Press **?** to view all shortcuts

### 🤖 **Auto-Archive Rules** (Pro)
- Set custom rules per repository
- Archive old notifications automatically
- "Dependabot notifications after 7 days" - done!
- Set it and forget it

### 🌙 **Beautiful Dark Mode** (Pro)
- Easy on the eyes, day or night
- Follows your system preference
- Light, Dark, or System theme options

### 📊 **Mark All as Read**
- Inbox zero in one click
- Bulk actions for efficiency
- Take control when you need it

---

## 🎯 Perfect For

- **Developers** managing multiple projects
- **Open source maintainers** overwhelmed by notifications
- **Code reviewers** who need to prioritize
- **Teams** collaborating on GitHub
- **Power users** who love keyboard shortcuts
- **Anyone** struggling with GitHub notification overload

---

## 🚀 Installation

### From Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (link coming soon)
2. Click "Add to Chrome"
3. Click the GitHush icon in your extensions bar
4. Sign in with GitHub
5. Start managing notifications your way!

### For Development
```bash
# Clone the repository
git clone https://github.com/ruimartins16/github-notification-manager.git
cd github-notification-manager

# Install dependencies
npm install

# Build for production
npm run build

# Load unpacked extension in Chrome
# 1. Go to chrome://extensions
# 2. Enable "Developer Mode"
# 3. Click "Load unpacked"
# 4. Select the `dist/` folder
```

---

## 💎 Free vs Pro

### Free Tier
- ✅ Smart filtering (All, Mentions, Reviews, Assigned)
- ✅ Mark all as read
- ✅ View keyboard shortcuts (press `?`)
- ⚠️ 3 snoozes per day
- ⚠️ 1 auto-archive rule
- ⚠️ 3 repositories for auto-archive

### Pro Tier (€3/month or €15 lifetime)
- ✅ **Unlimited snoozes**
- ✅ **Unlimited auto-archive rules**
- ✅ **Unlimited repositories**
- ✅ **Full keyboard shortcuts** (navigation, actions, filters)
- ✅ **Beautiful dark mode**
- ✅ **Support independent development**

[Upgrade to Pro](https://extensionpay.com) to unlock all features!

---

## 🔐 Privacy & Security

GitHush is **privacy-first**:

- ✅ **No data collection** - We don't collect, store, or transmit any of your personal data
- ✅ **All data stays local** - Everything is stored in your browser only
- ✅ **No tracking or analytics** - Zero third-party tracking services
- ✅ **Open source** - Transparent and auditable code
- ✅ **Secure GitHub OAuth** - Direct authentication with GitHub (no intermediaries)

Read our full [Privacy Policy](https://github.com/ruimartins16/github-notification-manager/blob/main/docs/privacy-policy.md).

---

## 🛠️ Tech Stack

- **Chrome Extension:** Manifest V3
- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI:** Tailwind CSS + GitHub Primer colors
- **State Management:** Zustand
- **GitHub API:** Octokit.js
- **Storage:** Chrome Storage API (local + sync)
- **Payments:** ExtensionPay + Stripe

---

## ⌨️ Keyboard Shortcuts

Press **?** in the extension to view all shortcuts. Here are the main ones:

**Navigation** (Pro)
- `J` - Next notification
- `K` - Previous notification

**Actions** (Pro)
- `D` - Mark as done
- `A` - Archive notification
- `S` - Snooze notification
- `O` - Open in GitHub

**Filters** (Pro)
- `1` - All notifications
- `2` - Mentions only
- `3` - Review requests
- `4` - Assigned issues

**Global**
- `?` - Show keyboard shortcuts help (Free & Pro)
- `Shift + D` - Mark all as read (Pro)

---

## 🤝 Contributing

Contributions are welcome! This project is open source.

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup
```bash
# Install dependencies
npm install

# Run development mode with hot reload
npm run dev

# Run tests
npm run test

# Build for production
npm run build

# Type check
npm run type-check
```

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 📧 Contact & Support

- **Issues & Feature Requests:** [GitHub Issues](https://github.com/ruimartins16/github-notification-manager/issues)
- **Email:** r.martins@ua.pt
- **Repository:** [github.com/ruimartins16/github-notification-manager](https://github.com/ruimartins16/github-notification-manager)

---

## 🌟 Show Your Support

If GitHush helps you manage your GitHub notifications, please:
- ⭐ Star this repository
- 🐦 Share it on social media
- ⭐ Leave a review on the Chrome Web Store
- 💬 Tell your developer friends

---

**Made with ❤️ for developers who want to quiet the noise.**
