import { useState } from 'react'
import { useNotificationStore } from '../store/notification-store'
import { useProStatus } from '../hooks/useProStatus'
import { RuleBuilder } from './RuleBuilder'
import { RuleList } from './RuleList'
import { AutoArchiveRule } from '../types/rules'
import { UpgradeModal } from './UpgradeModal'
import { ProBadge } from './ProBadge'

export function AutoArchiveRules() {
  const [showBuilder, setShowBuilder] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const { isPro, isLoading: proLoading } = useProStatus()
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
    // Free users can toggle their 1 rule, Pro users can toggle any rule
    // No Pro check needed - if they have the rule, they can toggle it
    
    // Prevent race conditions during rule application
    if (isApplying) {
      return
    }
    
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
    // Free users can delete their 1 rule to create a new one
    // No Pro check needed - if they have the rule, they can delete it
    
    // Prevent race conditions during rule application
    if (isApplying) {
      return
    }
    
    deleteRule(ruleId)
  }
  
  const handleNewRuleClick = () => {
    // Free tier: allow 1 rule, Pro: unlimited
    const FREE_TIER_MAX_RULES = 1
    
    if (!isPro && rules.length >= FREE_TIER_MAX_RULES) {
      setShowUpgradeModal(true)
      return
    }
    
    setShowBuilder(true)
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-github-fg-default dark:text-github-fg-dark-default flex items-center gap-2">
              Auto-Archive Rules
              {!proLoading && !isPro && <ProBadge />}
            </h2>
            <p className="text-xs text-github-fg-muted dark:text-github-fg-dark-muted mt-1">
              Automatically archive notifications based on repository, age, or
              reason
              {isApplying && (
                <span className="ml-2 text-github-accent-fg dark:text-github-accent-dark-fg font-medium">
                  Applying rules...
                </span>
              )}
            </p>
          </div>

          {!showBuilder && (
            <button
              onClick={handleNewRuleClick}
              disabled={isApplying || proLoading}
              className={`
                px-4 py-2 text-sm font-medium rounded-github focus:outline-none focus:ring-2 focus:ring-github-accent-emphasis dark:focus:ring-github-accent-dark-emphasis
                whitespace-nowrap transition-colors
                ${(isPro || rules.length === 0)
                  ? 'text-white bg-github-accent-emphasis dark:bg-github-accent-dark-emphasis hover:bg-github-accent-fg dark:hover:bg-github-accent-dark-fg' 
                  : 'text-github-accent-fg dark:text-github-accent-dark-fg border-2 border-github-accent-emphasis dark:border-github-accent-dark-emphasis hover:bg-github-accent-subtle dark:hover:bg-github-accent-dark-subtle'
                }
                ${isApplying || proLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              aria-label={
                isPro 
                  ? 'Create new rule' 
                  : rules.length >= 1 
                    ? 'Create new rule (Pro feature)' 
                    : 'Create your first rule (free)'
              }
              title={
                isPro 
                  ? 'Create new rule' 
                  : rules.length >= 1
                    ? 'Upgrade to Pro for unlimited rules'
                    : 'Create your first auto-archive rule'
              }
            >
              + New Rule
            </button>
          )}
        </div>

        {/* Rule Builder (shown when creating new rule) - Free tier: 1 rule, Pro: unlimited */}
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
            proLoading={proLoading}
          />
        </div>

        {/* Info Box */}
        {rules.length > 0 && (
          <div className="bg-github-accent-subtle dark:bg-github-accent-dark-subtle border border-github-accent-emphasis dark:border-github-accent-dark-emphasis rounded-github p-3">
            <div className="flex gap-2">
              <svg
                className="w-5 h-5 text-github-accent-fg dark:text-github-accent-dark-fg flex-shrink-0 mt-0.5"
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
              <div className="text-xs text-github-fg-default dark:text-github-fg-dark-default">
                <p className="font-medium mb-1">How Auto-Archive Works</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Rules apply automatically when notifications are fetched</li>
                  <li>Archived notifications can be viewed in the Archived tab</li>
                  <li>Disabled rules won't archive new notifications</li>
                  <li>Statistics show how many notifications each rule has archived</li>
                  {!isPro && rules.length > 0 && (
                    <li className="text-github-accent-fg dark:text-github-accent-dark-fg font-medium">
                      💎 Upgrade to Pro for unlimited custom rules
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Custom Rules"
      />
    </>
  )
}
