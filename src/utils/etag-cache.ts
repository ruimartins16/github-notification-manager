/**
 * ETag Cache - Stores ETags for GitHub API endpoints
 * 
 * GitHub's API returns ETag headers which can be used for conditional requests.
 * By sending "If-None-Match" with the ETag, GitHub will return:
 * - 304 Not Modified if data hasn't changed (doesn't count against rate limit!)
 * - 200 OK with fresh data if anything changed
 * 
 * This cache stores ETags in chrome.storage.local for persistence across sessions.
 * 
 * Benefits:
 * - Saves rate limits (304 responses don't count when authenticated)
 * - Reduces bandwidth (no body sent on 304)
 * - Ensures data freshness (validates on every request)
 * 
 * See: https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#use-conditional-requests-if-appropriate
 */

const ETAG_CACHE_KEY_PREFIX = 'etag:'
const ETAG_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface ETagEntry {
  etag: string
  lastModified?: string
  timestamp: number
}

export class ETagCache {
  /**
   * Get cached ETag for a URL
   * Returns null if no cache exists or cache is expired
   */
  async get(url: string): Promise<ETagEntry | null> {
    try {
      const key = this.getCacheKey(url)
      const result = await chrome.storage.local.get(key)
      const entry: ETagEntry | undefined = result[key]
      
      if (!entry) {
        return null
      }
      
      // Check if expired (older than 7 days)
      const age = Date.now() - entry.timestamp
      if (age > ETAG_CACHE_TTL_MS) {
        console.log('[ETagCache] Expired entry for', url, '- age:', Math.round(age / (24 * 60 * 60 * 1000)), 'days')
        await this.delete(url)
        return null
      }
      
      return entry
    } catch (error) {
      console.error('[ETagCache] Failed to get entry:', error)
      return null
    }
  }
  
  /**
   * Store ETag for a URL
   */
  async set(url: string, entry: Omit<ETagEntry, 'timestamp'>): Promise<void> {
    try {
      const key = this.getCacheKey(url)
      const cacheEntry: ETagEntry = {
        ...entry,
        timestamp: Date.now(),
      }
      
      await chrome.storage.local.set({ [key]: cacheEntry })
      console.log('[ETagCache] Stored ETag for', url, '- etag:', entry.etag)
    } catch (error) {
      console.error('[ETagCache] Failed to set entry:', error)
      // Non-critical, continue without caching
    }
  }
  
  /**
   * Delete cached ETag for a URL
   */
  async delete(url: string): Promise<void> {
    try {
      const key = this.getCacheKey(url)
      await chrome.storage.local.remove(key)
    } catch (error) {
      console.error('[ETagCache] Failed to delete entry:', error)
    }
  }
  
  /**
   * Clear all cached ETags
   */
  async clear(): Promise<void> {
    try {
      // Get all keys in chrome.storage.local
      const allKeys = await chrome.storage.local.get(null)
      const etagKeys = Object.keys(allKeys).filter(key => key.startsWith(ETAG_CACHE_KEY_PREFIX))
      
      if (etagKeys.length > 0) {
        await chrome.storage.local.remove(etagKeys)
        console.log('[ETagCache] Cleared', etagKeys.length, 'cached ETags')
      }
    } catch (error) {
      console.error('[ETagCache] Failed to clear cache:', error)
    }
  }
  
  /**
   * Cleanup expired entries (older than 7 days)
   * Call this periodically to prevent unbounded growth
   */
  async cleanup(): Promise<void> {
    try {
      const allKeys = await chrome.storage.local.get(null)
      const etagKeys = Object.keys(allKeys).filter(key => key.startsWith(ETAG_CACHE_KEY_PREFIX))
      
      let removedCount = 0
      const now = Date.now()
      
      for (const key of etagKeys) {
        const entry: ETagEntry = allKeys[key]
        const age = now - entry.timestamp
        
        if (age > ETAG_CACHE_TTL_MS) {
          await chrome.storage.local.remove(key)
          removedCount++
        }
      }
      
      if (removedCount > 0) {
        console.log('[ETagCache] Cleanup: removed', removedCount, 'expired entries')
      }
    } catch (error) {
      console.error('[ETagCache] Failed to cleanup:', error)
    }
  }
  
  /**
   * Generate cache key from URL
   * Uses the full URL as the key (normalized)
   */
  private getCacheKey(url: string): string {
    // Normalize URL: remove query params that don't affect caching
    // (but keep important ones like per_page, page, etc.)
    try {
      const urlObj = new URL(url)
      // Remove timestamp-based cache busting params if any
      urlObj.searchParams.delete('_t')
      urlObj.searchParams.delete('_timestamp')
      return `${ETAG_CACHE_KEY_PREFIX}${urlObj.toString()}`
    } catch {
      // If URL parsing fails, use raw URL
      return `${ETAG_CACHE_KEY_PREFIX}${url}`
    }
  }
}

// Export singleton instance
export const etagCache = new ETagCache()
