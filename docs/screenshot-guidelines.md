# Screenshot Guidelines for Chrome Web Store

Chrome Web Store requires landscape screenshots, but the extension popup is vertical (400x600). Here's how to capture screenshots that meet requirements while showcasing the extension.

---

## 📐 Requirements

**Chrome Web Store Screenshot Specs:**
- **Dimensions:** 1280x800 OR 640x400 (landscape, 16:10 ratio)
- **Format:** PNG or JPEG
- **Count:** Minimum 1, maximum 5
- **File size:** No explicit limit (keep under 1 MB each for fast loading)

**Current popup size:** 400px wide × 600px tall (vertical)

---

## ✅ Solution: Compose Screenshots with Context

Since the popup is vertical but screenshots must be landscape, we'll compose screenshots showing the extension **in context** with surrounding browser elements.

### 🎨 Layout Options

#### Option 1: Browser View with Popup (Recommended)
```
+----------------------------------------------------------------+
|  Browser toolbar  |  [Extension Icon]                         |
+----------------------------------------------------------------+
|                                 |                              |
|   GitHub Website                |   Extension Popup            |
|   (notifications page)          |   (400x600)                  |
|   - dimmed/blurred              |   - in focus                 |
|                                 |                              |
|                                 |                              |
+----------------------------------------------------------------+
     1280x800 total canvas
```

**How to create:**
1. Open GitHub notifications page in browser
2. Set browser window to 1280x800 or larger
3. Open extension popup (click icon)
4. Screenshot the entire browser window
5. Crop to 1280x800, centering the popup on right side

**Pros:**
- Shows extension in real use
- Provides context (GitHub website + extension)
- Meets landscape requirement
- Professional look

---

#### Option 2: Side-by-Side Comparison
```
+---------------------------------------------------------------+
|              Before                    |        After         |
+---------------------------------------------------------------+
|  GitHub notifications page             | Extension showing    |
|  (overwhelming list of 50 notifs)      | filtered view        |
|  - screenshot from GitHub              | - clean, organized   |
|                                        | - popup screenshot   |
+---------------------------------------------------------------+
     1280x800 canvas split in half
```

**How to create:**
1. Take screenshot of cluttered GitHub notifications page
2. Take screenshot of extension showing clean filtered view
3. Use image editor (Figma, Photoshop, or online tool) to combine
4. Add "Before" and "After" labels

**Pros:**
- Shows the problem + solution
- Highlights extension value
- Tells a story

---

#### Option 3: Feature Showcase Grid
```
+---------------------------------------------------------------+
|                  GitHub Notification Manager                  |
+---------------------------------------------------------------+
|  [Screenshot 1]    |  [Screenshot 2]    |  [Screenshot 3]     |
|  Filtering         |  Snooze            |  Keyboard Shortcuts |
|  (popup crop)      |  (popup crop)      |  (popup crop)       |
+---------------------------------------------------------------+
|               Feature descriptions below                       |
+---------------------------------------------------------------+
     1280x800 canvas with 3 popup screenshots side by side
```

**How to create:**
1. Take 3 separate popup screenshots showing different features
2. Use Figma/Canva to create 1280x800 canvas
3. Place 3 screenshots side by side
4. Add feature labels/descriptions

**Pros:**
- Shows multiple features in one screenshot
- Clean, professional
- Easy to understand

---

## 🛠️ Step-by-Step: Creating Browser Context Screenshots

### Method 1: macOS Built-in Screenshot Tool

1. **Set browser window size:**
   ```bash
   # Open browser, then resize to exactly 1280x800
   # Or use a tool like BetterSnapTool, Rectangle, or Magnet
   ```

2. **Prepare the scene:**
   - Open GitHub notifications page
   - Style with minimal tabs (close unnecessary tabs)
   - Click extension icon to open popup (400x600)
   - Position popup on right side of screen

3. **Take screenshot:**
   - Press `Cmd + Shift + 4` (macOS)
   - Drag to select the entire browser window
   - Screenshot saved to Desktop

4. **Crop to exact size:**
   - Open in Preview
   - Tools → Adjust Size → Enter 1280x800
   - Ensure "Scale proportionally" is checked
   - Save

### Method 2: Browser Developer Tools

1. **Use responsive design mode:**
   - Open Chrome DevTools (`Cmd + Opt + I` or `Ctrl + Shift + I`)
   - Click "Toggle device toolbar" (Cmd + Shift + M)
   - Set custom dimensions: 1280x800
   - Take screenshot (DevTools has built-in screenshot tool)

2. **Full-page screenshot:**
   - Open DevTools → Console
   - Type: `Cmd + Shift + P` (command palette)
   - Search: "Capture screenshot"
   - Select: "Capture screenshot" or "Capture full size screenshot"

### Method 3: Figma/Canva Composition (Most Flexible)

1. **Create canvas:**
   - Open Figma (free): https://figma.com
   - Create new frame: 1280x800
   - Set background color: #f6f8fa (GitHub gray)

2. **Add browser mockup:**
   - Search Figma Community for "browser mockup"
   - Or create simple browser chrome (toolbar, address bar)
   - Embed GitHub website screenshot as background

