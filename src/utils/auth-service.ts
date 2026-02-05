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
    const clientId = await this.getClientId()
    const deviceData = await this.requestDeviceCode(clientId)

    // Store device code for later polling
    await chrome.storage.local.set({ 
      _deviceCode: deviceData.device_code,
      _deviceInterval: deviceData.interval,
    })

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
    const clientId = await this.getClientId()
    
    // Retrieve stored device code
    const storage = await chrome.storage.local.get(['_deviceCode', '_deviceInterval'])
    const deviceCode = storage._deviceCode
    const interval = storage._deviceInterval || 5

    if (!deviceCode) {
      throw new Error('No device code found. Please start the authorization process again.')
    }

    try {
      // Poll for token
      const token = await this.pollForToken(clientId, deviceCode, interval)

      // Store the token
      await this.saveToken(token)

      // Clean up temporary device data
      await chrome.storage.local.remove(['_deviceCode', '_deviceInterval'])

      return token
    } catch (error) {
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
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return result[STORAGE_KEY] || null
  }

  /**
   * Saves GitHub access token to storage
   * 
   * @param token - GitHub access token to store
   * @returns Promise<void>
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
    const maxAttempts = 120 // 120 attempts * 5 seconds = 10 minutes max
    let attempts = 0

    while (attempts < maxAttempts) {
      attempts++

      // Wait for the interval before each request (GitHub requirement)
      await this.sleep(interval * 1000)

      try {
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

        // Success! We got the token
        if (data.access_token) {
          return data.access_token
        }

        // Handle error responses
        if (data.error) {
          switch (data.error) {
            case 'authorization_pending':
              // User hasn't authorized yet, keep polling
              continue

            case 'slow_down':
              // We're polling too fast, increase interval
              interval += 5
              continue

            case 'expired_token':
              throw new Error('Authorization expired. Please try again.')

            case 'access_denied':
              throw new Error('Authorization denied by user.')

            default:
              throw new Error(`Authorization failed: ${data.error}`)
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error
        }
        // Network error, continue polling
        continue
      }
    }

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
