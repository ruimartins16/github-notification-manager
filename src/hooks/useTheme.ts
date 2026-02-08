/**
 * useTheme Hook
 * 
 * React hook for managing dark mode theme preference.
 * Supports light, dark, and system theme options.
 * Pro feature - free users always get light theme.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSettingsStore } from '../store/settings-store'
import { useIsPro } from './useProStatus'
import { ThemePreference } from '../types/storage'

export interface UseThemeResult {
  /** User's theme preference (light, dark, or system) */
  theme: ThemePreference
  /** Actual resolved theme (light or dark) - resolves 'system' to actual theme */
  resolvedTheme: 'light' | 'dark'
  /** Whether dark mode is currently active */
  isDark: boolean
  /** Change theme preference (Pro only) */
  setTheme: (theme: ThemePreference) => void
}

/**
 * Hook to manage theme preference with Pro gating
 * 
 * Features:
 * - Pro-only feature (free users always get light theme)
 * - Supports light, dark, and system preferences
 * - Listens to OS theme changes when set to 'system'
 * - Automatically updates when system theme changes
 * - Persists theme preference to Chrome storage sync
 * 
 * @example
 * ```tsx
 * function ThemeSelector() {
 *   const { theme, isDark, setTheme } = useTheme()
 *   const isPro = useIsPro()
 *   
 *   if (!isPro) {
 *     return <UpgradePrompt feature="Dark Mode" />
 *   }
 *   
 *   return (
 *     <select value={theme} onChange={(e) => setTheme(e.target.value)}>
 *       <option value="light">Light</option>
 *       <option value="dark">Dark</option>
 *       <option value="system">System</option>
 *     </select>
 *   )
 * }
 * ```
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { isDark } = useTheme()
 *   
 *   return (
 *     <div className={isDark ? 'dark' : ''}>
 *       <MyApp />
 *     </div>
 *   )
 * }
 * ```
 */
export function useTheme(): UseThemeResult {
  const isPro = useIsPro()
  const theme = useSettingsStore((state) => state.theme)
  const setThemePreference = useSettingsStore((state) => state.setTheme)
  
  // Track system theme preference
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const newTheme = e.matches ? 'dark' : 'light'
      console.log('[useTheme] System theme changed to:', newTheme)
      setSystemTheme(newTheme)
    }
    
    // Initial check
    handleChange(mediaQuery)
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // Calculate resolved theme
  const resolvedTheme = useMemo((): 'light' | 'dark' => {
    // Free users always get light theme
    if (!isPro) {
      return 'light'
    }
    
    // Pro users: resolve theme based on preference
    if (theme === 'system') {
      return systemTheme
    }
    
    return theme
  }, [isPro, theme, systemTheme])

  const isDark = resolvedTheme === 'dark'

  // Apply dark class to document element for Tailwind dark mode
  useEffect(() => {
    if (typeof document === 'undefined') return // Safety check for SSR/tests
    
    if (isDark) {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }
  }, [isDark])

  // Wrap setTheme to enforce Pro gating
  const setTheme = useCallback((newTheme: ThemePreference) => {
    if (!isPro) {
      console.warn('[useTheme] Theme change blocked - Pro feature')
      return
    }
    
    console.log('[useTheme] Setting theme to:', newTheme)
    setThemePreference(newTheme)
  }, [isPro, setThemePreference])

  return {
    theme,
    resolvedTheme,
    isDark,
    setTheme,
  }
}
