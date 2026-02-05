/**
 * AuthService - Handles GitHub OAuth authentication flow
 * 
 * This service manages:
 * - OAuth login flow using chrome.identity.launchWebAuthFlow
 * - Secure token storage in chrome.storage.local
 * - Token retrieval and authentication state
 * - Logout and credential cleanup
 */

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
const SCOPES = 'notifications read:user'
const STORAGE_KEY = 'authToken'
const USER_STORAGE_KEY = 'user'

export class AuthService {
  /**
   * Initiates GitHub OAuth login flow
   * Opens GitHub authorization page and handles redirect
   * 
   * @returns Promise<string> - GitHub access token
   * @throws Error if user cancels or authentication fails
   */
  static async login(): Promise<string> {
    try {
      // Get the OAuth URL with proper redirect URI
      const redirectUri = chrome.identity.getRedirectURL()
      if (!redirectUri) {
        throw new Error('Failed to get redirect URI from Chrome')
      }
      const clientId = await this.getClientId()
      const authUrl = this.getAuthUrl(clientId, redirectUri)

      // Launch OAuth flow
      const redirectUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      })

      if (!redirectUrl) {
        throw new Error('OAuth flow failed: no redirect URL received')
      }

      // Extract token from redirect URL
      const token = this.extractTokenFromUrl(redirectUrl)
      
      if (!token) {
        throw new Error('No access token found in redirect URL')
      }

      // Store the token
      await this.saveToken(token)

      return token
    } catch (error) {
      // Re-throw with original error message
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Authentication failed')
    }
  }

  /**
   * Logs out user by clearing stored credentials
   * Removes both auth token and user data from storage
   * 
   * @returns Promise<void>
   */
  static async logout(): Promise<void> {
    try {
      await chrome.storage.local.remove([STORAGE_KEY, USER_STORAGE_KEY])
    } catch (error) {
      // Silently handle storage errors during logout
      // Even if storage clear fails, we want logout to succeed
      console.error('Error clearing storage during logout:', error)
    }
  }

  /**
   * Retrieves stored GitHub access token
   * 
   * @returns Promise<string | null> - Token if stored, null otherwise
   * @throws Error if storage access fails
   */
  static async getStoredToken(): Promise<string | null> {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return result[STORAGE_KEY] || null
  }

  /**
   * Saves GitHub access token to storage
   * 
   * @param token - GitHub access token to store
   * @returns Promise<void>
   * @throws Error if storage write fails
   */
  static async saveToken(token: string): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: token })
  }

  /**
   * Checks if user is authenticated
   * Returns true if a valid token exists in storage
   * 
   * @returns Promise<boolean> - Authentication status
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken()
    return !!token && token.length > 0
  }

  /**
   * Generates GitHub OAuth authorization URL
   * 
   * @param clientId - GitHub OAuth app client ID
   * @param redirectUri - Chrome extension redirect URI
   * @returns string - Complete OAuth URL
   */
  static getAuthUrl(clientId: string, redirectUri: string): string {
    // Manually build URL to ensure proper encoding
    const encodedRedirectUri = encodeURIComponent(redirectUri)
    const encodedScope = encodeURIComponent(SCOPES)
    
    return `${GITHUB_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=${encodedScope}`
  }

  /**
   * Extracts access token from OAuth redirect URL
   * Handles both fragment (#) and query parameter (?) formats
   * 
   * @param url - OAuth redirect URL containing token
   * @returns string | null - Extracted token or null if not found
   */
  static extractTokenFromUrl(url: string): string | null {
    if (!url || url.length === 0) {
      return null
    }

    try {
      // Try to parse as URL
      const urlObj = new URL(url)
      
      // Check fragment (hash) first - GitHub uses this format
      if (urlObj.hash) {
        const hashParams = new URLSearchParams(urlObj.hash.substring(1))
        const token = hashParams.get('access_token')
        if (token) return token
      }

      // Check query parameters as fallback
      const token = urlObj.searchParams.get('access_token')
      if (token) return token

      return null
    } catch (error) {
      // Invalid URL format
      return null
    }
  }

  /**
   * Retrieves GitHub OAuth client ID from manifest
   * 
   * @returns Promise<string> - Client ID
   * @throws Error if client ID is not configured
   */
  private static async getClientId(): Promise<string> {
    const manifest = chrome.runtime.getManifest()
    const clientId = manifest.oauth2?.client_id

    if (!clientId || clientId === 'YOUR_GITHUB_OAUTH_CLIENT_ID') {
      throw new Error(
        'GitHub OAuth client ID not configured. Please follow instructions in GITHUB-OAUTH-SETUP.md'
      )
    }

    return clientId
  }
}
