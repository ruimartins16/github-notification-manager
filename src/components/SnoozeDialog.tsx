import { useState, memo, useCallback } from 'react'
import { useNotificationStore } from '../store/notification-store'

interface SnoozeDialogProps {
  notificationId: string
  isOpen: boolean
  onClose: () => void
}

export const SnoozeDialog = memo(({ notificationId, isOpen, onClose }: SnoozeDialogProps) => {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const snoozeNotification = useNotificationStore(state => state.snoozeNotification)

  // Real-time validation: check if selected date/time is in the future
  const isValidDateTime = useCallback(() => {
    if (!selectedDate || !selectedTime) return false
    
    const wakeTime = new Date(`${selectedDate}T${selectedTime}`).getTime()
    return wakeTime > Date.now()
  }, [selectedDate, selectedTime])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedDate || !selectedTime) {
      return
    }

    // Combine date and time into a timestamp
    const wakeTime = new Date(`${selectedDate}T${selectedTime}`).getTime()
    
    // Validate future date (double-check)
    if (wakeTime <= Date.now()) {
      alert('Please select a future date and time')
      return
    }

    // Additional validation: not more than 1 year in the future
    const oneYearFromNow = Date.now() + (365 * 24 * 60 * 60 * 1000)
    if (wakeTime > oneYearFromNow) {
      alert('Please select a date within one year')
      return
    }

    snoozeNotification(notificationId, wakeTime)
    onClose()
    
    // Reset form
    setSelectedDate('')
    setSelectedTime('')
  }, [notificationId, selectedDate, selectedTime, snoozeNotification, onClose])

  const handleCancel = useCallback(() => {
    onClose()
    setSelectedDate('')
    setSelectedTime('')
  }, [onClose])

  if (!isOpen) return null

  // Get minimum date/time (current time)
  const now = new Date()
  const minDate = now.toISOString().split('T')[0]
  const minTime = now.toTimeString().slice(0, 5)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleCancel}
    >
      <div
        className="
          bg-github-canvas-default rounded-github shadow-lg
          border border-github-border-default
          w-full max-w-md p-6
        "
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="snooze-dialog-title"
        aria-modal="true"
      >
        <h2
          id="snooze-dialog-title"
          className="text-lg font-semibold text-github-fg-default mb-4"
        >
          Snooze until...
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="snooze-date"
              className="block text-sm font-medium text-github-fg-default mb-2"
            >
              Date
            </label>
            <input
              id="snooze-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              required
              className="
                w-full px-3 py-2 rounded-github
                bg-github-canvas-inset border border-github-border-default
                text-github-fg-default
                focus:outline-none focus:ring-2 focus:ring-github-accent-emphasis
              "
            />
          </div>

          <div>
            <label
              htmlFor="snooze-time"
              className="block text-sm font-medium text-github-fg-default mb-2"
            >
              Time
            </label>
            <input
              id="snooze-time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              min={selectedDate === minDate ? minTime : undefined}
              required
              className="
                w-full px-3 py-2 rounded-github
                bg-github-canvas-inset border border-github-border-default
                text-github-fg-default
                focus:outline-none focus:ring-2 focus:ring-github-accent-emphasis
              "
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="
                px-4 py-2 rounded-github text-sm font-medium
                text-github-fg-default bg-github-canvas-subtle
                hover:bg-github-canvas-inset
                focus:outline-none focus:ring-2 focus:ring-github-accent-emphasis
                transition-colors
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValidDateTime()}
              className="
                px-4 py-2 rounded-github text-sm font-medium
                text-white bg-github-accent-emphasis
                hover:bg-github-accent-emphasis/90
                focus:outline-none focus:ring-2 focus:ring-github-accent-emphasis
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              Snooze
            </button>
          </div>
        </form>
      </div>
    </div>
  )
})

SnoozeDialog.displayName = 'SnoozeDialog'
