import { useState, useEffect, useCallback } from 'react'
import { AuthService } from '../utils/auth-service'

interface UseAuthReturn {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

/**
 * useAuth Hook
 * 
 * Provides authentication state and methods for React components
 * Automatically checks authentication status on mount
 * 
 * @returns UseAuthReturn - Authentication state and methods
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { isAuthenticated, login, logout, isLoading } = useAuth()
 * 
 *   if (isLoading) return <div>Loading...</div>
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
   * Initiates GitHub OAuth login flow
   * Opens authorization page and handles callback
   */
  const login = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const newToken = await AuthService.login()
      setToken(newToken)
      setIsAuthenticated(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      setError(errorMessage)
      setIsAuthenticated(false)
      setToken(null)
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
    login,
    logout,
    checkAuth,
  }
}
