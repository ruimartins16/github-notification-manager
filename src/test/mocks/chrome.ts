// Mock Chrome API utilities for tests
import { vi } from 'vitest'

export const mockChromeStorage = {
  local: {
    get: vi.fn((keys, callback) => {
      callback?.({})
      return Promise.resolve({})
    }),
    set: vi.fn((items, callback) => {
      callback?.()
      return Promise.resolve()
    }),
    remove: vi.fn((keys, callback) => {
      callback?.()
      return Promise.resolve()
    }),
    clear: vi.fn((callback) => {
      callback?.()
      return Promise.resolve()
    }),
  },
  sync: {
    get: vi.fn((keys, callback) => {
      callback?.({})
      return Promise.resolve({})
    }),
    set: vi.fn((items, callback) => {
      callback?.()
      return Promise.resolve()
    }),
    remove: vi.fn((keys, callback) => {
      callback?.()
      return Promise.resolve()
    }),
    clear: vi.fn((callback) => {
      callback?.()
      return Promise.resolve()
    }),
  },
}

export const mockChromeRuntime = {
  onInstalled: {
    addListener: vi.fn(),
  },
  onMessage: {
    addListener: vi.fn(),
  },
  sendMessage: vi.fn(),
  getManifest: vi.fn(() => ({
    version: '1.0.0',
    name: 'GitHub Notification Manager',
  })),
}

export const mockChromeAction = {
  setBadgeText: vi.fn(),
  setBadgeBackgroundColor: vi.fn(),
  onClicked: {
    addListener: vi.fn(),
  },
}

export const mockChromeAlarms = {
  create: vi.fn(),
  clear: vi.fn(),
  clearAll: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
  onAlarm: {
    addListener: vi.fn(),
  },
}

export const resetChromeMocks = () => {
  vi.clearAllMocks()
}
