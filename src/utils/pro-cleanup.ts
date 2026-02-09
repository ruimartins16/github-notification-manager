/**
 * Pro Cleanup Utility
 * 
 * Handles cleanup of Pro-tier data when user downgrades from Pro to Free tier.
 * This ensures free-tier limits are respected and no orphaned Pro data remains.
 */

import { NOTIFICATIONS_STORAGE_KEY } from './notification-service'

/**
 * Maximum number of auto-archive rules for free tier
 */
const FREE_TIER_MAX_RULES = 1

/**
 * Clean up Pro-tier data when user downgrades to free tier
 * 
 * This function:
 * 1. Limits auto-archive rules to FREE_TIER_MAX_RULES (keeps most recent)
 * 2. Clears all snoozed notifications
 * 3. Logs cleanup actions for debugging
 * 
 * @returns Promise<void>
 */
export async function cleanupProTierData(): Promise<void> {
  console.log('[ProCleanup] 🧹 Starting Pro-tier data cleanup for free tier')
  
  try {
    // Get current notification store state
    const result = await chrome.storage.local.get(NOTIFICATIONS_STORAGE_KEY)
    const storeData = result[NOTIFICATIONS_STORAGE_KEY]
    
    if (!storeData) {
      console.log('[ProCleanup] No notification store data found, nothing to clean')
      return
    }
    
    // Parse the store data (it's JSON string from Zustand persist)
    let parsed
    try {
      parsed = typeof storeData === 'string' ? JSON.parse(storeData) : storeData
    } catch (e) {
      console.error('[ProCleanup] Failed to parse store data:', e)
      return
    }
    
    if (!parsed.state) {
      console.log('[ProCleanup] No state in store data, nothing to clean')
      return
    }
    
    const state = parsed.state
    let hasChanges = false
    
    // 1. Clean up auto-archive rules (keep only the most recent rule)
    if (state.autoArchiveRules && Array.isArray(state.autoArchiveRules) && state.autoArchiveRules.length > FREE_TIER_MAX_RULES) {
      const originalCount = state.autoArchiveRules.length
      
      // Sort by creation time (most recent first) and keep only FREE_TIER_MAX_RULES
      const sortedRules = [...state.autoArchiveRules].sort((a, b) => {
        const timeA = a.createdAt || 0
        const timeB = b.createdAt || 0
        return timeB - timeA // Most recent first
      })
      
      state.autoArchiveRules = sortedRules.slice(0, FREE_TIER_MAX_RULES)
      hasChanges = true
      
      console.log(`[ProCleanup] ✂️ Trimmed auto-archive rules from ${originalCount} to ${FREE_TIER_MAX_RULES}`)
    }
    
    // 2. Clear all snoozed notifications (Pro-only feature)
    if (state.snoozedNotifications && Array.isArray(state.snoozedNotifications) && state.snoozedNotifications.length > 0) {
      const snoozedCount = state.snoozedNotifications.length
      state.snoozedNotifications = []
      hasChanges = true
      
      console.log(`[ProCleanup] 🔔 Cleared ${snoozedCount} snoozed notifications`)
    }
    
    // 3. Save changes if any
    if (hasChanges) {
      const updatedData = typeof storeData === 'string' 
        ? JSON.stringify({ ...parsed, state })
        : { ...parsed, state }
      
      await chrome.storage.local.set({ [NOTIFICATIONS_STORAGE_KEY]: updatedData })
      console.log('[ProCleanup] ✅ Pro-tier data cleanup completed successfully')
    } else {
      console.log('[ProCleanup] ℹ️ No cleanup needed, data already within free tier limits')
    }
    
  } catch (error) {
    console.error('[ProCleanup] ❌ Failed to clean up Pro-tier data:', error)
    throw error
  }
}

/**
 * Check if cleanup is needed (used for testing/diagnostics)
 * Returns true if user has Pro-tier data that would need cleanup
 */
export async function needsProCleanup(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(NOTIFICATIONS_STORAGE_KEY)
    const storeData = result[NOTIFICATIONS_STORAGE_KEY]
    
    if (!storeData) return false
    
    const parsed = typeof storeData === 'string' ? JSON.parse(storeData) : storeData
    if (!parsed.state) return false
    
    const state = parsed.state
    
    // Check if rules exceed free tier limit
    const hasExcessRules = state.autoArchiveRules && 
                          Array.isArray(state.autoArchiveRules) && 
                          state.autoArchiveRules.length > FREE_TIER_MAX_RULES
    
    // Check if there are snoozed notifications
    const hasSnoozed = state.snoozedNotifications && 
                       Array.isArray(state.snoozedNotifications) && 
                       state.snoozedNotifications.length > 0
    
    return hasExcessRules || hasSnoozed
  } catch (error) {
    console.error('[ProCleanup] Failed to check cleanup status:', error)
    return false
  }
}
