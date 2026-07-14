import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import App from '../App'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications, useUnreadCount } from '../../hooks/useNotifications'
import { useNotificationStore } from '../../store/notification-store'
import type { GitHubNotification } from '../../types/github'

// extpay imports webextension-polyfill, which throws when loaded outside a
// real browser extension. Mock the package at its root.
vi.mock('extpay', () => ({
  default: () => ({
    getUser: vi.fn().mockResolvedValue({ paid: false }),
    onPaid: { addListener: vi.fn() },
    openPaymentPage: vi.fn(),
    startBackground: vi.fn(),
  }),
}))

// useProStatus's real implementation talks to ExtPay - stub it out
vi.mock('../../hooks/useProStatus', () => ({
  useProStatus: vi.fn(() => ({ isPro: false, isLoading: false, user: null })),
  useIsPro: vi.fn(() => false),
}))

// Mock the auth hook (App's primary gate)
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

// Mock the notifications hooks
vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
  useUnreadCount: vi.fn(),
}))

// App's mount effect reads the stored token and fetches when data is stale -
// keep both inert in tests
vi.mock('../../utils/auth-service', () => ({
  AuthService: {
    getStoredToken: vi.fn().mockResolvedValue(null),
    isAuthenticated: vi.fn().mockResolvedValue(false),
    logout: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../../utils/notification-service', () => ({
  NotificationService: {
    fetchNotifications: vi.fn().mockResolvedValue([]),
    forceRefreshNotifications: vi.fn().mockResolvedValue([]),
  },
}))

const mockUseAuth = vi.mocked(useAuth)
const mockUseNotifications = vi.mocked(useNotifications)
const mockUseUnreadCount = vi.mocked(useUnreadCount)

function makeNotification(id: string, title: string): GitHubNotification {
  return {
    id,
    unread: true,
    reason: 'mention',
    updated_at: '2024-01-01T00:00:00Z',
    last_read_at: null,
    subject: {
      title,
      url: `https://api.github.com/repos/user/test/issues/${id}`,
      latest_comment_url: null,
      type: 'Issue',
    },
    repository: {
      id: 1,
      name: 'test',
      full_name: 'user/test',
      owner: {
        login: 'user',
        avatar_url: 'https://avatars.githubusercontent.com/u/1',
      },
      html_url: 'https://github.com/user/test',
      description: null,
    },
    url: `https://api.github.com/notifications/threads/${id}`,
    subscription_url: `https://api.github.com/notifications/threads/${id}/subscription`,
  } as GitHubNotification
}

function authState(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    isAuthenticated: false,
    isLoading: false,
    token: null,
    error: null,
    deviceAuthInfo: null,
    login: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn(),
    ...overrides,
  }
}

function notificationsState(overrides: Partial<ReturnType<typeof useNotifications>> = {}) {
  return {
    notifications: [] as GitHubNotification[],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    forceRefresh: vi.fn(),
    markAsRead: vi.fn(),
    ...overrides,
  }
}

