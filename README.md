# GitHub Notification Manager

> A Chrome extension to snooze, filter, and prioritize GitHub notifications

**Status:** Planning Phase  
**Target Launch:** February 15, 2026  
**Business Model:** Freemium ($5/mo Pro tier)  
**Goal:** $250-500 MRR by Month 6

## 📋 Planning Documents

This project was planned using our autonomous SaaS development workflow:

- **[TECHNICAL-ARCHITECTURE.md](./TECHNICAL-ARCHITECTURE.md)** - System Architect's technical design
- **[UX-DESIGN.md](./UX-DESIGN.md)** - UX Designer's user flows and wireframes
- **[SPRINT-PLAN.md](./SPRINT-PLAN.md)** - Scrum Master's 10-day MVP plan
- **[LAUNCH-STRATEGY.md](./LAUNCH-STRATEGY.md)** - Business Analyst's growth strategy

## 🎯 MVP Features (7-10 Days)

### Must Have
- ✅ GitHub OAuth authentication
- ✅ Priority filtering (All, Mentions, Reviews, Assigned)
- ✅ Snooze notifications (1h, 4h, tomorrow, custom)
- ✅ Mark all as read
- ✅ Notification badge count
- ✅ Basic auto-archive rules
- ✅ Keyboard shortcuts (j/k, s, d, o)
- ✅ Dark mode support (light/dark/system)

### Freemium Limits
- **Free:** 3 snoozes/day, 3 repos, 1 auto-archive rule
- **Pro ($5/mo):** Unlimited everything

### Pro Features
Pro features are clearly indicated with a gradient yellow **PRO** badge:
- **Homepage Header**: Badge appears next to the tagline when user is subscribed
- **Settings Page**: Badge shown in Account section (plan status) and next to Dark Mode feature
- **Keyboard Shortcuts Modal**: Single badge in modal title
- **Feature Buttons**: Snooze button and auto-archive rules show Pro badge when gated

### Keyboard Shortcuts UX
- **Help Modal**: Press `?` to view all available shortcuts (works for all users)
- **Free Tier Behavior**: Pro keyboard shortcuts (J/K/D/A/S/O/1-4/Shift+D) are silently ignored for free users
  - No upgrade modal popup on accidental keypresses
  - Better UX - upgrade prompts only appear on intentional clicks
- **Pro Tier**: All shortcuts active (navigation, actions, filters)

## 🚀 Tech Stack

- **Chrome Extension:** Manifest V3
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + Headless UI
- **State:** Zustand
- **GitHub API:** Octokit.js
- **Storage:** chrome.storage.local (no backend!)
- **Cost:** $0/month for MVP

## 📅 Timeline

- **Feb 6-7:** Foundation + OAuth
- **Feb 8-9:** UI + Badge + Filtering
- **Feb 10-11:** Snooze + Actions
- **Feb 12-13:** Testing + Polish
- **Feb 14-15:** Chrome Web Store Submission

## 📈 Growth Strategy

**100% Organic (No Outreach/Sales):**
1. ProductHunt launch (Day 0)
2. Hacker News (Show HN)
3. Reddit (r/github, r/webdev, r/SideProject)
4. Twitter (building in public)
5. Chrome Web Store SEO
6. Content marketing (weekly blog posts)

**Viral Features:**
- Referral program (both get 1 month free)
- Share stats (social proof)
- Review prompts (Chrome Web Store ranking)

## 🎯 Success Metrics

### Month 1
- 1,000 installs
- 5 paying customers ($25 MRR)
- 4.5+ star rating

### Month 3
- 6,000 installs
- 50 paying customers (**$250 MRR** ✅)
- 200+ reviews

### Month 6
- 15,000 installs
- 100+ paying customers (**$500+ MRR** 🎯)
- 500+ reviews

## 🛠️ Setup (Coming Soon)

```bash
# Install dependencies
npm install

# Run development mode
npm run dev

# Build for production
npm run build

# Load unpacked extension in Chrome
# chrome://extensions → Enable Developer Mode → Load Unpacked → build/
```

## 📝 License

MIT

---

**Built with the Autonomous SaaS Development Workflow** 🤖
