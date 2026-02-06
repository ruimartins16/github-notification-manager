import { useState, useCallback, memo } from 'react'
import type { GitHubNotification, NotificationType } from '../types/github'
import { 
  GitPullRequestIcon, 
  IssueOpenedIcon, 
  CommentDiscussionIcon, 
  TagIcon,
  GitCommitIcon,
  CheckCircleIcon
} from '@primer/octicons-react'
import { SnoozeButton } from './SnoozeButton'
import { SnoozeDialog } from './SnoozeDialog'
import { NotificationActions } from './NotificationActions'

// Helper function to get fallback avatar with initial
function getFallbackAvatar(login: string): string {
  const initial = login.charAt(0).toUpperCase()
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="#6e7681"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="system-ui" font-size="16" font-weight="600">${initial}</text>
    </svg>`
  )}`
}

// Helper function to format reason text
function formatReason(reason: string): string {
  return reason
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Icon props constant
const ICON_PROPS = {
  size: 16,
  className: 'text-github-fg-muted flex-shrink-0',
  'aria-hidden': true,
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

// Helper function to get relative time
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

interface NotificationItemProps {
  notification: GitHubNotification
  showSnoozeButton?: boolean
  showActions?: boolean
  onActionComplete?: (action: 'read' | 'archive' | 'unsubscribe' | 'snooze') => void
}

export const NotificationItem = memo(({ 
  notification, 
  showSnoozeButton = true,
  showActions = true,
  onActionComplete
}: NotificationItemProps) => {
  const [isSnoozeDialogOpen, setIsSnoozeDialogOpen] = useState(false)

  const handleActionComplete = useCallback(
    (action: 'read' | 'archive' | 'unsubscribe') => {
      onActionComplete?.(action)
    },
    [onActionComplete]
  )

  const handleClick = useCallback(() => {
    try {
      // Construct GitHub URL safely
      let url = notification.subject.url
        ? notification.subject.url.replace('api.github.com/repos', 'github.com')
        : notification.repository.html_url
      
      // Validate it's a GitHub URL with correct protocol (XSS protection)
      const parsedUrl = new URL(url)
      if (!parsedUrl.hostname.endsWith('github.com') || 
          !['http:', 'https:'].includes(parsedUrl.protocol)) {
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
    <>
      <div
        className="relative w-full text-left p-4 bg-github-canvas-default border border-github-border-default rounded-github 
                   hover:bg-github-canvas-subtle transition-colors group"
      >
        <div className="flex gap-3">
          {/* Repository Avatar */}
          <img
            src={notification.repository.owner.avatar_url}
            alt={notification.repository.owner.login}
            className="w-8 h-8 rounded-full flex-shrink-0 cursor-pointer"
            onError={handleImageError}
            onClick={handleClick}
          />

          <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
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

          {/* Right side - Actions, Snooze button & Unread indicator */}
          <div className="flex items-center gap-2">
            {/* Action buttons (visible on hover) */}
            {showActions && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <NotificationActions
                  notificationId={notification.id}
                  notificationTitle={notification.subject.title}
                  onActionComplete={handleActionComplete}
                />
              </div>
            )}

            {/* Snooze button (visible on hover) */}
            {showSnoozeButton && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <SnoozeButton
                  notificationId={notification.id}
                  onCustom={() => setIsSnoozeDialogOpen(true)}
                />
              </div>
            )}

            {/* Unread indicator */}
            {notification.unread && (
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-github-accent-emphasis rounded-full" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Snooze Dialog */}
      {showSnoozeButton && (
        <SnoozeDialog
          notificationId={notification.id}
          isOpen={isSnoozeDialogOpen}
          onClose={() => setIsSnoozeDialogOpen(false)}
        />
      )}
    </>
  )
})

NotificationItem.displayName = 'NotificationItem'
