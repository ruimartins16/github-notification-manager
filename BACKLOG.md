# GitHub Notification Manager - MVP Backlog

## Project Overview
**Project:** GitHub Notification Manager Chrome Extension
**Sprint Duration:** 10 days (Feb 6-15, 2026)
**Team Velocity:** 20-25 story points (estimated, first sprint)
**Sprint Goal:** Launch a functional MVP that helps developers manage GitHub notifications more efficiently through filtering, snoozing, and quick actions.

---

## Sprint Capacity Planning

### Day 1-2: Foundation & OAuth (16 points)
**Focus:** Project setup, authentication, and basic data flow

### Day 3-4: UI & Badge (14 points)
**Focus:** Core UI components and notification badge

### Day 5-6: Core Features (16 points)
**Focus:** Filtering and snooze functionality

### Day 7-8: Actions & Polish (12 points)
**Focus:** Batch actions and settings

### Day 9-10: Testing & Submission (10 points)
**Focus:** QA, Chrome Web Store preparation

**Total MVP:** 68 story points

---

## Day 1-2: Foundation & OAuth Setup

### [GNM-001] Chrome Extension Foundation Setup
**Priority:** P0 (Must Have)
**Story Points:** 5
**Dependencies:** None

**User Story:**
As a developer, I want a properly configured Chrome extension project so that I can start building features on a solid foundation.

**Acceptance Criteria:**
- [ ] Vite + CRXJS project initialized with TypeScript
- [ ] React 18 configured with hot module reloading
- [ ] Tailwind CSS configured with custom theme
- [ ] Manifest V3 properly configured with permissions
- [ ] Basic folder structure established (components, hooks, utils, types)
- [ ] ESLint + Prettier configured
- [ ] Development build runs successfully
- [ ] Extension loads in Chrome without errors

**Technical Tasks:**
- [ ] Initialize Vite project with React-TS template
- [ ] Install and configure CRXJS plugin
- [ ] Configure manifest.json with required permissions (identity, notifications, storage, alarms)
- [ ] Setup Tailwind with custom color palette (GitHub-inspired)
- [ ] Create folder structure: src/{components,hooks,utils,types,store,background}
- [ ] Configure TypeScript for strict mode
- [ ] Add development scripts to package.json
- [ ] Create basic popup.html entry point

**Definition of Done:**
- Extension loads in chrome://extensions with dev mode
- Hot reload works for React components
- TypeScript compilation has no errors
- Tailwind classes render correctly

---

### [GNM-002] GitHub OAuth Implementation
**Priority:** P0 (Must Have)
**Story Points:** 8
**Dependencies:** GNM-001

**User Story:**
As a user, I want to authenticate with my GitHub account so that the extension can access my notifications securely.

**Acceptance Criteria:**
- [ ] OAuth flow initiates when user clicks "Connect GitHub"
- [ ] Redirect to GitHub authorization page with correct scopes
- [ ] Access token is securely stored in chrome.storage.local
- [ ] Token refresh mechanism implemented for expired tokens
- [ ] User sees authenticated state in popup
- [ ] Logout functionality clears stored credentials
- [ ] Error handling for failed authentication
- [ ] Rate limit information displayed in settings

**Technical Tasks:**
- [ ] Register GitHub OAuth App (get CLIENT_ID)
- [ ] Implement chrome.identity.launchWebAuthFlow()
- [ ] Request scopes: 'notifications', 'read:user'
- [ ] Create AuthService utility class
- [ ] Implement secure token storage with encryption
- [ ] Create useAuth hook for React components
- [ ] Build authentication UI states (logged out, loading, authenticated)
- [ ] Implement token refresh logic (handle 401 responses)
- [ ] Add logout function that clears storage
- [ ] Display user avatar and username after auth

**Definition of Done:**
- User can complete OAuth flow successfully
- Access token persists after closing extension
- Token refresh works automatically
- Error states display helpful messages
- No tokens logged to console

---

### [GNM-003] Notification Fetching Service
**Priority:** P0 (Must Have)
**Story Points:** 3
**Dependencies:** GNM-002

**User Story:**
As a user, I want the extension to fetch my GitHub notifications so that I can view them in the popup.

**Acceptance Criteria:**
- [ ] Background service fetches notifications on interval (30 seconds)
- [ ] Octokit SDK properly configured with auth token
- [ ] Notifications stored in chrome.storage.local
- [ ] Loading states handled appropriately
- [ ] API errors handled gracefully
- [ ] Rate limit respected (check X-RateLimit headers)
- [ ] Incremental updates (only fetch new/updated)
- [ ] Pagination handled for users with 100+ notifications

