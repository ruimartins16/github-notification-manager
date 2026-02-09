# GitHush - Quick Reference Card

## 🚀 Quick Start Commands

### Build Extension
```bash
npm run build
```

### Load in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist/` folder

---

## 🧪 Testing Shortcuts

### Set Free Tier
```javascript
localStorage.setItem('gnm-pro-cache', JSON.stringify({
  isPro: false, plan: null, timestamp: Date.now()
}))
location.reload()
```

### Set Pro Tier
```javascript
localStorage.setItem('gnm-pro-cache', JSON.stringify({
  isPro: true, plan: 'Pro', timestamp: Date.now()
}))
location.reload()
```

### Check Auto-Archive Rules Count
```javascript
chrome.storage.local.get('zustand-notifications', (r) => {
  const data = JSON.parse(r['zustand-notifications'])
  console.log('Rules:', data.state.autoArchiveRules.length)
})
```

---

## 📦 Storage Keys

| Key | Type | Format | Contains |
|-----|------|--------|----------|
| `zustand-notifications` | chrome.storage | STRING | Zustand state (rules, snoozes) |
| `notifications` | chrome.storage | ARRAY | Background worker cache |
| `gnm-pro-cache` | localStorage | JSON | Pro status cache |
| `gnm-theme-cache` | localStorage | STRING | Theme preference |

---

## 🎯 Free vs Pro Features

### Free Tier
- ✅ Core notification management
- ✅ 1 auto-archive rule (create, toggle, delete)
- ✅ Basic keyboard shortcuts (? for help)
- ✅ Light theme
- ❌ No snooze
- ❌ No dark mode

### Pro Tier (€3/month or €15 lifetime)
- ✅ Everything in Free
- ✅ Unlimited snoozes
- ✅ Unlimited auto-archive rules
- ✅ Full keyboard shortcuts (J/K, D, A, S, O)
- ✅ Dark mode

---

## 📋 Launch Checklist

### Phase 3: Pre-Launch (Current)
- [ ] Run TESTING-GUIDE.md (8 test suites)
- [ ] Enable GitHub Pages (GITHUB-PAGES-SETUP.md)
- [ ] Take 5 screenshots (CHROME-STORE-ASSETS.md)
- [ ] Annotate screenshots

### Phase 4: Submission
- [ ] Create Chrome dev account ($5)
- [ ] ZIP dist/ folder
- [ ] Submit with CHROME-STORE-ASSETS.md copy
- [ ] Wait for review (1-3 days)

---

## 🐛 Recent Bug Fixes

| Bug | Status | File |
|-----|--------|------|
| Snooze dropdown transparency | ✅ Fixed | SnoozeButton.tsx:140 |
| Pro downgrade cleanup | ✅ Fixed | pro-cleanup.ts, useProStatus.ts |
| Free tier can't create rule | ✅ Fixed | AutoArchiveRules.tsx |
| Free tier can't toggle/delete | ✅ Fixed | RuleList.tsx |

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| SESSION-SUMMARY.md | Complete session overview |
| TESTING-GUIDE.md | 8 comprehensive test suites |
| CHROME-STORE-ASSETS.md | Store listing & screenshots |
| GITHUB-PAGES-SETUP.md | Enable privacy policy URL |
| README.md | Project overview |
| QUICK-REFERENCE.md | This file |

---

## 🔗 Important URLs

- **Repository:** https://github.com/ruimartins16/github-notification-manager
- **Privacy Policy:** https://ruimartins16.github.io/github-notification-manager/privacy-policy.html
- **Chrome Web Store:** (pending submission)
- **Chrome Dev Dashboard:** https://chrome.google.com/webstore/devconsole/

---

## 💡 Common Issues

### Extension won't load
- Check `dist/` folder exists
- Run `npm run build` first
- Check `manifest.json` is in `dist/`

### Tests failing
- Clear storage: Dev Tools → Application → Storage → Clear
- Reload extension: `chrome://extensions/` → Reload icon
- Check console for errors

### Build errors
- Run `npm install` to update dependencies
- Check TypeScript version
- Look for missing imports

---

## 🎉 Quick Win Checklist

Before taking screenshots:
- [ ] Build extension (`npm run build`)
- [ ] Load in Chrome (unpacked from dist/)
- [ ] Sign in with GitHub
- [ ] Set Pro tier (for Pro screenshots)
- [ ] Enable dark mode (for Settings screenshot)
- [ ] Create 2-3 example rules
- [ ] Clear console errors
- [ ] Ready to capture! 📸

---

**Current Status:** Production ready, pending testing and submission
**Next Step:** Run TESTING-GUIDE.md
**Time to Launch:** ~2.5 hours of work + 1-3 days review

---

Print this file or keep it open for quick reference during testing and submission! 🚀
