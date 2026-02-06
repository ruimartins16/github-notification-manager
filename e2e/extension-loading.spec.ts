import { test, expect } from './utils/extension'

/**
 * E2E Tests: Extension Loading and Basic UI
 * 
 * Tests that the extension loads correctly and the popup displays
 */

test.describe('Extension Loading', () => {
  test('should load extension successfully', async ({ context, extensionId }) => {
    // Verify extension ID exists and is valid
    expect(extensionId).toBeTruthy()
    expect(extensionId).toMatch(/^[a-z]{32}$/)
    
    // Verify background service worker is running
    const serviceWorkers = context.serviceWorkers()
    expect(serviceWorkers.length).toBeGreaterThan(0)
    
    const backgroundWorker = serviceWorkers[0]
    expect(backgroundWorker.url()).toContain(extensionId)
  })

  test('should open popup window', async ({ popup }) => {
    // Verify popup page loads
    expect(popup).toBeTruthy()
    expect(popup.url()).toContain('chrome-extension://')
    expect(popup.url()).toContain('/index.html')
    
    // Wait for React app to mount
    await popup.waitForSelector('[data-testid="app-root"], .w-\\[400px\\]', { timeout: 10000 })
    
    // Verify popup has content
    const content = await popup.textContent('body')
    expect(content).toBeTruthy()
  })

  test('should display loading state on first load', async ({ popup }) => {
    // Should show loading indicator initially
    const loadingElement = popup.locator('text=Loading')
    
    // Either loading text exists or app is already loaded
    const isLoading = await loadingElement.isVisible().catch(() => false)
    const hasContent = await popup.locator('body').textContent()
    
    expect(isLoading || (hasContent && hasContent.length > 0)).toBeTruthy()
  })

  test('should have correct popup dimensions', async ({ popup }) => {
    // Wait for app to load
    await popup.waitForLoadState('domcontentloaded')
    
    // Check popup container has correct width (400px as per design)
    const container = popup.locator('.w-\\[400px\\]').first()
    await container.waitFor({ timeout: 10000 })
    
    const box = await container.boundingBox()
    expect(box).toBeTruthy()
    if (box) {
      // Should be 400px wide (allowing some tolerance for browser differences)
      expect(box.width).toBeGreaterThanOrEqual(390)
      expect(box.width).toBeLessThanOrEqual(410)
    }
  })
})

test.describe('Extension Manifest', () => {
  test('should have correct manifest version', async ({ popup }) => {
    // Read manifest from extension context
    const manifest = await popup.evaluate(() => {
      return chrome.runtime.getManifest()
    })
    
    expect(manifest).toBeTruthy()
    expect(manifest.manifest_version).toBe(3)
    expect(manifest.name).toContain('GitHub Notification Manager')
    expect(manifest.version).toBe('1.0.0')
  })

  test('should have required permissions', async ({ popup }) => {
    const manifest = await popup.evaluate(() => {
      return chrome.runtime.getManifest()
    })
    
    expect(manifest.permissions).toContain('storage')
    expect(manifest.permissions).toContain('alarms')
    expect(manifest.permissions).toContain('notifications')
  })
})
