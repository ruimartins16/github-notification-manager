/**
 * AuthService - Handles GitHub OAuth authentication using Device Flow
 * 
 * This service implements GitHub's Device Flow (OAuth 2.0 Device Authorization Grant)
 * which is designed for applications without direct web browser access, perfect for
 * Chrome extensions.
 * 
 * Flow:
 * 1. Request device and user codes from GitHub
 * 2. Show user code and open GitHub verification page
 * 3. Poll GitHub for authorization status
 * 4. Receive access token when user authorizes
 * 
 * Resources:
 * - https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 */

const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const SCOPES = 'notifications read:user'
const STORAGE_KEY = 'authToken'
const USER_STORAGE_KEY = 'user'

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

interface TokenResponse {
  access_token: string
  token_type: string
  scope: string
  error?: string
}

export interface DeviceAuthInfo {
  userCode: string
  verificationUri: string
  expiresIn: number
}

export class AuthService {
  /**
   * Initiates GitHub Device Flow authentication - Step 1: Get device code
   * Returns device info that should be displayed to user
   * Call completeDeviceAuth() after user sees the code
   * 
   * @returns Promise<DeviceAuthInfo> - Device code info to display
   * @throws Error if request fails
   */
  static async initiateDeviceAuth(): Promise<DeviceAuthInfo> {
    console.log('[AuthService] Initiating device auth...')
    const clientId = await this.getClientId()
    const deviceData = await this.requestDeviceCode(clientId)

    console.log('[AuthService] Device code received:', deviceData.user_code)
    console.log('[AuthService] Verification URI:', deviceData.verification_uri)

    // Store device code for later polling
    await chrome.storage.local.set({ 
      _deviceCode: deviceData.device_code,
      _deviceInterval: deviceData.interval,
    })

    console.log('[AuthService] Device code stored in chrome.storage')

    return {
      userCode: deviceData.user_code,
      verificationUri: deviceData.verification_uri,
      expiresIn: deviceData.expires_in,
    }
  }

  /**
   * Completes GitHub Device Flow authentication - Step 2: Poll for token
   * Call this after showing user the code and opening verification page
   * 
   * @returns Promise<string> - GitHub access token
   * @throws Error if authorization fails
   */
  static async completeDeviceAuth(): Promise<string> {
    console.log('[AuthService] Starting completeDeviceAuth...')
    const clientId = await this.getClientId()
    
    // Retrieve stored device code
    const storage = await chrome.storage.local.get(['_deviceCode', '_deviceInterval'])
    const deviceCode = storage._deviceCode
    const interval = storage._deviceInterval || 5

    console.log('[AuthService] Device code from storage:', deviceCode ? 'Found' : 'NOT FOUND')
    console.log('[AuthService] Poll interval:', interval, 'seconds')

    if (!deviceCode) {
      throw new Error('No device code found. Please start the authorization process again.')
    }

    try {
      console.log('[AuthService] Starting to poll for token...')
      // Poll for token
      const token = await this.pollForToken(clientId, deviceCode, interval)

      console.log('[AuthService] Token received from GitHub:', token.substring(0, 10) + '...')

      // Store the token
      await this.saveToken(token)

      // Clean up temporary device data
      await chrome.storage.local.remove(['_deviceCode', '_deviceInterval'])

      console.log('[AuthService] completeDeviceAuth finished successfully')
      return token
    } catch (error) {
      console.error('[AuthService] completeDeviceAuth failed:', error)
      // Clean up on error
      await chrome.storage.local.remove(['_deviceCode', '_deviceInterval'])
      throw error
    }
  }

  /**
   * Legacy login method for backwards compatibility
   * Now uses Device Flow internally
   * 
   * @returns Promise<string> - GitHub access token
   * @throws Error if user cancels or authentication fails
   */
  static async login(): Promise<string> {
    try {
      // Step 1: Get device code
      const deviceInfo = await this.initiateDeviceAuth()

      // Step 2: Open verification page
      await chrome.tabs.create({
        url: deviceInfo.verificationUri,
        active: true,
      })

      // Step 3: Poll for token (this will take a while)
      const token = await this.completeDeviceAuth()

      return token
    } catch (error) {
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
      console.error('Error clearing storage during logout:', error)
    }
  }

