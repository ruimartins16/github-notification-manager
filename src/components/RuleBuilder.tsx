import React, { useState } from 'react'
import { NotificationReason } from '../types/github'
import {
  AutoArchiveRule,
  createRepositoryRule,
  createAgeRule,
  createReasonRule,
  RuleType,
} from '../types/rules'

interface RuleBuilderProps {
  onRuleCreated: (rule: AutoArchiveRule) => void
  onCancel: () => void
}

const REASON_OPTIONS: { value: NotificationReason; label: string }[] = [
  { value: 'assign', label: 'Assigned' },
  { value: 'author', label: 'Author' },
  { value: 'comment', label: 'Comment' },
  { value: 'invitation', label: 'Invitation' },
  { value: 'manual', label: 'Manual' },
  { value: 'mention', label: 'Mention' },
  { value: 'review_requested', label: 'Review Requested' },
  { value: 'security_alert', label: 'Security Alert' },
  { value: 'state_change', label: 'State Change' },
  { value: 'subscribed', label: 'Subscribed' },
  { value: 'team_mention', label: 'Team Mention' },
]

export function RuleBuilder({ onRuleCreated, onCancel }: RuleBuilderProps) {
  const [ruleType, setRuleType] = useState<RuleType>('repository')
  const [repositoryName, setRepositoryName] = useState('')
  const [ageDays, setAgeDays] = useState('7')
  const [selectedReasons, setSelectedReasons] = useState<NotificationReason[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    let rule: AutoArchiveRule | null = null

    if (ruleType === 'repository' && repositoryName.trim()) {
      rule = createRepositoryRule(repositoryName.trim())
    } else if (ruleType === 'age' && parseInt(ageDays) > 0) {
      rule = createAgeRule(parseInt(ageDays))
    } else if (ruleType === 'reason' && selectedReasons.length > 0) {
      rule = createReasonRule(selectedReasons)
    }

    if (rule) {
      onRuleCreated(rule)
      // Reset form
      setRepositoryName('')
      setAgeDays('7')
      setSelectedReasons([])
    }
  }

  const toggleReason = (reason: NotificationReason) => {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    )
  }

  const isValid = () => {
    if (ruleType === 'repository') {
      const trimmed = repositoryName.trim()
      // Validate format: owner/repo (alphanumeric, hyphens, underscores)
      return trimmed.length > 0 && /^[\w-]+\/[\w.-]+$/.test(trimmed)
    }
    if (ruleType === 'age') return parseInt(ageDays) > 0
    if (ruleType === 'reason') return selectedReasons.length > 0
    return false
  }

  const hasRepositoryError = ruleType === 'repository' && repositoryName.trim().length > 0 && !/^[\w-]+\/[\w.-]+$/.test(repositoryName.trim())

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Create Auto-Archive Rule
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rule Type Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Rule Type
          </label>
          <select
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value as RuleType)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="repository">Repository</option>
            <option value="age">Age</option>
            <option value="reason">Reason</option>
          </select>
        </div>

        {/* Repository Rule Input */}
        {ruleType === 'repository' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Repository (owner/repo)
            </label>
            <input
              type="text"
              value={repositoryName}
              onChange={(e) => setRepositoryName(e.target.value)}
              placeholder="e.g., facebook/react"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {hasRepositoryError && (
              <p className="mt-1 text-xs text-red-600">
                Format should be owner/repo (e.g., facebook/react)
              </p>
            )}
            {!hasRepositoryError && (
              <p className="mt-1 text-xs text-gray-500">
                Archive all notifications from this repository
              </p>
            )}
          </div>
        )}

        {/* Age Rule Input */}
        {ruleType === 'age' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Days Old
            </label>
            <input
              type="number"
              min="1"
              value={ageDays}
              onChange={(e) => setAgeDays(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Archive notifications older than this many days
            </p>
          </div>
        )}

        {/* Reason Rule Input */}
        {ruleType === 'reason' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Notification Reasons
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {REASON_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedReasons.includes(option.value)}
                    onChange={() => toggleReason(option.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Archive notifications with these reasons
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={!isValid()}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Rule
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
