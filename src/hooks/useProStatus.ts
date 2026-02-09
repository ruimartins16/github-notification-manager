/**
 * useProStatus Hook
 * 
 * React hook for checking user's Pro subscription status.
 * Handles loading, caching, offline detection, and real-time updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { extPayService, type ProUser } from '../utils/extpay-service'
import { validateLicense, getCacheAge } from '../utils/license-validator'
import { onNetworkChange } from '../utils/network-handler'
import { cleanupProTierData } from '../utils/pro-cleanup'

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
  /** Whether the app is currently online */
  isOnline: boolean
  /** Age of cached data in milliseconds, or null if no cache */
  cacheAge: number | null
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
 * - Detects network connectivity changes
 * - Auto-refreshes when connection restored
 * - Handles loading and error states
 * - Provides manual refresh function
 * - Safe with React Strict Mode
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isPro, isLoading, user, isOnline, cacheAge } = useProStatus()
 *   
 *   if (isLoading) {
 *     return <div>Loading...</div>
 *   }
 *   
 *   if (!isOnline) {
 *     return <div>Offline - showing cached status</div>
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
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [cacheAge, setCacheAge] = useState<number | null>(null)
  const previousProStatusRef = useRef<boolean | null>(null)

  /**
   * Fetch user status from license validator
   * Uses cache when available, otherwise fetches from ExtPay
   */
  const fetchUser = useCallback(async (forceRefresh = false) => {
    console.log(`[useProStatus] 🔄 Fetching user (forceRefresh: ${forceRefresh})`)
    setIsLoading(true)
    setError(null)
    
    try {
      const proUser = await validateLicense(forceRefresh)
      console.log(`[useProStatus] ✅ User fetched - isPro: ${proUser.isPro}, plan: ${proUser.plan?.nickname || 'none'}`)
      
      // Check if Pro status changed from true to false (downgrade)
      const previousProStatus = previousProStatusRef.current
      if (previousProStatus === true && proUser.isPro === false) {
        console.log('[useProStatus] 🔽 Downgrade detected (Pro → Free), triggering cleanup')
        try {
          await cleanupProTierData()
          console.log('[useProStatus] ✅ Pro-tier data cleanup completed')
        } catch (cleanupError) {
          console.error('[useProStatus] ❌ Failed to clean up Pro-tier data:', cleanupError)
        }
      }
      
      // Update previous Pro status
      previousProStatusRef.current = proUser.isPro
      
      setUser(proUser)
      
      // Update cache age
      const age = await getCacheAge()
      setCacheAge(age)
      
      // Cache Pro status to localStorage for fast synchronous access (prevents flash)
      try {
        localStorage.setItem('gnm-pro-cache', JSON.stringify({
          isPro: proUser.isPro,
          plan: proUser.plan?.nickname || null,
          timestamp: Date.now()
        }))
        console.log('[useProStatus] Cached Pro status to localStorage:', proUser.isPro)
      } catch (e) {
        console.error('[useProStatus] Failed to cache Pro status to localStorage:', e)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check license')
      setError(error)
      console.error('[useProStatus] ❌ Failed to fetch user:', error)
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
    console.log('[useProStatus] Hook mounted, checking for pending refreshes')
    
    // Check for pending payment, status change, or login on mount
    const checkAndRefreshIfNeeded = async () => {
      const result = await chrome.storage.local.get([
        'payment_pending',
        'status_changed',
        'extpay_payment_pending',
        'extpay_login_pending'
      ])
      
      const needsRefresh = result.payment_pending || result.status_changed || 
                          result.extpay_payment_pending || result.extpay_login_pending
      
      if (needsRefresh) {
        console.log('[useProStatus] 🔄 Pending refresh detected, clearing cache and forcing refresh', result)
        
        // Clear all flags
        await chrome.storage.local.remove([
          'payment_pending',
          'status_changed', 
          'extpay_payment_pending',
          'extpay_login_pending',
          'extpay_user_cache' // Clear cache too
        ])
        
        // Force refresh from ExtPay
        await fetchUser(true)
      } else {
        // Normal fetch (uses cache if available)
        await fetchUser(false)
      }
    }
    
    // Run check immediately on mount
    checkAndRefreshIfNeeded()

    // Listen for payment events (real-time updates from ExtPay)
    const cleanupPaid = extPayService.onPaid((paidUser) => {
      console.log('[useProStatus] 💰 Payment received from ExtPay, updating user')
      setUser(paidUser)
      setIsLoading(false)
      setError(null)
      setCacheAge(0) // Fresh data
      
      // Cache Pro status to localStorage immediately
      try {
        localStorage.setItem('gnm-pro-cache', JSON.stringify({
          isPro: paidUser.isPro,
          plan: paidUser.plan?.nickname || null,
          timestamp: Date.now()
        }))
        console.log('[useProStatus] Cached Pro status to localStorage after payment:', paidUser.isPro)
      } catch (e) {
        console.error('[useProStatus] Failed to cache Pro status to localStorage:', e)
      }
    })
    
    // Listen for Pro status changes from background worker or other contexts
    const handleMessage = (message: any) => {
      if (message.type === 'PRO_STATUS_CHANGED') {
        console.log('[useProStatus] 📨 Received PRO_STATUS_CHANGED message, refreshing')
        fetchUser(true) // Force refresh
      }
    }
    
    chrome.runtime.onMessage.addListener(handleMessage)
    
    // Listen for network changes
    const cleanupNetwork = onNetworkChange((online) => {
      console.log('[useProStatus] Network status changed:', online ? 'online' : 'offline')
      setIsOnline(online)
      
      // Auto-refresh when connection restored
      if (online) {
        console.log('[useProStatus] Connection restored, refreshing user status')
        fetchUser(true) // Force refresh
      }
    })

    // Cleanup listeners on unmount
    return () => {
      cleanupPaid()
      cleanupNetwork()
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [fetchUser])

  return {
    isPro: user?.isPro ?? false,
    isLoading,
    user,
    error,
    isOnline,
    cacheAge,
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
