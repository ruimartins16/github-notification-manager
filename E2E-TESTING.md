# E2E Testing with Playwright

This document describes the End-to-End (E2E) testing setup for the GitHub Notification Manager Chrome Extension using Playwright.

## Overview

E2E tests verify that the extension works correctly in a real Chrome browser environment, testing critical user flows like extension loading, popup display, and user interactions.

## Setup

### Installation

Playwright and related dependencies are already installed. If you need to reinstall:

```bash
npm install -D @playwright/test playwright @types/node
npx playwright install chromium
```

### Configuration

- **Config File:** `playwright.config.ts`
- **Test Directory:** `e2e/`
- **Build Output:** `dist/` (extension must be built before testing)

## Running Tests

### Build Extension First

E2E tests load the built extension from the `dist/` folder:

```bash
npm run build
```

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Tests with UI

```bash
npm run test:e2e:ui
```

### Run Tests in Headed Mode

See the browser window during test execution:

```bash
npm run test:e2e:headed
```

### Run Specific Test File

```bash
npx playwright test extension-loading.spec.ts
```

### Debug Mode

Step through tests with the Playwright Inspector:

```bash
npm run test:e2e:debug
```

## Test Structure

### E2E Test Files

```
e2e/
├── extension-loading.spec.ts    # Extension loading and manifest tests
├── authentication.spec.ts       # Auth flow tests (with mocking challenges)
├── notifications.spec.ts        # Notification list, filtering, actions
├── keyboard-shortcuts.spec.ts   # Keyboard navigation tests
├── utils/
│   └── extension.ts            # Test utilities and fixtures
└── fixtures/
    └── notifications.ts        # Mock data for tests
```

### Test Utilities

**`e2e/utils/extension.ts`** provides:
- `test` - Custom Playwright test fixture with extension context
- `expect` - Playwright expect assertions
- `helpers` - Helper functions for E2E tests

**Custom Fixtures:**
- `context` - Browser context with extension loaded
- `extensionId` - Extension ID for navigation
- `popup` - Extension popup page

## Writing E2E Tests

### Basic Test Example

```typescript
import { test, expect } from './utils/extension'

test.describe('My Feature', () => {
  test('should do something', async ({ popup }) => {
    // popup is the extension popup page
    await popup.waitForSelector('.my-element')
    
    const element = popup.locator('.my-element')
    await expect(element).toBeVisible()
  })
})
```

### Using Mock Data

```typescript
import { helpers } from './utils/extension'
import { mockNotifications, mockUser } from './fixtures/notifications'

test('should display notifications', async ({ popup }) => {
  // Mock GitHub API responses
  await helpers.mockGitHubAPI(popup, {
    '/user': mockUser,
    '/notifications': mockNotifications,
  })
  
  // Your test code here
})
```

### Testing Keyboard Shortcuts

```typescript
test('should navigate with J key', async ({ popup }) => {
  await popup.keyboard.press('j')
  await popup.waitForTimeout(300)
  
  // Verify focus indicator
  const focused = popup.locator('[data-testid="notification-item"].ring-2')
  await expect(focused).toBeVisible()
})
```

## Test Results

### Current Status

**Passing Tests (6):**
- ✅ Extension loads successfully
- ✅ Popup window opens
- ✅ Loading state displays
- ✅ Popup has correct dimensions
- ✅ Manifest version is correct (v3)
- ✅ Required permissions present

**Known Limitations:**
- Mocking Chrome APIs (storage, alarms) from test context is challenging
- Some tests require real authentication or a test mode in the extension
- Tests that depend on chrome.storage may not work reliably

### Test Output

```bash
$ npm run test:e2e

Running 35 tests using 6 workers
  6 passed (Extension Loading)
  ...
```

## Best Practices

### 1. Build Before Testing

Always build the extension before running E2E tests:

```bash
npm run build && npm run test:e2e
```

### 2. Use Selectors Wisely

Prefer test IDs or ARIA roles over CSS classes:

```typescript
// Good
popup.locator('[data-testid="notification-item"]')
popup.locator('[role="article"]')

// Avoid
popup.locator('.some-css-class')
```

### 3. Wait for Elements

Always wait for elements before interacting:

```typescript
await popup.waitForSelector('[data-testid="notification-item"]', { timeout: 10000 })
```

### 4. Handle Async Operations

Use `waitForTimeout` sparingly, prefer specific waits:

```typescript
// Better
await popup.waitForSelector('.success-message')

// Worse
await popup.waitForTimeout(1000)
```

### 5. Screenshot on Failure

Playwright automatically takes screenshots on failure. Find them in:

```
test-results/
└── <test-name>/
    └── test-failed-1.png
```

## Debugging Tests

### View Test Report

```bash
npx playwright show-report
```

### Run Single Test

```bash
npx playwright test extension-loading.spec.ts:10
```

### Debug with Inspector

```bash
npx playwright test --debug
```

### Slow Motion

Slow down test execution to see what's happening:

```typescript
test.use({ launchOptions: { slowMo: 500 } })
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npx playwright install chromium
      - run: npm run test:e2e
```

## Limitations

### Chrome Extension Context

E2E testing Chrome extensions has unique challenges:

1. **No Headless Mode:** Extensions require headed browser mode
2. **Chrome API Mocking:** Difficult to mock `chrome.storage`, `chrome.alarms`
3. **Authentication:** Real OAuth flow is complex to test
4. **Service Workers:** Background scripts have limited test access

### Solutions

1. **Focus on UI Tests:** Test what users see and interact with
2. **Build Test Mode:** Add a `TEST_MODE` flag to the extension for mocking
3. **Manual Testing:** Some flows are better tested manually
4. **Unit Tests:** Cover business logic with unit tests instead

## Future Improvements

- [ ] Add test mode flag to extension for easier mocking
- [ ] Implement mock GitHub API server for authenticated tests
- [ ] Add visual regression testing with Playwright screenshots
- [ ] Set up CI/CD pipeline for automated E2E tests
- [ ] Add more comprehensive keyboard shortcut tests
- [ ] Test notification actions (mark read, archive, snooze)

## Troubleshooting

### Extension Not Loading

**Issue:** `TimeoutError: browserContext.waitForEvent`

**Solution:** Ensure extension is built before testing:
```bash
npm run build
```

### Tests Running Too Fast

**Issue:** Tests complete before UI updates

**Solution:** Add appropriate waits:
```typescript
await popup.waitForLoadState('domcontentloaded')
await popup.waitForSelector('.my-element')
```

### Chrome API Errors

**Issue:** `chrome.storage is undefined`

**Solution:** E2E tests run in different context. Use unit tests for Chrome API logic.

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Chrome Extension Testing Guide](https://playwright.dev/docs/chrome-extensions)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)

## Support

For issues or questions about E2E testing:
1. Check test output and screenshots in `test-results/`
2. Review Playwright docs for Chrome extensions
3. Consider unit tests for complex logic
4. Use manual testing for OAuth flows
