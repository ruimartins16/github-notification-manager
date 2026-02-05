import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, type UserSettings, type FilterType } from '../storage'

describe('Storage Types', () => {
  describe('DEFAULT_SETTINGS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SETTINGS).toEqual({
        refreshInterval: 30,
        badgeEnabled: true,
        soundEnabled: false,
        defaultFilter: 'all',
        openLinksInNewTab: true,
      })
    })

    it('should have all required UserSettings properties', () => {
      const settings: UserSettings = DEFAULT_SETTINGS
      
      expect(settings).toHaveProperty('refreshInterval')
      expect(settings).toHaveProperty('badgeEnabled')
      expect(settings).toHaveProperty('soundEnabled')
      expect(settings).toHaveProperty('defaultFilter')
      expect(settings).toHaveProperty('openLinksInNewTab')
    })

    it('should have valid filter type as default', () => {
      const validFilters: FilterType[] = ['all', 'mentions', 'reviews', 'assigned']
      expect(validFilters).toContain(DEFAULT_SETTINGS.defaultFilter)
    })

    it('should have reasonable refresh interval (30 seconds)', () => {
      expect(DEFAULT_SETTINGS.refreshInterval).toBe(30)
      expect(DEFAULT_SETTINGS.refreshInterval).toBeGreaterThan(0)
      expect(DEFAULT_SETTINGS.refreshInterval).toBeLessThanOrEqual(300) // max 5 minutes
    })

    it('should have badge enabled by default for better UX', () => {
      expect(DEFAULT_SETTINGS.badgeEnabled).toBe(true)
    })

    it('should have sound disabled by default to avoid annoyance', () => {
      expect(DEFAULT_SETTINGS.soundEnabled).toBe(false)
    })
  })

  describe('FilterType', () => {
    it('should accept valid filter types', () => {
      const validFilters: FilterType[] = ['all', 'mentions', 'reviews', 'assigned']
      
      validFilters.forEach(filter => {
        const testFilter: FilterType = filter
        expect(testFilter).toBeDefined()
      })
    })
  })
})
