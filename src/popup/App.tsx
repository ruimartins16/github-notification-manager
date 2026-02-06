import { useAuth } from '../hooks/useAuth'
import { useNotifications, useUnreadCount } from '../hooks/useNotifications'
import { useState, useEffect, useCallback, memo } from 'react'
import type { GitHubNotification, NotificationType } from '../types/github'
import { 
  GitPullRequestIcon, 
  IssueOpenedIcon, 
  CommentDiscussionIcon, 
  TagIcon,
  GitCommitIcon,
  CheckCircleIcon
} from '@primer/octicons-react'

// Helper function to get fallback avatar with initial
function getFallbackAvatar(login: string): string {
  const initial = login.charAt(0).toUpperCase()
  // Create a simple SVG with the user's initial
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="#6e7681"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="system-ui" font-size="16" font-weight="600">${initial}</text>
    </svg>`
  )}`
}

// Helper function to format reason text (e.g., "team_mention" -> "Team Mention")
function formatReason(reason: string): string {
  return reason
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Icon props constant for consistency and performance
const ICON_PROPS = {
  size: 16,
  className: 'text-github-fg-muted flex-shrink-0',
  'aria-hidden': true, // Decorative - type is shown in badge below
} as const

// Helper function to get notification type icon
function getNotificationIcon(type: NotificationType): JSX.Element {
  switch (type) {
    case 'PullRequest':
      return <GitPullRequestIcon {...ICON_PROPS} />
    case 'Issue':
      return <IssueOpenedIcon {...ICON_PROPS} />
    case 'Discussion':
      return <CommentDiscussionIcon {...ICON_PROPS} />
    case 'Release':
      return <TagIcon {...ICON_PROPS} />
    case 'Commit':
      return <GitCommitIcon {...ICON_PROPS} />
    case 'CheckSuite':
    case 'CheckRun':
      return <CheckCircleIcon {...ICON_PROPS} />
  }
}

// Helper function to get relative time (e.g., "2 hours ago")
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// Helper function to get reason badge color
function getReasonBadgeClass(reason: string): string {
  switch (reason) {
    case 'mention':
    case 'team_mention':
      return 'bg-github-attention-subtle text-github-attention-fg border-github-attention-emphasis'
    case 'review_requested':
      return 'bg-github-accent-subtle text-github-accent-fg border-github-accent-emphasis'
    case 'assign':
      return 'bg-github-success-subtle text-github-success-fg border-github-success-emphasis'
    case 'security_alert':
      return 'bg-github-danger-subtle text-github-danger-fg border-github-danger-emphasis'
    default:
      return 'bg-github-canvas-subtle text-github-fg-muted border-github-border-default'
  }
}

// Notification item component (memoized for performance during polling)
const NotificationItem = memo(({ notification }: { notification: GitHubNotification }) => {
  const handleClick = useCallback(() => {
    try {
      // Construct GitHub URL safely
      let url = notification.subject.url
        ? notification.subject.url.replace('api.github.com/repos', 'github.com')
        : notification.repository.html_url
      
      // Validate it's a GitHub URL (XSS protection)
      const parsedUrl = new URL(url)
      if (!parsedUrl.hostname.endsWith('github.com')) {
        console.error('Invalid GitHub URL - security check failed')
        return
      }
      
      // Open in new tab with validated URL
      chrome.tabs.create({ url: parsedUrl.toString(), active: true })
    } catch (error) {
      console.error('Invalid URL:', error)
    }
  }, [notification.subject.url, notification.repository.html_url])

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = getFallbackAvatar(notification.repository.owner.login)
  }, [notification.repository.owner.login])

  return (
    <button
      onClick={handleClick}
      className="w-full text-left p-4 bg-github-canvas-default border border-github-border-default rounded-github 
                 hover:bg-github-canvas-subtle focus:outline-none focus:ring-2 focus:ring-github-accent-emphasis
                 transition-colors cursor-pointer"
      aria-label={`Open notification: ${notification.subject.title} from ${notification.repository.full_name}`}
    >
      <div className="flex gap-3">
        {/* Repository Avatar */}
        <img
          src={notification.repository.owner.avatar_url}
          alt={notification.repository.owner.login}
          className="w-8 h-8 rounded-full flex-shrink-0"
          onError={handleImageError}
        />

        <div className="flex-1 min-w-0">
          {/* Repository Name */}
          <div className="text-xs text-github-fg-muted mb-1">
            {notification.repository.full_name}
          </div>

          {/* Notification Title */}
          <div className="flex items-start gap-2 mb-2">
            {getNotificationIcon(notification.subject.type)}
            <div className="text-sm font-medium text-github-fg-default line-clamp-2 flex-1">
              {notification.subject.title}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Reason Badge */}
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${getReasonBadgeClass(
                notification.reason
              )}`}
            >
              {formatReason(notification.reason)}
            </span>

            {/* Type Badge */}
            <span className="text-xs px-2 py-0.5 rounded-full bg-github-canvas-subtle text-github-fg-muted border border-github-border-default">
              {notification.subject.type}
            </span>

            {/* Time */}
            <span className="text-xs text-github-fg-muted">
              {getRelativeTime(notification.updated_at)}
            </span>
          </div>
        </div>

        {/* Unread indicator */}
        {notification.unread && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-github-accent-emphasis rounded-full" />
          </div>
        )}
      </div>
    </button>
  )
})

NotificationItem.displayName = 'NotificationItem'

function App() {
  const { isAuthenticated, isLoading: authLoading, error: authError, deviceAuthInfo, login, logout } = useAuth()
  const { 
    data: notifications, 
    isLoading: notificationsLoading, 
    error: notificationsError,
    refetch: refetchNotifications 
  } = useNotifications()
  const unreadCount = useUnreadCount()
  
  const [copied, setCopied] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  
  // Combined loading state
  const isLoading = authLoading
  const error = authError

  // Start polling indicator when device auth starts
  useEffect(() => {
    if (deviceAuthInfo) {
      setIsPolling(true)
    } else {
      setIsPolling(false)
    }
  }, [deviceAuthInfo])

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
      <div className="p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-github-fg-default mb-2">
            GitHub Notification Manager
          </h1>
          <p className="text-sm text-github-fg-muted">
            Take control of your GitHub notifications
          </p>
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
          <div className="space-y-4">
            {/* Header with unread count and logout */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-github-fg-default">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-github-accent-emphasis text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </h2>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 bg-github-canvas-default border border-github-border-default
                         rounded-github hover:bg-github-canvas-subtle transition-colors
                         font-medium text-xs text-github-fg-default"
              >
                Logout
              </button>
            </div>

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
                  {notificationsError.message}
                </p>
                <button
                  onClick={() => refetchNotifications()}
                  className="px-3 py-1.5 bg-github-canvas-default border border-github-border-default
                           rounded-github hover:bg-github-canvas-subtle transition-colors
                           font-medium text-xs text-github-fg-default"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Notifications List */}
            {!notificationsLoading && !notificationsError && notifications && (
              <div className="space-y-2">
                {notifications.length === 0 ? (
                  // Empty State
                  <div className="p-8 text-center bg-github-canvas-subtle rounded-github border border-github-border-default">
                    <div className="text-4xl mb-3">🎉</div>
                    <h3 className="text-sm font-semibold text-github-fg-default mb-1">
                      All caught up!
                    </h3>
                    <p className="text-xs text-github-fg-muted">
                      You have no unread notifications
                    </p>
                  </div>
                ) : (
                  // Notification Items
                  <div 
                    className="space-y-2 max-h-[400px] overflow-y-auto"
                    role="list"
                    aria-label="GitHub notifications"
                  >
                    {notifications.map((notification) => (
                      <div key={notification.id} role="listitem">
                        <NotificationItem
                          notification={notification}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        <footer className="mt-6 pt-4 border-t border-github-border-default">
          <p className="text-xs text-github-fg-subtle text-center">
            Built with React + TypeScript + Tailwind CSS
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App
