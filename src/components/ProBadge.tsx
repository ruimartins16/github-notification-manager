/**
 * ProBadge Component
 * 
 * Visual indicator badge for Pro features.
 * Displays "PRO" text in a gold/yellow gradient to indicate premium features.
 */

interface ProBadgeProps {
  /** Additional CSS classes to apply */
  className?: string
  /** Whether to show tooltip on hover (default: true) */
  showTooltip?: boolean
  /** Custom tooltip text (default: "Upgrade to Pro to unlock this feature") */
  tooltipText?: string
}

/**
 * ProBadge component
 * 
 * A small, visually distinct badge that indicates a feature requires Pro.
 * Uses a yellow/gold gradient to stand out without being obtrusive.
 * 
 * Features:
 * - Accessible with aria-label
 * - Optional tooltip on hover
 * - Small size (doesn't obstruct UI)
 * - Customizable with className prop
 * 
 * @example
 * ```tsx
 * // Simple usage
 * <ProBadge />
 * 
 * // With custom styling
 * <ProBadge className="ml-2" />
 * 
 * // Without tooltip
 * <ProBadge showTooltip={false} />
 * 
 * // Custom tooltip text
 * <ProBadge tooltipText="Pro feature - $3/month" />
 * 
 * // Next to a feature name
 * <div className="flex items-center gap-2">
 *   <span>Snooze Notifications</span>
 *   <ProBadge />
 * </div>
 * ```
 */
export function ProBadge({ 
  className = '', 
  showTooltip = true,
  tooltipText = 'Upgrade to Pro to unlock this feature'
}: ProBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        px-2 py-0.5 
        text-xs font-semibold leading-none
        bg-gradient-to-r from-yellow-500 to-yellow-600 
        text-yellow-950 
        rounded-full
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      title={showTooltip ? tooltipText : undefined}
      aria-label={tooltipText}
      role="status"
    >
      PRO
    </span>
  )
}
