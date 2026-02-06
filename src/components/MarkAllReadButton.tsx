import { useState, useCallback, useMemo } from 'react'
import { CheckIcon } from '@primer/octicons-react'
import { useNotificationStore } from '../store/notification-store'
import { ConfirmationDialog } from './ConfirmationDialog'

interface MarkAllReadButtonProps {
  onMarkAll: () => Promise<void>
  disabled?: boolean
}

export function MarkAllReadButton({ onMarkAll, disabled = false }: MarkAllReadButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Memoized selector to prevent unnecessary re-renders
  const filteredNotifications = useNotificationStore(state => state.getFilteredNotifications())
  const activeFilter = useNotificationStore(state => state.activeFilter)
  
  // Memoize unread count calculation
  const unreadCount = useMemo(
    () => filteredNotifications.filter(n => n.unread).length,
    [filteredNotifications]
  )

  const handleClick = useCallback(() => {
    if (unreadCount === 0 || showConfirmation || isLoading) return
    setShowConfirmation(true)
  }, [unreadCount, showConfirmation, isLoading])

  const handleConfirm = useCallback(async () => {
    setShowConfirmation(false)
    setIsLoading(true)
    
    try {
      await onMarkAll()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    } finally {
      setIsLoading(false)
    }
  }, [onMarkAll])

  const handleCancel = useCallback(() => {
    setShowConfirmation(false)
  }, [])

  const filterLabel = {
    all: 'all',
    mentions: 'mention',
    reviews: 'review',
    assigned: 'assigned',
  }[activeFilter]

  const confirmMessage =
    activeFilter === 'all'
      ? `Mark all ${unreadCount} notification${unreadCount === 1 ? '' : 's'} as read?`
      : `Mark all ${unreadCount} ${filterLabel} notification${unreadCount === 1 ? '' : 's'} as read?`

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled || unreadCount === 0 || isLoading}
        className={`
          px-3 py-1.5 rounded-github font-medium text-xs transition-colors
          flex items-center gap-2
          ${
            unreadCount === 0 || disabled || isLoading
              ? 'bg-github-canvas-subtle text-github-fg-muted cursor-not-allowed'
              : 'bg-github-success-subtle text-github-success-fg border border-github-success-emphasis hover:bg-github-success-emphasis hover:text-white'
          }
        `}
        title={
          unreadCount === 0
            ? 'No unread notifications'
            : `Mark ${unreadCount} notification${unreadCount === 1 ? '' : 's'} as read`
        }
        aria-label={`Mark all ${unreadCount} notifications as read`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <CheckIcon size={14} />
        )}
        <span>Mark all read</span>
      </button>

      <ConfirmationDialog
        isOpen={showConfirmation}
        title="Mark all as read?"
        message={confirmMessage}
        confirmLabel="Mark as read"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  )
}
