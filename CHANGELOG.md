# Changelog

All notable changes to the GitHub Notification Manager extension.

## [Unreleased]

### Added
- Complete dark mode support for all components (light/dark/system theme options)
- Pro badge with consistent gradient yellow styling across the application
- Dark mode support for theme toggle labels in Settings

### Changed
- **Pro Badge Location**: Moved Pro badge from notifications header to homepage welcome header
- **Pro Badge Styling**: Standardized to gradient yellow pill (`from-yellow-500 to-yellow-600`) with "PRO" text
- **Keyboard Shortcuts Modal**: Simplified UI with single PRO badge in modal title instead of per-shortcut badges
- **Settings Page**: Fixed scrolling behavior using proper flex layout (`flex-1 min-h-0` pattern)

### Improved
- **Keyboard Shortcuts UX**: Pro keyboard shortcuts now silently ignored for free tier users
  - Removed annoying upgrade modal popup on accidental keypresses
  - Shortcuts (J/K/D/A/S/O/1-4/Shift+D) now do nothing for free users instead of showing modal
  - Help shortcut (`?`) still works for all users
  - Upgrade prompts only appear on intentional feature button clicks

### Fixed
- Dark mode text colors for 15+ components (ArchivedTab, BulkActionsBar, ConfirmDialog, ConfirmationDialog, FilterBar, MarkAllReadButton, NotificationItem, RefreshStatusButton, ShortcutHelpModal, SnoozeButton, SnoozeDialog, SnoozedTab, SubscriptionStatus, Toast, ErrorBoundary)
- Theme toggle text visibility in dark mode (Settings page)
- Settings page scrolling issue on all tabs (Account, Behaviour, Advanced)
- Optimized icon files (PNG and SVG variants) for better performance

## Commit History

### `78f967f` - 2026-02-08
**fix(ux): silently ignore Pro keyboard shortcuts for free users**
- Removed upgrade modal popup when free users press Pro shortcuts
- Prevents annoying modal on accidental keypresses
- Better UX - less intrusive, modal only shows on intentional upgrade button clicks

### `9d4337c` - 2026-02-08
**feat(ui): standardize all Pro badges across the app**
- Updated Settings page Plan Status badge to match new styling
- Replaced dark mode feature badge with ProBadge component
- Consistent "PRO" text (uppercase, no emojis) everywhere

### `ec01c12` - 2026-02-08
**feat(ui): update Pro badge styling and keyboard shortcuts modal**
- Changed Pro badge to gradient yellow pill design
- Updated text to "PRO" (uppercase, removed star emoji)
- Simplified Keyboard Shortcuts Modal with single PRO badge in title
- Removed individual Pro badges from each shortcut line

### `acbf220` - 2026-02-08
**feat(ui): move Pro badge to homepage header**
- Relocated Pro badge from notifications section to welcome header
- Shows in same row as tagline for Pro users
- Consistent placement with Upgrade button for free tier

### `f4ff5c0` - 2026-02-08
**fix(ui): fix Settings page scrolling and theme toggle dark mode text**
- Changed root container from `h-full` to `flex-1 min-h-0` for proper flex scrolling
- Added dark mode text colors to Light/Dark/System theme toggle labels
- Settings page now scrolls properly on all tabs

### `23242bb` - 2026-02-08
**fix(ui): add dark mode support for remaining components**
- Updated 15 components with proper dark mode text colors
- Optimized 10 icon files (PNG and SVG variants)
- Complete dark mode coverage across entire extension

---

## Design Decisions

### Pro Badge Styling
The Pro badge was standardized to use:
- **Colors**: `bg-gradient-to-r from-yellow-500 to-yellow-600 text-yellow-950`
- **Text**: "PRO" (uppercase, no emoji decorations)
- **Component**: Defined in `src/components/ProBadge.tsx`
- **Locations**: Homepage header, Settings plan status, feature-gated buttons

### Dark Mode Pattern
All components follow the consistent pattern:
- **Text**: `text-github-fg-default dark:text-github-fg-dark-default`
- **Background**: `bg-github-canvas-default dark:bg-github-canvas-dark-default`
- **Borders**: `border-github-border-default dark:border-github-border-dark-default`
- **Strategy**: Using `darkMode: 'class'` in Tailwind config

### Keyboard Shortcuts Philosophy
- **Free Tier**: Only `?` (help) shortcut works
- **Pro Shortcuts**: Silently ignored for free users (no modal spam)
- **Upgrade Prompts**: Only shown on intentional feature interactions (clicking buttons)
- **Goal**: Non-intrusive freemium experience that respects user attention