**Technical Tasks:**
- [ ] Install and configure @octokit/rest
- [ ] Create NotificationService class
- [ ] Implement background service worker (service-worker.ts)
- [ ] Use chrome.alarms API for periodic fetching
- [ ] Fetch from /notifications endpoint with 'all=true' and 'participating=false'
- [ ] Parse and normalize notification data structure
- [ ] Implement incremental sync with 'since' parameter
- [ ] Store notifications with metadata (fetched_at, read_state)
- [ ] Handle API rate limiting (pause fetching if limit hit)
- [ ] Add retry logic with exponential backoff

**Definition of Done:**
- Notifications fetch every 30 seconds when authenticated
- Storage updates with new notifications
- Background service respects rate limits
- No memory leaks in background worker

---

## Day 3-4: UI & Badge

### [GNM-004] Notification List UI Component
**Priority:** P0 (Must Have)
**Story Points:** 5
**Dependencies:** GNM-003

**User Story:**
As a user, I want to see my GitHub notifications in a clean, organized list so that I can quickly scan what needs my attention.

**Acceptance Criteria:**
- [ ] Notifications display in a scrollable list
- [ ] Each item shows: repository, title, reason, timestamp
- [ ] Unread notifications visually distinguished (bold, blue dot)
- [ ] Repository name includes icon (PR, Issue, Discussion)
- [ ] Relative timestamps (e.g., "2 hours ago")
- [ ] Hover state shows full notification details
- [ ] Click opens notification in GitHub (new tab)
- [ ] Empty state when no notifications
- [ ] Loading skeleton while fetching
- [ ] Smooth animations for list updates

**Technical Tasks:**
- [ ] Create NotificationList component (React)
- [ ] Create NotificationItem component with props interface
- [ ] Implement virtual scrolling (react-window) for performance
- [ ] Style with Tailwind (match GitHub aesthetics)
- [ ] Add notification type icons (Octicons)
- [ ] Implement relative time formatting (use date-fns)
- [ ] Add click handler to open notification URL
- [ ] Create EmptyState component with illustration
- [ ] Add loading skeletons (Tailwind pulse animation)
- [ ] Implement smooth enter/exit animations (framer-motion optional)

**Definition of Done:**
- List renders 100+ notifications without lag
- Visual design matches GitHub's style
- Interactions feel responsive (<100ms)
- Accessibility: keyboard navigable

---

### [GNM-005] Badge Counter Implementation
**Priority:** P0 (Must Have)
**Story Points:** 3
**Dependencies:** GNM-003

**User Story:**
As a user, I want to see a badge count on the extension icon so that I know how many unread notifications I have without opening the popup.

