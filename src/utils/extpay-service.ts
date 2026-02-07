/**
 * ExtPay Service Wrapper
 * 
 * Provides a clean, type-safe interface for ExtensionPay payment functionality.
 * Handles license validation, user status, and payment flows.
 */

import { extpay } from '../background/service-worker'

/**
 * Pro user information with subscription details
 */
export interface ProUser {
  /** Whether the user has an active paid subscription */
  isPro: boolean
  /** Date the user first paid, or null if never paid */
  paidAt: Date | null
  /** User's email address, or null if not provided */
  email: string | null
  /** Current subscription plan */
  plan: {
    nickname: string | null
    interval: 'month' | 'year' | 'once'
    amount: number
    currency: string
  } | null
  /** Date the user installed the extension */
  installedAt: Date
  /** Subscription status (for recurring plans) */
  subscriptionStatus?: 'active' | 'past_due' | 'canceled'
  /** Date the subscription will cancel or did cancel */
  subscriptionCancelAt?: Date | null
}

/**
 * ExtPay Service - Singleton wrapper for payment functionality
 */
class ExtPayService {
  private static instance: ExtPayService | undefined
  private cachedUser: ProUser | null = null
  private lastFetchTime: number = 0
  private readonly CACHE_DURATION = 60000 // 1 minute cache
  private userFetchPromise: Promise<ProUser> | null = null
  private paidListeners = new Set<(user: ProUser) => void>()
  private extPayListenerRegistered = false
  private fetchAttempts = 0
  private readonly MAX_FETCH_ATTEMPTS = 3

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of ExtPayService
   * Thread-safe implementation that ensures only one instance is created
   */
  static getInstance(): ExtPayService {
    if (!ExtPayService.instance) {
      ExtPayService.instance = new ExtPayService()
    }
    return ExtPayService.instance
  }

  /**
   * Get user's payment status from ExtensionPay
   * Results are cached for 1 minute to reduce API calls
   * Concurrent requests are deduped to prevent thundering herd
   * 
   * @throws {Error} If ExtPay service is unavailable after max retries
   */
  async getUser(): Promise<ProUser> {
    const now = Date.now()
    
    // Return cached user if still fresh
    if (this.cachedUser && now - this.lastFetchTime < this.CACHE_DURATION) {
      return this.cachedUser
    }
    
    // Reuse in-flight request to prevent duplicate API calls
    if (this.userFetchPromise) {
      return this.userFetchPromise
    }
    
    this.userFetchPromise = this.fetchUser()
    
    try {
      const user = await this.userFetchPromise
      return user
    } finally {
      this.userFetchPromise = null
    }
  }
  
  /**
   * Internal method to fetch user from ExtPay with error handling
   */
  private async fetchUser(): Promise<ProUser> {
    try {
      const user = await extpay.getUser()
      
      this.cachedUser = this.transformUser(user)
      this.lastFetchTime = Date.now()
      this.fetchAttempts = 0 // Reset on success
      
      return this.cachedUser
    } catch (error) {
      const sanitizedError = error instanceof Error 
        ? { message: error.message, name: error.name }
        : 'Unknown error'
      console.error('[ExtPayService] Failed to get user:', sanitizedError)
      
      this.fetchAttempts++
      
      // Return cached if available and not too many failures
      if (this.cachedUser && this.fetchAttempts < this.MAX_FETCH_ATTEMPTS) {
        console.warn('[ExtPayService] Using cached user due to fetch error')
        return this.cachedUser
      }
      
      // If too many failures, throw to let caller handle
      if (this.fetchAttempts >= this.MAX_FETCH_ATTEMPTS) {
        throw new Error('ExtPay service unavailable after multiple attempts')
      }
      
      // Return free tier as last resort
      console.warn('[ExtPayService] Returning free tier due to service unavailability')
      return this.getFreeTierUser()
    }
  }
  
  /**
   * Transform ExtPay user object to ProUser interface
   * Handles type conversions and null checks
   */
  private transformUser(user: any): ProUser {
    return {
      isPro: user.paid,
      paidAt: user.paidAt,
      email: user.email,
      plan: user.plan ? {
        nickname: user.plan.nickname ? String(user.plan.nickname) : null,
        interval: user.plan.interval,
        amount: user.plan.unitAmountCents / 100,
        currency: user.plan.currency,
      } : null,
      installedAt: user.installedAt,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionCancelAt: user.subscriptionCancelAt,
    }
  }

