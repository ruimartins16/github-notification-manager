import { useState, useCallback } from 'react'
import { CheckIcon, ArchiveIcon, XIcon } from '@primer/octicons-react'
import { useNotificationStore } from '../store/notification-store'
import { GitHubAPI } from '../utils/github-api'
import { Spinner } from './Spinner'

interface BulkActionsBarProps {
  onActionComplete?: (action: 'read' | 'archive', count: number) => void
}

export function BulkActionsBar({ onActionComplete }: BulkActionsBarProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  
  const getSelectedCount = useNotificationStore(state => state.getSelectedCount)
  const selectedCount = getSelectedCount()
  const clearSelection = useNotificationStore(state => state.clearSelection)
  const bulkMarkAsRead = useNotificationStore(state => state.bulkMarkAsRead)
  const bulkArchive = useNotificationStore(state => state.bulkArchive)

  const handleBulkMarkAsRead = useCallback(async () => {
    if (isProcessing || selectedCount === 0) return

    setIsProcessing(true)
    try {
      // Get selected IDs and update UI
      const selectedIds = bulkMarkAsRead()

      // Call GitHub API for each notification in background
      const token = await chrome.storage.local.get('github_token')
      if (token.github_token) {
        const api = GitHubAPI.getInstance()
        await api.initialize(token.github_token)
        
        // Mark all as read in parallel
        await Promise.all(
          selectedIds.map(id => api.markAsRead(id).catch(err => {
            console.error(`Failed to mark ${id} as read:`, err)
          }))
        )
      }

      onActionComplete?.('read', selectedIds.length)
    } catch (error) {
      console.error('Failed to bulk mark as read:', error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, selectedCount, bulkMarkAsRead, onActionComplete])

  const handleBulkArchive = useCallback(() => {
    if (isProcessing || selectedCount === 0) return

    setIsProcessing(true)
    try {
      const archived = bulkArchive()
      onActionComplete?.('archive', archived.length)
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, selectedCount, bulkArchive, onActionComplete])

  const handleClearSelection = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  if (selectedCount === 0) {
    return null
  }

  return (
    <div 
      className="sticky top-0 z-10 p-3 bg-github-accent-subtle dark:bg-github-accent-dark-subtle border-b border-github-accent-emphasis dark:border-github-accent-dark-emphasis"
      role="toolbar"
      aria-label="Bulk actions"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-github-fg-default dark:text-github-fg-dark-default whitespace-nowrap">
          {selectedCount} selected
        </span>
        
        <div className="flex items-center gap-2">
          {/* Bulk Mark as Read */}
          <button
            onClick={handleBulkMarkAsRead}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-github
                     bg-github-success-subtle dark:bg-github-success-dark-subtle text-github-success-fg dark:text-github-success-dark-fg border border-github-success-emphasis dark:border-github-success-dark-emphasis
                     hover:bg-github-success-emphasis dark:hover:bg-github-success-dark-emphasis hover:text-white
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            aria-label={`Mark ${selectedCount} notifications as read`}
            title="Mark as read"
          >
            {isProcessing ? <Spinner size={14} /> : <CheckIcon size={14} />}
            Read
          </button>

          {/* Bulk Archive */}
          <button
            onClick={handleBulkArchive}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-github
                     bg-github-accent-subtle dark:bg-github-accent-dark-subtle text-github-accent-fg dark:text-github-accent-dark-fg border border-github-accent-emphasis dark:border-github-accent-dark-emphasis
                     hover:bg-github-accent-emphasis dark:hover:bg-github-accent-dark-emphasis hover:text-white
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            aria-label={`Archive ${selectedCount} notifications`}
            title="Archive"
          >
            {isProcessing ? <Spinner size={14} /> : <ArchiveIcon size={14} />}
            Archive
          </button>

          {/* Clear Selection */}
          <button
            onClick={handleClearSelection}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-github
                     bg-github-canvas-default dark:bg-github-canvas-dark-default text-github-fg-muted dark:text-github-fg-dark-muted border border-github-border-default dark:border-github-border-dark-default
                     hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-dark-subtle hover:text-github-fg-default dark:hover:text-github-fg-dark-default
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Clear selection"
            title="Clear selection"
          >
            <XIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
