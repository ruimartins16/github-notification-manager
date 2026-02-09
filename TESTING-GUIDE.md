# GitHush Testing Guide - Final Pre-Launch Verification

## 🎯 Purpose
Verify all bug fixes and features work correctly before Chrome Web Store submission.

---

## 🧪 Test 1: Free Tier Auto-Archive Rule Management

**What we fixed:** Free users can now create, toggle, and delete their 1 auto-archive rule.

### Setup
```javascript
// In popup console
localStorage.setItem('gnm-pro-cache', JSON.stringify({
  isPro: false, 
  plan: null, 
  timestamp: Date.now()
}))
// Reload popup
```

### Test Steps

#### 1.1 Create First Rule (Should Work ✅)
1. Open GitHush popup
2. Go to Settings → Auto-Archive Rules
3. Click **"+ New Rule"** button
   - **Expected:** Rule builder appears
   - **Expected:** No "Pro" blocking

4. Fill in rule:
   - Repository: Select any repo
   - Days: Enter `7`
   - Click **"Save Rule"**
   - **Expected:** Rule is created successfully
   - **Expected:** Rule appears in list

#### 1.2 Toggle Rule (Should Work ✅)
1. Find the rule you just created
2. Click the **checkmark icon** (toggle button)
   - **Expected:** Button is NOT disabled
   - **Expected:** Rule toggles to disabled state
   - **Expected:** Rule card becomes semi-transparent
   - **Expected:** "Disabled" label appears

3. Click toggle again
   - **Expected:** Rule re-enables
   - **Expected:** Opacity returns to normal

#### 1.3 Delete Rule (Should Work ✅)
1. Click the **trash icon** (delete button)
   - **Expected:** Button is NOT disabled
   - **Expected:** Confirmation dialog appears
   
2. Click **"Delete"**
   - **Expected:** Rule is removed from list
   - **Expected:** "No auto-archive rules yet" message appears

#### 1.4 Create Second Rule (Should Block ⛔)
1. Create first rule again (repeat 1.1)
2. Try to click **"+ New Rule"** again
   - **Expected:** Upgrade modal appears
   - **Expected:** Message about needing Pro for more rules
   - **Expected:** Cannot create second rule

**Result:** ✅ Free tier rule management works correctly

---

## 🧪 Test 2: Pro Tier Auto-Archive Rules

**What we fixed:** Pro users should have unlimited rules.

### Setup
```javascript
// In popup console
localStorage.setItem('gnm-pro-cache', JSON.stringify({
  isPro: true, 
  plan: 'Pro', 
  timestamp: Date.now()
}))
// Reload popup
```

### Test Steps

#### 2.1 Create Multiple Rules (Should Work ✅)
1. Go to Settings → Auto-Archive Rules
2. Create 3 different rules:
   - Rule 1: dependabot, 3 days
   - Rule 2: renovate, 7 days
   - Rule 3: any other repo, 14 days

3. **Expected:** All 3 rules created successfully
4. **Expected:** Can still click "+ New Rule" for more

#### 2.2 Toggle Any Rule (Should Work ✅)
1. Toggle each rule on/off
   - **Expected:** All toggles work
   - **Expected:** No "Pro feature" warnings

#### 2.3 Delete Any Rule (Should Work ✅)
1. Delete one of the rules
   - **Expected:** Delete works
   - **Expected:** Confirmation dialog appears
   - **Expected:** Rule removed after confirmation

**Result:** ✅ Pro tier unlimited rules work correctly

---

## 🧪 Test 3: Pro Downgrade Cleanup

**What we fixed:** When user downgrades from Pro to Free, auto-archive rules are trimmed to 1 (most recent).

### Setup
```javascript
// Step 1: Set as Pro and create 3 rules (do Test 2.1 first)

// Step 2: Downgrade to Free
localStorage.setItem('gnm-pro-cache', JSON.stringify({
  isPro: false, 
  plan: null, 
  timestamp: Date.now()
}))

// Step 3: Reload popup
location.reload()
```

### Test Steps

#### 3.1 Verify Cleanup Triggered
1. After reload, check console logs
   - **Expected:** See "[ProStatus] Previous: true, Current: false - Downgrade detected!"
   - **Expected:** See "[ProCleanup] Starting Pro tier data cleanup..."
   - **Expected:** See "[ProCleanup] Trimmed auto-archive rules from X to 1"

#### 3.2 Verify Only 1 Rule Remains
1. Go to Settings → Auto-Archive Rules
   - **Expected:** Only 1 rule visible (the most recently created)
   - **Expected:** Older rules have been removed

#### 3.3 Verify Free Tier Behavior
1. Try to create another rule
   - **Expected:** Upgrade modal appears (blocked from creating 2nd rule)

2. Toggle and delete the remaining rule
   - **Expected:** Both actions work (free tier can manage their 1 rule)

**Result:** ✅ Pro downgrade cleanup works correctly

---

## 🧪 Test 4: Snooze Dropdown Transparency Fix

**What we fixed:** Snooze dropdown had transparent background, now has solid background.

### Setup
```javascript
// Set as Pro to access snooze
localStorage.setItem('gnm-pro-cache', JSON.stringify({
  isPro: true, 
  plan: 'Pro', 
  timestamp: Date.now()
}))
// Reload popup
```

### Test Steps

