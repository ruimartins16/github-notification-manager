# Testing Instructions for GNM-001

## ✅ Foundation Setup Complete!

All files have been created and the project builds successfully.

---

## 🧪 How to Test the Extension in Chrome

### Step 1: Start Development Server

```bash
cd /Users/ruimartins/Documents/dev/ai/github-notification-manager
npm run dev
```

This will start Vite's dev server with hot module reloading.

### Step 2: Load Extension in Chrome

1. Open Chrome browser
2. Navigate to `chrome://extensions`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"** button
5. Select the `dist` folder from this project:
   ```
   /Users/ruimartins/Documents/dev/ai/github-notification-manager/dist
   ```
6. The extension should appear in your extensions list!

### Step 3: Test the Extension

1. **Click the extension icon** in your Chrome toolbar
   - You should see a popup (400x600px)
   - The popup displays "GitHub Notification Manager"
   - GitHub-inspired color scheme is applied
   - Test button should be clickable

2. **Test the counter button**
   - Click the blue "Test Button"
   - Counter should increment
   - This confirms React state management is working

3. **Open Chrome DevTools**
   - Right-click the popup
   - Select "Inspect"
   - Check the Console tab for any errors
   - Should see: "GitHub Notification Manager: Background service worker loaded"

4. **Check the background service worker**
   - Go to `chrome://extensions`
   - Find "GitHub Notification Manager"
   - Click "service worker" link
   - DevTools opens - check for console logs
   - Should see: "Extension installed: install" and "GitHub Notification Manager initialized"

---

## ✅ Acceptance Criteria Checklist (GNM-001)

- [x] Vite + CRXJS project initialized with TypeScript
- [x] React 18 configured with hot module reloading
- [x] Tailwind CSS configured with custom theme
- [x] Manifest V3 properly configured with permissions
- [x] Basic folder structure established (components, hooks, utils, types)
- [x] ESLint + Prettier configured
- [x] Development build runs successfully
- [ ] Extension loads in Chrome without errors ← **TEST THIS NOW**

---

## 🐛 Troubleshooting

### Extension doesn't appear after loading
- Make sure you selected the `dist` folder, not the root folder
- Run `npm run build` to create the dist folder if it doesn't exist
- Check that manifest.json exists in `dist/`

### Popup doesn't open
- Check `chrome://extensions` for any errors
- Right-click the extension icon and check for error messages
- Verify the build completed successfully

### Console errors in popup
- Open DevTools on the popup (right-click popup → Inspect)
- Check for TypeScript or React errors
- Common issue: icon paths - we're using SVG placeholders

### Background service worker not loading
- Go to `chrome://extensions`
- Click "service worker" under the extension
- Check for syntax errors in the console

---

## 🎯 Expected Behavior

When everything works correctly:

1. ✅ Extension icon appears in Chrome toolbar (blue square with "GH")
2. ✅ Clicking icon opens a 400x600px popup
3. ✅ Popup displays with GitHub-style colors and fonts
4. ✅ Test button increments counter on click
5. ✅ Background service worker loads without errors
6. ✅ No console errors in popup or background worker
7. ✅ Badge can be set (empty for now)
8. ✅ Hot reload works (edit src/popup/App.tsx and save - popup updates)

---

## 📸 Screenshot Reference

The popup should look like this:

```
┌────────────────────────────────────┐
│  GitHub Notification Manager       │
│  Take control of your GitHub       │
│  notifications                     │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐ │
│  │ Foundation Setup Complete! ✅│ │
│  │                              │ │
│  │ The Chrome extension is      │ │
│  │ running with React,          │ │
│  │ TypeScript, and Tailwind CSS.│ │
│  │                              │ │
│  │ [Test Button (clicked N)]    │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ Next Steps:                  │ │
│  │ • GNM-002: GitHub OAuth      │ │
│  │ • GNM-003: Fetch notifications│ │
│  │ • GNM-004: Build UI          │ │
│  └──────────────────────────────┘ │
├────────────────────────────────────┤
│  Built with React + TypeScript +   │
│  Tailwind CSS                      │
└────────────────────────────────────┘
```

---

## 🚀 Next Steps After Testing

Once you confirm the extension loads successfully:

1. Mark GNM-001 as **DONE** ✅
2. Move to **GNM-002: GitHub OAuth Implementation**
3. Commit your code to git:
   ```bash
   git add .
   git commit -m "feat(GNM-001): Complete foundation setup with React, TypeScript, Tailwind, and CRXJS"
   git push
   ```

---

## 📝 Notes

- **Icons:** Currently using SVG placeholders. Replace with PNG before Chrome Web Store submission.
- **OAuth Client ID:** Placeholder in manifest.json - will be configured in GNM-002
- **Hot Reload:** Works for popup code, but background worker requires manual reload
- **TypeScript:** Strict mode enabled - all code must be type-safe

---

**Ready to test? Run `npm run dev` and load the extension!** 🎉
