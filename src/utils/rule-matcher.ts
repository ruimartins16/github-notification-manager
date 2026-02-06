// Auto-archive rule matching and application logic

import { GitHubNotification } from '../types/github'
import {
  AutoArchiveRule,
  isRepositoryRule,
  isAgeRule,
  isReasonRule,
} from '../types/rules'

/**
 * Check if a notification matches a given rule
 */
export function matchesRule(
  notification: GitHubNotification,
  rule: AutoArchiveRule
): boolean {
  if (!rule.enabled) {
    return false
  }

  if (isRepositoryRule(rule)) {
    return notification.repository.full_name === rule.condition.fullName
  }

  if (isAgeRule(rule)) {
    const updatedAt = new Date(notification.updated_at).getTime()
    
    if (isNaN(updatedAt)) {
      console.warn('[Rule Matcher] Invalid date for notification:', notification.id, notification.updated_at)
      return false
    }
    
    const now = Date.now()
    const ageInDays = (now - updatedAt) / (1000 * 60 * 60 * 24)
    return ageInDays > rule.condition.days
  }

  if (isReasonRule(rule)) {
    return rule.condition.reasons.includes(notification.reason)
  }

  return false
}

/**
 * Apply all rules to a list of notifications
 * Returns an object with matched and unmatched notifications
 */
export function applyRules(
  notifications: GitHubNotification[],
  rules: AutoArchiveRule[]
): {
  toArchive: GitHubNotification[]
  toKeep: GitHubNotification[]
  ruleMatches: Map<string, string[]> // ruleId -> notificationIds
} {
  const toArchive: GitHubNotification[] = []
  const toKeep: GitHubNotification[] = []
  const ruleMatches = new Map<string, string[]>()

  // Initialize rule matches map
  rules.forEach((rule) => {
    ruleMatches.set(rule.id, [])
  })

  notifications.forEach((notification) => {
    let shouldArchive = false

    // Check each rule
    for (const rule of rules) {
      if (matchesRule(notification, rule)) {
        shouldArchive = true
        // Track which rule matched this notification
        const matches = ruleMatches.get(rule.id) || []
        matches.push(notification.id)
        ruleMatches.set(rule.id, matches)
        break // Only need one rule to match
      }
    }

    if (shouldArchive) {
      toArchive.push(notification)
    } else {
      toKeep.push(notification)
    }
  })

  return { toArchive, toKeep, ruleMatches }
}

/**
 * Get a human-readable description of a rule
 */
export function getRuleDescription(rule: AutoArchiveRule): string {
  if (isRepositoryRule(rule)) {
    return `Archive notifications from ${rule.condition.fullName}`
  }

  if (isAgeRule(rule)) {
    const days = rule.condition.days
    return `Archive notifications older than ${days} day${days === 1 ? '' : 's'}`
  }

  if (isReasonRule(rule)) {
    const reasons = rule.condition.reasons.join(', ')
    return `Archive notifications with reason: ${reasons}`
  }

  return 'Unknown rule'
}
