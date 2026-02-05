import { useAuth } from '../hooks/useAuth'

function App() {
  const { isAuthenticated, isLoading, error, deviceAuthInfo, login, logout } = useAuth()

  if (isLoading) {
    return (
      <div className="w-[400px] h-[600px] bg-github-canvas-default flex items-center justify-center">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-github-accent-emphasis mx-auto mb-4"
            role="status"
            aria-label="Loading authentication status"
          />
          <p className="text-sm text-github-fg-muted">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[400px] h-[600px] bg-github-canvas-default">
      <div className="p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-github-fg-default mb-2">
            GitHub Notification Manager
          </h1>
          <p className="text-sm text-github-fg-muted">
            Take control of your GitHub notifications
          </p>
        </header>

        {error && (
          <div 
            className="mb-4 p-4 bg-github-danger-subtle border border-github-danger-emphasis rounded-github"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-sm text-github-danger-fg font-medium">
              {error}
            </p>
          </div>
        )}

        {deviceAuthInfo && (
          <div className="mb-4 p-6 bg-github-accent-subtle border border-github-accent-emphasis rounded-github">
            <h2 className="text-lg font-semibold text-github-fg-default mb-2">
              Enter this code on GitHub:
            </h2>
            <div className="my-4 p-4 bg-github-canvas-default rounded-github border border-github-border-default">
              <p className="text-3xl font-mono font-bold text-center text-github-accent-fg tracking-widest">
                {deviceAuthInfo.userCode}
              </p>
            </div>
            <p className="text-sm text-github-fg-muted text-center mb-2">
              A GitHub tab has been opened. Enter the code above to authorize this extension.
            </p>
            <p className="text-xs text-github-fg-subtle text-center">
              Waiting for authorization... (Code expires in {Math.floor(deviceAuthInfo.expiresIn / 60)} minutes)
            </p>
          </div>
        )}

        {!isAuthenticated && !deviceAuthInfo ? (
          <div className="space-y-4">
            <div className="p-6 bg-github-canvas-subtle rounded-github border border-github-border-default text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-16 w-16 text-github-fg-muted"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  role="img"
                  aria-label="GitHub logo"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              
              <h2 className="text-lg font-semibold text-github-fg-default mb-2">
                Connect to GitHub
              </h2>
              <p className="text-sm text-github-fg-muted mb-6">
                Sign in with your GitHub account to manage your notifications
              </p>

              <button
                onClick={login}
                disabled={isLoading}
                aria-busy={isLoading}
                className="px-6 py-3 bg-github-accent-emphasis text-white rounded-github 
                         hover:bg-github-accent-fg transition-colors font-medium text-sm
                         disabled:opacity-50 disabled:cursor-not-allowed w-full"
              >
                {isLoading ? 'Connecting...' : 'Connect GitHub'}
              </button>
            </div>

            <div className="p-4 bg-github-attention-subtle rounded-github border border-github-border-default">
              <h3 className="text-sm font-semibold text-github-fg-default mb-2">
                What you'll authorize:
              </h3>
              <ul className="text-xs text-github-fg-muted space-y-1">
                <li>✓ Read your notifications</li>
                <li>✓ View your profile information</li>
                <li>✓ Mark notifications as read</li>
              </ul>
            </div>
          </div>
        ) : null}

        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="p-4 bg-github-success-subtle rounded-github border border-github-success-emphasis">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-github-fg-default mb-1">
                    ✓ Connected
                  </h2>
                  <p className="text-sm text-github-fg-muted">
                    You're authenticated with GitHub
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-github-canvas-default border border-github-border-default
                           rounded-github hover:bg-github-canvas-subtle transition-colors
                           font-medium text-sm text-github-fg-default"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="p-4 bg-github-canvas-subtle rounded-github border border-github-border-default">
              <h3 className="text-sm font-semibold text-github-fg-default mb-2">
                Coming Soon:
              </h3>
              <ul className="text-xs text-github-fg-muted space-y-1 list-disc list-inside">
                <li>View your GitHub notifications</li>
                <li>Filter by repository and type</li>
                <li>Mark as read with one click</li>
                <li>Snooze notifications</li>
              </ul>
            </div>
          </div>
        ) : null}

        <footer className="mt-6 pt-4 border-t border-github-border-default">
          <p className="text-xs text-github-fg-subtle text-center">
            Built with React + TypeScript + Tailwind CSS
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App
