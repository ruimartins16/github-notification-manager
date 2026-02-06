// GitHub API types and interfaces

export interface GitHubNotification {
  id: string
  unread: boolean
  reason: NotificationReason
  updated_at: string
  last_read_at: string | null
  subject: {
    title: string
    url: string
    latest_comment_url: string
    type: NotificationType
  }
  repository: {
    id: number
    name: string
    full_name: string
    owner: {
      login: string
      avatar_url: string
    }
    html_url: string
  }
  url: string
  subscription_url: string
}

export type NotificationReason =
  | 'assign'
  | 'author'
  | 'comment'
  | 'invitation'
  | 'manual'
  | 'mention'
  | 'review_requested'
  | 'security_alert'
  | 'state_change'
  | 'subscribed'
  | 'team_mention'

export type NotificationType =
  | 'Issue'
  | 'PullRequest'
  | 'Commit'
  | 'Release'
  | 'Discussion'
  | 'CheckSuite'
  | 'CheckRun'

export interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  name: string | null
  email: string | null
}

export interface AuthToken {
  access_token: string
  token_type: string
  scope: string
}

export interface SnoozedNotification {
  notification: GitHubNotification
  snoozedAt: number // timestamp when snoozed
  wakeTime: number // timestamp when to wake
  alarmName: string // chrome alarm identifier
}

export type SnoozeDuration = '1h' | '4h' | '24h' | 'custom'
