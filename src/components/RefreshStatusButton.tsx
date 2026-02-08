/**
 * RefreshStatusButton Component
 * 
 * Button that allows users to manually refresh their Pro subscription status.
 * Useful if payment status seems incorrect or after making changes in ExtPay dashboard.
 */

import { useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { clearCache } from '../utils/license-validator'
import { useProStatus } from '../hooks/useProStatus'

interface RefreshStatusButtonProps {
  /** Optional className for styling */
  className?: string
  /** Variant style */
  variant?: 'default' | 'link'
}

/**
 * RefreshStatusButton component
 * 
 * Displays a button that:
 * - Clears the ExtPay cache
 * - Forces a fresh fetch from ExtensionPay
 * - Shows loading state during refresh
 * - Shows success feedback after refresh
 * 
 * @example
 * ```tsx
 * // In settings page
 * <RefreshStatusButton variant="default" />
 * 
 * // As a link in header
 * <RefreshStatusButton variant="link" />
 * ```
 */
export function RefreshStatusButton({ 
  className = '', 
  variant = 'default' 
}: RefreshStatusButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const { refresh } = useProStatus()
  
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      setShowSuccess(false)
      
      // Clear cache to force fresh fetch
      await clearCache()
      console.log('[RefreshStatusButton] Cache cleared, refreshing status')
      
      // Force refresh from ExtensionPay
      await refresh()
      
      // Show success feedback briefly
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('[RefreshStatusButton] Failed to refresh status:', error)
    } finally {
      setIsRefreshing(false)
    }
  }
  
  if (variant === 'link') {
    return (
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`text-xs text-github-accent-fg hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ${className}`}
        title="Refresh subscription status from ExtensionPay"
      >
        <ArrowPathIcon 
          className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        {showSuccess ? (
          <span className="text-github-success-fg">✓ Updated</span>
        ) : (
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Status'}</span>
        )}
      </button>
    )
  }
  
  // Default button variant
  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`px-4 py-2 text-sm font-medium bg-github-canvas-default border border-github-border-default
                 rounded-github hover:bg-github-canvas-subtle transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed
                 focus:outline-none focus:ring-2 focus:ring-github-accent-emphasis
                 flex items-center gap-2 ${className}`}
      title="Refresh subscription status from ExtensionPay"
    >
      <ArrowPathIcon 
        className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      {showSuccess ? (
        <span className="text-github-success-fg">✓ Status Updated</span>
      ) : (
        <span className="text-github-fg-default">
          {isRefreshing ? 'Refreshing Status...' : 'Refresh Payment Status'}
        </span>
      )}
    </button>
  )
}
