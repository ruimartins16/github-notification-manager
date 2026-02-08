/**
 * SubscriptionStatus Component
 * 
 * Displays subscription status warnings and information to Pro users.
 * Shows different states: past_due, canceled, active.
 */

import { extPayService } from '../utils/extpay-service'
import type { ProUser } from '../utils/extpay-service'

interface SubscriptionStatusProps {
  user: ProUser | null
}

/**
 * Format date for display (e.g., "Dec 15, 2026")
 */
function formatDate(date: Date | null): string {
  if (!date) return 'Unknown date'
  
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

/**
 * SubscriptionStatus Component
 * 
 * Shows warning banners for subscription issues:
 * - past_due: Payment failed, needs update
 * - canceled: Subscription canceled, shows end date
 * - active: No warnings shown
 * 
 * @example
 * ```tsx
 * const { user } = useProStatus()
 * return <SubscriptionStatus user={user} />
 * ```
 */
export function SubscriptionStatus({ user }: SubscriptionStatusProps) {
  // Only show for Pro users
  if (!user?.isPro) {
    return null
  }
  
  // Payment failed - needs attention
  if (user.subscriptionStatus === 'past_due') {
    return (
      <div
        className="bg-github-attention-subtle dark:bg-github-attention-dark-subtle border border-github-attention-muted dark:border-github-attention-dark-muted rounded-github p-4 mb-4"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-sm text-github-attention-fg dark:text-github-attention-dark-fg font-semibold mb-1">
              Payment Failed
            </p>
            <p className="text-sm text-github-fg-default dark:text-github-fg-dark-default mb-3">
              Your payment method couldn't be charged. Please update it to keep Pro features active.
            </p>
            <button
              onClick={async () => {
                // Import helper dynamically
                const { triggerStatusRefresh } = await import('../utils/status-refresh-helper')
                // Trigger refresh (sets flag + broadcasts message)
                await triggerStatusRefresh('payment')
                await extPayService.openPaymentPage()
              }}
              className="px-3 py-1.5 text-sm font-medium bg-github-accent-emphasis dark:bg-github-accent-dark-emphasis text-white 
                       rounded-github hover:bg-github-accent-fg dark:hover:bg-github-accent-dark-fg transition-colors 
                       focus:outline-none focus:ring-2 focus:ring-github-accent-emphasis dark:focus:ring-github-accent-dark-emphasis"
              aria-label="Update payment method"
            >
              Update Payment Method →
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // Subscription canceled but still in billing period
  if (user.subscriptionStatus === 'canceled' && user.subscriptionCancelAt) {
    const cancelDate = user.subscriptionCancelAt
    const daysUntilEnd = Math.ceil(
      (cancelDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    
    // If already expired, don't show canceled banner (user is no longer Pro)
    if (daysUntilEnd < 0) {
      return null
    }
    
    const endDate = formatDate(cancelDate)
    
    return (
      <div
        className="bg-github-canvas-subtle dark:bg-github-canvas-dark-subtle border border-github-border-default dark:border-github-border-dark-default rounded-github p-4 mb-4"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0">ℹ️</span>
          <div className="flex-1">
            <p className="text-sm text-github-fg-default dark:text-github-fg-dark-default font-semibold mb-1">
              Subscription Ending
            </p>
            <p className="text-sm text-github-fg-muted dark:text-github-fg-dark-muted mb-3">
              Your Pro subscription will end on <strong>{endDate}</strong> 
              {daysUntilEnd > 0 && ` (${daysUntilEnd} day${daysUntilEnd === 1 ? '' : 's'} remaining)`}.
              You'll still have Pro features until then.
            </p>
            <button
              onClick={async () => {
                // Import helper dynamically
                const { triggerStatusRefresh } = await import('../utils/status-refresh-helper')
                // Trigger refresh (sets flag + broadcasts message)
                await triggerStatusRefresh('payment')
                await extPayService.openPaymentPage()
              }}
              className="px-3 py-1.5 text-sm font-medium bg-github-accent-emphasis dark:bg-github-accent-dark-emphasis text-white 
                       rounded-github hover:bg-github-accent-fg dark:hover:bg-github-accent-dark-fg transition-colors 
                       focus:outline-none focus:ring-2 focus:ring-github-accent-emphasis dark:focus:ring-github-accent-dark-emphasis"
              aria-label="Resubscribe to Pro"
            >
              Resubscribe →
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // Active subscription - no warnings needed
  return null
}
