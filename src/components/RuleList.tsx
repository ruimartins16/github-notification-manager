import { useState } from 'react'
import { AutoArchiveRule } from '../types/rules'
import { getRuleDescription } from '../utils/rule-matcher'
import { ConfirmationDialog } from './ConfirmationDialog'

interface RuleListProps {
  rules: AutoArchiveRule[]
  onToggle: (ruleId: string) => void
  onDelete: (ruleId: string) => void
}

export function RuleList({ rules, onToggle, onDelete }: RuleListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  if (rules.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
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
            border rounded-lg p-3 transition-all
            ${
              rule.enabled
                ? 'border-gray-200 bg-white'
                : 'border-gray-100 bg-gray-50 opacity-60'
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
                        ? 'bg-blue-100 text-blue-700'
                        : rule.type === 'age'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-orange-100 text-orange-700'
                    }
                  `}
                >
                  {rule.type}
                </span>
                {!rule.enabled && (
                  <span className="text-xs text-gray-500">Disabled</span>
                )}
              </div>

              <p className="text-sm text-gray-900 mb-1">
                {getRuleDescription(rule)}
              </p>

              {/* Statistics */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
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
                aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                className={`
                  p-2 rounded-md transition-colors
                  ${
                    rule.enabled
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-100'
                  }
                `}
                title={rule.enabled ? 'Disable rule' : 'Enable rule'}
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
                aria-label="Delete rule"
                className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Delete rule"
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
