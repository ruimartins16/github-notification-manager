import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '../useAuth'
import { AuthService } from '../../utils/auth-service'

// Mock AuthService
vi.mock('../../utils/auth-service', () => ({
  AuthService: {
    initiateDeviceAuth: vi.fn(),
    completeDeviceAuth: vi.fn(),
    logout: vi.fn(),
    getStoredToken: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}))

// Mock chrome.runtime.sendMessage
const mockSendMessage = vi.fn()

beforeEach(() => {
  // Setup chrome mock
  global.chrome = {
    ...global.chrome,
    runtime: {
      sendMessage: mockSendMessage,
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  } as any

  vi.clearAllMocks()
  // Default to not authenticated
  ;(AuthService.isAuthenticated as any).mockResolvedValue(false)
  ;(AuthService.getStoredToken as any).mockResolvedValue(null)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAuth', () => {
  describe('initial state', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useAuth())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.token).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.deviceAuthInfo).toBeNull()
    })

    it('should check authentication on mount', async () => {
      ;(AuthService.isAuthenticated as any).mockResolvedValue(true)
      ;(AuthService.getStoredToken as any).mockResolvedValue('gho_token')

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(AuthService.isAuthenticated).toHaveBeenCalled()
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe('login - Device Flow', () => {
    it('should initiate device auth and set deviceAuthInfo', async () => {
      const mockDeviceInfo = {
        userCode: 'WDJB-MJHT',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
      }

      ;(AuthService.initiateDeviceAuth as any).mockResolvedValue(mockDeviceInfo)
      ;(AuthService.isAuthenticated as any).mockResolvedValue(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.login()
      })

      await waitFor(() => {
        expect(result.current.deviceAuthInfo).toEqual(mockDeviceInfo)
      })

      expect(AuthService.initiateDeviceAuth).toHaveBeenCalled()
      expect(result.current.error).toBeNull()
    })

    it('should send START_DEVICE_POLLING message to service worker', async () => {
      const mockDeviceInfo = {
        userCode: 'WDJB-MJHT',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
      }

      ;(AuthService.initiateDeviceAuth as any).mockResolvedValue(mockDeviceInfo)
      ;(AuthService.isAuthenticated as any).mockResolvedValue(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.login()
      })

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({ type: 'START_DEVICE_POLLING' })
      })
    })

    it('should handle login errors', async () => {
      const error = new Error('Device auth failed')
      ;(AuthService.initiateDeviceAuth as any).mockRejectedValue(error)
      ;(AuthService.isAuthenticated as any).mockResolvedValue(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.login()
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Device auth failed')
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.deviceAuthInfo).toBeNull()
    })

    it('should set loading state during login', async () => {
      const mockDeviceInfo = {
        userCode: 'WDJB-MJHT',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
      }

      ;(AuthService.initiateDeviceAuth as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockDeviceInfo), 100))
      )
      ;(AuthService.isAuthenticated as any).mockResolvedValue(false)

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

  describe('AUTH_COMPLETE message handling', () => {
    it('should update state on successful auth completion', async () => {
      ;(AuthService.isAuthenticated as any).mockResolvedValue(false)
      ;(AuthService.getStoredToken as any).mockResolvedValue(null)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Get the message listener that was registered
      const addListenerCall = (chrome.runtime.onMessage.addListener as any).mock.calls[0]
      const messageListener = addListenerCall[0]

      // Update mocks to simulate successful auth after message
      ;(AuthService.isAuthenticated as any).mockResolvedValue(true)
      ;(AuthService.getStoredToken as any).mockResolvedValue('gho_new_token')

      // Simulate receiving AUTH_COMPLETE message from service worker
      act(() => {
        messageListener({
          type: 'AUTH_COMPLETE',
          success: true,
          token: 'gho_new_token',
        })
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      expect(result.current.token).toBe('gho_new_token')
      expect(result.current.deviceAuthInfo).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should handle auth completion errors', async () => {
      ;(AuthService.isAuthenticated as any).mockResolvedValue(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const addListenerCall = (chrome.runtime.onMessage.addListener as any).mock.calls[0]
      const messageListener = addListenerCall[0]

      act(() => {
        messageListener({
          type: 'AUTH_COMPLETE',
          success: false,
          error: 'Authorization expired',
        })
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Authorization expired')
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.deviceAuthInfo).toBeNull()
    })

    it('should ignore non-AUTH_COMPLETE messages', async () => {
      ;(AuthService.isAuthenticated as any).mockResolvedValue(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const addListenerCall = (chrome.runtime.onMessage.addListener as any).mock.calls[0]
      const messageListener = addListenerCall[0]

      const previousState = { ...result.current }

      act(() => {
        messageListener({
          type: 'SOME_OTHER_MESSAGE',
          data: 'test',
        })
      })

      // State should not change
      expect(result.current.isAuthenticated).toBe(previousState.isAuthenticated)
      expect(result.current.error).toBe(previousState.error)
    })
  })

  describe('logout', () => {
    it('should successfully log out user', async () => {
      ;(AuthService.isAuthenticated as any).mockResolvedValue(true)
      ;(AuthService.getStoredToken as any).mockResolvedValue('gho_token')
      ;(AuthService.logout as any).mockResolvedValue(undefined)

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

      expect(AuthService.logout).toHaveBeenCalled()
      expect(result.current.token).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should handle logout errors', async () => {
      ;(AuthService.isAuthenticated as any).mockResolvedValue(true)
      ;(AuthService.logout as any).mockRejectedValue(new Error('Logout failed'))

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

      expect(AuthService.logout).toHaveBeenCalled()
    })
  })

  describe('token management', () => {
    it('should retrieve and store token', async () => {
      const mockToken = 'gho_stored_token'
      ;(AuthService.isAuthenticated as any).mockResolvedValue(true)
      ;(AuthService.getStoredToken as any).mockResolvedValue(mockToken)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.token).toBe(mockToken)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should return null token when not authenticated', async () => {
      ;(AuthService.isAuthenticated as any).mockResolvedValue(false)
      ;(AuthService.getStoredToken as any).mockResolvedValue(null)

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
      ;(AuthService.isAuthenticated as any).mockRejectedValue(new Error('Storage error'))

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Storage error')
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should clear error on successful login', async () => {
      const mockDeviceInfo = {
        userCode: 'WDJB-MJHT',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
      }

      ;(AuthService.isAuthenticated as any).mockResolvedValue(false)
      ;(AuthService.initiateDeviceAuth as any)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValue(mockDeviceInfo)

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
      act(() => {
        result.current.login()
      })

      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })

      expect(result.current.deviceAuthInfo).toEqual(mockDeviceInfo)
    })
  })

  describe('refresh authentication', () => {
    it('should provide a method to refresh auth state', async () => {
      ;(AuthService.isAuthenticated as any).mockResolvedValue(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(false)

      // Change mock to authenticated
      ;(AuthService.isAuthenticated as any).mockResolvedValue(true)
      ;(AuthService.getStoredToken as any).mockResolvedValue('gho_token')

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
