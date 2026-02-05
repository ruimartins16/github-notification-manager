import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '../useAuth'
import { AuthService } from '../../utils/auth-service'

// Mock AuthService
vi.mock('../../utils/auth-service', () => ({
  AuthService: {
    login: vi.fn(),
    logout: vi.fn(),
    getStoredToken: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}))

const mockAuthService = AuthService as any

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default to not authenticated
    mockAuthService.isAuthenticated.mockResolvedValue(false)
    mockAuthService.getStoredToken.mockResolvedValue(null)
  })

  describe('initial state', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useAuth())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.token).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should check authentication on mount', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(true)
      mockAuthService.getStoredToken.mockResolvedValue('gho_token')

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockAuthService.isAuthenticated).toHaveBeenCalled()
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe('login', () => {
    it('should successfully log in user', async () => {
      mockAuthService.login.mockResolvedValue('gho_new_token')
      mockAuthService.isAuthenticated.mockResolvedValue(false)

      const { result } = renderHook(() => useAuth())

      // Wait for initial check
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Perform login
      act(() => {
        result.current.login()
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockAuthService.login).toHaveBeenCalled()
      expect(result.current.error).toBeNull()
    })

    it('should handle login errors', async () => {
      const error = new Error('User cancelled')
      mockAuthService.login.mockRejectedValue(error)
      mockAuthService.isAuthenticated.mockResolvedValue(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.login()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('User cancelled')
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should set loading state during login', async () => {
      mockAuthService.login.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('token'), 100))
      )
      mockAuthService.isAuthenticated.mockResolvedValue(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.login()
      })

      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('logout', () => {
    it('should successfully log out user', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(true)
      mockAuthService.getStoredToken.mockResolvedValue('gho_token')
      mockAuthService.logout.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      act(() => {
        result.current.logout()
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
      })

      expect(mockAuthService.logout).toHaveBeenCalled()
      expect(result.current.token).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should handle logout errors', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(true)
      mockAuthService.logout.mockRejectedValue(new Error('Logout failed'))

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      act(() => {
        result.current.logout()
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Logout failed')
      })

      expect(mockAuthService.logout).toHaveBeenCalled()
    })
  })

  describe('token management', () => {
    it('should retrieve and store token', async () => {
      const mockToken = 'gho_stored_token'
      mockAuthService.isAuthenticated.mockResolvedValue(true)
      mockAuthService.getStoredToken.mockResolvedValue(mockToken)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.token).toBe(mockToken)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should return null token when not authenticated', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(false)
      mockAuthService.getStoredToken.mockResolvedValue(null)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.token).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should handle authentication check errors', async () => {
      mockAuthService.isAuthenticated.mockRejectedValue(new Error('Storage error'))

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Storage error')
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should clear error on successful login', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(false)
      mockAuthService.login.mockRejectedValueOnce(new Error('First error'))
      mockAuthService.login.mockResolvedValue('gho_token')

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // First login attempt - fails
      act(() => {
        result.current.login()
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // Second login attempt - succeeds
      mockAuthService.isAuthenticated.mockResolvedValue(true)
      
      act(() => {
        result.current.login()
      })

      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })
  })

  describe('refresh authentication', () => {
    it('should provide a method to refresh auth state', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(false)

      // Change mock to authenticated
      mockAuthService.isAuthenticated.mockResolvedValue(true)
      mockAuthService.getStoredToken.mockResolvedValue('gho_token')

      act(() => {
        result.current.checkAuth()
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      expect(result.current.token).toBe('gho_token')
    })
  })
})
