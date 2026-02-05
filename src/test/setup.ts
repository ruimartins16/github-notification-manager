import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Chrome APIs for testing
global.chrome = {
  runtime: {
    onInstalled: {
      addListener: vi.fn(),
    },
    onMessage: {
      addListener: vi.fn(),
    },
    sendMessage: vi.fn(),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
} as any

// Extend expect with jest-dom matchers
expect.extend({})
