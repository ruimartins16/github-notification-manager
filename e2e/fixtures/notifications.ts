/**
 * Mock notification data for E2E tests
 */

export const mockNotifications = [
  {
    id: '1',
    repository: {
      id: 123,
      name: 'test-repo',
      full_name: 'testuser/test-repo',
      owner: {
        login: 'testuser',
        avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
      },
      html_url: 'https://github.com/testuser/test-repo',
    },
    subject: {
      title: 'Fix: Update dependencies',
      url: 'https://api.github.com/repos/testuser/test-repo/pulls/42',
      latest_comment_url: 'https://api.github.com/repos/testuser/test-repo/issues/comments/123',
      type: 'PullRequest',
    },
    reason: 'mention',
    unread: true,
    updated_at: new Date().toISOString(),
    last_read_at: null,
    url: 'https://api.github.com/notifications/threads/1',
  },
  {
    id: '2',
    repository: {
      id: 456,
      name: 'another-repo',
      full_name: 'testuser/another-repo',
      owner: {
        login: 'testuser',
        avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
      },
      html_url: 'https://github.com/testuser/another-repo',
    },
    subject: {
      title: 'Bug: Login not working',
      url: 'https://api.github.com/repos/testuser/another-repo/issues/10',
      latest_comment_url: 'https://api.github.com/repos/testuser/another-repo/issues/comments/456',
      type: 'Issue',
    },
    reason: 'assign',
    unread: true,
    updated_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    last_read_at: null,
    url: 'https://api.github.com/notifications/threads/2',
  },
  {
    id: '3',
    repository: {
      id: 789,
      name: 'review-repo',
      full_name: 'testuser/review-repo',
      owner: {
        login: 'testuser',
        avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
      },
      html_url: 'https://github.com/testuser/review-repo',
    },
    subject: {
      title: 'feat: Add new feature',
      url: 'https://api.github.com/repos/testuser/review-repo/pulls/5',
      latest_comment_url: 'https://api.github.com/repos/testuser/review-repo/pulls/comments/789',
      type: 'PullRequest',
    },
    reason: 'review_requested',
    unread: true,
    updated_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    last_read_at: null,
    url: 'https://api.github.com/notifications/threads/3',
  },
]

export const mockUser = {
  login: 'testuser',
  id: 1,
  avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  name: 'Test User',
  email: 'test@example.com',
}

export const mockAuthToken = {
  access_token: 'gho_test1234567890abcdefghijklmnop',
  token_type: 'bearer',
  scope: 'notifications read:user',
}

export const mockStorageData = {
  auth: {
    accessToken: mockAuthToken.access_token,
    user: mockUser,
  },
  notifications: mockNotifications,
  settings: {
    refreshInterval: 30,
    badgeEnabled: true,
    soundEnabled: false,
    defaultFilter: 'all',
    openLinksInNewTab: true,
  },
}
