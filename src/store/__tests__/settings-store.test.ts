import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSettingsStore } from '../settings-store'
import { DEFAULT_SETTINGS } from '../../types/storage'

// Mock chrome.storage.sync
const mockStorage: Record<string, string> = {}

global.chrome = {
  storage: {
    sync: {
      get: vi.fn((key: string) => {
        return Promise.resolve({ [key]: mockStorage[key] })
      }),
      set: vi.fn((items: Record<string, string>) => {
        Object.assign(mockStorage, items)
        return Promise.resolve()
      }),
      remove: vi.fn((key: string) => {
        delete mockStorage[key]
        return Promise.resolve()
      }),
    },
  },
} as any

describe('useSettingsStore', () => {
  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    // Reset store state
    useSettingsStore.setState(DEFAULT_SETTINGS)
  })

  describe('Initial State', () => {
    it('should have default settings on initialization', () => {
      const { result } = renderHook(() => useSettingsStore())
      
      expect(result.current.refreshInterval).toBe(DEFAULT_SETTINGS.refreshInterval)
      expect(result.current.badgeEnabled).toBe(DEFAULT_SETTINGS.badgeEnabled)
      expect(result.current.soundEnabled).toBe(DEFAULT_SETTINGS.soundEnabled)
      expect(result.current.defaultFilter).toBe(DEFAULT_SETTINGS.defaultFilter)
      expect(result.current.openLinksInNewTab).toBe(DEFAULT_SETTINGS.openLinksInNewTab)
    })
  })

  describe('setRefreshInterval', () => {
    it('should update refresh interval', () => {
      const { result } = renderHook(() => useSettingsStore())
      
      act(() => {
        result.current.setRefreshInterval(60)
      })
      
      expect(result.current.refreshInterval).toBe(60)
    })

    it('should enforce minimum 10 seconds', () => {
      const { result } = renderHook(() => useSettingsStore())
      
      act(() => {
        result.current.setRefreshInterval(5)
      })
      
      expect(result.current.refreshInterval).toBe(10)
    })

    it('should accept valid intervals', () => {
      const { result } = renderHook(() => useSettingsStore())
      
      act(() => {
        result.current.setRefreshInterval(300)
      })
      
      expect(result.current.refreshInterval).toBe(300)
    })
  })

  describe('setBadgeEnabled', () => {
    it('should toggle badge enabled', () => {
      const { result } = renderHook(() => useSettingsStore())
      
      act(() => {
        result.current.setBadgeEnabled(false)
      })
      
      expect(result.current.badgeEnabled).toBe(false)
      
      act(() => {
        result.current.setBadgeEnabled(true)
      })
      
      expect(result.current.badgeEnabled).toBe(true)
    })
  })

  describe('setSoundEnabled', () => {
    it('should toggle sound enabled', () => {
      const { result } = renderHook(() => useSettingsStore())
      
      act(() => {
        result.current.setSoundEnabled(true)
      })
      
      expect(result.current.soundEnabled).toBe(true)
      
      act(() => {
        result.current.setSoundEnabled(false)
      })
      
      expect(result.current.soundEnabled).toBe(false)
    })
  })

  describe('setDefaultFilter', () => {
    it('should update default filter', () => {
      const { result } = renderHook(() => useSettingsStore())
      
      act(() => {
        result.current.setDefaultFilter('mentions')
      })
      
      expect(result.current.defaultFilter).toBe('mentions')
    })

    it('should accept all valid filter types', () => {
      const { result } = renderHook(() => useSettingsStore())
      
      const filters: Array<'all' | 'mentions' | 'reviews' | 'assigned'> = [
        'all', 'mentions', 'reviews', 'assigned'
      ]
      
      filters.forEach((filter) => {
        act(() => {
          result.current.setDefaultFilter(filter)
        })
        
        expect(result.current.defaultFilter).toBe(filter)
      })
    })
  })

  describe('setOpenLinksInNewTab', () => {
    it('should toggle open links in new tab', () => {
      const { result } = renderHook(() => useSettingsStore())
      
      act(() => {
        result.current.setOpenLinksInNewTab(false)
      })
      
      expect(result.current.openLinksInNewTab).toBe(false)
      
      act(() => {
        result.current.setOpenLinksInNewTab(true)
      })
      
      expect(result.current.openLinksInNewTab).toBe(true)
    })
  })

  describe('resetSettings', () => {
    it('should reset all settings to defaults', () => {
      const { result } = renderHook(() => useSettingsStore())
      
      // Change all settings
      act(() => {
        result.current.setRefreshInterval(60)
        result.current.setBadgeEnabled(false)
        result.current.setSoundEnabled(true)
        result.current.setDefaultFilter('mentions')
        result.current.setOpenLinksInNewTab(false)
      })
      
      // Reset
      act(() => {
        result.current.resetSettings()
      })
      
      // Verify all are back to defaults
      expect(result.current.refreshInterval).toBe(DEFAULT_SETTINGS.refreshInterval)
      expect(result.current.badgeEnabled).toBe(DEFAULT_SETTINGS.badgeEnabled)
      expect(result.current.soundEnabled).toBe(DEFAULT_SETTINGS.soundEnabled)
      expect(result.current.defaultFilter).toBe(DEFAULT_SETTINGS.defaultFilter)
      expect(result.current.openLinksInNewTab).toBe(DEFAULT_SETTINGS.openLinksInNewTab)
    })
  })

  describe('isDefaultSettings', () => {
    it('should return true when all settings are default', () => {
      const { result } = renderHook(() => useSettingsStore())
      
      expect(result.current.isDefaultSettings()).toBe(true)
    })

    it('should return false when any setting is changed', () => {
      const { result } = renderHook(() => useSettingsStore())
      
      act(() => {
        result.current.setRefreshInterval(60)
      })
      
      expect(result.current.isDefaultSettings()).toBe(false)
    })

    it('should return true after reset', () => {
      const { result } = renderHook(() => useSettingsStore())
      
      act(() => {
        result.current.setBadgeEnabled(false)
        result.current.setSoundEnabled(true)
      })
      
      expect(result.current.isDefaultSettings()).toBe(false)
      
      act(() => {
        result.current.resetSettings()
      })
      
      expect(result.current.isDefaultSettings()).toBe(true)
    })
  })

  describe('Persistence', () => {
    it('should persist settings to chrome.storage.sync', async () => {
      const { result } = renderHook(() => useSettingsStore())
      
      await act(async () => {
        result.current.setRefreshInterval(60)
        result.current.setBadgeEnabled(false)
      })
      
      // Give persist middleware time to save
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(chrome.storage.sync.set).toHaveBeenCalled()
    })
  })
})
