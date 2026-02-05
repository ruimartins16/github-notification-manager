import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthService } from '../auth-service'

// Mock chrome.identity API
const mockLaunchWebAuthFlow = vi.fn()
const mockGetAuthToken = vi.fn()
const mockGetRedirectURL = vi.fn(() => 'https://test.chromiumapp.org/')

beforeEach(() => {
  // Setup chrome.identity mock
  global.chrome = {
    ...global.chrome,
    identity: {
      launchWebAuthFlow: mockLaunchWebAuthFlow,
      getAuthToken: mockGetAuthToken,
      getRedirectURL: mockGetRedirectURL,
    },
  } as any

  // Clear storage before each test
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AuthService', () => {
  describe('login', () => {
    it('should successfully authenticate with GitHub', async () => {
      const mockToken = 'gho_test_token_123'
      const mockRedirectUrl = `https://github.com/login/oauth/authorize?client_id=test&redirect_uri=https://test.chromiumapp.org/&scope=notifications%20read:user&state=test#access_token=${mockToken}`

      mockLaunchWebAuthFlow.mockResolvedValue(mockRedirectUrl)

      const token = await AuthService.login()

      expect(mockLaunchWebAuthFlow).toHaveBeenCalledWith({
        url: expect.stringContaining('github.com/login/oauth/authorize'),
        interactive: true,
      })
      expect(token).toBe(mockToken)
    })

    it('should extract token from redirect URL', async () => {
      const mockToken = 'gho_test_token_abc'
      const mockRedirectUrl = `https://extension.chromiumapp.org/#access_token=${mockToken}&token_type=bearer`

      mockLaunchWebAuthFlow.mockResolvedValue(mockRedirectUrl)

      const token = await AuthService.login()

      expect(token).toBe(mockToken)
    })

    it('should throw error if user cancels OAuth flow', async () => {
      mockLaunchWebAuthFlow.mockRejectedValue(new Error('User cancelled'))

      await expect(AuthService.login()).rejects.toThrow('User cancelled')
    })

    it('should throw error if no token in redirect URL', async () => {
      const mockRedirectUrl = 'https://extension.chromiumapp.org/#error=access_denied'

      mockLaunchWebAuthFlow.mockResolvedValue(mockRedirectUrl)

      await expect(AuthService.login()).rejects.toThrow('No access token found')
    })

    it('should handle network errors gracefully', async () => {
      mockLaunchWebAuthFlow.mockRejectedValue(new Error('Network error'))

      await expect(AuthService.login()).rejects.toThrow('Network error')
    })
  })

  describe('logout', () => {
    it('should clear stored token', async () => {
      const removeSpy = vi.spyOn(chrome.storage.local, 'remove')

      await AuthService.logout()

      expect(removeSpy).toHaveBeenCalledWith(['authToken', 'user'])
    })

    it('should resolve even if storage clear fails', async () => {
      vi.spyOn(chrome.storage.local, 'remove').mockRejectedValue(new Error('Storage error'))

      // Should not throw
      await expect(AuthService.logout()).resolves.toBeUndefined()
    })
  })

  describe('getStoredToken', () => {
    it('should retrieve token from chrome.storage.local', async () => {
      const mockToken = 'gho_stored_token'
      vi.spyOn(chrome.storage.local, 'get').mockResolvedValue({ authToken: mockToken })

      const token = await AuthService.getStoredToken()

      expect(token).toBe(mockToken)
    })

    it('should return null if no token stored', async () => {
      vi.spyOn(chrome.storage.local, 'get').mockResolvedValue({})

      const token = await AuthService.getStoredToken()

      expect(token).toBeNull()
    })

    it('should handle storage errors', async () => {
      vi.spyOn(chrome.storage.local, 'get').mockRejectedValue(new Error('Storage error'))

      await expect(AuthService.getStoredToken()).rejects.toThrow('Storage error')
    })
  })

  describe('saveToken', () => {
    it('should store token in chrome.storage.local', async () => {
      const token = 'gho_new_token'
      const setSpy = vi.spyOn(chrome.storage.local, 'set').mockResolvedValue()

      await AuthService.saveToken(token)

      expect(setSpy).toHaveBeenCalledWith({ authToken: token })
    })

    it('should handle storage errors', async () => {
      vi.spyOn(chrome.storage.local, 'set').mockRejectedValue(new Error('Storage full'))

      await expect(AuthService.saveToken('token')).rejects.toThrow('Storage full')
    })
  })

  describe('isAuthenticated', () => {
    it('should return true if valid token exists', async () => {
      vi.spyOn(chrome.storage.local, 'get').mockResolvedValue({ authToken: 'gho_valid_token' })

      const isAuth = await AuthService.isAuthenticated()

      expect(isAuth).toBe(true)
    })

    it('should return false if no token exists', async () => {
      vi.spyOn(chrome.storage.local, 'get').mockResolvedValue({})

      const isAuth = await AuthService.isAuthenticated()

      expect(isAuth).toBe(false)
    })

    it('should return false if token is null', async () => {
      vi.spyOn(chrome.storage.local, 'get').mockResolvedValue({ authToken: null })

      const isAuth = await AuthService.isAuthenticated()

      expect(isAuth).toBe(false)
    })

    it('should return false if token is empty string', async () => {
      vi.spyOn(chrome.storage.local, 'get').mockResolvedValue({ authToken: '' })

      const isAuth = await AuthService.isAuthenticated()

      expect(isAuth).toBe(false)
    })
  })

  describe('getAuthUrl', () => {
    it('should generate correct GitHub OAuth URL', () => {
      const url = AuthService.getAuthUrl('test_client_id', 'https://test.chromiumapp.org/')

      expect(url).toContain('https://github.com/login/oauth/authorize')
      expect(url).toContain('client_id=test_client_id')
      expect(url).toContain('redirect_uri=https%3A%2F%2Ftest.chromiumapp.org%2F')
      expect(url).toContain('scope=notifications%20read:user')
    })

    it('should URL encode redirect URI', () => {
      const url = AuthService.getAuthUrl('client', 'https://test.com/callback')

      expect(url).toContain(encodeURIComponent('https://test.com/callback'))
    })

    it('should include correct scopes', () => {
      const url = AuthService.getAuthUrl('client', 'https://test.com/')

      expect(url).toContain('scope=notifications%20read:user')
    })
  })

  describe('extractTokenFromUrl', () => {
    it('should extract token from fragment', () => {
      const url = 'https://test.com/#access_token=gho_token123&token_type=bearer'
      const token = AuthService.extractTokenFromUrl(url)

      expect(token).toBe('gho_token123')
    })

    it('should extract token from query parameter', () => {
      const url = 'https://test.com/?access_token=gho_token456'
      const token = AuthService.extractTokenFromUrl(url)

      expect(token).toBe('gho_token456')
    })

    it('should return null if no token in URL', () => {
      const url = 'https://test.com/#error=access_denied'
      const token = AuthService.extractTokenFromUrl(url)

      expect(token).toBeNull()
    })

    it('should return null for empty URL', () => {
      const token = AuthService.extractTokenFromUrl('')

      expect(token).toBeNull()
    })

    it('should handle malformed URLs', () => {
      const token = AuthService.extractTokenFromUrl('not a url')

      expect(token).toBeNull()
    })
  })
})
