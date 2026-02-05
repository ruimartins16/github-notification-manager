// Chrome storage types

import { GitHubNotification } from './github'

export interface StorageSchema {
  // Authentication
  authToken: string | null
  user: {
    login: string
    avatar_url: string
  } | null

  // Notifications
  notifications: GitHubNotification[]
  lastFetch: number | null
  
  // Snoozed notifications
  snoozed: SnoozedNotification[]
  
  // Settings
  settings: UserSettings
  
  // Filters
  activeFilter: FilterType
}

export interface SnoozedNotification {
  notification: GitHubNotification
  wake_time: number // Unix timestamp
  alarm_name: string
}

export interface UserSettings {
  refreshInterval: number // seconds
  badgeEnabled: boolean
  soundEnabled: boolean
  defaultFilter: FilterType
  openLinksInNewTab: boolean
}

export type FilterType = 'all' | 'mentions' | 'reviews' | 'assigned'

// Default values
export const DEFAULT_SETTINGS: UserSettings = {
  refreshInterval: 30,
  badgeEnabled: true,
  soundEnabled: false,
  defaultFilter: 'all',
  openLinksInNewTab: true,
}
