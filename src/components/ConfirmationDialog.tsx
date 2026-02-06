import { useEffect, useCallback } from 'react'

export interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  // Handle escape key to close dialog
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    },
    [onCancel]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent background scrolling
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  const confirmButtonClass =
    confirmVariant === 'danger'
      ? 'bg-github-danger-emphasis text-white hover:bg-github-danger-emphasis/90'
      : 'bg-github-accent-emphasis text-white hover:bg-github-accent-emphasis/90'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative bg-github-canvas-default border border-github-border-default rounded-github shadow-xl max-w-md w-full mx-4 p-6">
        <h2
          id="dialog-title"
          className="text-lg font-semibold text-github-fg-default mb-3"
        >
          {title}
        </h2>

        <p className="text-sm text-github-fg-muted mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-github-canvas-default border border-github-border-default
                     rounded-github hover:bg-github-canvas-subtle transition-colors
                     font-medium text-sm text-github-fg-default"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-github transition-colors font-medium text-sm ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
