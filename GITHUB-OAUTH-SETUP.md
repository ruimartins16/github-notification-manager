# GitHub OAuth Setup Instructions

## Important: Using Device Flow

This extension uses **GitHub's Device Flow** for authentication, which is designed for applications without direct web browser access (like CLI tools and browser extensions).

**Benefits:**
- ✅ No callback URL needed
- ✅ No server-side token exchange required
- ✅ Secure and recommended by GitHub for extensions
- ✅ User-friendly authorization flow

## Step 1: Register GitHub OAuth App

To enable GitHub authentication in the extension, you need to create a GitHub OAuth App:

### 1. Go to GitHub Developer Settings

Visit: https://github.com/settings/developers

Or navigate:
1. GitHub.com → Your Profile → Settings
2. Scroll down to "Developer settings" (bottom left)
3. Click "OAuth Apps"
4. Click "New OAuth App"

### 2. Fill in the Application Details

**Application name:**
```
GitHub Notification Manager (Development)
```

**Homepage URL:**
```
https://github.com/YOUR_USERNAME/github-notification-manager
```

**Application description:**
```
Chrome extension to manage GitHub notifications with filters, snooze, and keyboard shortcuts
```

**Authorization callback URL:**
```
http://localhost (placeholder - not used with Device Flow)
```

**Note:** The callback URL is required when creating the app, but it's not actually used with Device Flow. You can use any placeholder like `http://localhost`.

### 3. Enable Device Flow

**IMPORTANT:** You must enable Device Flow for the extension to work.

1. On your OAuth App settings page, scroll down
2. Find "Enable Device Flow" checkbox
3. **Check the box** to enable it
4. Click "Update application"

### 4. Get Your Client ID

After creating the app:
1. You'll see your **Client ID** - copy this
2. **DO NOT** generate a Client Secret (not needed for Chrome extensions)
3. The Client ID is public and will be embedded in your extension

### 5. Update manifest.json

Open `manifest.json` and replace the placeholder:

```json
"oauth2": {
  "client_id": "YOUR_ACTUAL_GITHUB_CLIENT_ID_HERE",
  "scopes": [
    "notifications",
    "read:user"
  ]
}
```

---

## Step 2: How Device Flow Works

When you click "Connect GitHub" in the extension:

1. Extension requests a device code from GitHub
2. Extension opens GitHub in a new tab
3. GitHub shows you a code to verify
4. You confirm the code and authorize the app
5. Extension automatically receives your access token
6. You're authenticated!

**User Experience:**
- Click "Connect GitHub" → New tab opens
- GitHub shows: "Device Activation" page with a code
- Click "Continue" and authorize
- Close the tab and return to extension
- Extension shows "✓ Connected"

---

## Step 3: Build and Load Extension (Development)

---

## Step 4: Test Device Flow

Once configured:
1. Build and load extension in Chrome (`npm run build`)
2. Click extension icon
3. Click "Connect GitHub" button
4. New tab opens to GitHub device activation page
5. GitHub shows a verification code
6. Click "Continue" and authorize the scopes (notifications, read:user)
7. Close the GitHub tab
8. Return to extension - should show "✓ Connected"
9. Extension polls GitHub in background and gets your token automatically

---

## Security Notes

✅ **Safe to commit:**
- GitHub OAuth Client ID (it's public)
- Scopes (notifications, read:user)

❌ **NEVER commit:**
- Client Secret (we don't use this)
- Access tokens
- Personal data

---

## Scopes Explained

**notifications:** Required to read and mark notifications as read
**read:user:** Required to get user profile info (name, avatar)

These are read-only scopes with minimal permissions.

---

## Troubleshooting

### "Device flow not enabled" error
- Make sure you enabled Device Flow in your GitHub OAuth App settings
- Go to https://github.com/settings/developers
- Click your app → Check "Enable Device Flow" → Update application

### "Authorization expired" error
- The device code expires after 15 minutes
- Simply click "Connect GitHub" again to get a new code

### OAuth tab doesn't open
- Check that browser has permission to open new tabs
- Verify Client ID is correct in manifest.json
- Check browser console for errors

### "Authorization pending" for too long
- Make sure you clicked "Continue" on the GitHub page
- Check that you authorized the correct scopes
- The extension polls every 5 seconds - be patient

### Token not persisting
- Verify `storage` permission is in manifest.json
- Check that chrome.storage.local is working
- Try disconnecting and reconnecting

---

## Development Notes

**Current Development Client ID:** `Ov23lizRYABSJ6d1qdVQ`  
**Extension ID:** `odbbnhlpfpcmmmbnbochjomjogkmnioc`  
**Callback URL:** Not used (Device Flow doesn't need it)

---

## For Production

When publishing to Chrome Web Store:
1. Keep the same GitHub OAuth App (or create production version)
2. Ensure Device Flow is enabled
3. Update manifest.json with Client ID
4. Test the Device Flow thoroughly
5. No need to update callback URL (Device Flow doesn't use it)

---

**Next:** Once you have your Client ID, update `manifest.json` and the extension will be ready to authenticate!
