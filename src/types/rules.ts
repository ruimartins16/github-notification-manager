// Auto-archive rule types and interfaces

import { NotificationReason } from './github'

export type RuleType = 'repository' | 'age' | 'reason'

export interface BaseRule {
  id: string
  type: RuleType
  enabled: boolean
  createdAt: number
  archivedCount: number // Statistics: how many notifications this rule has archived
}

export interface RepositoryRule extends BaseRule {
  type: 'repository'
  condition: {
    fullName: string // e.g., "facebook/react"
  }
}

export interface AgeRule extends BaseRule {
  type: 'age'
  condition: {
    days: number // Archive notifications older than N days
  }
}

export interface ReasonRule extends BaseRule {
  type: 'reason'
  condition: {
    reasons: NotificationReason[] // Archive notifications with these reasons
  }
}

export type AutoArchiveRule = RepositoryRule | AgeRule | ReasonRule

// Helper type guards
export function isRepositoryRule(rule: AutoArchiveRule): rule is RepositoryRule {
  return rule.type === 'repository'
}

export function isAgeRule(rule: AutoArchiveRule): rule is AgeRule {
  return rule.type === 'age'
}

export function isReasonRule(rule: AutoArchiveRule): rule is ReasonRule {
  return rule.type === 'reason'
}

// Rule creation helpers
export function createRepositoryRule(fullName: string): RepositoryRule {
  return {
    id: crypto.randomUUID(),
    type: 'repository',
    enabled: true,
    createdAt: Date.now(),
    archivedCount: 0,
    condition: { fullName },
  }
}

export function createAgeRule(days: number): AgeRule {
  return {
    id: crypto.randomUUID(),
    type: 'age',
    enabled: true,
    createdAt: Date.now(),
    archivedCount: 0,
    condition: { days },
  }
}

export function createReasonRule(reasons: NotificationReason[]): ReasonRule {
  return {
    id: crypto.randomUUID(),
    type: 'reason',
    enabled: true,
    createdAt: Date.now(),
    archivedCount: 0,
    condition: { reasons },
  }
}