3. **Add popup screenshot:**
   - Take popup screenshot (400x600)
   - Drag into Figma canvas
   - Position on right side
   - Add subtle shadow for depth

4. **Polish:**
   - Add labels/annotations (arrows, text)
   - Highlight key features
   - Export as PNG (1280x800)

**Recommended Figma mockups:**
- Search "Browser Mockup" in Community
- Or use Chrome DevTools to capture clean browser UI

---

## 📸 Recommended Screenshots (5 Total)

### Screenshot 1: Overview (Hero Shot)
**Content:**
- Extension popup showing notification list
- Filter bar visible at top
- 8-10 notifications visible
- Clean, organized interface

**Context:**
- Show in browser with GitHub page in background
- Highlight the extension icon in toolbar

**Message:** "Manage all your GitHub notifications in one place"

---

### Screenshot 2: Smart Filtering
**Content:**
- Extension showing "Mentions" filter selected
- Only 2-3 notifications visible (filtered down from 10+)
- Filter counts visible: "All (12)" "Mentions (2)"

**Context:**
- Before/after split or browser view

**Message:** "Filter by type: unread, mentions, PRs, CI, and more"

---

### Screenshot 3: Snooze Feature
**Content:**
- Snooze menu open showing options (30min, 1hr, 3hrs, Tomorrow, etc.)
- Notification being snoozed
- Snoozed section visible with "3h" countdown

**Context:**
- Close-up of popup with annotation arrows

**Message:** "Snooze notifications until you're ready to handle them"

---

### Screenshot 4: Keyboard Shortcuts
**Content:**
- Keyboard shortcuts help modal visible
- Or show navigation with highlighted notification
- Keyboard overlay showing "j", "k", "m", "s" keys

**Context:**
- Full popup view with shortcuts modal

**Message:** "Lightning-fast navigation with keyboard shortcuts"

---

### Screenshot 5: Archive & Mark as Read
**Content:**
- Notification being archived or marked as read
- "Mark all as read" button visible
- Clean "All caught up!" state
- Or show archived section

**Context:**
- Popup showing action in progress (fade animation)

**Message:** "Mark as read, archive, or bulk actions — stay organized"

---

## 🎨 Design Tips

### Visual Consistency
- **Color scheme:** Use GitHub colors (blue #0969da, gray #24292f)
- **Typography:** System fonts (match GitHub style)
- **Icons:** Use consistent icon style throughout

### Annotations
- **Arrows:** Point to key features (use blue or red for visibility)
- **Labels:** Short, descriptive text (1-5 words)
- **Highlights:** Subtle circles or boxes around important UI

### Image Quality
- **Resolution:** High DPI (2x or 3x for retina displays)
- **Compression:** Use PNG for UI screenshots (lossless)
- **File size:** Aim for 200-500 KB per screenshot (under 1 MB)

---

## 🔧 Tools for Screenshot Editing

### Free Tools
- **Figma** (web/desktop): https://figma.com - Best for composition
- **Canva** (web): https://canva.com - Easy templates
- **GIMP** (desktop): https://gimp.org - Photoshop alternative
- **Preview** (macOS): Built-in, good for basic edits
- **Paint.NET** (Windows): https://getpaint.net - Simple editing

### Online Tools
- **Kapwing** (web): https://kapwing.com - Add annotations, resize
- **Photopea** (web): https://photopea.com - Free Photoshop in browser
- **Remove.bg** (web): https://remove.bg - Remove backgrounds

### macOS Screenshot Tools
- **CleanShot X** (paid): https://cleanshot.com - Pro screenshot tool
- **Shottr** (free): https://shottr.cc - Annotations, annotations
- **Xnapper** (paid): https://xnapper.com - Beautiful screenshots

---

## ✅ Screenshot Checklist

Before submitting:
- [ ] All screenshots are 1280x800 (or 640x400)
- [ ] PNG format, high quality
- [ ] File size under 1 MB each
- [ ] Show different features (don't repeat)
- [ ] Clear, readable text (no blurriness)
- [ ] Professional composition (no messy desktop)
- [ ] Consistent color scheme
- [ ] Annotations/labels are clear
- [ ] Show real use cases (realistic notifications)
- [ ] No sensitive information visible (private repos, emails, etc.)

---

## 🚀 Upload to Chrome Web Store

1. Go to Chrome Web Store Developer Dashboard
2. Navigate to Store Listing → Screenshots
3. Upload 5 screenshots (1280x800 PNG)
4. Reorder as needed (drag and drop)
5. Preview on different devices (desktop, mobile)

**Order recommendation:**
1. Hero shot (overview)
2. Filtering
3. Snooze
4. Keyboard shortcuts
5. Mark as read / Archive

---

## 💡 Pro Tips

1. **Use real data:** Show realistic GitHub notifications (not lorem ipsum)
2. **Tell a story:** Each screenshot should demonstrate a pain point → solution
3. **Highlight benefits:** Not just features, but how they help users
4. **Keep it simple:** Don't overcomplicate with too many annotations
5. **Test on mobile:** Preview screenshots on small screens (readability)
6. **A/B test:** Try different compositions, see which converts better

---

**Need help?** If you're stuck on creating screenshots, I can help you design Figma mockups or suggest specific tools based on your operating system!
