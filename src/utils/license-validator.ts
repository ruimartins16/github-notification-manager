/**
 * License Validation and Caching
 * 
 * Handles license validation on extension startup and caches results
 * in chrome.storage.local for offline access and fast loading.
 */

import { extPayService, type ProUser } from './extpay-service'

/** Cache key for storing user data in chrome.storage.local */
const CACHE_KEY = 'extpay_user_cache'

/** Cache TTL: 24 hours for normal refresh */
const CACHE_TTL = 24 * 60 * 60 * 1000

/** Extended cache TTL: 7 days for offline fallback */
const EXTENDED_CACHE_TTL = 7 * 24 * 60 * 60 * 1000

/**
 * Cached user data with timestamp
 */
export interface CachedUser {
  user: ProUser
  timestamp: number
  version: number // For future migrations
}

/**
 * Current cache version (increment on breaking changes)
 */
const CACHE_VERSION = 1

/**
 * Validate user's license and return Pro status
 * 
 * Workflow:
 * 1. Check cache (if fresh < 24h, return cached)
 * 2. Fetch from ExtPay (if successful, cache and return)
 * 3. On error: return cached if < 7 days, else return free tier
 * 
 * This ensures:
 * - Fast loading (cached data)
 * - Offline support (7-day grace period)
 * - Fresh data (24h refresh)
 * 
 * @param forceRefresh - Skip cache and fetch fresh data
 * @returns User's Pro status
 */
export async function validateLicense(forceRefresh = false): Promise<ProUser> {
  try {
    // Try cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getCachedUser()
      if (cached && isCacheFresh(cached.timestamp, CACHE_TTL)) {
        console.log('[LicenseValidator] Using cached user (fresh)')
        return cached.user
      }
    }
    
    // Fetch fresh from ExtPay
    console.log('[LicenseValidator] Fetching fresh user data')
    const user = await extPayService.getUser()
    
    // Cache the result
    await cacheUser(user)
    
    return user
  } catch (error) {
    console.error('[LicenseValidator] Failed to validate license:', error)
    
    // Try to use cached data as fallback (extended TTL for offline)
    const cached = await getCachedUser()
    if (cached && isCacheFresh(cached.timestamp, EXTENDED_CACHE_TTL)) {
      console.warn('[LicenseValidator] Using stale cached user (offline fallback)')
      return cached.user
    }
    
    // No cache or too old - return free tier
    console.warn('[LicenseValidator] No valid cache, returning free tier')
    return getFreeTierUser()
  }
}

/**
 * Get cached user data from chrome.storage.local
 * Returns null if no cache or invalid cache
 */
export async function getCachedUser(): Promise<CachedUser | null> {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY)
    const cached = result[CACHE_KEY] as CachedUser | undefined
    
    if (!cached) {
      return null
    }
    
    // Validate cache structure
    if (!cached.user || typeof cached.timestamp !== 'number') {
      console.warn('[LicenseValidator] Invalid cache structure, clearing')
      await clearCache()
      return null
    }
    
    // Check cache version (for future migrations)
    if (cached.version !== CACHE_VERSION) {
      console.warn('[LicenseValidator] Cache version mismatch, clearing')
      await clearCache()
      return null
    }
    
    return cached
  } catch (error) {
    console.error('[LicenseValidator] Failed to get cached user:', error)
    return null
  }
}

/**
 * Cache user data to chrome.storage.local
 */
export async function cacheUser(user: ProUser): Promise<void> {
  try {
    const cached: CachedUser = {
      user,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    }
    
    await chrome.storage.local.set({ [CACHE_KEY]: cached })
    console.log('[LicenseValidator] User cached successfully')
  } catch (error) {
    console.error('[LicenseValidator] Failed to cache user:', error)
  }
}

/**
 * Clear cached user data
 * Call this on logout or when explicitly requested
 */
export async function clearCache(): Promise<void> {
  try {
    await chrome.storage.local.remove(CACHE_KEY)
    console.log('[LicenseValidator] Cache cleared')
  } catch (error) {
    console.error('[LicenseValidator] Failed to clear cache:', error)
  }
}

/**
 * Check if cached data is still fresh
 */
function isCacheFresh(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp < ttl
}

/**
 * Get a free tier user object (fallback)
 */
function getFreeTierUser(): ProUser {
  return {
    isPro: false,
    paidAt: null,
    email: null,
    plan: null,
    installedAt: new Date(),
    subscriptionStatus: undefined,
    subscriptionCancelAt: undefined,
  }
}

/**
 * Update cached user after payment success
 * Call this from onPaid callback
 */
export async function updateCacheOnPayment(user: ProUser): Promise<void> {
  await cacheUser(user)
  console.log('[LicenseValidator] Cache updated after payment')
}

/**
 * Get cache age in milliseconds
 * Useful for UI to show "last refreshed" info
 */
export async function getCacheAge(): Promise<number | null> {
  const cached = await getCachedUser()
  if (!cached) {
    return null
  }
  return Date.now() - cached.timestamp
}

/**
 * Check if cache is expired (needs refresh)
 */
export async function isCacheExpired(): Promise<boolean> {
  const cached = await getCachedUser()
  if (!cached) {
    return true
  }
  return !isCacheFresh(cached.timestamp, CACHE_TTL)
}
