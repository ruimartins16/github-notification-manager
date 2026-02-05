import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('App Component', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<App />)
      expect(screen.getByText(/GitHub Notification Manager/i)).toBeInTheDocument()
    })

    it('should display the correct title', () => {
      render(<App />)
      const title = screen.getByText('GitHub Notification Manager')
      expect(title).toBeInTheDocument()
      expect(title.tagName).toBe('H1')
    })

    it('should display the subtitle', () => {
      render(<App />)
      expect(screen.getByText(/Take control of your GitHub notifications/i)).toBeInTheDocument()
    })

    it('should have correct dimensions (400x600)', () => {
      const { container } = render(<App />)
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass('w-[400px]')
      expect(mainDiv).toHaveClass('h-[600px]')
    })

    it('should apply GitHub theme background color', () => {
      const { container } = render(<App />)
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass('bg-github-canvas-default')
    })
  })

  describe('Foundation Status', () => {
    it('should display foundation setup complete message', () => {
      render(<App />)
      expect(screen.getByText(/Foundation Setup Complete!/i)).toBeInTheDocument()
    })

    it('should show that React, TypeScript, and Tailwind are running', () => {
      render(<App />)
      expect(screen.getByText(/React, TypeScript, and Tailwind CSS/i)).toBeInTheDocument()
    })
  })

  describe('Test Button Interaction', () => {
    it('should render test button with initial count of 0', () => {
      render(<App />)
      const button = screen.getByRole('button', { name: /Test Button/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('clicked 0 times')
    })

    it('should increment counter when test button is clicked', () => {
      render(<App />)
      const button = screen.getByRole('button', { name: /Test Button/i })
      
      // Initial state
      expect(button).toHaveTextContent('clicked 0 times')
      
      // Click once
      fireEvent.click(button)
      expect(button).toHaveTextContent('clicked 1 times')
      
      // Click again
      fireEvent.click(button)
      expect(button).toHaveTextContent('clicked 2 times')
    })

    it('should have correct styling for test button', () => {
      render(<App />)
      const button = screen.getByRole('button', { name: /Test Button/i })
      
      expect(button).toHaveClass('bg-github-accent-emphasis')
      expect(button).toHaveClass('text-white')
      expect(button).toHaveClass('rounded-github')
    })
  })

  describe('Next Steps Section', () => {
    it('should display next steps heading', () => {
      render(<App />)
      expect(screen.getByText('Next Steps:')).toBeInTheDocument()
    })

    it('should list GNM-002 as next task', () => {
      render(<App />)
      expect(screen.getByText(/GNM-002: Implement GitHub OAuth/i)).toBeInTheDocument()
    })

    it('should list GNM-003 as future task', () => {
      render(<App />)
      expect(screen.getByText(/GNM-003: Create notification fetching service/i)).toBeInTheDocument()
    })

    it('should list GNM-004 as future task', () => {
      render(<App />)
      expect(screen.getByText(/GNM-004: Build notification list UI/i)).toBeInTheDocument()
    })
  })

  describe('Footer', () => {
    it('should display tech stack in footer', () => {
      render(<App />)
      expect(screen.getByText(/Built with React \+ TypeScript \+ Tailwind CSS/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<App />)
      
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('GitHub Notification Manager')
      
      const h2 = screen.getByRole('heading', { level: 2 })
      expect(h2).toHaveTextContent(/Foundation Setup Complete/i)
    })

    it('should have interactive button accessible', () => {
      render(<App />)
      const button = screen.getByRole('button')
      expect(button).toBeEnabled()
    })
  })

  describe('Layout Structure', () => {
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

    it('should use proper spacing classes', () => {
      const { container } = render(<App />)
      
      // Check for padding
      const paddingDiv = container.querySelector('.p-6')
      expect(paddingDiv).toBeInTheDocument()
      
      // Check for spacing
      const spacingDiv = container.querySelector('.space-y-4')
      expect(spacingDiv).toBeInTheDocument()
    })
  })
})
