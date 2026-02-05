import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthService } from '../auth-service'

// Mock fetch globally
global.fetch = vi.fn()

// Mock chrome.runtime.getManifest
const mockGetManifest = vi.fn(() => ({
  oauth2: {
    client_id: 'test_client_id',
  },
}))

beforeEach(() => {
  // Setup chrome mock
  global.chrome = {
    ...global.chrome,
    runtime: {
      getManifest: mockGetManifest,
    },
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
      },
    },
    tabs: {
      create: vi.fn(),
    },
  } as any

  vi.clearAllMocks()
  
  // Use fake timers to speed up sleep() calls
  vi.useFakeTimers()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('AuthService', () => {
  describe('initiateDeviceAuth', () => {
    it('should request device code from GitHub', async () => {
      const mockDeviceResponse = {
        device_code: 'device_code_123',
        user_code: 'WDJB-MJHT',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeviceResponse,
      })

      const result = await AuthService.initiateDeviceAuth()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://github.com/login/device/code',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: 'test_client_id',
            scope: 'notifications read:user',
          }),
        })
      )

      expect(result).toEqual({
        userCode: 'WDJB-MJHT',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
      })
    })

    it('should store device code in chrome.storage', async () => {
      const mockDeviceResponse = {
        device_code: 'device_code_123',
        user_code: 'WDJB-MJHT',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeviceResponse,
      })

      await AuthService.initiateDeviceAuth()

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        _deviceCode: 'device_code_123',
        _deviceInterval: 5,
        _userCode: 'WDJB-MJHT',
      })
    })

    it('should throw error if GitHub request fails', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      })

      await expect(AuthService.initiateDeviceAuth()).rejects.toThrow(
        'Failed to request device code: Bad Request'
      )
    })

    it('should throw error if client ID not configured', async () => {
      mockGetManifest.mockReturnValueOnce({
        oauth2: {
          client_id: 'YOUR_GITHUB_OAUTH_CLIENT_ID',
        },
      })

      await expect(AuthService.initiateDeviceAuth()).rejects.toThrow(
        'GitHub OAuth client ID not configured'
      )
    })
  })

  describe('completeDeviceAuth', () => {
    it('should retrieve device code from storage and poll for token', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValueOnce({
        _deviceCode: 'device_code_123',
        _deviceInterval: 5,
        _userCode: 'WDJB-MJHT',
      })

      // Mock successful token response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'gho_test_token',
          token_type: 'bearer',
          scope: 'notifications read:user',
        }),
      })

      // Start the call and advance timers
      const tokenPromise = AuthService.completeDeviceAuth()
      await vi.advanceTimersByTimeAsync(5000) // Advance past the sleep
      const token = await tokenPromise

      expect(chrome.storage.local.get).toHaveBeenCalledWith([
        '_deviceCode',
        '_deviceInterval',
        '_userCode',
      ])
      expect(token).toBe('gho_test_token')
    })

    it('should save token and clean up temporary storage', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValueOnce({
        _deviceCode: 'device_code_123',
        _deviceInterval: 5,
        _userCode: 'WDJB-MJHT',
      })

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'gho_test_token',
          token_type: 'bearer',
          scope: 'notifications read:user',
        }),
      })

      const promise = AuthService.completeDeviceAuth()
      await vi.advanceTimersByTimeAsync(5000)
      await promise

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        authToken: 'gho_test_token',
      })

      expect(chrome.storage.local.remove).toHaveBeenCalledWith([
        '_deviceCode',
        '_deviceInterval',
        '_userCode',
      ])
    })

    it('should throw error if no device code found', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValueOnce({})

      await expect(AuthService.completeDeviceAuth()).rejects.toThrow(
        'No device code found. Please start the authorization process again.'
      )
    })

    it('should clean up storage on polling error', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValueOnce({
        _deviceCode: 'device_code_123',
        _deviceInterval: 5,
      })

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: 'expired_token',
        }),
      })

      const promise = AuthService.completeDeviceAuth()
      await vi.advanceTimersByTimeAsync(5000)
      
      await expect(promise).rejects.toThrow(
        'Authorization expired. Please try again.'
      )

      expect(chrome.storage.local.remove).toHaveBeenCalledWith([
        '_deviceCode',
        '_deviceInterval',
        '_userCode',
      ])
    })
  })

  describe('pollForToken', () => {
    it('should return token on successful authorization', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValueOnce({
        _deviceCode: 'device_code_123',
        _deviceInterval: 5,
      })

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'gho_success_token',
          token_type: 'bearer',
          scope: 'notifications read:user',
        }),
      })

      const promise = AuthService.completeDeviceAuth()
      await vi.advanceTimersByTimeAsync(5000)
      const token = await promise

      expect(token).toBe('gho_success_token')
    })

    it('should continue polling on authorization_pending', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValueOnce({
        _deviceCode: 'device_code_123',
        _deviceInterval: 5,
      })

      // First call: pending, Second call: success
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ error: 'authorization_pending' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'gho_success_token',
            token_type: 'bearer',
            scope: 'notifications read:user',
          }),
        })

      const promise = AuthService.completeDeviceAuth()
      await vi.advanceTimersByTimeAsync(5000) // First poll
      await vi.advanceTimersByTimeAsync(5000) // Second poll
      const token = await promise

      expect(token).toBe('gho_success_token')
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should throw error on expired_token', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValueOnce({
        _deviceCode: 'device_code_123',
        _deviceInterval: 5,
      })

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'expired_token' }),
      })

      const promise = AuthService.completeDeviceAuth()
      await vi.advanceTimersByTimeAsync(5000)

      await expect(promise).rejects.toThrow(
        'Authorization expired. Please try again.'
      )
    })

    it('should throw error on access_denied', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValueOnce({
        _deviceCode: 'device_code_123',
        _deviceInterval: 5,
      })

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'access_denied' }),
      })

      const promise = AuthService.completeDeviceAuth()
      await vi.advanceTimersByTimeAsync(5000)

      await expect(promise).rejects.toThrow(
        'Authorization denied by user.'
      )
    })

    it('should handle slow_down error by increasing interval', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValueOnce({
        _deviceCode: 'device_code_123',
        _deviceInterval: 5,
      })

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ error: 'slow_down' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'gho_success_token',
            token_type: 'bearer',
            scope: 'notifications read:user',
          }),
        })

      const promise = AuthService.completeDeviceAuth()
      await vi.advanceTimersByTimeAsync(5000)  // First poll with slow_down
      await vi.advanceTimersByTimeAsync(10000) // Second poll with increased interval (5 + 5)
      const token = await promise

      expect(token).toBe('gho_success_token')
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should throw error on unknown error code', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValueOnce({
        _deviceCode: 'device_code_123',
        _deviceInterval: 5,
      })

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'unknown_error' }),
      })

      const promise = AuthService.completeDeviceAuth()
      await vi.advanceTimersByTimeAsync(5000)

      await expect(promise).rejects.toThrow(
        'Authorization failed: unknown_error'
      )
    })
  })

  describe('logout', () => {
    it('should clear stored token and user data', async () => {
      await AuthService.logout()

      expect(chrome.storage.local.remove).toHaveBeenCalledWith(['authToken', 'user'])
    })

    it('should resolve even if storage clear fails', async () => {
      ;(chrome.storage.local.remove as any).mockRejectedValue(new Error('Storage error'))

      // Should not throw
      await expect(AuthService.logout()).resolves.toBeUndefined()
    })
  })

  describe('getStoredToken', () => {
    it('should retrieve token from chrome.storage.local', async () => {
      const mockToken = 'gho_stored_token'
      ;(chrome.storage.local.get as any).mockResolvedValue({ authToken: mockToken })

      const token = await AuthService.getStoredToken()

      expect(token).toBe(mockToken)
    })

    it('should return null if no token stored', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValue({})

      const token = await AuthService.getStoredToken()

      expect(token).toBeNull()
    })

    it('should handle storage errors', async () => {
      ;(chrome.storage.local.get as any).mockRejectedValue(new Error('Storage error'))

      await expect(AuthService.getStoredToken()).rejects.toThrow('Storage error')
    })
  })

  describe('saveToken', () => {
    it('should store token in chrome.storage.local', async () => {
      const token = 'gho_new_token'

      await AuthService.saveToken(token)

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ authToken: token })
    })

    it('should handle storage errors', async () => {
      ;(chrome.storage.local.set as any).mockRejectedValue(new Error('Storage full'))

      await expect(AuthService.saveToken('token')).rejects.toThrow('Storage full')
    })
  })

  describe('isAuthenticated', () => {
    it('should return true if valid token exists', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValue({ authToken: 'gho_valid_token' })

      const isAuth = await AuthService.isAuthenticated()

      expect(isAuth).toBe(true)
    })

    it('should return false if no token exists', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValue({})

      const isAuth = await AuthService.isAuthenticated()

      expect(isAuth).toBe(false)
    })

    it('should return false if token is null', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValue({ authToken: null })

      const isAuth = await AuthService.isAuthenticated()

      expect(isAuth).toBe(false)
    })

    it('should return false if token is empty string', async () => {
      ;(chrome.storage.local.get as any).mockResolvedValue({ authToken: '' })

      const isAuth = await AuthService.isAuthenticated()

      expect(isAuth).toBe(false)
    })
  })
})