function resetStore(notifications: GitHubNotification[] = []) {
  useNotificationStore.setState({
    notifications,
    snoozedNotifications: [],
    archivedNotifications: [],
    dismissedNotifications: [],
    isLoading: false,
    error: null,
    lastFetched: null,
    activeFilter: 'all',
    markAllBackup: null,
    selectedNotificationIds: new Set<string>(),
  })
}

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
    mockUseAuth.mockReturnValue(authState())
    mockUseNotifications.mockReturnValue(notificationsState())
    mockUseUnreadCount.mockReturnValue(0)
  })

  describe('Loading State', () => {
    it('displays a loading spinner while authentication is being checked', () => {
      mockUseAuth.mockReturnValue(authState({ isLoading: true }))

      render(<App />)

      expect(
        screen.getByRole('status', { name: /loading authentication status/i })
      ).toBeInTheDocument()
    })
  })

  describe('Not Authenticated State', () => {
    it('renders the app title and subtitle', () => {
      render(<App />)

      expect(screen.getByText('GitHush')).toBeInTheDocument()
      expect(screen.getByText('Quiet the noise')).toBeInTheDocument()
    })

    it('shows the login screen with authorization details', () => {
      render(<App />)

      expect(screen.getByText('Connect to GitHub')).toBeInTheDocument()
      expect(screen.getByText("What you'll authorize:")).toBeInTheDocument()
      expect(screen.getByText('✓ Read your notifications')).toBeInTheDocument()
      expect(screen.getByText('✓ Mark notifications as read')).toBeInTheDocument()
    })

    it('calls login when the Connect GitHub button is clicked', async () => {
      const loginMock = vi.fn()
      mockUseAuth.mockReturnValue(authState({ login: loginMock }))

      const user = userEvent.setup()
      render(<App />)

      const button = screen.getByRole('button', { name: /connect github/i })
      expect(button).toBeEnabled()
      await user.click(button)

      expect(loginMock).toHaveBeenCalledTimes(1)
    })

    it('does not render the notifications view', () => {
      render(<App />)

      expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
    })
  })

  describe('Device Auth Flow', () => {
    it('shows the device code while authorization is pending', () => {
      mockUseAuth.mockReturnValue(
        authState({
          deviceAuthInfo: {
            userCode: 'ABCD-1234',
            verificationUri: 'https://github.com/login/device',
            expiresIn: 900,
            deviceCode: 'device_code',
            interval: 5,
          } as any,
        })
      )

      render(<App />)

      expect(screen.getByText('ABCD-1234')).toBeInTheDocument()
      expect(screen.getByText('Step 1: Copy this code')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /open github to authorize/i })
      ).toBeInTheDocument()
    })
  })

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(
        authState({ isAuthenticated: true, token: 'gho_test_token' })
      )
    })

    it('displays the notifications header and view tabs', () => {
      render(<App />)

      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Snoozed')).toBeInTheDocument()
      expect(screen.getByText('Archived')).toBeInTheDocument()
    })

    it('displays the empty state when there are no notifications', () => {
      mockUseUnreadCount.mockReturnValue(0)

      render(<App />)

      expect(screen.getByText('All caught up!')).toBeInTheDocument()
      expect(screen.getByText('You have no unread notifications')).toBeInTheDocument()
    })

    it('renders the notification list from the store', () => {
      const notifications = [
        makeNotification('1', 'Fix the flaky test'),
        makeNotification('2', 'Release v2.0.0'),
      ]
      resetStore(notifications)
      mockUseNotifications.mockReturnValue(notificationsState({ notifications }))
      mockUseUnreadCount.mockReturnValue(2)

      render(<App />)

      expect(screen.getByRole('list', { name: /github notifications/i })).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
      expect(screen.getByText('Fix the flaky test')).toBeInTheDocument()
      expect(screen.getByText('Release v2.0.0')).toBeInTheDocument()
      expect(screen.queryByText('All caught up!')).not.toBeInTheDocument()
    })

    it('shows a loading indicator while notifications are loading', () => {
      mockUseNotifications.mockReturnValue(notificationsState({ isLoading: true }))

      render(<App />)

      expect(
        screen.getByRole('status', { name: /loading notifications/i })
      ).toBeInTheDocument()
    })

    it('shows an error state with a retry button when loading fails', async () => {
      const refreshMock = vi.fn()
      mockUseNotifications.mockReturnValue(
        notificationsState({ error: 'API rate limit exceeded', refresh: refreshMock })
      )

      const user = userEvent.setup()
      render(<App />)

      expect(screen.getByText('Failed to load notifications')).toBeInTheDocument()
      expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /retry/i }))
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  describe('Auth Error State', () => {
    it('displays the authentication error message', () => {
      mockUseAuth.mockReturnValue(authState({ error: 'Authentication failed' }))

      render(<App />)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('Authentication failed')
    })
  })
})
