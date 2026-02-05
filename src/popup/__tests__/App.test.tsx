import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useAuth } from '../../hooks/useAuth'

// Mock the useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = useAuth as any

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading spinner when authentication is being checked', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      })

      render(<App />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should have correct dimensions during loading', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      })

      const { container } = render(<App />)
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass('w-[400px]')
      expect(mainDiv).toHaveClass('h-[600px]')
    })
  })

  describe('Not Authenticated State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      })
    })

    it('should render the app title and subtitle', () => {
      render(<App />)
      
      expect(screen.getByText('GitHub Notification Manager')).toBeInTheDocument()
      expect(screen.getByText('Take control of your GitHub notifications')).toBeInTheDocument()
    })

    it('should display GitHub icon', () => {
      const { container } = render(<App />)
      
      const svgElement = container.querySelector('svg')
      expect(svgElement).toBeInTheDocument()
      expect(svgElement).toHaveClass('mx-auto')
    })

    it('should show "Connect to GitHub" heading', () => {
      render(<App />)
      
      expect(screen.getByText('Connect to GitHub')).toBeInTheDocument()
    })

    it('should display authorization information', () => {
      render(<App />)
      
      expect(screen.getByText("What you'll authorize:")).toBeInTheDocument()
      expect(screen.getByText('✓ Read your notifications')).toBeInTheDocument()
      expect(screen.getByText('✓ View your profile information')).toBeInTheDocument()
      expect(screen.getByText('✓ Mark notifications as read')).toBeInTheDocument()
    })

    it('should render "Connect GitHub" button', () => {
      render(<App />)
      
      const button = screen.getByRole('button', { name: /Connect GitHub/i })
      expect(button).toBeInTheDocument()
      expect(button).toBeEnabled()
    })

    it('should call login when Connect GitHub button is clicked', async () => {
      const loginMock = vi.fn()
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: loginMock,
        logout: vi.fn(),
        checkAuth: vi.fn(),
      })

      const user = userEvent.setup()
      render(<App />)
      
      const button = screen.getByRole('button', { name: /Connect GitHub/i })
      await user.click(button)
      
      expect(loginMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      })
    })

    it('should display connected status', () => {
      render(<App />)
      
      expect(screen.getByText('✓ Connected')).toBeInTheDocument()
      expect(screen.getByText("You're authenticated with GitHub")).toBeInTheDocument()
    })

    it('should render logout button', () => {
      render(<App />)
      
      const button = screen.getByRole('button', { name: /Logout/i })
      expect(button).toBeInTheDocument()
      expect(button).toBeEnabled()
    })

    it('should call logout when Logout button is clicked', async () => {
      const logoutMock = vi.fn()
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: logoutMock,
        checkAuth: vi.fn(),
      })

      const user = userEvent.setup()
      render(<App />)
      
      const button = screen.getByRole('button', { name: /Logout/i })
      await user.click(button)
      
      expect(logoutMock).toHaveBeenCalledTimes(1)
    })

    it('should display coming soon features', () => {
      render(<App />)
      
      expect(screen.getByText('Coming Soon:')).toBeInTheDocument()
      expect(screen.getByText(/View your GitHub notifications/i)).toBeInTheDocument()
      expect(screen.getByText(/Filter by repository and type/i)).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should display error message when error occurs', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: 'Authentication failed',
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      })

      render(<App />)
      
      expect(screen.getByText('Authentication failed')).toBeInTheDocument()
    })

    it('should have error styling for error messages', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: 'Test error',
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      })

      const { container } = render(<App />)
      const errorDiv = container.querySelector('.bg-github-danger-subtle')
      expect(errorDiv).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      })
    })

    it('should have correct dimensions', () => {
      const { container } = render(<App />)
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass('w-[400px]')
      expect(mainDiv).toHaveClass('h-[600px]')
      expect(mainDiv).toHaveClass('bg-github-canvas-default')
    })

    it('should have header section', () => {
      const { container } = render(<App />)
      const header = container.querySelector('header')
      expect(header).toBeInTheDocument()
    })

    it('should have footer section', () => {
      const { container } = render(<App />)
      const footer = container.querySelector('footer')
      expect(footer).toBeInTheDocument()
    })

    it('should display tech stack in footer', () => {
      render(<App />)
      expect(screen.getByText(/Built with React \+ TypeScript \+ Tailwind CSS/i)).toBeInTheDocument()
    })
  })
})
