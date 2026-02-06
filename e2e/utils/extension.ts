import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

/**
 * Chrome Extension test fixtures
 * 
 * Provides utilities for testing Chrome extensions with Playwright:
 * - Loads the extension from dist folder
 * - Provides access to popup and background pages
 * - Sets up mocked GitHub API responses
 */

export type ExtensionFixtures = {
  context: BrowserContext
  extensionId: string
  popup: Page
}

/**
 * Load Chrome extension and get extension ID
 */
async function loadExtension() {
  // ES module equivalent of __dirname
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const pathToExtension = path.join(__dirname, '../../dist')
  
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      '--no-sandbox',
    ],
  })

  // Wait for service worker (background script) to load
  let [background] = context.serviceWorkers()
  if (!background) {
    background = await context.waitForEvent('serviceworker', { timeout: 10000 })
  }

  const extensionId = background.url().split('/')[2]
  
  return { context, extensionId }
}

/**
 * Open extension popup
 */
async function openPopup(context: BrowserContext, extensionId: string): Promise<Page> {
  // Create a new page for the popup
  const popup = await context.newPage()
  
  // Navigate to the extension popup
  await popup.goto(`chrome-extension://${extensionId}/index.html`)
  await popup.waitForLoadState('domcontentloaded')
  
  return popup
}

/**
 * Setup mocked storage for tests
 */
async function setupMockStorage(popup: Page, data: Record<string, any>) {
  await popup.evaluate((mockData) => {
    Object.keys(mockData).forEach((key) => {
      chrome.storage.local.set({ [key]: mockData[key] })
    })
  }, data)
}

/**
 * Custom test fixture that loads extension
 */
export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const { context } = await loadExtension()
    await use(context)
    await context.close()
  },
  
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers()
    if (!background) {
      background = await context.waitForEvent('serviceworker')
    }
    const extensionId = background.url().split('/')[2]
    await use(extensionId)
  },
  
  popup: async ({ context, extensionId }, use) => {
    const popup = await openPopup(context, extensionId)
    await use(popup)
    await popup.close()
  },
})

export { expect } from '@playwright/test'

/**
 * Helper functions
 */
export const helpers = {
  setupMockStorage,
  
  /**
   * Mock GitHub API responses
   */
  async mockGitHubAPI(page: Page, responses: Record<string, any>) {
    await page.route('https://api.github.com/**', (route) => {
      const url = route.request().url()
      
      // Match endpoint and return mocked response
      for (const [endpoint, response] of Object.entries(responses)) {
        if (url.includes(endpoint)) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(response),
          })
        }
      }
      
      // Default: continue with request
      route.continue()
    })
  },
  
  /**
   * Wait for element with text
   */
  async waitForText(page: Page, text: string, timeout = 5000) {
    await page.waitForSelector(`text=${text}`, { timeout })
  },
  
  /**
   * Get notification count from badge
   */
  async getBadgeCount(context: BrowserContext): Promise<string | null> {
    const page = context.pages()[0]
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.action.getBadgeText({}, (text) => {
          resolve(text)
        })
      })
    })
  },
}
