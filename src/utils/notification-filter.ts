/**
 * Pure read-time filtering of the raw GitHub notification list.
 *
 * The store and the background worker both keep the RAW list from GitHub's
 * API untouched and apply local state (archived, snoozed, smart-dismissed)
 * only when reading. Because the raw list is never destructively filtered,
 * filtering is idempotent and the "double filtering" class of bugs (data
 * disappearing after being filtered twice) cannot occur.
 */

import type { GitHubNotification, SnoozedNotification } from '../types/github'

/** Minimal shape of a smart-dismiss entry (see notification-store). */
export interface DismissedEntry {
  id: string
  lastSeenUpdatedAt: string // GitHub's updated_at value when dismissed
}

export interface LocalNotificationState {
  dismissedNotifications?: DismissedEntry[]
  archivedNotifications?: Pick<GitHubNotification, 'id'>[]
  snoozedNotifications?: SnoozedNotification[]
}

/**
 * Return the notifications that should appear in the Active list / badge:
 * the raw GitHub list minus archived, snoozed, and smart-dismissed items.
 *
 * Smart dismiss: a dismissed notification stays hidden only while GitHub's
 * updated_at is unchanged. New activity (updated_at moved forward) makes it
 * reappear.
 */
export function getActiveNotifications(
  notifications: GitHubNotification[],
  local: LocalNotificationState
): GitHubNotification[] {
  const dismissedMap = new Map(
    (local.dismissedNotifications ?? []).map(d => [d.id, d])
  )
  const archivedSet = new Set((local.archivedNotifications ?? []).map(n => n.id))
  const snoozedSet = new Set(
    (local.snoozedNotifications ?? []).map(s => s.notification.id)
  )

  return notifications.filter(n => {
    if (archivedSet.has(n.id)) return false
    if (snoozedSet.has(n.id)) return false

    const dismissed = dismissedMap.get(n.id)
    if (!dismissed) return true

    // Dismissed — show again only if there is new activity since dismissal
    return new Date(n.updated_at) > new Date(dismissed.lastSeenUpdatedAt)
  })
}
