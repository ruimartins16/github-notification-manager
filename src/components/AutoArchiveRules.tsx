import { useState } from 'react'
import { useNotificationStore } from '../store/notification-store'
import { RuleBuilder } from './RuleBuilder'
import { RuleList } from './RuleList'
import { AutoArchiveRule } from '../types/rules'

export function AutoArchiveRules() {
  const [showBuilder, setShowBuilder] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const rules = useNotificationStore((state) => state.autoArchiveRules)
  const addRule = useNotificationStore((state) => state.addRule)
  const toggleRule = useNotificationStore((state) => state.toggleRule)
  const deleteRule = useNotificationStore((state) => state.deleteRule)
  const applyAutoArchiveRules = useNotificationStore(
    (state) => state.applyAutoArchiveRules
  )

  const handleRuleCreated = async (rule: AutoArchiveRule) => {
    addRule(rule)
    setShowBuilder(false)
    // Apply rules immediately to current notifications
    setIsApplying(true)
    try {
      applyAutoArchiveRules()
    } finally {
      setIsApplying(false)
    }
  }

  const handleToggle = async (ruleId: string) => {
    toggleRule(ruleId)
    // Reapply rules after toggle (this won't unarchive, but will apply newly enabled rules)
    setIsApplying(true)
    try {
      applyAutoArchiveRules()
    } finally {
      setIsApplying(false)
    }
  }

  const handleDelete = (ruleId: string) => {
    deleteRule(ruleId)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Auto-Archive Rules
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Automatically archive notifications based on repository, age, or
            reason
            {isApplying && (
              <span className="ml-2 text-blue-600 font-medium">
                Applying rules...
              </span>
            )}
          </p>
        </div>

        {!showBuilder && (
          <button
            onClick={() => setShowBuilder(true)}
            disabled={isApplying}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            + New Rule
          </button>
        )}
      </div>

      {/* Rule Builder (shown when creating new rule) */}
      {showBuilder && (
        <RuleBuilder
          onRuleCreated={handleRuleCreated}
          onCancel={() => setShowBuilder(false)}
        />
      )}

      {/* Rules List */}
      <div className={isApplying ? 'opacity-50 pointer-events-none' : ''}>
        <RuleList
          rules={rules}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      </div>

      {/* Info Box */}
      {rules.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex gap-2">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-xs text-blue-900">
              <p className="font-medium mb-1">How Auto-Archive Works</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Rules apply automatically when notifications are fetched</li>
                <li>Archived notifications can be viewed in the Archived tab</li>
                <li>Disabled rules won't archive new notifications</li>
                <li>Statistics show how many notifications each rule has archived</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
