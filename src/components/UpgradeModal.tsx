/**
 * UpgradeModal Component
 * 
 * Modal that displays when a free user tries to access a Pro feature.
 * Shows Pro features, pricing plans, and provides an upgrade CTA.
 */

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useEffect } from 'react'
import { LockClosedIcon, CheckIcon } from '@heroicons/react/24/outline'
import { extPayService } from '../utils/extpay-service'
import { trackEvent, ANALYTICS_EVENTS } from '../utils/analytics'

interface UpgradeModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Name of the feature that triggered the modal (optional) */
  feature?: string
}

/**
 * List of Pro features to display in the modal
 */
const PRO_FEATURES = [
  'Snooze notifications (30min, 1hr, 3hrs, tomorrow, next week)',
  'Custom rules engine for advanced filtering',
  'All keyboard shortcuts (J/K navigation, D/A/S/O actions, 1-4 filters, Shift+D mark all)',
]

/**
 * Pricing plans to display
 */
const PRICING_PLANS = [
  { name: 'Monthly', price: '$3/month', savings: null },
  { name: 'Yearly', price: '$30/year', savings: 'Save 16%' },
  { name: 'Lifetime', price: '$100 once', savings: 'Best Value' },
]

/**
 * UpgradeModal component
 * 
 * Displays a compelling upgrade modal with:
 * - Lock icon to indicate locked feature
 * - List of Pro features with checkmarks
 * - Pricing information with savings
 * - Upgrade CTA button (opens payment page)
 * - Dismiss button ("Maybe Later")
 * 
 * Accessible with keyboard navigation and screen reader support.
 * 
 * @example
 * ```tsx
 * const [showUpgrade, setShowUpgrade] = useState(false)
 * 
 * <button onClick={() => setShowUpgrade(true)}>Try Pro Feature</button>
 * <UpgradeModal 
 *   isOpen={showUpgrade} 
 *   onClose={() => setShowUpgrade(false)}
 *   feature="Snooze"
 * />
 * ```
 */
export function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  // Track when modal is shown
  useEffect(() => {
    if (isOpen) {
      trackEvent(ANALYTICS_EVENTS.UPGRADE_MODAL_SHOWN, { feature })
    }
  }, [isOpen, feature])

  const handleUpgrade = async () => {
    try {
      trackEvent(ANALYTICS_EVENTS.PAYMENT_PAGE_OPENED, { source: 'upgrade_modal', feature })
      await extPayService.openPaymentPage()
      onClose()
    } catch (error) {
      console.error('[UpgradeModal] Failed to open payment page:', error)
      // Keep modal open so user can retry
    }
  }

  const handleClose = () => {
    trackEvent(ANALYTICS_EVENTS.UPGRADE_MODAL_DISMISSED, { feature })
    onClose()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        {/* Backdrop with fade animation */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              {/* Lock Icon */}
              <div className="flex justify-center mb-4">
                <div className="bg-yellow-100 rounded-full p-3">
                  <LockClosedIcon className="w-8 h-8 text-yellow-600" />
                </div>
              </div>

              {/* Title */}
              <Dialog.Title className="text-xl font-bold text-center text-gray-900 mb-2">
                Unlock Pro Features
              </Dialog.Title>

              {/* Description */}
              <Dialog.Description className="text-center text-gray-600 mb-6">
                {feature 
                  ? `${feature} is a Pro feature.`
                  : 'Upgrade to unlock powerful features.'}
              </Dialog.Description>

              {/* Feature List */}
              <ul className="space-y-3 mb-6" role="list">
                {PRO_FEATURES.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <CheckIcon 
                      className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" 
                      aria-hidden="true"
                    />
                    <span className="text-sm text-gray-700">{feat}</span>
                  </li>
                ))}
              </ul>

              {/* Pricing */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                {PRICING_PLANS.map((plan, index) => (
                  <div 
                    key={plan.name}
                    className={`flex justify-between items-center ${
                      index < PRICING_PLANS.length - 1 ? 'mb-2' : ''
                    }`}
                  >
                    <span className="text-gray-600">{plan.name}</span>
                    <div className="text-right">
                      <span className="font-semibold">{plan.price}</span>
                      {plan.savings && (
                        <span className="text-green-600 text-sm ml-2">
                          {plan.savings}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleUpgrade}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  aria-label="Upgrade to Pro"
                >
                  Upgrade to Pro →
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full text-gray-600 py-2 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded transition-colors"
                  aria-label="Close modal"
                >
                  Maybe Later
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
