import { ReactNode } from 'react'
import { XIcon } from '@primer/octicons-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string | ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: 'bg-github-danger-emphasis dark:bg-github-danger-dark-emphasis hover:bg-github-danger-fg dark:hover:bg-github-danger-dark-fg text-white',
    warning: 'bg-github-attention-emphasis dark:bg-github-attention-dark-emphasis hover:bg-github-attention-fg dark:hover:bg-github-attention-dark-fg text-white',
    default: 'bg-github-accent-emphasis dark:bg-github-accent-dark-emphasis hover:bg-github-accent-fg dark:hover:bg-github-accent-dark-fg text-white',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div
        className="bg-github-canvas-default dark:bg-github-canvas-dark-default rounded-github border border-github-border-default dark:border-github-border-dark-default shadow-lg max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-github-border-default dark:border-github-border-dark-default">
          <h2
            id="dialog-title"
            className="text-lg font-semibold text-github-fg-default dark:text-github-fg-dark-default"
          >
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="text-github-fg-muted dark:text-github-fg-dark-muted hover:text-github-fg-default dark:hover:text-github-fg-dark-default transition-colors"
            aria-label="Close dialog"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Body */}
        <div id="dialog-description" className="p-4">
          {typeof message === 'string' ? (
            <p className="text-sm text-github-fg-default dark:text-github-fg-dark-default">{message}</p>
          ) : (
            message
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-github-border-default dark:border-github-border-dark-default">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium bg-github-canvas-default dark:bg-github-canvas-dark-default border border-github-border-default dark:border-github-border-dark-default 
                     text-github-fg-default dark:text-github-fg-dark-default rounded-github hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-dark-subtle transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onCancel()
            }}
            className={`px-4 py-2 text-sm font-medium rounded-github transition-colors ${variantStyles[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
