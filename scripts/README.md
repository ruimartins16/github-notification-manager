# Debug Utility Scripts

These scripts are meant to be run in the browser console (DevTools) when the extension popup is open.

## clear-dismissed.js
Clears all dismissed notifications from the extension's storage, making them visible again.

**Usage:**
1. Open extension popup
2. Right-click → Inspect (or F12)
3. Copy and paste the contents of `clear-dismissed.js` into the console
4. Press Enter
5. Refresh the popup

## check-etag-status.js
Checks the current ETag cache status and shows when the next force refresh will occur.

**Usage:**
1. Open extension popup  
2. Right-click → Inspect (or F12)
3. Copy and paste the contents of `check-etag-status.js` into the console
4. Press Enter
