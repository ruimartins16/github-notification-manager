# Testing Instructions

## ✅ GNM-001: Foundation Setup - Complete!
## 🔄 GNM-002: GitHub OAuth Authentication - In Progress

---

## 🧪 Running Unit Tests

### Run All Tests
```bash
npm test              # Watch mode (recommended during development)
npm run test:run      # Run once
npm run test:ui       # Open Vitest UI
npm run test:coverage # Generate coverage report
```

### Test Coverage Status

**Total Tests:** 65 passing ✅

| Module | Tests | Status | Coverage |
|--------|-------|--------|----------|
| `src/types/` | 11 | ✅ | Type definitions |
| `src/utils/auth-service.ts` | 24 | ✅ | OAuth authentication |
| `src/hooks/useAuth.ts` | 12 | ✅ | Authentication hook |
| `src/popup/App.tsx` | 18 | ✅ | UI components |

### Test Files

1. **Type Tests** (`src/types/__tests__/`)
   - `github.test.ts` - GitHub API type validations (4 tests)
   - `storage.test.ts` - Chrome storage schema tests (7 tests)

2. **Authentication Service** (`src/utils/__tests__/auth-service.test.ts`)
   - OAuth login flow (5 tests)
   - Token storage and retrieval (4 tests)
   - Logout functionality (2 tests)
   - Authentication state checks (4 tests)
   - URL generation and parsing (9 tests)

3. **Authentication Hook** (`src/hooks/__tests__/useAuth.test.ts`)
   - Initial state and loading (2 tests)
   - Login functionality (3 tests)
   - Logout functionality (2 tests)
   - Token management (2 tests)
   - Error handling (2 tests)
   - State refresh (1 test)

4. **App Component** (`src/popup/__tests__/App.test.tsx`)
   - Loading state (2 tests)
   - Not authenticated UI (6 tests)
   - Authenticated UI (4 tests)
   - Error handling (2 tests)
   - Layout and styling (4 tests)

---

## 🧪 Manual Testing in Chrome

### Prerequisites (for OAuth testing)

**⚠️ Before you can test OAuth, you need to:**
1. Register a GitHub OAuth App (see `GITHUB-OAUTH-SETUP.md`)
2. Update `manifest.json` with your GitHub Client ID
3. Configure the redirect URI in GitHub App settings

### Step 1: Build the Extension

```bash
npm run build
```

### Step 2: Load Extension in Chrome

1. Open Chrome browser
2. Navigate to `chrome://extensions`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"** button
5. Select the `dist` folder from this project
6. The extension should appear in your extensions list!

### Step 3: Test Authentication Flow (GNM-002)

#### Test Case 1: Initial Load - Not Authenticated

1. **Click the extension icon** in Chrome toolbar
2. **Expected behavior:**
   - Popup opens (400x600px)
   - Shows "GitHub Notification Manager" header
   - Displays GitHub icon
   - Shows "Connect to GitHub" button
   - Lists authorization scopes
   - Footer shows tech stack

#### Test Case 2: OAuth Login Flow

1. **Click "Connect GitHub" button**
2. **Expected behavior:**
   - Button shows "Connecting..." (disabled)
   - GitHub authorization page opens in new tab
   - You're asked to authorize the app
   - After approval, redirected back
   - Popup updates to authenticated state

#### Test Case 3: Authenticated State

1. **After successful login:**
2. **Expected behavior:**
   - Shows "✓ Connected" status
   - Displays "Logout" button
   - Shows "Coming Soon" features list
   - No errors in console

#### Test Case 4: Logout

1. **Click "Logout" button**
2. **Expected behavior:**
   - Returns to login screen
   - Token cleared from storage
   - "Connect GitHub" button shown again

#### Test Case 5: Persistent Authentication

1. **After logging in, close and reopen popup**
2. **Expected behavior:**
   - Popup shows loading spinner briefly
   - Automatically restores authenticated state
   - No need to login again

#### Test Case 6: Error Handling

1. **Cancel OAuth flow (click cancel on GitHub)**
2. **Expected behavior:**
   - Returns to extension
   - Shows error message in red box
   - "Connect GitHub" button remains enabled
   - User can retry

---

## 🐛 Troubleshooting

### OAuth Flow Not Working

**Error:** "GitHub OAuth client ID not configured"
- **Solution:** You need to register a GitHub OAuth App first (see `GITHUB-OAUTH-SETUP.md`)
- Update `manifest.json` with your Client ID

**Error:** "Failed to get redirect URI from Chrome"
- **Solution:** Extension might not be properly loaded. Reload extension from `chrome://extensions`

**Error:** "User cancelled"
- **Expected:** This happens when you cancel on GitHub authorization page
- **Action:** Click "Connect GitHub" again to retry

### Extension Doesn't Load

- Make sure you selected the `dist` folder, not the root folder
- Run `npm run build` to create/update the dist folder
- Check that `manifest.json` exists in `dist/`
- Reload extension from `chrome://extensions`

### Popup Errors

- Open DevTools on popup (right-click popup → Inspect)
- Check Console tab for errors
- Common issues:
  - Missing Client ID in manifest
  - Network errors (check internet connection)
  - Chrome storage errors (check permissions)

---

## ✅ Acceptance Criteria Checklist

### GNM-001: Foundation ✅ Complete
- [x] Vite + CRXJS project initialized with TypeScript
- [x] React 18 configured with hot module reloading
- [x] Tailwind CSS configured with custom theme
- [x] Manifest V3 properly configured with permissions
- [x] Basic folder structure established
- [x] ESLint + Prettier configured
- [x] Development build runs successfully
- [x] Extension loads in Chrome without errors
- [x] Testing infrastructure setup (Vitest + React Testing Library)

### GNM-002: GitHub OAuth 🔄 In Progress
- [x] AuthService utility class implemented
- [x] useAuth React hook created
- [x] Authentication UI components built
- [x] Unit tests written and passing (36 new tests)
- [x] Error handling implemented
- [x] Loading states handled
- [ ] OAuth flow tested manually in Chrome ← **NEEDS USER ACTION**
- [ ] Token persists across popup close/open
- [ ] Logout clears credentials properly

---

## 📊 Test Coverage Goals

**Current Coverage:** 65 tests passing

**Target Coverage:** >70% for all new code

To check coverage:
```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory.

---

## 🚀 Next Steps

### Before Completing GNM-002:
1. ✅ All unit tests passing (DONE)
2. ⚠️ Register GitHub OAuth App (USER ACTION REQUIRED)
3. ⚠️ Test OAuth flow in Chrome (after registration)
4. ⚠️ Verify token persistence
5. ⚠️ Test logout functionality
6. 📝 Commit GNM-002 to git

### After GNM-002:
1. Move to **GNM-003: Notification Fetching Service**
2. Implement GitHub API client
3. Create notification polling mechanism
4. Add notification storage

---

## 📝 Notes

- **Testing Strategy:** Write tests before/during implementation (TDD)
- **Chrome APIs:** Mocked in tests using Vitest
- **OAuth Client ID:** Placeholder in manifest - needs user registration
- **Token Storage:** Encrypted by Chrome automatically
- **Hot Reload:** Popup updates on save, background worker needs manual reload

---

**Ready to test? Run `npm test` for unit tests or `npm run build` for Chrome testing!** 🎉
