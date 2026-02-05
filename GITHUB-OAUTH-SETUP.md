# GitHub OAuth Setup Instructions

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
https://YOUR_EXTENSION_ID.chromiumapp.org/
```

**Note:** For development, you can use a placeholder like:
```
https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org/
```

You'll update this with the real extension ID after loading it in Chrome.

### 3. Get Your Client ID

After creating the app:
1. You'll see your **Client ID** - copy this
2. **DO NOT** generate a Client Secret (not needed for Chrome extensions)
3. The Client ID is public and will be embedded in your extension

### 4. Update manifest.json

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

### 5. Get Your Extension ID

After you load the extension in Chrome:
1. Go to `chrome://extensions`
2. Find "GitHub Notification Manager"
3. Copy the Extension ID (long string like: `abcdefghijklmnopqrstuvwxyz123456`)
4. Update the GitHub OAuth App's callback URL:
   ```
   https://YOUR_ACTUAL_EXTENSION_ID.chromiumapp.org/
   ```

**Current Development Extension ID:**
```
odbbnhlpfpcmmmbnbochjomjogkmnioc
```

**Current Callback URL:**
```
https://odbbnhlpfpcmmmbnbochjomjogkmnioc.chromiumapp.org/
```

---

## Step 2: Environment Configuration (Optional)

For local development, you can create a `.env.local` file:

```bash
VITE_GITHUB_CLIENT_ID=your_client_id_here
```

Then update `manifest.json` to use:
```json
"client_id": "__VITE_GITHUB_CLIENT_ID__"
```

**Note:** This is optional. For simplicity, you can hardcode the Client ID in manifest.json since it's public anyway.

---

## Step 3: Test OAuth Flow

Once configured:
1. Load extension in Chrome
2. Click extension icon
3. Click "Connect GitHub" button
4. GitHub authorization page should open
5. Approve the app
6. You should be redirected back to the extension
7. Extension stores the access token

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

### "Invalid callback URL" error
- Make sure the callback URL in GitHub matches your extension ID exactly
- Format: `https://EXTENSION_ID.chromiumapp.org/`
- No trailing slash after the domain

### OAuth popup doesn't open
- Check that `identity` permission is in manifest.json
- Verify Client ID is correct
- Check browser console for errors

### Token not persisting
- Verify `storage` permission is in manifest.json
- Check that chrome.storage.local is working

---

## For Production

When publishing to Chrome Web Store:
1. Create a separate GitHub OAuth App for production
2. Use the production extension ID in the callback URL
3. Update manifest.json with production Client ID
4. Test the OAuth flow thoroughly

---

**Next:** Once you have your Client ID, update `manifest.json` and the extension will be ready to authenticate!
