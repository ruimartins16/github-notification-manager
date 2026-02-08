import { useEffect, useRef } from 'react'

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
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    // Save currently focused element
    const previouslyFocused = document.activeElement as HTMLElement

    // Set focus to first focusable element (cancel button)
    const firstButton = dialogRef.current?.querySelector('button')
    firstButton?.focus()

    // Handle keyboard events
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle escape key
      if (e.key === 'Escape') {
        onCancel()
        return
      }

      // Handle tab key for focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
      // Restore focus to previously focused element
      previouslyFocused?.focus()
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmButtonClass =
    confirmVariant === 'danger'
      ? 'bg-github-danger-emphasis dark:bg-github-danger-dark-emphasis text-white hover:bg-github-danger-emphasis/90 dark:hover:bg-github-danger-dark-emphasis/90'
      : 'bg-github-accent-emphasis dark:bg-github-accent-dark-emphasis text-white hover:bg-github-accent-emphasis/90 dark:hover:bg-github-accent-dark-emphasis/90'

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
      <div
        ref={dialogRef}
        className="relative bg-github-canvas-default dark:bg-github-canvas-dark-default border border-github-border-default dark:border-github-border-dark-default rounded-github shadow-xl max-w-md w-full mx-4 p-6"
      >
        <h2
          id="dialog-title"
          className="text-lg font-semibold text-github-fg-default dark:text-github-fg-dark-default mb-3"
        >
          {title}
        </h2>

        <p className="text-sm text-github-fg-muted dark:text-github-fg-dark-muted mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-github-canvas-default dark:bg-github-canvas-dark-default border border-github-border-default dark:border-github-border-dark-default
                     rounded-github hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-dark-subtle transition-colors
                     font-medium text-sm text-github-fg-default dark:text-github-fg-dark-default"
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
