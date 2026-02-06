import { useState, useCallback } from 'react'
import { CheckIcon, ArchiveIcon, BellSlashIcon } from '@primer/octicons-react'
import { useNotificationStore } from '../store/notification-store'
import { ConfirmationDialog } from './ConfirmationDialog'
import { GitHubAPI } from '../utils/github-api'

interface NotificationActionsProps {
  notificationId: string
  notificationTitle: string
  onActionComplete?: (action: 'read' | 'archive' | 'unsubscribe') => void
}

export function NotificationActions({
  notificationId,
  notificationTitle,
  onActionComplete,
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
        const token = await chrome.storage.local.get('github_token')
        if (token.github_token) {
          const api = GitHubAPI.getInstance()
          await api.initialize(token.github_token)
          await api.markAsRead(notificationId)
        }

        // Only update UI after API success
        markAsRead(notificationId)
        onActionComplete?.('read')
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
        // Re-throw to let parent handle error toast
        throw error
      } finally {
        setIsProcessing(false)
      }
    },
    [notificationId, markAsRead, onActionComplete, isProcessing]
  )

  // Archive handler
  const handleArchive = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isProcessing) return

      archiveNotification(notificationId)
      onActionComplete?.('archive')
    },
    [notificationId, archiveNotification, onActionComplete, isProcessing]
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
      const token = await chrome.storage.local.get('github_token')
      if (token.github_token) {
        const api = GitHubAPI.getInstance()
        await api.initialize(token.github_token)
        await api.unsubscribe(notificationId)
      }

      onActionComplete?.('unsubscribe')
    } catch (error) {
      console.error('Failed to unsubscribe from notification:', error)
      // Toast will be shown by parent component
    } finally {
      setIsProcessing(false)
    }
  }, [notificationId, archiveNotification, onActionComplete, isProcessing])

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
          <CheckIcon size={14} />
        </button>

        {/* Archive */}
        <button
          onClick={handleArchive}
          disabled={isProcessing}
          className="p-1.5 rounded hover:bg-github-accent-subtle hover:text-github-accent-fg transition-colors disabled:opacity-50"
          title="Archive"
          aria-label="Archive notification"
        >
          <ArchiveIcon size={14} />
        </button>

        {/* Unsubscribe */}
        <button
          onClick={handleUnsubscribeClick}
          disabled={isProcessing}
          className="p-1.5 rounded hover:bg-github-danger-subtle hover:text-github-danger-fg transition-colors disabled:opacity-50"
          title="Unsubscribe"
          aria-label="Unsubscribe from thread"
        >
          <BellSlashIcon size={14} />
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
