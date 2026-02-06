import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { UserSettings, DEFAULT_SETTINGS, FilterType } from '../types/storage'

interface SettingsState extends UserSettings {
  // Actions
  setRefreshInterval: (interval: number) => void
  setBadgeEnabled: (enabled: boolean) => void
  setSoundEnabled: (enabled: boolean) => void
  setDefaultFilter: (filter: FilterType) => void
  setOpenLinksInNewTab: (enabled: boolean) => void
  resetSettings: () => void
  
  // Derived state
  isDefaultSettings: () => boolean
}

// Chrome storage adapter for Zustand persist middleware (chrome.storage.sync for settings)
const chromeSyncStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const result = await chrome.storage.sync.get(name)
      const value = result[name]
      return value ?? null
    } catch (error) {
      console.error('Error reading from chrome.storage.sync:', error)
      return null
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      // Check storage quota before writing (if available)
      if (chrome.storage.sync.getBytesInUse) {
        const bytesInUse = await chrome.storage.sync.getBytesInUse()
        const QUOTA_BYTES = chrome.storage.sync.QUOTA_BYTES || 102400 // 100KB default
        const QUOTA_BYTES_PER_ITEM = chrome.storage.sync.QUOTA_BYTES_PER_ITEM || 8192 // 8KB default
        const valueBytes = new Blob([value]).size
        
        // Check per-item quota
        if (valueBytes > QUOTA_BYTES_PER_ITEM) {
          throw new Error(
            `Settings data too large (${valueBytes} bytes). Maximum ${QUOTA_BYTES_PER_ITEM} bytes per item allowed.`
          )
        }
        
        // Check total quota (approximate)
        if (bytesInUse + valueBytes > QUOTA_BYTES) {
          throw new Error(
            `Storage quota exceeded. Using ${bytesInUse + valueBytes} of ${QUOTA_BYTES} bytes available.`
          )
        }
      }
      
      await chrome.storage.sync.set({ [name]: value })
    } catch (error) {
      console.error('Error writing to chrome.storage.sync:', error)
      throw error
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await chrome.storage.sync.remove(name)
    } catch (error) {
      console.error('Error removing from chrome.storage.sync:', error)
      throw error
    }
  },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state from defaults
      ...DEFAULT_SETTINGS,

      // Actions
      setRefreshInterval: (interval) => {
        // Validate minimum 10 seconds
        const validInterval = Math.max(10, interval)
        set({ refreshInterval: validInterval })
      },

      setBadgeEnabled: (enabled) =>
        set({ badgeEnabled: enabled }),

      setSoundEnabled: (enabled) =>
        set({ soundEnabled: enabled }),

      setDefaultFilter: (filter) =>
        set({ defaultFilter: filter }),

      setOpenLinksInNewTab: (enabled) =>
        set({ openLinksInNewTab: enabled }),

      resetSettings: () =>
        set(DEFAULT_SETTINGS),

      // Derived state
      isDefaultSettings: () => {
        const state = get()
        return (
          state.refreshInterval === DEFAULT_SETTINGS.refreshInterval &&
          state.badgeEnabled === DEFAULT_SETTINGS.badgeEnabled &&
          state.soundEnabled === DEFAULT_SETTINGS.soundEnabled &&
          state.defaultFilter === DEFAULT_SETTINGS.defaultFilter &&
          state.openLinksInNewTab === DEFAULT_SETTINGS.openLinksInNewTab
        )
      },
    }),
    {
      name: 'gnm-settings',
      storage: createJSONStorage(() => chromeSyncStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate settings from chrome.storage.sync:', error)
          // Optionally notify user or fallback to defaults
        } else if (state) {
          console.log('Settings successfully loaded from chrome.storage.sync')
        }
      },
    }
  )
)
