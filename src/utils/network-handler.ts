/**
 * Network Connectivity Handler
 * 
 * Utilities for detecting and responding to network connectivity changes.
 * Used by license-validator to handle offline/online states gracefully.
 */

/**
 * Check if the browser is currently online
 * 
 * Note: navigator.onLine can have false positives (reports online but no internet).
 * This is a best-effort check and should be combined with actual API call results.
 * 
 * @returns true if browser reports online status
 */
export function isOnline(): boolean {
  return navigator.onLine
}

/**
 * Listen for network connectivity changes
 * 
 * Usage:
 * ```typescript
 * const cleanup = onNetworkChange((online) => {
 *   console.log(online ? 'Connected' : 'Disconnected')
 * })
 * 
 * // Later, cleanup listeners:
 * cleanup()
 * ```
 * 
 * @param callback - Function called when connectivity changes
 * @returns Cleanup function to remove event listeners
 */
export function onNetworkChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * Get a human-readable description of cache staleness
 * 
 * @param ageMs - Cache age in milliseconds
 * @returns Human-readable string like "5 minutes ago", "2 hours ago", "3 days ago"
 */
export function getCacheAgeDescription(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ago`
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }
  return 'just now'
}

/**
 * Retry a promise-returning function with exponential backoff
 * 
 * Useful for transient network errors. Waits progressively longer between retries:
 * - 1st retry: 1s
 * - 2nd retry: 2s
 * - 3rd retry: 4s
 * 
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Result of successful function call
 * @throws Error from last failed attempt if all retries exhausted
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | unknown
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Exponential backoff: 2^attempt seconds
      const delayMs = Math.pow(2, attempt) * 1000
      console.log(`[NetworkHandler] Retry ${attempt + 1}/${maxRetries} after ${delayMs}ms`)
      
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  throw lastError
}

/**
 * Check if an error is network-related
 * 
 * @param error - Error to check
 * @returns true if error appears to be network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('offline')
    )
  }
  return false
}
