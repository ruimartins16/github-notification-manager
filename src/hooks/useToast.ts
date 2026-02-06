import { useState, useCallback } from 'react'
import type { ToastMessage, ToastVariant } from '../components/Toast'

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback(
    (
      message: string,
      options?: {
        variant?: ToastVariant
        duration?: number
        action?: {
          label: string
          onClick: () => void
        }
      }
    ) => {
      const id = `toast-${Date.now()}-${Math.random()}`
      const newToast: ToastMessage = {
        id,
        message,
        variant: options?.variant,
        duration: options?.duration,
        action: options?.action,
      }

      setToasts((prev) => [...prev, newToast])
      return id
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
  }
}