#### 4.1 Open Snooze Dropdown
1. Go to main notification list
2. Hover over any notification
3. Click **"Snooze"** button (clock icon)
   - **Expected:** Dropdown appears
   - **Expected:** Dropdown has SOLID background (not transparent)
   - **Expected:** Text is fully readable

#### 4.2 Check All Theme Variants
1. **Light Theme:**
   - Settings → Theme → Light
   - Open snooze dropdown
   - **Expected:** Solid light background

2. **Dark Theme:**
   - Settings → Theme → Dark
   - Open snooze dropdown
   - **Expected:** Solid dark background

**Result:** ✅ Snooze dropdown has proper solid background

---

## 🧪 Test 5: Build Verification

### Test Steps

```bash
# From project root
npm run build
```

**Expected Results:**
- ✅ No TypeScript errors
- ✅ Build completes successfully
- ✅ `dist/` folder created
- ✅ All assets generated:
  - `dist/manifest.json`
  - `dist/popup.html` (or `dist/index.html`)
  - `dist/assets/*.js`
  - `dist/assets/*.css`
  - `dist/icons/icon*.png`

**Result:** ✅ Build succeeds with no errors

---

## 🧪 Test 6: Extension Loading in Chrome

### Test Steps

#### 6.1 Load Extension
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **"Developer mode"** (top right toggle)
4. Click **"Load unpacked"**
5. Select the `dist/` folder from project root
   - **Expected:** Extension loads successfully
   - **Expected:** GitHush icon appears in toolbar

#### 6.2 Basic Functionality
1. Click GitHush icon in toolbar
   - **Expected:** Popup opens
   - **Expected:** No console errors

2. If not signed in:
   - Click **"Sign in with GitHub"**
   - Complete OAuth flow
   - **Expected:** Returns to extension, shows notifications

3. Check all tabs:
   - All / Mentions / Reviews / Assigned
   - **Expected:** All filters work

4. Go to Settings
   - **Expected:** Settings page loads
   - **Expected:** Pro status displayed correctly
   - **Expected:** Theme switcher works

**Result:** ✅ Extension loads and functions correctly

---

## 🧪 Test 7: Fresh Profile Test (Critical!)

**Why:** Ensure extension works for first-time users with no cached data.

### Test Steps

#### 7.1 Create Fresh Chrome Profile
1. Chrome → Settings → "You and Google" → "+ Add"
2. Create new profile (e.g., "GitHush Test")
3. Open `chrome://extensions/` in new profile
4. Load unpacked extension from `dist/`

#### 7.2 First-Time User Experience
1. Click GitHush icon
   - **Expected:** Sign-in prompt appears
   - **Expected:** No errors in console

2. Complete OAuth
   - **Expected:** Redirects to GitHub
   - **Expected:** Returns to extension
   - **Expected:** Fetches notifications

3. Test as free user:
   - Create 1 auto-archive rule ✅
   - Try to create 2nd rule → Upgrade modal ⛔
   - Toggle rule ✅
   - Delete rule ✅

**Result:** ✅ Fresh profile works perfectly

---

## 🧪 Test 8: Console Error Check

**What to check:** No unexpected errors in console during normal usage.

### Test Steps

1. Open popup with DevTools open (right-click popup → Inspect)
2. Perform common actions:
   - Switch between filter tabs
   - Mark notification as done
   - Open snooze dropdown
   - Navigate to Settings
   - Create/toggle/delete auto-archive rule
   - Switch themes

3. **Expected:** No errors in console
4. **Acceptable:** Warnings about dynamic imports (we already see these)
5. **Not Acceptable:** TypeScript errors, runtime errors, 404s

**Result:** ✅ No unexpected errors

---

## ✅ Final Pre-Launch Checklist

After completing all tests above:

- [ ] Free tier: Can create, toggle, delete 1 auto-archive rule ✅
- [ ] Free tier: Blocked from creating 2nd rule ✅
- [ ] Pro tier: Can create unlimited rules ✅
- [ ] Pro downgrade: Cleanup works, trims to 1 rule ✅
- [ ] Snooze dropdown: Has solid background ✅
- [ ] Build: Completes with no errors ✅
- [ ] Extension: Loads in Chrome from `dist/` ✅
- [ ] Fresh profile: Works for first-time users ✅
- [ ] Console: No unexpected errors ✅

---

## 🚀 If All Tests Pass

**You're ready to:**
1. Take Chrome Web Store screenshots
2. Enable GitHub Pages for privacy policy
3. Submit to Chrome Web Store

**If any test fails:**
- Document the issue
- Fix the bug
- Re-run all tests
- Re-build (`npm run build`)
- Re-test extension loading

---

## 📊 Test Results Summary

### Session: [Date]
- Test 1 (Free tier rules): ⬜ Pass / ⬜ Fail
- Test 2 (Pro tier rules): ⬜ Pass / ⬜ Fail
- Test 3 (Pro downgrade): ⬜ Pass / ⬜ Fail
- Test 4 (Snooze dropdown): ⬜ Pass / ⬜ Fail
- Test 5 (Build): ⬜ Pass / ⬜ Fail
- Test 6 (Extension load): ⬜ Pass / ⬜ Fail
- Test 7 (Fresh profile): ⬜ Pass / ⬜ Fail
- Test 8 (Console errors): ⬜ Pass / ⬜ Fail

**Overall Status:** ⬜ READY FOR LAUNCH / ⬜ NEEDS FIXES

---

Good luck! 🎉
