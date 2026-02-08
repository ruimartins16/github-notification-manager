import { useAuth } from '../hooks/useAuth'
import { useNotifications, useUnreadCount } from '../hooks/useNotifications'
import { useNotificationStore } from '../store/notification-store'
import { useSettingsStore } from '../store/settings-store'
import { useProStatus } from '../hooks/useProStatus'
import { FilterBar } from '../components/FilterBar'
import { NotificationItem } from '../components/NotificationItem'
import { SnoozedTab } from '../components/SnoozedTab'
import { ArchivedTab } from '../components/ArchivedTab'
import { BulkActionsBar } from '../components/BulkActionsBar'
import { ToastContainer } from '../components/Toast'
import { SettingsPage } from '../components/SettingsPage'
import { ShortcutHelpModal } from '../components/ShortcutHelpModal'
import { UpgradeModal } from '../components/UpgradeModal'
import { useToast } from '../hooks/useToast'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { GitHubAPI } from '../utils/github-api'
import { convertApiUrlToWebUrl } from '../utils/url-converter'
import { extPayService } from '../utils/extpay-service'
import { trackEvent, ANALYTICS_EVENTS } from '../utils/analytics'
import { useState, useEffect, useCallback, useRef } from 'react'
import { GearIcon, ArrowLeftIcon, CheckCircleIcon, CheckboxIcon, QuestionIcon } from '@primer/octicons-react'

type ViewMode = 'active' | 'snoozed' | 'archived'
type PageMode = 'notifications' | 'settings'

