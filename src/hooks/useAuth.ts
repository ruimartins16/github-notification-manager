import { useState, useEffect, useCallback } from 'react'
import { AuthService, type DeviceAuthInfo } from '../utils/auth-service'

interface UseAuthReturn {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  error: string | null
  deviceAuthInfo: DeviceAuthInfo | null
  login: () => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

/**
 * useAuth Hook
 * 
 * Provides authentication state and methods for React components
 * Automatically checks authentication status on mount
 * Supports GitHub Device Flow for authentication
 * 
 * @returns UseAuthReturn - Authentication state and methods
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { isAuthenticated, deviceAuthInfo, login, logout, isLoading } = useAuth()
 * 
 *   if (isLoading) return <div>Loading...</div>
 * 
 *   if (deviceAuthInfo) {
 *     return <div>Enter this code: {deviceAuthInfo.userCode}</div>
 *   }
 * 
 *   return isAuthenticated ? (
 *     <button onClick={logout}>Logout</button>
 *   ) : (
 *     <button onClick={login}>Connect GitHub</button>
 *   )
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deviceAuthInfo, setDeviceAuthInfo] = useState<DeviceAuthInfo | null>(null)

  /**
   * Checks current authentication status
   * Retrieves token from storage and updates state
   */
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const isAuth = await AuthService.isAuthenticated()
      setIsAuthenticated(isAuth)

      if (isAuth) {
        const storedToken = await AuthService.getStoredToken()
        setToken(storedToken)
      } else {
        setToken(null)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication check failed'
      setError(errorMessage)
      setIsAuthenticated(false)
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Initiates GitHub Device Flow login
   * Shows device code to user, opens GitHub, and polls for authorization
   */
  const login = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      setDeviceAuthInfo(null)

      // Step 1: Get device code and show it to user
      const deviceInfo = await AuthService.initiateDeviceAuth()
      setDeviceAuthInfo(deviceInfo)
      setIsLoading(false)

      // Step 2: Open GitHub verification page in new tab
      await chrome.tabs.create({
        url: deviceInfo.verificationUri,
        active: true,
      })

      // Step 3: Poll for authorization (this happens in background)
      setIsLoading(true)
      const newToken = await AuthService.completeDeviceAuth()
      
      setToken(newToken)
      setIsAuthenticated(true)
      setDeviceAuthInfo(null) // Clear device info after success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      setError(errorMessage)
      setIsAuthenticated(false)
      setToken(null)
      setDeviceAuthInfo(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Logs out user and clears stored credentials
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      await AuthService.logout()
      setIsAuthenticated(false)
      setToken(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return {
    isAuthenticated,
    isLoading,
    token,
    error,
    deviceAuthInfo,
    login,
    logout,
    checkAuth,
  }
}