**Acceptance Criteria:**
- [ ] Badge displays unread count (1-99)
- [ ] Badge shows "99+" for counts over 99
- [ ] Badge color is blue (#0969DA) for unread
- [ ] Badge updates in real-time when notifications change
- [ ] Badge clears when all notifications marked as read
- [ ] Badge updates after filtering (respects active filter)
- [ ] Badge color changes to green when priority mentions exist
- [ ] Option to disable badge in settings

**Technical Tasks:**
- [ ] Use chrome.action.setBadgeText() API
- [ ] Use chrome.action.setBadgeBackgroundColor() API
- [ ] Calculate unread count from storage
- [ ] Listen to storage changes and update badge
- [ ] Implement badge update function in background service
- [ ] Add priority indicator logic (mentions = green badge)
- [ ] Format count display (handle 99+ case)
- [ ] Add setting toggle for badge display
- [ ] Update badge when filter changes

**Definition of Done:**
- Badge count matches actual unread notifications
- Updates immediately when notifications change
- Color coding works for priority items
- No badge flicker during updates

---

### [GNM-006] Zustand State Management Setup
**Priority:** P0 (Must Have)
**Story Points:** 3
**Dependencies:** GNM-001

**User Story:**
As a developer, I want centralized state management so that UI components can reactively update when notification data changes.

**Acceptance Criteria:**
- [ ] Zustand store configured for notifications
- [ ] Store includes: notifications array, filters, settings, auth state
- [ ] Storage middleware syncs with chrome.storage
- [ ] Actions defined: addNotifications, updateFilter, markAsRead, etc.
- [ ] Selectors created for derived state (filteredNotifications, unreadCount)
- [ ] TypeScript interfaces for all state shapes
- [ ] Dev tools enabled for debugging (Redux DevTools)

**Technical Tasks:**
- [ ] Install zustand and middleware
- [ ] Create store/index.ts with store definition
- [ ] Define NotificationState interface
- [ ] Implement actions: setNotifications, updateNotification, removeNotification
- [ ] Implement actions: setFilter, setSettings, setAuth
- [ ] Add persist middleware for chrome.storage.local sync
- [ ] Create selectors: selectFilteredNotifications, selectUnreadCount
- [ ] Configure Redux DevTools extension support
- [ ] Create useStore hook with proper typing

**Definition of Done:**
- All components can access store via useStore()
- State persists across extension restarts
- Redux DevTools shows state changes
- TypeScript autocomplete works for store

---

### [GNM-007] Filter Controls UI
**Priority:** P0 (Must Have)
**Story Points:** 3
**Dependencies:** GNM-004, GNM-006

**User Story:**
As a user, I want to filter notifications by type so that I can focus on what's most important to me (mentions, review requests, assigned issues).

**Acceptance Criteria:**
- [ ] Filter bar at top of popup with tabs: All, Mentions, Reviews, Assigned
- [ ] Active filter visually highlighted
- [ ] Notification count shown per filter tab
- [ ] List updates instantly when filter changes
- [ ] Filter state persists across popup opens
- [ ] Keyboard shortcuts: 1-4 to switch filters
- [ ] Badge count respects active filter

**Technical Tasks:**
- [ ] Create FilterBar component with tab buttons
- [ ] Implement filter logic in Zustand store
- [ ] Map notification.reason to filter categories:
  - Mentions: 'mention', 'team_mention', 'author'
  - Reviews: 'review_requested', 'review_requested_team'
  - Assigned: 'assign'
- [ ] Calculate counts per filter type
- [ ] Style active tab (blue underline + background)
- [ ] Wire up keyboard shortcuts (1='All', 2='Mentions', 3='Reviews', 4='Assigned')
- [ ] Update URL hash for filter state (#filter=mentions)
- [ ] Persist selected filter in storage

**Definition of Done:**
- Filters accurately categorize notifications
- Filter state persists
- Keyboard shortcuts work
- Counts are accurate per filter

---

## Day 5-6: Core Features

### [GNM-008] Snooze Functionality
**Priority:** P0 (Must Have)
**Story Points:** 8
**Dependencies:** GNM-004

**User Story:**
As a user, I want to snooze notifications for later so that I can focus on immediate tasks without losing track of important items.

**Acceptance Criteria:**
- [ ] Snooze button on each notification item (clock icon)
- [ ] Snooze menu appears with options: 1h, 4h, 24h, Custom
- [ ] Custom snooze allows date/time picker
- [ ] Snoozed notifications removed from main list
- [ ] Snoozed notifications stored separately in storage
- [ ] Chrome alarm triggers when snooze expires
- [ ] Notification reappears in list when unsnoozed
- [ ] Snoozed count displayed in separate tab
- [ ] Can view and manage snoozed items
- [ ] Can unsnooze manually before timer expires

**Technical Tasks:**
- [ ] Create SnoozeButton component with dropdown menu
- [ ] Create SnoozeDialog component for custom time
- [ ] Implement snooze logic in Zustand store (moveToSnoozed action)
- [ ] Store snoozed items with wake_time timestamp
- [ ] Use chrome.alarms.create() for each snoozed item
- [ ] Listen to chrome.alarms.onAlarm in background service
- [ ] Move notification back to active list when alarm fires
- [ ] Create SnoozedTab component to view snoozed items
- [ ] Implement unsnooze action (delete alarm + restore notification)
- [ ] Add notification when item is unsnoozed

**Definition of Done:**
- Notifications snooze for exact duration
- Alarms fire reliably
- Snoozed items persist across browser restarts
- Can manage snoozed items in dedicated view

---

### [GNM-009] Mark All as Read Action
**Priority:** P0 (Must Have)
**Story Points:** 3
**Dependencies:** GNM-004

**User Story:**
As a user, I want to mark all notifications as read with one click so that I can quickly clear my notification list when I've reviewed everything.

**Acceptance Criteria:**
- [ ] "Mark All as Read" button in header (checkmark icon)
- [ ] Confirmation dialog appears before marking all
- [ ] All visible notifications (respecting filter) marked as read
- [ ] API call to GitHub to mark as read on server
- [ ] UI updates optimistically (immediate feedback)
- [ ] Badge count updates to 0
- [ ] Undo option available for 5 seconds
- [ ] Loading state during API call
- [ ] Error handling if API fails

**Technical Tasks:**
- [ ] Create MarkAllReadButton component
- [ ] Create ConfirmationDialog component (reusable)
- [ ] Implement markAllAsRead action in store
- [ ] Call Octokit PUT /notifications (marks all threads as read)
- [ ] Implement optimistic update (update UI before API response)
- [ ] Add undo mechanism (restore previous state, store in temp)
- [ ] Show toast notification with undo button (5s timeout)
- [ ] Handle API errors (revert optimistic update)
- [ ] Update badge count after marking
- [ ] Add keyboard shortcut: Shift+D for mark all

**Definition of Done:**
- All notifications mark as read successfully
- Undo works within 5 second window
- API errors handled gracefully
- Badge updates correctly

---

### [GNM-010] Individual Notification Actions
**Priority:** P0 (Must Have)
**Story Points:** 5
**Dependencies:** GNM-004

**User Story:**
As a user, I want to perform quick actions on individual notifications (mark as read, archive, unsubscribe) so that I can efficiently manage my notification list.

**Acceptance Criteria:**
- [ ] Hover on notification reveals action buttons
- [ ] Mark as read button (checkmark icon)
- [ ] Archive button (archive icon)
- [ ] Unsubscribe button (bell-slash icon) with confirmation
- [ ] Actions update notification immediately
- [ ] API calls to GitHub for each action
- [ ] Keyboard shortcuts: D (mark done), A (archive), U (unsubscribe)
- [ ] Archived items go to separate "Archived" tab
- [ ] Can unarchive from Archived tab
- [ ] Visual feedback on action success

**Technical Tasks:**
- [ ] Create NotificationActions component (button group)
- [ ] Implement markAsRead action (PATCH /notifications/threads/:id)
- [ ] Implement archive action (store locally with archived flag)
- [ ] Implement unsubscribe action (PUT /notifications/threads/:id/subscription with ignored=true)
- [ ] Add hover state to show actions
- [ ] Create ArchivedTab component
- [ ] Implement keyboard shortcuts (j/k to navigate, d/a/u for actions)
- [ ] Add confirmation modal for unsubscribe
- [ ] Show toast notifications for each action
- [ ] Handle API errors per action

**Definition of Done:**
- Each action works correctly with API
- Keyboard navigation and actions work
- Archived tab shows archived items
- Confirmations prevent accidental unsubscribes

---

## Day 7-8: Actions & Polish

### [GNM-011] Auto-Archive Rules
**Priority:** P1 (Should Have)
**Story Points:** 5
**Dependencies:** GNM-010

**User Story:**
As a user, I want to set up rules to automatically archive notifications so that I can reduce noise from repositories I don't actively follow.

**Acceptance Criteria:**
- [ ] Settings page has "Auto-Archive Rules" section
- [ ] Can create rule: "Archive notifications from repository X"
- [ ] Can create rule: "Archive notifications older than N days"
- [ ] Can create rule: "Archive notifications with reason Y"
- [ ] Rules apply automatically when notifications are fetched
- [ ] List of active rules with enable/disable toggle
- [ ] Can edit and delete rules
- [ ] Rules persist in storage
- [ ] Background service applies rules every sync

**Technical Tasks:**
- [ ] Create AutoArchiveRules component in settings
- [ ] Create RuleBuilder component (form for rule creation)
- [ ] Define Rule interface: { id, type, condition, enabled }
- [ ] Implement rule types: 'repository', 'age', 'reason'
- [ ] Create applyRules function in background service
- [ ] Run rules after each notification fetch
- [ ] Store rules in chrome.storage.sync (sync across devices)
- [ ] Create RuleList component (CRUD operations)
- [ ] Implement rule matching logic
- [ ] Add rule statistics (X notifications archived by this rule)

**Definition of Done:**
- Rules auto-archive matching notifications
- Rules can be managed in settings
- Rules persist across sessions
- Rule statistics visible

---

### [GNM-012] Settings Page
**Priority:** P0 (Must Have)
**Story Points:** 4
**Dependencies:** GNM-002, GNM-005

**User Story:**
As a user, I want a settings page to customize the extension behavior so that it works the way I prefer.

**Acceptance Criteria:**
- [ ] Settings accessible via gear icon in header
- [ ] Settings organized in sections: Account, Notifications, Behavior, Advanced
- [ ] Account: show user info, logout button
- [ ] Notifications: refresh interval (30s, 1m, 5m), badge toggle, sound toggle
- [ ] Behavior: default filter, open links in (new tab/current tab)
- [ ] Advanced: clear cache, export/import settings, rate limit info
- [ ] All settings persist in chrome.storage.sync
- [ ] Changes apply immediately
- [ ] Validation for inputs (e.g., refresh interval minimum)

**Technical Tasks:**
- [ ] Create Settings page component (separate route)
- [ ] Create SettingsSection component (reusable)
- [ ] Implement settings schema in Zustand store
- [ ] Create form controls: Toggle, Select, Input, Button
- [ ] Wire up each setting to store actions
- [ ] Persist settings with chrome.storage.sync
- [ ] Implement logout functionality (clear auth + storage)
- [ ] Add clear cache button (clears all notifications)
- [ ] Add export/import settings (JSON download/upload)
- [ ] Display GitHub API rate limit status

**Definition of Done:**
- All settings work as expected
- Settings persist across devices (chrome.storage.sync)
- Settings page is accessible and intuitive
- Validation prevents invalid values

---

### [GNM-013] Keyboard Shortcuts
**Priority:** P1 (Should Have)
**Story Points:** 3
**Dependencies:** GNM-004, GNM-010

**User Story:**
As a power user, I want keyboard shortcuts to navigate and act on notifications so that I can be more efficient without using the mouse.

**Acceptance Criteria:**
- [ ] J/K keys navigate up/down notification list
- [ ] D marks focused notification as done (read)
- [ ] A archives focused notification
- [ ] S opens snooze menu for focused notification
- [ ] O opens focused notification in GitHub
- [ ] 1-4 switches between filter tabs
- [ ] Shift+D marks all as read
- [ ] ? shows keyboard shortcut help overlay
- [ ] Shortcuts work with visual focus indicator

**Technical Tasks:**
- [ ] Create useKeyboardShortcuts hook
- [ ] Implement key event listeners (useEffect)
- [ ] Track focusedIndex in state
- [ ] Move focus with J/K (next/previous)
- [ ] Execute actions on focused item (D, A, S, O)
- [ ] Add visual focus indicator (border highlight)
- [ ] Create ShortcutHelp modal (? key)
- [ ] List all shortcuts in modal with categories
- [ ] Prevent shortcuts when input fields focused
- [ ] Scroll viewport to keep focused item visible

**Definition of Done:**
- All shortcuts work as documented
- Focus indicator is clear
- Help modal displays all shortcuts
- No conflicts with browser shortcuts

---

## Day 9-10: Testing & Submission

### [GNM-014] End-to-End Testing
**Priority:** P0 (Must Have)
**Story Points:** 5
**Dependencies:** All previous tickets

**User Story:**
As a developer, I want comprehensive tests to ensure the extension works reliably so that users have a bug-free experience.

**Acceptance Criteria:**
- [ ] Unit tests for all utility functions (80%+ coverage)
- [ ] Component tests for major UI components
- [ ] Integration tests for API calls (mocked)
- [ ] E2E tests for critical flows (auth, fetch, actions)
- [ ] Test OAuth flow with mocked GitHub
- [ ] Test notification actions (mark read, archive, snooze)
- [ ] Test filter and search functionality
- [ ] Test keyboard shortcuts
- [ ] All tests passing in CI

**Technical Tasks:**
- [ ] Setup Vitest for unit/integration tests
- [ ] Setup Testing Library for component tests
- [ ] Create test utilities (mock store, mock chrome APIs)
- [ ] Write tests for NotificationService
- [ ] Write tests for AuthService
- [ ] Write component tests for NotificationList
- [ ] Write component tests for FilterBar
- [ ] Mock chrome.storage and chrome.alarms APIs
- [ ] Create E2E test scenarios with Playwright (optional)
- [ ] Setup GitHub Actions CI for tests

**Definition of Done:**
- All tests pass locally
- Test coverage >70%
- CI runs tests on every commit
- No console errors during tests

---

### [GNM-015] Chrome Web Store Assets
**Priority:** P0 (Must Have)
**Story Points:** 3
**Dependencies:** GNM-014

**User Story:**
As a user, I want to discover the extension on Chrome Web Store so that I can install it easily.

**Acceptance Criteria:**
- [ ] Extension icon designed (16x16, 32x32, 48x48, 128x128)
- [ ] Screenshots created (1280x800 or 640x400) - minimum 1, up to 5
- [ ] Promotional images: 440x280 (small tile), 1400x560 (marquee - optional)
- [ ] Store listing description written (compelling copy)
- [ ] Privacy policy drafted and hosted
- [ ] Version set to 1.0.0 in manifest
- [ ] Extension name finalized
- [ ] Short description (132 chars max)
- [ ] Detailed description with features, benefits, instructions

**Technical Tasks:**
- [ ] Design extension icon (use Figma or similar)
- [ ] Export icon in required sizes
- [ ] Take screenshots of extension in action
- [ ] Create promotional tile images
- [ ] Write store listing copy
- [ ] Create privacy policy page (host on GitHub Pages)
- [ ] Update manifest.json with final metadata
- [ ] Create demo GIF for store listing (30s max)

**Definition of Done:**
- All required assets created at correct sizes
- Store listing copy reviewed and approved
- Privacy policy live and linked
- manifest.json updated for submission

---

### [GNM-016] Chrome Web Store Submission
**Priority:** P0 (Must Have)
**Story Points:** 2
**Dependencies:** GNM-015

**User Story:**
As a developer, I want to submit the extension to Chrome Web Store so that users can discover and install it.

**Acceptance Criteria:**
- [ ] Production build created and tested
- [ ] Extension package (.zip) prepared
- [ ] Developer account created ($5 one-time fee)
- [ ] Store listing completed with all assets
- [ ] Extension submitted for review
- [ ] Privacy practices form completed
- [ ] Version 1.0.0 published (after approval)

**Technical Tasks:**
- [ ] Run production build: npm run build
- [ ] Test production build locally (load unpacked)
- [ ] Create ZIP file of dist folder
- [ ] Create Chrome Web Store developer account
- [ ] Pay $5 registration fee
- [ ] Upload extension package
- [ ] Fill out store listing (use GNM-015 assets)
- [ ] Complete privacy practices questionnaire
- [ ] Submit for review
- [ ] Monitor review status (typically 1-3 days)
- [ ] Publish after approval

**Definition of Done:**
- Extension submitted successfully
- Awaiting review notification received
- Team notified of submission status

---

## SEPARATE TRACK: Landing Page (Can Develop in Parallel)

### [GNM-017] Landing Page Development
**Priority:** P1 (Should Have)
**Story Points:** 8
**Dependencies:** GNM-001 (for demo/screenshots)

**User Story:**
As a potential user, I want an informative landing page so that I can understand the extension's value and decide to install it.

**Acceptance Criteria:**
- [ ] Landing page designed and developed
- [ ] Hosted on GitHub Pages or Vercel
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Clear value proposition above the fold
- [ ] Feature showcase with screenshots/GIFs
- [ ] Social proof section (testimonials, GitHub stars)
- [ ] Clear CTA buttons to Chrome Web Store
- [ ] Demo video or interactive GIF
- [ ] Footer with links (GitHub, privacy, support)
- [ ] SEO optimized (meta tags, OG images, sitemap)
- [ ] Analytics integrated (Google Analytics or Plausible)
- [ ] Fast loading (<2s first contentful paint)

**Technical Tasks:**
See detailed LANDING-PAGE.md document for full requirements.

**Definition of Done:**
- Landing page live at custom domain or github.io
- CTA buttons link to Chrome Web Store
- Page loads fast and ranks well on Lighthouse
- Social sharing preview looks good (OG tags)

---

## Priority Summary

### P0 - Must Have for MVP (58 points)
- GNM-001 through GNM-010, GNM-012, GNM-014, GNM-015, GNM-016

### P1 - Should Have (16 points)
- GNM-011, GNM-013, GNM-017

### P2 - Nice to Have (Future Sprints)
- Dark mode, search, sounds, notifications, multi-account, advanced filtering

---

## Definition of Done (Team-Wide)

A ticket is considered "Done" when:
- [ ] Code implemented according to acceptance criteria
- [ ] **Unit tests written and passing (>70% coverage for new code)**
- [ ] All tests pass: `npm run test:run`
- [ ] Component tested manually in Chrome
- [ ] TypeScript compiles without errors
- [ ] ESLint passes with no warnings
- [ ] No console errors in popup or background worker
- [ ] Tested in both development and production builds
- [ ] Documentation updated (if API changes)
- [ ] Committed to git with descriptive message
- [ ] Code reviewed (if working with team)

**Testing Requirements (Added after GNM-001):**
- Every feature must have corresponding unit tests
- Use Testing Library for component tests
- Mock Chrome APIs using `src/test/mocks/chrome.ts`
- Follow patterns in TESTING-STRATEGY.md
- Maintain >70% overall code coverage
