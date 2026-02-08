import { useState, useCallback } from 'react'
import { CheckIcon, ArchiveIcon, BellSlashIcon } from '@primer/octicons-react'
import { useNotificationStore } from '../store/notification-store'
import { ConfirmationDialog } from './ConfirmationDialog'
import { GitHubAPI } from '../utils/github-api'
import { BadgeService } from '../utils/badge-service'
import { AuthService } from '../utils/auth-service'
import { Spinner } from './Spinner'

interface NotificationActionsProps {
  notificationId: string
  notificationTitle: string
  onActionComplete?: (action: 'read' | 'archive' | 'unsubscribe') => void
  onError?: (action: 'read' | 'archive' | 'unsubscribe', error: Error) => void
}

export function NotificationActions({
  notificationId,
  notificationTitle,
  onActionComplete,
  onError,
}: NotificationActionsProps) {
  const [showUnsubscribeConfirm, setShowUnsubscribeConfirm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const markAsRead = useNotificationStore(state => state.markAsRead)
  const archiveNotification = useNotificationStore(state => state.archiveNotification)

  // Mark as read handler
  const handleMarkAsRead = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isProcessing) return

      setIsProcessing(true)
      
      try {
        // Call GitHub API first (not optimistic to avoid rollback complexity)
        const token = await AuthService.getStoredToken()
        
        if (!token) {
          throw new Error('Not authenticated. Please log in again.')
        }

        const api = GitHubAPI.getInstance()
        await api.initialize(token)
        
        await api.markAsRead(notificationId)

        // Update UI after API success
        markAsRead(notificationId)
        
        // Update badge with fresh state from store (fixes race condition)
        const updatedNotifications = useNotificationStore.getState().notifications
        BadgeService.updateBadge(updatedNotifications)
        
        onActionComplete?.('read')
      } catch (error) {
        console.error('[NotificationActions] Failed to mark notification as read:', error)
        const errorObj = error instanceof Error ? error : new Error('Failed to mark as read')
        onError?.('read', errorObj)
      } finally {
        setIsProcessing(false)
      }
    },
    [notificationId, notificationTitle, markAsRead, onActionComplete, onError]
  )

  // Archive handler
  const handleArchive = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isProcessing) return

      archiveNotification(notificationId)
      onActionComplete?.('archive')
    },
    [notificationId, archiveNotification, onActionComplete]
  )

  // Unsubscribe handler
  const handleUnsubscribeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowUnsubscribeConfirm(true)
  }, [])

  const handleUnsubscribeConfirm = useCallback(async () => {
    // Check isProcessing FIRST before any state updates to prevent race condition
    if (isProcessing) return

    setIsProcessing(true)
    setShowUnsubscribeConfirm(false)
    try {
      // Archive the notification immediately
      archiveNotification(notificationId)

      // Call GitHub API to unsubscribe in background
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('Not authenticated. Please log in again.')
      }

      const api = GitHubAPI.getInstance()
      await api.initialize(token)
      await api.unsubscribe(notificationId)

      onActionComplete?.('unsubscribe')
    } catch (error) {
      console.error('Failed to unsubscribe from notification:', error)
      const errorObj = error instanceof Error ? error : new Error('Failed to unsubscribe')
      onError?.('unsubscribe', errorObj)
    } finally {
      setIsProcessing(false)
    }
  }, [notificationId, archiveNotification, onActionComplete, onError])

  const handleUnsubscribeCancel = useCallback(() => {
    setShowUnsubscribeConfirm(false)
  }, [])

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Mark as Read */}
        <button
          onClick={handleMarkAsRead}
          disabled={isProcessing}
          className="p-1.5 rounded hover:bg-github-success-subtle hover:text-github-success-fg transition-colors disabled:opacity-50"
          title="Mark as read"
          aria-label="Mark as read"
        >
          {isProcessing ? <Spinner size={14} /> : <CheckIcon size={14} />}
        </button>

        {/* Archive */}
        <button
          onClick={handleArchive}
          disabled={isProcessing}
          className="p-1.5 rounded hover:bg-github-accent-subtle hover:text-github-accent-fg transition-colors disabled:opacity-50"
          title="Archive"
          aria-label="Archive notification"
        >
          {isProcessing ? <Spinner size={14} /> : <ArchiveIcon size={14} />}
        </button>

        {/* Unsubscribe */}
        <button
          onClick={handleUnsubscribeClick}
          disabled={isProcessing}
          className="p-1.5 rounded hover:bg-github-danger-subtle hover:text-github-danger-fg transition-colors disabled:opacity-50"
          title="Unsubscribe"
          aria-label="Unsubscribe from thread"
        >
          {isProcessing ? <Spinner size={14} /> : <BellSlashIcon size={14} />}
        </button>
      </div>

      {/* Unsubscribe Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showUnsubscribeConfirm}
        title="Unsubscribe from thread?"
        message={`You will no longer receive notifications for "${notificationTitle}". This action cannot be undone.`}
        confirmLabel="Unsubscribe"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleUnsubscribeConfirm}
        onCancel={handleUnsubscribeCancel}
      />
    </>
  )
}
