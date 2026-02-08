/**
 * Status Refresh Helper
 * 
 * Centralized utility for triggering Pro status refreshes across all contexts.
 * Sets storage flags AND broadcasts messages to ensure immediate UI updates.
 */

/**
 * Trigger a Pro status refresh across the extension
 * 
 * This function:
 * 1. Sets a flag in storage for persistence
 * 2. Broadcasts a message to all open popups/tabs
 * 3. Ensures immediate UI updates without requiring popup reload
 * 
 * @param reason - Why the refresh was triggered (for logging)
 */
export async function triggerStatusRefresh(reason: 'payment' | 'login' | 'logout' | 'manual'): Promise<void> {
  console.log(`[StatusRefresh] 🚀 TRIGGERING status refresh: ${reason}`)
  
  try {
    // Clear the ExtPay cache
    console.log('[StatusRefresh] Step 1: Clearing ExtPay cache')
    await chrome.storage.local.remove('extpay_user_cache')
    
    // Set appropriate flag based on reason
    const flagKey = reason === 'payment' ? 'extpay_payment_pending' 
                  : reason === 'login' ? 'extpay_login_pending'
                  : 'status_changed'
    
    console.log(`[StatusRefresh] Step 2: Setting flag: ${flagKey}`)
    await chrome.storage.local.set({ [flagKey]: true })
    
    // Verify flag was set
    const verification = await chrome.storage.local.get(flagKey)
    console.log(`[StatusRefresh] Flag verified: ${flagKey} = ${verification[flagKey]}`)
    
    // Broadcast message to all listeners (popup, options page, etc.)
    // This ensures immediate updates without waiting for storage polling
    try {
      // Check if chrome.runtime is available (it won't be in tests)
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        console.log('[StatusRefresh] Step 3: Broadcasting message to all listeners')
        await chrome.runtime.sendMessage({
          type: 'PRO_STATUS_CHANGED',
          reason,
          timestamp: Date.now()
        })
        console.log('[StatusRefresh] ✅ Message broadcasted successfully')
      } else {
        console.log('[StatusRefresh] ⚠️ chrome.runtime.sendMessage not available (test environment?)')
      }
    } catch (messageError) {
      // Message sending can fail if no receivers are listening (e.g., popup closed)
      // This is okay - the flag will be picked up when popup opens
      console.log('[StatusRefresh] ℹ️ Message broadcast failed (no receivers):', messageError)
    }
    
    console.log(`[StatusRefresh] ✅ Refresh triggered successfully: ${reason}`)
  } catch (error) {
    console.error('[StatusRefresh] ❌ Failed to trigger refresh:', error)
    throw error
  }
}