function App() {
  const { isAuthenticated, isLoading: authLoading, error: authError, deviceAuthInfo, login } = useAuth()
  const { 
    notifications, 
    isLoading: notificationsLoading, 
    error: notificationsError,
    refresh: refreshNotifications 
  } = useNotifications()
  const unreadCount = useUnreadCount()
  
  // Get filtered notifications from store
  const getFilteredNotifications = useNotificationStore(state => state.getFilteredNotifications)
  const filteredNotifications = getFilteredNotifications()
  const getSnoozedCount = useNotificationStore(state => state.getSnoozedCount)
  const snoozedCount = getSnoozedCount()
  const getArchivedCount = useNotificationStore(state => state.getArchivedCount)
  const archivedCount = getArchivedCount()
  const getSelectedCount = useNotificationStore(state => state.getSelectedCount)
  const selectedCount = getSelectedCount()
  const selectAll = useNotificationStore(state => state.selectAll)
  const clearSelection = useNotificationStore(state => state.clearSelection)
  const snoozeNotification = useNotificationStore(state => state.snoozeNotification)
  
  // Get settings
  const openLinksInNewTab = useSettingsStore(state => state.openLinksInNewTab)
  const defaultFilter = useSettingsStore(state => state.defaultFilter)
  
  // Get filter setter
  const setFilter = useNotificationStore(state => state.setFilter)
  
  // Pro status
  const { isPro, isLoading: proLoading } = useProStatus()
  
  const [copied, setCopied] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('active')
  const [pageMode, setPageMode] = useState<PageMode>('notifications')
  const [selectionMode, setSelectionMode] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1) // -1 means no item focused
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  // Track if we've applied the initial default filter
  const hasAppliedInitialFilter = useRef(false)
  
  // Toast notifications
  const { toasts, addToast, removeToast } = useToast()
  
  // Get store actions
  const markAllAsRead = useNotificationStore(state => state.markAllAsRead)
  const undoMarkAllAsRead = useNotificationStore(state => state.undoMarkAllAsRead)
  const markAsRead = useNotificationStore(state => state.markAsRead)
  const archiveNotification = useNotificationStore(state => state.archiveNotification)
  
  // Combined loading state
  const isLoading = authLoading
  const error = authError

  // Keyboard shortcuts handlers
  const handleOpenFocused = useCallback(() => {
    const notification = filteredNotifications[focusedIndex]
    if (!notification) return
    
    try {
      let url = notification.subject.url
        ? convertApiUrlToWebUrl(notification.subject.url)
        : notification.repository.html_url
      
      const parsedUrl = new URL(url)
      if (!parsedUrl.hostname.endsWith('github.com') || 
          !['http:', 'https:'].includes(parsedUrl.protocol)) {
        console.error('Invalid GitHub URL')
        return
      }
      
      // Open based on user preference
      if (openLinksInNewTab) {
        chrome.tabs.create({ url: parsedUrl.toString(), active: true })
      } else {
        chrome.tabs.update({ url: parsedUrl.toString() })
      }
    } catch (error) {
      console.error('Invalid URL:', error)
    }
  }, [focusedIndex, filteredNotifications, openLinksInNewTab])

  const handleMarkFocusedDone = useCallback(async () => {
    const notification = filteredNotifications[focusedIndex]
    if (!notification) return
    
    markAsRead(notification.id)
    addToast('Marked as read', { variant: 'success', duration: 2000 })
    
    // Mark as read on GitHub
    try {
      const token = await chrome.storage.local.get('github_token')
      if (token.github_token) {
        const api = GitHubAPI.getInstance()
        await api.initialize(token.github_token)
        // Note: API doesn't expose markThreadAsRead, uses markAllAsRead instead
        // Individual thread marking is handled by NotificationActions component
      }
    } catch (error) {
      console.error('Failed to mark as read on GitHub:', error)
    }
  }, [focusedIndex, filteredNotifications, markAsRead, addToast])

  const handleArchiveFocused = useCallback(() => {
    const notification = filteredNotifications[focusedIndex]
    if (!notification) return
    
    archiveNotification(notification.id)
    addToast('Archived', { variant: 'success', duration: 2000 })
  }, [focusedIndex, filteredNotifications, archiveNotification, addToast])

  const handleSnoozeFocused = useCallback(() => {
    // Get the focused notification
    const notification = filteredNotifications[focusedIndex]
    if (!notification) return

    // Snooze for 1 hour (default duration)
    const wakeTime = Date.now() + 3600000 // 1 hour in milliseconds
    snoozeNotification(notification.id, wakeTime)
    
    // Show success message
    addToast(`Snoozed for 1 hour`, { variant: 'success' })
    
    // Clear focus after snoozing
    setFocusedIndex(-1)
  }, [focusedIndex, filteredNotifications, snoozeNotification, addToast])

  // Apply default filter from settings once on mount (after settings rehydrate)
  useEffect(() => {
    // Only apply once when component mounts
    // By the time this runs, settings store should have rehydrated
    if (!hasAppliedInitialFilter.current) {
      console.log(`[App] Applying default filter from settings: ${defaultFilter}`)
      setFilter(defaultFilter)
      hasAppliedInitialFilter.current = true
    }
  }, [defaultFilter, setFilter])
  
  // Reset focus when changing views or filters
  useEffect(() => {
    setFocusedIndex(-1)
  }, [viewMode, pageMode, selectionMode])

  // Start polling indicator when device auth starts
  useEffect(() => {
    if (deviceAuthInfo) {
      setIsPolling(true)
    } else {
      setIsPolling(false)
    }
  }, [deviceAuthInfo])

  // Listen for payment success and show welcome toast
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'PRO_STATUS_CHANGED' && message.isPro) {
        // User just upgraded to Pro!
        addToast('Welcome to Pro! ⭐ All features unlocked.', {
          variant: 'success',
          duration: 5000,
        })
      }
    }
    
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [addToast])

  const handleCopyCode = () => {
    if (deviceAuthInfo) {
      navigator.clipboard.writeText(deviceAuthInfo.userCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenGitHub = () => {
    if (deviceAuthInfo) {
      chrome.tabs.create({
        url: deviceAuthInfo.verificationUri,
        active: true,
      })
    }
  }

  // Handle individual notification actions
  const handleActionComplete = useCallback(
    (action: 'read' | 'archive' | 'unsubscribe' | 'snooze') => {
      const messages = {
        read: 'Marked as read',
        archive: 'Archived',
        unsubscribe: 'Unsubscribed from thread',
        snooze: 'Snoozed',
      }

      addToast(messages[action], {
        variant: 'success',
        duration: 3000,
      })
    },
    [addToast]
  )

  // Handle bulk actions
  const handleBulkActionComplete = useCallback(
    (action: 'read' | 'archive', count: number) => {
      const messages = {
        read: `Marked ${count} notification${count === 1 ? '' : 's'} as read`,
        archive: `Archived ${count} notification${count === 1 ? '' : 's'}`,
      }

      addToast(messages[action], {
        variant: 'success',
        duration: 3000,
      })
    },
    [addToast]
  )

  // Toggle selection mode
  const handleToggleSelectionMode = useCallback(() => {
    if (selectionMode) {
      // Exiting selection mode - clear selection
      clearSelection()
    }
    setSelectionMode(!selectionMode)
  }, [selectionMode, clearSelection])

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedCount === filteredNotifications.length && selectedCount > 0) {
      // All are selected, deselect all
      clearSelection()
    } else {
      // Select all filtered notifications
      selectAll()
    }
  }, [selectedCount, filteredNotifications.length, clearSelection, selectAll])

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    // Optimistic update - mark all filtered notifications as read in the store
    const markedNotifications = markAllAsRead()
    
    // Show toast with undo option
    addToast(`Marked ${markedNotifications.length} notification${markedNotifications.length === 1 ? '' : 's'} as read`, {
      variant: 'success',
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          undoMarkAllAsRead()
          addToast('Restored notifications', { variant: 'info', duration: 3000 })
        },
      },
    })

    // Call GitHub API to actually mark as read (runs in background)
    try {
      const token = await chrome.storage.local.get('github_token')
      if (token.github_token) {
        const api = GitHubAPI.getInstance()
        await api.initialize(token.github_token)
        await api.markAllAsRead()
      }
    } catch (error) {
      console.error('Failed to mark notifications as read on GitHub:', error)
      
      // Show error toast with retry option
      addToast('Failed to sync with GitHub. Changes saved locally.', {
        variant: 'warning',
        duration: 7000,
        action: {
          label: 'Retry',
          onClick: async () => {
            try {
              const token = await chrome.storage.local.get('github_token')
              if (token.github_token) {
                const api = GitHubAPI.getInstance()
                await api.initialize(token.github_token)
                await api.markAllAsRead()
                addToast('Synced with GitHub', { variant: 'success', duration: 3000 })
              }
            } catch (retryError) {
              console.error('Retry failed:', retryError)
              addToast('Retry failed. Please try again later.', { 
                variant: 'error', 
                duration: 5000 
              })
            }
          }
        }
      })
    }
  }, [markAllAsRead, undoMarkAllAsRead, addToast])

  // Keyboard shortcuts integration
  const { getShortcuts, listRef } = useKeyboardShortcuts({
    focusedIndex,
    setFocusedIndex,
    notificationCount: filteredNotifications.length,
    onOpenFocused: handleOpenFocused,
    onMarkFocusedDone: handleMarkFocusedDone,
    onArchiveFocused: handleArchiveFocused,
    onSnoozeFocused: handleSnoozeFocused,
    onMarkAllRead: handleMarkAllAsRead,
    onOpenHelp: () => setIsHelpModalOpen(true),
    onShowUpgrade: () => setShowUpgradeModal(true),
    enabled: viewMode === 'active' && !selectionMode && pageMode === 'notifications',
  })


  if (isLoading) {
    return (
      <div className="w-[400px] h-[600px] bg-github-canvas-default flex items-center justify-center">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-github-accent-emphasis mx-auto mb-4"
            role="status"
            aria-label="Loading authentication status"
          />
          <p className="text-sm text-github-fg-muted">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[400px] h-[600px] bg-github-canvas-default">
      <div className="p-4">
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-github-fg-default mb-2">
            GitHub Notification Manager
          </h1>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-github-fg-muted">
              Take control of your GitHub notifications
            </p>
            {!proLoading && !isPro && (
              <button
                onClick={() => {
                  trackEvent(ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED, { location: 'header' })
                  setShowUpgradeModal(true)
                }}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-full hover:bg-blue-700 
                         transition-colors font-semibold whitespace-nowrap"
                aria-label="Upgrade to Pro"
                title="Upgrade to Pro to unlock snooze, rules, and keyboard shortcuts"
              >
                Upgrade
              </button>
            )}
          </div>
        </header>

        {error && (
          <div 
            className="mb-4 p-4 bg-github-danger-subtle border border-github-danger-emphasis rounded-github"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-sm text-github-danger-fg font-medium">
              {error}
            </p>
          </div>
        )}

        {deviceAuthInfo && (
          <div className="mb-4 p-6 bg-github-accent-subtle border border-github-accent-emphasis rounded-github">
            <h2 className="text-lg font-semibold text-github-fg-default mb-3 text-center">
              Step 1: Copy this code
            </h2>
            <div className="my-4 p-4 bg-github-canvas-default rounded-github border border-github-border-default">
              <p className="text-3xl font-mono font-bold text-center text-github-accent-fg tracking-widest">
                {deviceAuthInfo.userCode}
              </p>
            </div>
            
            <button
              onClick={handleCopyCode}
              className="w-full px-4 py-2 mb-3 bg-github-canvas-default border border-github-border-default
                       rounded-github hover:bg-github-canvas-subtle transition-colors
                       font-medium text-sm text-github-fg-default"
            >
              {copied ? '✓ Copied!' : '📋 Copy Code'}
            </button>

            <h2 className="text-lg font-semibold text-github-fg-default mb-3 text-center mt-4">
              Step 2: Authorize on GitHub
            </h2>
            
            <button
              onClick={handleOpenGitHub}
              className="w-full px-4 py-2 bg-github-accent-emphasis text-white rounded-github 
                       hover:bg-github-accent-fg transition-colors font-medium text-sm"
            >
              Open GitHub to Authorize
            </button>

            <p className="text-xs text-github-fg-muted text-center mt-4">
              {isPolling ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-2 h-2 bg-github-accent-emphasis rounded-full animate-pulse"></span>
                  <span>Waiting for authorization...</span>
                </span>
              ) : (
                `Code expires in ${Math.floor(deviceAuthInfo.expiresIn / 60)} minutes`
              )}
            </p>
          </div>
        )}

        {!isAuthenticated && !deviceAuthInfo ? (
          <div className="space-y-4">
            <div className="p-6 bg-github-canvas-subtle rounded-github border border-github-border-default text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-16 w-16 text-github-fg-muted"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  role="img"
                  aria-label="GitHub logo"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              
              <h2 className="text-lg font-semibold text-github-fg-default mb-2">
                Connect to GitHub
              </h2>
              <p className="text-sm text-github-fg-muted mb-6">
                Sign in with your GitHub account to manage your notifications
              </p>

              <button
                onClick={login}
                disabled={isLoading}
                aria-busy={isLoading}
                className="px-6 py-3 bg-github-accent-emphasis text-white rounded-github 
                         hover:bg-github-accent-fg transition-colors font-medium text-sm
                         disabled:opacity-50 disabled:cursor-not-allowed w-full"
              >
                {isLoading ? 'Connecting...' : 'Connect GitHub'}
              </button>
            </div>

            <div className="p-4 bg-github-attention-subtle rounded-github border border-github-border-default">
              <h3 className="text-sm font-semibold text-github-fg-default mb-2">
                What you'll authorize:
              </h3>
              <ul className="text-xs text-github-fg-muted space-y-1">
                <li>✓ Read your notifications</li>
                <li>✓ View your profile information</li>
                <li>✓ Mark notifications as read</li>
              </ul>
            </div>
          </div>
        ) : null}

        {isAuthenticated ? (
          pageMode === 'settings' ? (
            /* Settings Page */
            <div className="h-full">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-github-border-default">
                <button
                  onClick={() => setPageMode('notifications')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-github-canvas-default border border-github-border-default
                           rounded-github hover:bg-github-canvas-subtle transition-colors
                           font-medium text-xs text-github-fg-default"
                >
                  <ArrowLeftIcon size={14} />
                  Back
                </button>
                <h2 className="text-lg font-semibold text-github-fg-default">Settings</h2>
                <div className="w-16" /> {/* Spacer for centering */}
              </div>
              <SettingsPage />
            </div>
          ) : (
            /* Notifications Page */
            <div>
              {/* ARIA Live Regions for Screen Readers */}
              <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
              </div>
              <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {snoozedCount} snoozed notification{snoozedCount === 1 ? '' : 's'}
              </div>
              <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {archivedCount} archived notification{archivedCount === 1 ? '' : 's'}
              </div>

              {/* Header with unread count, actions, and logout */}
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <h2 className="text-lg font-semibold text-github-fg-default">
                  Notifications
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {/* Pro Status Button/Badge */}
                {proLoading ? (
                  <span 
                    className="text-xs text-github-fg-muted"
                    role="status"
                    aria-live="polite"
                    aria-label="Loading subscription status"
                  >
                    ...
                  </span>
                ) : isPro && (
                  <button
                    onClick={async () => {
                      try {
                        // Import helper dynamically
                        const { triggerStatusRefresh } = await import('../utils/status-refresh-helper')
                        // Trigger refresh (sets flag + broadcasts message)
                        await triggerStatusRefresh('payment')
                        await extPayService.openPaymentPage()
                      } catch (error) {
                        console.error('[App] Failed to open payment page:', error)
                        // Clear flag on error
                        await chrome.storage.local.remove('extpay_payment_pending')
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-yellow-800 hover:text-yellow-900 transition-colors
                             px-2 py-1 rounded-github bg-yellow-50 hover:bg-yellow-100"
                    aria-label="Manage Pro subscription"
                    title="Manage Pro subscription"
                  >
                    <span className="text-sm">⭐</span>
                    <span className="font-semibold">Pro</span>
                  </button>
                )}
                
                {viewMode === 'active' && !selectionMode && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={notificationsLoading}
                    className="px-3 py-1.5 bg-github-canvas-default border border-github-border-default
                             rounded-github hover:bg-github-canvas-subtle transition-colors
                             font-medium text-xs text-github-fg-default flex items-center gap-1.5
                             disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Mark all as read"
                    title="Mark all as read"
                  >
                    <CheckCircleIcon size={14} />
                  </button>
                )}
                {viewMode === 'active' && (
                  <button
                    onClick={handleToggleSelectionMode}
                    className={`px-3 py-1.5 rounded-github font-medium text-xs transition-colors flex items-center gap-1.5
                             ${selectionMode 
                               ? 'bg-github-accent-emphasis text-white hover:bg-github-accent-fg' 
                               : 'bg-github-canvas-default border border-github-border-default text-github-fg-default hover:bg-github-canvas-subtle'
                             }`}
                    aria-label={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
                    title={selectionMode ? 'Exit selection mode' : 'Select notifications'}
                  >
                    {selectionMode ? 'Done' : <CheckboxIcon size={14} />}
                  </button>
                )}
                {isPro && (
                  <button
                    onClick={() => setIsHelpModalOpen(true)}
                    className="px-3 py-1.5 bg-github-canvas-default border border-github-border-default
                             rounded-github hover:bg-github-canvas-subtle transition-colors
                             font-medium text-xs text-github-fg-default flex items-center gap-1.5"
                    aria-label="Keyboard shortcuts help"
                    title="Keyboard shortcuts (?)"
                  >
                    <QuestionIcon size={14} />
                  </button>
                )}
                <button
                  onClick={() => setPageMode('settings')}
                  className="px-3 py-1.5 bg-github-canvas-default border border-github-border-default
                           rounded-github hover:bg-github-canvas-subtle transition-colors
                           font-medium text-xs text-github-fg-default flex items-center gap-1.5"
                  aria-label="Settings"
                  title="Settings"
                  data-testid="settings-button"
                >
                  <GearIcon size={14} />
                </button>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5 mb-2">
              <button
                onClick={() => setViewMode('active')}
                className={`
                  flex-1 px-3 py-2 rounded-github text-xs font-medium transition-colors
                  flex items-center justify-center gap-1.5
                  ${viewMode === 'active'
                    ? 'bg-github-accent-emphasis text-white'
                    : 'bg-github-canvas-default border border-github-border-default text-github-fg-default hover:bg-github-canvas-subtle'
                  }
                `}
              >
                <span>Active</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-white bg-opacity-20">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setViewMode('snoozed')}
                className={`
                  flex-1 px-3 py-2 rounded-github text-xs font-medium transition-colors
                  flex items-center justify-center gap-1.5
                  ${viewMode === 'snoozed'
                    ? 'bg-github-accent-emphasis text-white'
                    : 'bg-github-canvas-default border border-github-border-default text-github-fg-default hover:bg-github-canvas-subtle'
                  }
                `}
              >
                <span>Snoozed</span>
                {snoozedCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-white bg-opacity-20">
                    {snoozedCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setViewMode('archived')}
                className={`
                  flex-1 px-3 py-2 rounded-github text-xs font-medium transition-colors
                  flex items-center justify-center gap-1.5
                  ${viewMode === 'archived'
                    ? 'bg-github-accent-emphasis text-white'
                    : 'bg-github-canvas-default border border-github-border-default text-github-fg-default hover:bg-github-canvas-subtle'
                  }
                `}
              >
                <span>Archived</span>
                {archivedCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-white bg-opacity-20">
                    {archivedCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filter Bar - only show for active notifications */}
            {viewMode === 'active' && !selectionMode && <FilterBar />}

            {/* Select All - only show in selection mode */}
            {viewMode === 'active' && selectionMode && filteredNotifications.length > 0 && (
              <div className="mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCount === filteredNotifications.length && selectedCount > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-github-border-default text-github-accent-emphasis 
                             focus:ring-2 focus:ring-github-accent-emphasis cursor-pointer"
                  />
                  <span className="text-sm font-medium text-github-fg-default">
                    Select All ({filteredNotifications.length})
                  </span>
                </label>
              </div>
            )}

            {/* Bulk Actions Bar */}
            {viewMode === 'active' && selectionMode && <BulkActionsBar onActionComplete={handleBulkActionComplete} />}

            {/* Notifications Loading State */}
            {notificationsLoading && (
              <div className="p-8 text-center">
                <div 
                  className="animate-spin rounded-full h-8 w-8 border-b-2 border-github-accent-emphasis mx-auto mb-3"
                  role="status"
                  aria-label="Loading notifications"
                />
                <p className="text-sm text-github-fg-muted">Loading notifications...</p>
              </div>
            )}

            {/* Notifications Error State */}
            {notificationsError && (
              <div 
                className="p-4 bg-github-danger-subtle border border-github-danger-emphasis rounded-github"
                role="alert"
              >
                <p className="text-sm text-github-danger-fg font-medium mb-2">
                  Failed to load notifications
                </p>
                <p className="text-xs text-github-fg-muted mb-3">
                  {notificationsError}
                </p>
                <button
                  onClick={() => refreshNotifications()}
                  className="px-3 py-1.5 bg-github-canvas-default border border-github-border-default
                           rounded-github hover:bg-github-canvas-subtle transition-colors
                           font-medium text-xs text-github-fg-default"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Notifications List - Active View */}
            {viewMode === 'active' && !notificationsLoading && !notificationsError && notifications && (
              <div 
                ref={listRef}
                id="notification-list"
                className="mt-2"
                role="tabpanel"
              >
                {filteredNotifications.length === 0 ? (
                  // Empty State
                  <div className="p-8 text-center bg-github-canvas-subtle rounded-github border border-github-border-default">
                    <div className="text-4xl mb-3">🎉</div>
                    <h3 className="text-sm font-semibold text-github-fg-default mb-1">
                      All caught up!
                    </h3>
                    <p className="text-xs text-github-fg-muted">
                      {notifications.length === 0 
                        ? 'You have no unread notifications'
                        : 'No notifications in this filter'}
                    </p>
                  </div>
                ) : (
                  // Notification Items
                  <div 
                    className="space-y-2 max-h-[400px] overflow-y-auto"
                    role="list"
                    aria-label="GitHub notifications"
                  >
                    {filteredNotifications.map((notification, index) => (
                      <div 
                        key={notification.id} 
                        role="listitem"
                        data-notification-index={index}
                        className={`
                          ${focusedIndex === index ? 'ring-2 ring-github-accent-emphasis ring-offset-2 rounded-github' : ''}
                        `}
                      >
                        <NotificationItem
                          notification={notification}
                          showCheckbox={selectionMode}
                          showActions={!selectionMode}
                          showSnoozeButton={!selectionMode}
                          onActionComplete={handleActionComplete}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Snoozed View */}
            {viewMode === 'snoozed' && (
              <div className="mt-2">
                <SnoozedTab />
              </div>
            )}

            {/* Archived View */}
            {viewMode === 'archived' && (
              <div className="mt-2">
                <ArchivedTab />
              </div>
            )}
            </div>
          )
        ) : null}
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Keyboard Shortcuts Help Modal */}
      <ShortcutHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        shortcuts={getShortcuts()}
      />
      
      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  )
}

export default App