  /**
   * Retrieves stored GitHub access token
   * 
   * @returns Promise<string | null> - Token if stored, null otherwise
   */
  static async getStoredToken(): Promise<string | null> {
    console.log('[AuthService] Getting stored token...')
    const result = await chrome.storage.local.get(STORAGE_KEY)
    console.log('[AuthService] Storage result:', result)
    const token = result[STORAGE_KEY] || null
    console.log('[AuthService] Token found:', token ? 'YES' : 'NO')
    return token
  }

  /**
   * Saves GitHub access token to storage
   * 
   * @param token - GitHub access token to store
   * @returns Promise<void>
   */
  static async saveToken(token: string): Promise<void> {
    console.log('[AuthService] Saving token to storage:', token.substring(0, 10) + '...')
    await chrome.storage.local.set({ [STORAGE_KEY]: token })
    console.log('[AuthService] Token saved successfully')
    
    // Verify it was saved
    const verification = await chrome.storage.local.get(STORAGE_KEY)
    console.log('[AuthService] Token verification:', verification[STORAGE_KEY] ? 'Found' : 'NOT FOUND')
  }

  /**
   * Checks if user is authenticated
   * Returns true if a valid token exists in storage
   * 
   * @returns Promise<boolean> - Authentication status
   */
  static async isAuthenticated(): Promise<boolean> {
    console.log('[AuthService] Checking authentication...')
    const token = await this.getStoredToken()
    const isAuth = !!token && token.length > 0
    console.log('[AuthService] Is authenticated:', isAuth)
    return isAuth
  }

  /**
   * Requests device and user codes from GitHub
   * 
   * @param clientId - GitHub OAuth app client ID
   * @returns Promise<DeviceCodeResponse> - Device code data
   * @throws Error if request fails
   */
  private static async requestDeviceCode(clientId: string): Promise<DeviceCodeResponse> {
    const response = await fetch(GITHUB_DEVICE_CODE_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        scope: SCOPES,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to request device code: ${response.statusText}`)
    }

    const data = await response.json()
    return data as DeviceCodeResponse
  }

  /**
   * Polls GitHub for access token
   * Continues polling until user authorizes or timeout occurs
   * 
   * @param clientId - GitHub OAuth app client ID
   * @param deviceCode - Device verification code
   * @param interval - Minimum seconds between poll requests
   * @returns Promise<string> - Access token
   * @throws Error if authorization fails or times out
   */
  private static async pollForToken(
    clientId: string,
    deviceCode: string,
    interval: number
  ): Promise<string> {
    console.log('[AuthService] pollForToken started')
    const maxAttempts = 120 // 120 attempts * 5 seconds = 10 minutes max
    let attempts = 0

    while (attempts < maxAttempts) {
      attempts++
      console.log(`[AuthService] Poll attempt ${attempts}/${maxAttempts}`)

      // Wait for the interval before each request (GitHub requirement)
      await this.sleep(interval * 1000)

      try {
        console.log('[AuthService] Fetching token from GitHub...')
        const response = await fetch(GITHUB_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
        })

        const data: TokenResponse = await response.json()
        console.log('[AuthService] GitHub response:', data.error || 'Success')

        // Success! We got the token
        if (data.access_token) {
          console.log('[AuthService] ✅ Access token received!')
          return data.access_token
        }

        // Handle error responses
        if (data.error) {
          switch (data.error) {
            case 'authorization_pending':
              // User hasn't authorized yet, keep polling
              console.log('[AuthService] Authorization pending, continuing...')
              continue

            case 'slow_down':
              // We're polling too fast, increase interval
              console.log('[AuthService] Slow down requested, increasing interval')
              interval += 5
              continue

            case 'expired_token':
              console.error('[AuthService] Token expired')
              throw new Error('Authorization expired. Please try again.')

            case 'access_denied':
              console.error('[AuthService] Access denied by user')
              throw new Error('Authorization denied by user.')

            default:
              console.error('[AuthService] Unknown error:', data.error)
              throw new Error(`Authorization failed: ${data.error}`)
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('[AuthService] Polling error:', error.message)
          throw error
        }
        // Network error, continue polling
        console.warn('[AuthService] Network error, continuing to poll...')
        continue
      }
    }

    console.error('[AuthService] Polling timeout reached')
    throw new Error('Authorization timeout. Please try again.')
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

  /**
   * Helper function to sleep for a specified duration
   * 
   * @param ms - Milliseconds to sleep
   * @returns Promise<void>
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
