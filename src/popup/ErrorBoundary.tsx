import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component to catch and display React errors
 * Prevents the entire extension popup from crashing
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-[400px] h-[600px] bg-github-canvas-default p-6 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-lg font-bold text-github-danger-fg mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-github-fg-muted mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-github-accent-emphasis text-white rounded-github
                       hover:bg-github-accent-fg transition-colors font-medium text-sm"
            >
              Reload Extension
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
