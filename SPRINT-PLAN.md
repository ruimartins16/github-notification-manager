# Sprint 1: GitHub Notification Manager MVP

**Duration:** 10 days (Feb 6-15, 2026)
**Capacity:** 60-70 hours (6-7 hours/day)
**Goal:** Ship to Chrome Web Store

## Day-by-Day Breakdown

### Day 1: Foundation & OAuth (7h)
- Setup: Vite + React + TypeScript + CRXJS
- GitHub OAuth app registration
- Implement chrome.identity API
- **Deliverable:** Extension loads, OAuth works

### Day 2: GitHub API Integration (7h)
- Create GitHub API service (Octokit)
- Fetch notifications endpoint
- Display in popup (basic layout)
- **Deliverable:** Notifications fetch and display

### Day 3: UI Components & Badge (7h)
- Build notification card component
- Style popup (GitHub-inspired theme)
- Implement chrome.action.setBadgeText()
- Background polling (every 5 min)
- **Deliverable:** Polished UI + badge count

### Day 4: Filtering & Snooze (8h)
- Priority filter (All, Mentions, Reviews, Assigned)
- Snooze modal (1h, 4h, 24h, custom)
- Store snoozed in chrome.storage
- Use chrome.alarms for wake-up
- **Deliverable:** Filters + snooze working

### Day 5: Actions & Auto-Archive (7h)
- "Mark All as Read" button
- Auto-archive rule builder (settings)
- Rules execute in background
- **Deliverable:** Bulk actions + automation

### Day 6: Keyboard Shortcuts & Settings (6h)
- Implement shortcuts (j/k, s, d, o, e)
- Settings page (options.html)
- Logout functionality
- **Deliverable:** Shortcuts + settings page

### Day 7: Manual Testing & Bug Fixes (7h)
- Complete testing checklist
- Test all flows (OAuth, notifications, snooze, etc.)
- Fix critical bugs
- **Deliverable:** Stable, tested extension

### Day 8: Polish & Edge Cases (6h)
- Handle edge cases (no internet, token expired)
- Add loading states, error messages
- Create screenshots for Chrome Web Store
- **Deliverable:** Production-ready extension

### Day 9: Chrome Web Store Prep (6h)
- Create store assets (icons, screenshots, description)
- Write privacy policy
- Prepare documentation
- **Deliverable:** All store materials ready

### Day 10: Submission & Buffer (6h)
- Create Chrome Web Store developer account
- Upload extension package
- Submit for review
- **Deliverable:** Extension submitted!

## Testing Checklist

- [ ] OAuth flow (login, logout, re-auth)
- [ ] Notifications display correctly
- [ ] Filters work (All, Mentions, Reviews, Assigned)
- [ ] Snooze works (notifications reappear)
- [ ] Mark all as read works
- [ ] Badge updates correctly
- [ ] Auto-archive rules execute
- [ ] Keyboard shortcuts work
- [ ] Settings persist
- [ ] Error handling graceful

## Definition of Done

- [ ] Extension submitted to Chrome Web Store
- [ ] All core features working
- [ ] Zero critical bugs
- [ ] Manual testing 100% complete
- [ ] Documentation ready
- [ ] Store assets created

**Realistic Timeline:** Yes, 7-10 days is achievable for MVP!
