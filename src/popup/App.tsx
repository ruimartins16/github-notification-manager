import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

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

        <div className="space-y-4">
          <div className="p-4 bg-github-canvas-subtle rounded-github border border-github-border-default">
            <h2 className="text-lg font-semibold text-github-fg-default mb-2">
              Foundation Setup Complete! ✅
            </h2>
            <p className="text-sm text-github-fg-muted mb-4">
              The Chrome extension is running with React, TypeScript, and Tailwind CSS.
            </p>
            
            <button
              onClick={() => setCount((count) => count + 1)}
              className="px-4 py-2 bg-github-accent-emphasis text-white rounded-github 
                       hover:bg-github-accent-fg transition-colors font-medium text-sm"
            >
              Test Button (clicked {count} times)
            </button>
          </div>

          <div className="p-4 bg-github-attention-subtle rounded-github border border-github-border-default">
            <h3 className="text-sm font-semibold text-github-fg-default mb-2">
              Next Steps:
            </h3>
            <ul className="text-xs text-github-fg-muted space-y-1 list-disc list-inside">
              <li>GNM-002: Implement GitHub OAuth</li>
              <li>GNM-003: Create notification fetching service</li>
              <li>GNM-004: Build notification list UI</li>
            </ul>
          </div>
        </div>

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
