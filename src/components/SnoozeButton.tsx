import { useState, useRef, useEffect, memo, useCallback } from 'react'
import { useNotificationStore } from '../store/notification-store'
import { useProStatus } from '../hooks/useProStatus'
import { UpgradeModal } from './UpgradeModal'
import { ProBadge } from './ProBadge'

interface SnoozeOption {
  label: string
  duration: number | 'custom'
  description: string
}

const SNOOZE_OPTIONS: SnoozeOption[] = [
  { label: '1 hour', duration: 60 * 60 * 1000, description: 'Wake me in 1 hour' },
  { label: '4 hours', duration: 4 * 60 * 60 * 1000, description: 'Wake me in 4 hours' },
  { label: '1 day', duration: 24 * 60 * 60 * 1000, description: 'Wake me tomorrow' },
  { label: 'Custom...', duration: 'custom', description: 'Pick a specific time' },
]

interface SnoozeButtonProps {
  notificationId: string
  onCustom: () => void
}

export const SnoozeButton = memo(({ notificationId, onCustom }: SnoozeButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const snoozeNotification = useNotificationStore(state => state.snoozeNotification)
  const { isPro, isLoading: proLoading } = useProStatus()

  const handleSnooze = useCallback((duration: number | 'custom') => {
    // Gate behind Pro check
    if (!isPro) {
      setShowUpgradeModal(true)
      setIsOpen(false)
      return
    }

    if (duration === 'custom') {
      onCustom()
      setIsOpen(false)
      return
    }

    const wakeTime = Date.now() + duration
    snoozeNotification(notificationId, wakeTime)
    setIsOpen(false)
  }, [notificationId, snoozeNotification, onCustom, isPro])

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    // Small delay to avoid catching the same click that opened the dropdown
    const timerId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 0)

    return () => {
      clearTimeout(timerId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            // Prevent interaction when loading
            if (proLoading) return
            // If not Pro, show upgrade modal immediately
            if (!isPro) {
              setShowUpgradeModal(true)
              return
            }
            setIsOpen(!isOpen)
          }}
          className={`
            relative p-1.5 rounded-github text-github-fg-muted dark:text-github-fg-dark-muted hover:text-github-fg-default dark:hover:text-github-fg-dark-default
            hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-dark-subtle transition-colors
            focus:outline-none focus:ring-2 focus:ring-github-accent-emphasis dark:focus:ring-github-accent-dark-emphasis
            ${proLoading ? 'opacity-50 cursor-wait pointer-events-none' : ''}
          `}
          aria-label={
            proLoading 
              ? 'Loading Pro status...'
              : isPro 
                ? 'Snooze notification' 
                : 'Snooze (Pro feature)'
          }
          aria-busy={proLoading}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {/* Clock icon */}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          
          {/* Pro badge for free users */}
          {!proLoading && !isPro && (
            <div className="absolute -top-1 -right-1" aria-hidden="true">
              <ProBadge />
            </div>
          )}
        </button>

        {isPro && isOpen && (
          <div
            className="
              absolute right-0 mt-2 w-56 rounded-github shadow-lg
              bg-github-canvas-default dark:bg-github-canvas-dark-default border border-github-border-default dark:border-github-border-dark-default
              z-50 overflow-hidden
            "
            role="menu"
            aria-orientation="vertical"
          >
            <div className="py-1">
              {SNOOZE_OPTIONS.map((option, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSnooze(option.duration)
                  }}
                  className="
                    w-full px-4 py-2 text-left text-sm
                    text-github-fg-default dark:text-github-fg-dark-default hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-dark-subtle
                    focus:outline-none focus:bg-github-canvas-subtle dark:focus:bg-github-canvas-dark-subtle
                    transition-colors
                  "
                  role="menuitem"
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-github-fg-muted dark:text-github-fg-dark-muted">{option.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Snooze"
      />
    </>
  )
})

SnoozeButton.displayName = 'SnoozeButton'
