import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { GitHubNotification } from '../types/github'
import { NOTIFICATIONS_STORAGE_KEY } from '../utils/notification-service'

interface NotificationState {
  notifications: GitHubNotification[]
  isLoading: boolean
  error: string | null
  lastFetched: number | null
  
  // Actions
  setNotifications: (notifications: GitHubNotification[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clearNotifications: () => void
  markAsRead: (notificationId: string) => void
  updateLastFetched: () => void
}

// Chrome storage adapter for Zustand persist middleware
const chromeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get(name)
      const value = result[name]
      
      // Validate it's a string (Zustand expects JSON string)
      if (value !== undefined && typeof value !== 'string') {
        console.warn(`Invalid data type in storage for key "${name}", expected string, got:`, typeof value)
        return null
      }
      
      return value ?? null
    } catch (error) {
      console.error('Error reading from chrome.storage:', error)
      return null
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await chrome.storage.local.set({ [name]: value })
    } catch (error) {
      console.error('Error writing to chrome.storage:', error)
      // Re-throw to let Zustand know persistence failed
      throw error
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await chrome.storage.local.remove(name)
    } catch (error) {
      console.error('Error removing from chrome.storage:', error)
      throw error
    }
  },
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      // Initial state
      notifications: [],
      isLoading: false,
      error: null,
      lastFetched: null,

      // Actions
      setNotifications: (notifications) =>
        set({ notifications, error: null }),

      setLoading: (isLoading) =>
        set({ isLoading }),

      setError: (error) =>
        set({ error, isLoading: false }),

      clearNotifications: () =>
        set({ notifications: [], error: null, lastFetched: null }),

      markAsRead: (notificationId) =>
        set((state) => ({
          notifications: state.notifications.filter(
            (n) => n.id !== notificationId
          ),
        })),

      updateLastFetched: () =>
        set({ lastFetched: Date.now() }),
    }),
    {
      name: 'zustand-notifications', // Use different key from NotificationService
      storage: createJSONStorage(() => chromeStorage),
      // Only persist notifications, not loading/error states
      partialize: (state) => ({
        notifications: state.notifications,
        lastFetched: state.lastFetched,
      }),
    }
  )
)

// Sync with background worker updates
// Listen to the 'notifications' key written by NotificationService
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[NOTIFICATIONS_STORAGE_KEY]) {
      const change = changes[NOTIFICATIONS_STORAGE_KEY]
      
      // Only sync if there's a new value and it's an array
      if (change.newValue && Array.isArray(change.newValue)) {
        console.log('[Zustand] Syncing notifications from background worker:', change.newValue.length)
        
        // Update Zustand store with background worker's data
        useNotificationStore.getState().setNotifications(change.newValue)
        useNotificationStore.getState().updateLastFetched()
      }
    }
  })
}
