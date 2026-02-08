import { useState } from 'react'
import { AutoArchiveRule } from '../types/rules'
import { getRuleDescription } from '../utils/rule-matcher'
import { ConfirmationDialog } from './ConfirmationDialog'

interface RuleListProps {
  rules: AutoArchiveRule[]
  onToggle: (ruleId: string) => void
  onDelete: (ruleId: string) => void
  isPro: boolean
  proLoading: boolean
}

export function RuleList({ rules, onToggle, onDelete, isPro, proLoading }: RuleListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  if (rules.length === 0) {
    return (
      <div className="text-center py-8 text-github-fg-muted dark:text-github-fg-dark-muted text-sm">
        No auto-archive rules yet. Create one to get started!
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className={`
            border rounded-github p-3 transition-all
            ${
              rule.enabled
                ? 'border-github-border-default dark:border-github-border-dark-default bg-github-canvas-default dark:bg-github-canvas-dark-default'
                : 'border-github-border-muted dark:border-github-border-dark-muted bg-github-canvas-subtle dark:bg-github-canvas-dark-subtle opacity-60'
            }
          `}
        >
          <div className="flex items-start justify-between gap-3">
            {/* Rule Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`
                    px-2 py-0.5 text-xs font-medium rounded-full
                    ${
                      rule.type === 'repository'
                        ? 'bg-github-accent-subtle dark:bg-github-accent-dark-subtle text-github-accent-fg dark:text-github-accent-dark-fg'
                        : rule.type === 'age'
                        ? 'bg-github-success-subtle dark:bg-github-success-dark-subtle text-github-success-fg dark:text-github-success-dark-fg'
                        : 'bg-github-attention-subtle dark:bg-github-attention-dark-subtle text-github-attention-fg dark:text-github-attention-dark-fg'
                    }
                  `}
                >
                  {rule.type.charAt(0).toUpperCase() + rule.type.slice(1)}
                </span>
                {!rule.enabled && (
                  <span className="text-xs text-github-fg-muted dark:text-github-fg-dark-muted">Disabled</span>
                )}
              </div>

              <p className="text-sm text-github-fg-default dark:text-github-fg-dark-default mb-1">
                {getRuleDescription(rule)}
              </p>

              {/* Statistics */}
              <div className="flex items-center gap-4 text-xs text-github-fg-muted dark:text-github-fg-dark-muted">
                <span>
                  Archived: <strong>{rule.archivedCount}</strong>
                </span>
                <span>
                  Created:{' '}
                  {new Date(rule.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Toggle Enable/Disable */}
              <button
                onClick={() => onToggle(rule.id)}
                disabled={proLoading || !isPro}
                aria-label={
                  !isPro 
                    ? 'Toggle rule (Pro feature)' 
                    : rule.enabled ? 'Disable rule' : 'Enable rule'
                }
                className={`
                  p-2 rounded-github transition-colors
                  ${!isPro 
                    ? 'opacity-50 cursor-not-allowed'
                    : rule.enabled
                      ? 'text-github-success-fg dark:text-github-success-dark-fg hover:bg-github-success-subtle dark:hover:bg-github-success-dark-subtle'
                      : 'text-github-fg-muted dark:text-github-fg-dark-muted hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-dark-subtle'
                  }
                  ${!isPro && (rule.enabled ? 'text-github-success-fg dark:text-github-success-dark-fg' : 'text-github-fg-muted dark:text-github-fg-dark-muted')}
                `}
                title={
                  !isPro 
                    ? 'Upgrade to Pro to toggle rules' 
                    : rule.enabled ? 'Disable rule' : 'Enable rule'
                }
              >
                {rule.enabled ? (
                  // Check icon
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  // X icon
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </button>

              {/* Delete */}
              <button
                onClick={() => setDeleteConfirm(rule.id)}
                disabled={proLoading || !isPro}
                aria-label={!isPro ? 'Delete rule (Pro feature)' : 'Delete rule'}
                className={`
                  p-2 rounded-github transition-colors
                  ${!isPro 
                    ? 'opacity-50 cursor-not-allowed text-github-danger-fg dark:text-github-danger-dark-fg' 
                    : 'text-github-danger-fg dark:text-github-danger-dark-fg hover:bg-github-danger-subtle dark:hover:bg-github-danger-dark-subtle'
                  }
                `}
                title={!isPro ? 'Upgrade to Pro to delete rules' : 'Delete rule'}
              >
                {/* Trash icon */}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirm !== null}
        title="Delete Rule"
        message="Are you sure you want to delete this rule? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteConfirm) {
            onDelete(deleteConfirm)
            setDeleteConfirm(null)
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  )
}
