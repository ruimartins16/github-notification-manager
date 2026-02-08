import { useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon, AlertIcon } from '@primer/octicons-react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  message: string
  variant?: ToastVariant
  duration?: number
  onClose: () => void
  action?: {
    label: string
    onClick: () => void
  }
}

export function Toast({
  message,
  variant = 'info',
  duration = 5000,
  onClose,
  action,
}: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return

    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const variantStyles = {
    success: 'bg-github-success-subtle dark:bg-github-success-dark-subtle border-github-success-emphasis dark:border-github-success-dark-emphasis text-github-success-fg dark:text-github-success-dark-fg',
    error: 'bg-github-danger-subtle dark:bg-github-danger-dark-subtle border-github-danger-emphasis dark:border-github-danger-dark-emphasis text-github-danger-fg dark:text-github-danger-dark-fg',
    warning: 'bg-github-attention-subtle dark:bg-github-attention-dark-subtle border-github-attention-emphasis dark:border-github-attention-dark-emphasis text-github-attention-fg dark:text-github-attention-dark-fg',
    info: 'bg-github-accent-subtle dark:bg-github-accent-dark-subtle border-github-accent-emphasis dark:border-github-accent-dark-emphasis text-github-accent-fg dark:text-github-accent-dark-fg',
  }

  const IconComponent = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: AlertIcon,
    info: AlertIcon,
  }[variant]

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-github border
                  shadow-xl min-w-[300px] max-w-md animate-slide-up
                  ${variantStyles[variant]}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <IconComponent size={16} className="flex-shrink-0" />
      <p className="text-sm font-medium flex-1">{message}</p>

      {action && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            action.onClick()
            onClose() // Close immediately after action
          }}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm font-semibold transition-colors"
        >
          {action.label}
        </button>
      )}

      <button
        onClick={onClose}
        className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="Close notification"
      >
        <XCircleIcon size={16} />
      </button>
    </div>
  )
}

// Toast container component to manage multiple toasts
export interface ToastMessage {
  id: string
  message: string
  variant?: ToastVariant
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            variant={toast.variant}
            duration={toast.duration}
            action={toast.action}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}
