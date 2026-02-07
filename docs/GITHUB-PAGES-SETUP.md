# GitHub Pages Setup for Privacy Policy

This guide explains how to deploy the privacy policy to GitHub Pages so it's publicly accessible.

## Quick Setup (5 minutes)

### Step 1: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. Click **Pages** (left sidebar)
4. Under "Source", select:
   - **Branch**: `main`
   - **Folder**: `/docs`
5. Click **Save**

### Step 2: Wait for Deployment

GitHub will automatically build and deploy your site. This takes 1-2 minutes.

You can check the status:
- Go to **Actions** tab in your repository
- Look for "pages build and deployment" workflow
- Wait until it shows a green checkmark ✓

### Step 3: Access Your Privacy Policy

Once deployed, your privacy policy will be available at:

```
https://yourusername.github.io/github-notification-manager/privacy-policy.html
```

Replace `yourusername` with your actual GitHub username.

### Step 4: Update Privacy Policy Link in Extension

After deployment, update the link in `src/components/SettingsPage.tsx`:

**Before:**
```tsx
href="https://github.com/yourusername/github-notification-manager/blob/main/docs/privacy-policy.md"
```

**After:**
```tsx
href="https://yourusername.github.io/github-notification-manager/privacy-policy.html"
```

This ensures users see the rendered HTML version instead of raw markdown.

## Verification

To verify it's working:

1. Visit: `https://yourusername.github.io/github-notification-manager/privacy-policy.html`
2. You should see your privacy policy rendered as a web page
3. Verify all sections are visible (scroll to "Payment Information" section)

## Troubleshooting

### "404 Not Found" Error

**Cause**: GitHub Pages hasn't finished deploying yet.

**Solution**: 
- Wait 2-3 minutes
- Check Actions tab for deployment status
- Refresh the page

### Privacy Policy Not Updating

**Cause**: GitHub Pages cache hasn't cleared yet.

**Solution**:
- Wait 1-2 minutes for cache to clear
- Hard refresh in browser (Ctrl+Shift+R or Cmd+Shift+R)
- Try incognito/private browsing mode

### Link Shows Raw Markdown

**Cause**: You're linking to the GitHub blob URL instead of GitHub Pages.

**Solution**: Use the GitHub Pages URL format:
```
https://yourusername.github.io/github-notification-manager/privacy-policy.html
```

NOT:
```
https://github.com/yourusername/github-notification-manager/blob/main/docs/privacy-policy.md
```

## Updating the Privacy Policy

When you update `docs/privacy-policy.md`:

1. Commit and push changes to `main` branch
2. GitHub Pages automatically rebuilds (takes 1-2 minutes)
3. Changes appear at the GitHub Pages URL
4. No additional configuration needed

## Custom Domain (Optional)

If you want to use a custom domain like `privacy.yourdomain.com`:

1. Add a `CNAME` file to `/docs` directory:
   ```
   privacy.yourdomain.com
   ```

2. Configure DNS records at your domain provider:
   - Add a CNAME record pointing to `yourusername.github.io`

3. In GitHub Settings > Pages:
   - Enter your custom domain
   - Enable "Enforce HTTPS"

## Security

GitHub Pages uses HTTPS automatically. Your privacy policy will be served over a secure connection.

## Cost

GitHub Pages is **free** for public repositories.

## Next Steps

After deploying:
- ✅ Verify privacy policy is accessible
- ✅ Update link in SettingsPage.tsx
- ✅ Test the link from extension settings
- ✅ Include privacy policy URL in Chrome Web Store listing
