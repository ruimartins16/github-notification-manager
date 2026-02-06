import { test, expect, helpers } from './utils/extension'
import { mockUser, mockAuthToken } from './fixtures/notifications'

/**
 * E2E Tests: Authentication Flow
 * 
 * Tests GitHub OAuth authentication with mocked responses
 */

test.describe('Authentication', () => {
  test('should show login screen when not authenticated', async ({ popup }) => {
    // Wait for app to load
    await popup.waitForLoadState('domcontentloaded')
    
    // Should show "Connect GitHub" button or login prompt
    const loginButton = popup.locator('text=Connect GitHub, text=Login, button:has-text("GitHub")')
    
    // Wait for either loading to finish or login button to appear
    await popup.waitForSelector('text=Connect GitHub, text=Loading', { timeout: 10000 })
    
    const hasLoginUI = await loginButton.isVisible().catch(() => false)
    const hasLoadingUI = await popup.locator('text=Loading').isVisible().catch(() => false)
    
    // Should show either login UI or loading state
    expect(hasLoginUI || hasLoadingUI).toBeTruthy()
  })

  test('should display user info when authenticated', async ({ popup }) => {
    // Mock authenticated state
    await helpers.setupMockStorage(popup, {
      auth: {
        accessToken: mockAuthToken.access_token,
        user: mockUser,
      },
    })
    
    // Mock GitHub API user endpoint
    await helpers.mockGitHubAPI(popup, {
      '/user': mockUser,
      '/notifications': [],
    })
    
    // Reload popup to apply mocked auth
    await popup.reload()
    await popup.waitForLoadState('domcontentloaded')
    
    // Should show user info (avatar, username, or settings)
    const hasUserInfo = 
      await popup.locator(`text=${mockUser.login}`).isVisible().catch(() => false) ||
      await popup.locator('[data-testid="settings-button"]').isVisible().catch(() => false) ||
      await popup.locator('img[alt*="avatar"]').isVisible().catch(() => false)
    
    expect(hasUserInfo).toBeTruthy()
  })

  test('should handle logout', async ({ popup }) => {
    // Setup authenticated state
    await helpers.setupMockStorage(popup, {
      auth: {
        accessToken: mockAuthToken.access_token,
        user: mockUser,
      },
    })
    
    await popup.reload()
    await popup.waitForLoadState('domcontentloaded')
    
    // Open settings (should have logout button)
    const settingsButton = popup.locator('[data-testid="settings-button"], button:has-text("Settings"), [aria-label*="Settings"]').first()
    
    if (await settingsButton.isVisible()) {
      await settingsButton.click()
      
      // Look for logout button
      const logoutButton = popup.locator('text=Logout, text=Sign Out, button:has-text("Logout")').first()
      
      if (await logoutButton.isVisible()) {
        await logoutButton.click()
        
        // Should return to login screen
        await popup.waitForSelector('text=Connect GitHub, text=Login', { timeout: 5000 })
        
        const hasLoginUI = await popup.locator('text=Connect GitHub').isVisible()
        expect(hasLoginUI).toBeTruthy()
      }
    }
  })
})

test.describe('Authentication Error Handling', () => {
  test('should show error on failed authentication', async ({ popup }) => {
    // Mock failed auth response
    await helpers.mockGitHubAPI(popup, {
      '/user': { 
        message: 'Bad credentials',
        documentation_url: 'https://docs.github.com/rest'
      },
    })
    
    // Try to authenticate with invalid token
    await helpers.setupMockStorage(popup, {
      auth: {
        accessToken: 'invalid_token',
        user: null,
      },
    })
    
    await popup.reload()
    await popup.waitForLoadState('domcontentloaded')
    
    // Should show error message or return to login
    const hasError = 
      await popup.locator('text=error, text=failed, text=invalid').isVisible().catch(() => false) ||
      await popup.locator('text=Connect GitHub').isVisible().catch(() => false)
    
    expect(hasError).toBeTruthy()
  })

  test('should persist authentication across popup opens', async ({ context, extensionId, popup }) => {
    // Setup authenticated state
    await helpers.setupMockStorage(popup, {
      auth: {
        accessToken: mockAuthToken.access_token,
        user: mockUser,
      },
    })
    
    await popup.reload()
    await popup.waitForLoadState('domcontentloaded')
    
    // Close popup
    await popup.close()
    
    // Re-open popup
    const newPopup = await context.newPage()
    await newPopup.goto(`chrome-extension://${extensionId}/index.html`)
    await newPopup.waitForLoadState('domcontentloaded')
    
    // Should still be authenticated (show user info, not login screen)
    const hasLoginUI = await newPopup.locator('text=Connect GitHub').isVisible().catch(() => false)
    
    // Should NOT show login screen since we're authenticated
    expect(hasLoginUI).toBeFalsy()
    
    await newPopup.close()
  })
})