  /**
   * Get cached user without making an API call
   * Returns null if no cached user is available
   */
  getCachedUser(): ProUser | null {
    return this.cachedUser
  }

  /**
   * Get cached user or fetch if not available
   * Useful for synchronous contexts where you need a user immediately
   */
  getCachedUserOrFetch(): ProUser {
    if (this.cachedUser) {
      return this.cachedUser
    }
    
    // Start async fetch in background
    this.getUser().catch(console.error)
    
    // Return free tier immediately
    return this.getFreeTierUser()
  }

  /**
   * Invalidate the cached user data
   * Next getUser() call will fetch fresh data from ExtensionPay
   * 
   * @param refetch - If true, immediately fetch fresh data
   */
  async invalidateCache(refetch = false): Promise<ProUser | null> {
    this.lastFetchTime = 0
    this.cachedUser = null
    
    if (refetch) {
      return await this.getUser()
    }
    return null
  }

  /**
   * Open the payment page for the user to subscribe
   * Optionally specify a plan nickname to pre-select a plan
   */
  async openPaymentPage(planNickname?: string): Promise<void> {
    try {
      await extpay.openPaymentPage(planNickname)
    } catch (error) {
      console.error('[ExtPayService] Failed to open payment page:', error)
      throw error
    }
  }

  /**
   * Open the login page for users who have already paid
   */
  async openLoginPage(): Promise<void> {
    try {
      await extpay.openLoginPage()
    } catch (error) {
      console.error('[ExtPayService] Failed to open login page:', error)
      throw error
    }
  }

  /**
   * Register a callback to be called when the user completes payment
   * Returns a cleanup function to unregister the callback
   * 
   * @param callback - Function to call when user pays
   * @returns Cleanup function to unregister the callback
   * 
   * @example
   * ```typescript
   * const cleanup = extPayService.onPaid((user) => {
   *   console.log('User upgraded!', user.plan)
   * })
   * 
   * // Later, cleanup:
   * cleanup()
   * ```
   */
  onPaid(callback: (user: ProUser) => void): () => void {
    // Register the underlying ExtPay listener once
    if (!this.extPayListenerRegistered) {
      extpay.onPaid.addListener((user) => {
        const proUser = this.transformUser(user)
        
        // Update cache with fresh data
        this.cachedUser = proUser
        this.lastFetchTime = Date.now()
        
        // Call all registered callbacks with error handling
        this.paidListeners.forEach(cb => {
          try {
            cb(proUser)
          } catch (error) {
            console.error('[ExtPayService] Error in onPaid callback:', error)
          }
        })
      })
      this.extPayListenerRegistered = true
    }
    
    // Add this specific callback
    this.paidListeners.add(callback)
    
    // Return cleanup function
    return () => {
      this.paidListeners.delete(callback)
    }
  }

  /**
   * Check if the user has Pro access (paid subscription)
   * Uses cached data if available, otherwise fetches fresh data
   */
  async isPro(): Promise<boolean> {
    const user = await this.getUser()
    return user.isPro
  }
  
  /**
   * Preload user data in background (fire and forget)
   * Useful for warming cache on extension startup
   */
  async preloadUser(): Promise<void> {
    try {
      await this.getUser()
    } catch (error) {
      // Silent fail - this is just cache warming
      console.debug('[ExtPayService] Preload failed:', error)
    }
  }

  /**
   * Get the user's current plan name for display
   */
  getPlanDisplayName(user: ProUser): string {
    if (!user.isPro || !user.plan) {
      return 'Free'
    }

    const { nickname, interval } = user.plan
    
    if (nickname) {
      return nickname
    }

    // Fallback to interval-based name
    if (interval === 'month') {
      return 'Monthly'
    } else if (interval === 'year') {
      return 'Annual'
    } else if (interval === 'once') {
      return 'Lifetime'
    }

    return 'Pro'
  }

  /**
   * Get a free tier user object (used as fallback)
   */
  private getFreeTierUser(): ProUser {
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
}

// Export singleton instance
export const extPayService = ExtPayService.getInstance()
