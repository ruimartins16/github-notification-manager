# GitHub Pages Setup Guide

## Enable GitHub Pages for Privacy Policy

Follow these steps to make your privacy policy accessible at:
`https://ruimartins16.github.io/github-notification-manager/privacy-policy.html`

### Step 1: Go to Repository Settings

1. Navigate to: https://github.com/ruimartins16/github-notification-manager
2. Click **"Settings"** tab (top right)

### Step 2: Enable GitHub Pages

1. Scroll down to **"Pages"** in the left sidebar (under "Code and automation")
2. Click on **"Pages"**

### Step 3: Configure Source

1. Under **"Build and deployment"**:
   - **Source:** Select "Deploy from a branch"
   - **Branch:** Select `main`
   - **Folder:** Select `/docs`
2. Click **"Save"**

### Step 4: Wait for Deployment

- GitHub will automatically build and deploy your site
- This usually takes 30-60 seconds
- You'll see a message: "Your site is ready to be published at..."
- When done, it will show: "Your site is live at..."

### Step 5: Verify Privacy Policy is Live

1. Visit: https://ruimartins16.github.io/github-notification-manager/privacy-policy.html
2. You should see your privacy policy page
3. This is the URL you'll use for Chrome Web Store submission

### Troubleshooting

**If the page doesn't load:**
- Wait 2-3 minutes for GitHub's CDN to propagate
- Check that `docs/privacy-policy.html` exists in the `main` branch
- Make sure the path is exactly `/docs` not `/docs/` or `docs`
- Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)

**If you get a 404:**
- Verify the file exists at: https://github.com/ruimartins16/github-notification-manager/blob/main/docs/privacy-policy.html
- Check that GitHub Pages source is set to `main` branch and `/docs` folder
- Try accessing the root first: https://ruimartins16.github.io/github-notification-manager/

### What's Published

Currently in your `/docs` folder:
- ✅ `privacy-policy.html` - Privacy policy page (required for Chrome Web Store)

This file will be publicly accessible once GitHub Pages is enabled.

### Next Steps After GitHub Pages is Live

1. ✅ Verify privacy policy URL works
2. Use this URL in Chrome Web Store submission: 
   ```
   https://ruimartins16.github.io/github-notification-manager/privacy-policy.html
   ```
3. Proceed with Chrome Web Store submission

---

**Note:** GitHub Pages for public repositories is completely free! No payment required.
