/**
 * useProStatus Hook
 * 
 * React hook for checking user's Pro subscription status.
 * Handles loading, caching, and real-time updates via onPaid events.
 */

import { useState, useEffect, useCallback } from 'react'
import { extPayService, type ProUser } from '../utils/extpay-service'
import { validateLicense } from '../utils/license-validator'

/**
 * Return type for useProStatus hook
 */
export interface UseProStatusResult {
  /** Whether the user has an active Pro subscription */
  isPro: boolean
  /** Whether the hook is currently loading user data */
  isLoading: boolean
  /** Full user object with subscription details, or null if loading */
  user: ProUser | null
  /** Error that occurred during validation, or null if successful */
  error: Error | null
  /** Manually refresh user status (bypasses cache) */
  refresh: () => Promise<void>
}

/**
 * Hook to check user's Pro subscription status
 * 
 * Features:
 * - Loads user status on mount
 * - Uses cached data when available (fast!)
 * - Listens for payment events (real-time updates)
 * - Handles loading and error states
 * - Provides manual refresh function
 * - Safe with React Strict Mode
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isPro, isLoading, user } = useProStatus()
 *   
 *   if (isLoading) {
 *     return <div>Loading...</div>
 *   }
 *   
 *   if (isPro) {
 *     return <div>Welcome Pro user! Plan: {user?.plan?.nickname}</div>
 *   }
 *   
 *   return <button onClick={() => extPayService.openPaymentPage()}>
 *     Upgrade to Pro
 *   </button>
 * }
 * ```
 */
export function useProStatus(): UseProStatusResult {
  const [user, setUser] = useState<ProUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Fetch user status from license validator
   * Uses cache when available, otherwise fetches from ExtPay
   */
  const fetchUser = useCallback(async (forceRefresh = false) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const proUser = await validateLicense(forceRefresh)
      setUser(proUser)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check license')
      setError(error)
      console.error('[useProStatus] Failed to fetch user:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Manual refresh function (bypasses cache)
   */
  const refresh = useCallback(async () => {
    await fetchUser(true) // Force refresh
  }, [fetchUser])

  useEffect(() => {
    // Fetch user on mount
    fetchUser()

    // Listen for payment events (real-time updates)
    const cleanup = extPayService.onPaid((paidUser) => {
      console.log('[useProStatus] Payment received, updating user')
      setUser(paidUser)
      setIsLoading(false)
      setError(null)
    })
    
    // Listen for Pro status changes from background worker
    const handleMessage = (message: any) => {
      if (message.type === 'PRO_STATUS_CHANGED') {
        console.log('[useProStatus] Pro status changed, refreshing')
        fetchUser()
      }
    }
    
    chrome.runtime.onMessage.addListener(handleMessage)

    // Cleanup listeners on unmount
    return () => {
      cleanup()
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [fetchUser])

  return {
    isPro: user?.isPro ?? false,
    isLoading,
    user,
    error,
    refresh,
  }
}

/**
 * Simpler hook that only returns isPro boolean
 * Useful for components that only need to gate features
 * 
 * @example
 * ```tsx
 * function SnoozeButton() {
 *   const isPro = useIsPro()
 *   
 *   if (!isPro) {
 *     return <UpgradePrompt feature="snooze" />
 *   }
 *   
 *   return <button onClick={handleSnooze}>Snooze</button>
 * }
 * ```
 */
export function useIsPro(): boolean {
  const { isPro } = useProStatus()
  return isPro
}
