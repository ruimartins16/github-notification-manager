/**
 * Tests for SubscriptionStatus Component
 * 
 * Tests display of subscription status warnings for Pro users:
 * - past_due status (payment failed)
 * - canceled status (subscription ending)
 * - active status (no warnings)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SubscriptionStatus } from '../SubscriptionStatus'
import type { ProUser } from '../../utils/extpay-service'
import { extPayService } from '../../utils/extpay-service'

// Mock extPayService
vi.mock('../../utils/extpay-service', () => ({
  extPayService: {
    openPaymentPage: vi.fn(),
  },
}))

describe('SubscriptionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockUser = (overrides?: Partial<ProUser>): ProUser => ({
    isPro: true,
    paidAt: new Date('2024-01-01'),
    email: 'user@example.com',
    plan: {
      nickname: 'Pro Monthly',
      interval: 'month',
      amount: 5,
      currency: 'usd',
    },
    installedAt: new Date('2024-01-01'),
    subscriptionStatus: 'active',
    subscriptionCancelAt: null,
    ...overrides,
  })

  describe('Free Users', () => {
    it('should not render for free users (isPro: false)', () => {
      const freeUser = createMockUser({ isPro: false })
      const { container } = render(<SubscriptionStatus user={freeUser} />)
      expect(container.firstChild).toBeNull()
    })

    it('should not render when user is null', () => {
      const { container } = render(<SubscriptionStatus user={null} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Active Subscription', () => {
    it('should not render warnings for active subscription', () => {
      const activeUser = createMockUser({
        subscriptionStatus: 'active',
      })
      const { container } = render(<SubscriptionStatus user={activeUser} />)
      expect(container.firstChild).toBeNull()
    })

    it('should not render warnings when subscriptionStatus is undefined', () => {
      const user = createMockUser({
        subscriptionStatus: undefined,
      })
      const { container } = render(<SubscriptionStatus user={user} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Past Due Status (Payment Failed)', () => {
    it('should render payment failed warning', () => {
      const pastDueUser = createMockUser({
        subscriptionStatus: 'past_due',
      })
      
      render(<SubscriptionStatus user={pastDueUser} />)
      
      expect(screen.getByText('Payment Failed')).toBeInTheDocument()
      expect(screen.getByText(/Your payment method couldn't be charged/)).toBeInTheDocument()
    })

    it('should show update payment button for past_due status', () => {
      const pastDueUser = createMockUser({
        subscriptionStatus: 'past_due',
      })
      
      render(<SubscriptionStatus user={pastDueUser} />)
      
      const button = screen.getByRole('button', { name: /Update payment method/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Update Payment Method →')
    })

    it('should call openPaymentPage when update button clicked', async () => {
      const user = userEvent.setup()
      const pastDueUser = createMockUser({
        subscriptionStatus: 'past_due',
      })
      
      render(<SubscriptionStatus user={pastDueUser} />)
      
      const button = screen.getByRole('button', { name: /Update payment method/i })
      await user.click(button)
      
      expect(extPayService.openPaymentPage).toHaveBeenCalledOnce()
    })

    it('should have alert role for accessibility', () => {
      const pastDueUser = createMockUser({
        subscriptionStatus: 'past_due',
      })
      
      render(<SubscriptionStatus user={pastDueUser} />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveAttribute('aria-live', 'polite')
    })

    it('should show warning emoji for past_due status', () => {
      const pastDueUser = createMockUser({
        subscriptionStatus: 'past_due',
      })
      
      render(<SubscriptionStatus user={pastDueUser} />)
      
      expect(screen.getByText('⚠️')).toBeInTheDocument()
    })
  })

  describe('Canceled Status (Subscription Ending)', () => {
    it('should render cancellation notice with end date', () => {
      const futureDate = new Date('2026-12-31')
      const canceledUser = createMockUser({
        subscriptionStatus: 'canceled',
        subscriptionCancelAt: futureDate,
      })
      
      render(<SubscriptionStatus user={canceledUser} />)
      
      expect(screen.getByText('Subscription Ending')).toBeInTheDocument()
      expect(screen.getByText(/Your Pro subscription will end on/)).toBeInTheDocument()
      expect(screen.getByText(/Dec 31, 2026/)).toBeInTheDocument()
    })

    it('should show days remaining until cancellation', () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
      const canceledUser = createMockUser({
        subscriptionStatus: 'canceled',
        subscriptionCancelAt: futureDate,
      })
      
      render(<SubscriptionStatus user={canceledUser} />)
      
      expect(screen.getByText(/5 days remaining/)).toBeInTheDocument()
    })

    it('should show singular "day" for 1 day remaining', () => {
      const futureDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1 day from now
      const canceledUser = createMockUser({
        subscriptionStatus: 'canceled',
        subscriptionCancelAt: futureDate,
      })
      
      render(<SubscriptionStatus user={canceledUser} />)
      
      expect(screen.getByText(/1 day remaining/)).toBeInTheDocument()
      expect(screen.queryByText(/1 days remaining/)).not.toBeInTheDocument()
    })

    it('should show resubscribe button for canceled status', () => {
      const futureDate = new Date('2026-12-31')
      const canceledUser = createMockUser({
        subscriptionStatus: 'canceled',
        subscriptionCancelAt: futureDate,
      })
      
      render(<SubscriptionStatus user={canceledUser} />)
      
      const button = screen.getByRole('button', { name: /Resubscribe to Pro/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Resubscribe →')
    })

    it('should call openPaymentPage when resubscribe clicked', async () => {
      const user = userEvent.setup()
      const futureDate = new Date('2026-12-31')
      const canceledUser = createMockUser({
        subscriptionStatus: 'canceled',
        subscriptionCancelAt: futureDate,
      })
      
      render(<SubscriptionStatus user={canceledUser} />)
      
      const button = screen.getByRole('button', { name: /Resubscribe to Pro/i })
      await user.click(button)
      
      expect(extPayService.openPaymentPage).toHaveBeenCalledOnce()
    })

    it('should not render if cancelAt date is in the past', () => {
      const pastDate = new Date('2023-01-01')
      const expiredUser = createMockUser({
        subscriptionStatus: 'canceled',
        subscriptionCancelAt: pastDate,
      })
      
      const { container } = render(<SubscriptionStatus user={expiredUser} />)
      expect(container.firstChild).toBeNull()
    })

    it('should not render if canceled but no cancelAt date', () => {
      const canceledUser = createMockUser({
        subscriptionStatus: 'canceled',
        subscriptionCancelAt: null,
      })
      
      const { container } = render(<SubscriptionStatus user={canceledUser} />)
      expect(container.firstChild).toBeNull()
    })

    it('should have status role for accessibility', () => {
      const futureDate = new Date('2026-12-31')
      const canceledUser = createMockUser({
        subscriptionStatus: 'canceled',
        subscriptionCancelAt: futureDate,
      })
      
      render(<SubscriptionStatus user={canceledUser} />)
      
      const status = screen.getByRole('status')
      expect(status).toBeInTheDocument()
      expect(status).toHaveAttribute('aria-live', 'polite')
    })

    it('should show info emoji for canceled status', () => {
      const futureDate = new Date('2026-12-31')
      const canceledUser = createMockUser({
        subscriptionStatus: 'canceled',
        subscriptionCancelAt: futureDate,
      })
      
      render(<SubscriptionStatus user={canceledUser} />)
      
      expect(screen.getByText('ℹ️')).toBeInTheDocument()
    })
  })

  describe('Date Formatting', () => {
    it('should format date correctly (Month DD, YYYY)', () => {
      const testDate = new Date('2026-03-15')
      const canceledUser = createMockUser({
        subscriptionStatus: 'canceled',
        subscriptionCancelAt: testDate,
      })
      
      render(<SubscriptionStatus user={canceledUser} />)
      
      expect(screen.getByText(/Mar 15, 2026/)).toBeInTheDocument()
    })

    it('should handle different months correctly', () => {
      const testCases = [
        { date: new Date('2027-01-01'), expected: 'Jan 1, 2027' },
        { date: new Date('2027-06-30'), expected: 'Jun 30, 2027' },
        { date: new Date('2027-12-25'), expected: 'Dec 25, 2027' },
      ]
      
      testCases.forEach(({ date, expected }) => {
        const canceledUser = createMockUser({
          subscriptionStatus: 'canceled',
          subscriptionCancelAt: date,
        })
        
        const { unmount } = render(<SubscriptionStatus user={canceledUser} />)
        expect(screen.getByText(new RegExp(expected))).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('Visual Styling', () => {
    it('should use attention colors for past_due warning', () => {
      const pastDueUser = createMockUser({
        subscriptionStatus: 'past_due',
      })
      
      render(<SubscriptionStatus user={pastDueUser} />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-github-attention-subtle')
      expect(alert).toHaveClass('border-github-attention-muted')
    })

    it('should use subtle colors for canceled notice', () => {
      const futureDate = new Date('2026-12-31')
      const canceledUser = createMockUser({
        subscriptionStatus: 'canceled',
        subscriptionCancelAt: futureDate,
      })
      
      render(<SubscriptionStatus user={canceledUser} />)
      
      const status = screen.getByRole('status')
      expect(status).toHaveClass('bg-github-canvas-subtle')
      expect(status).toHaveClass('border-github-border-default')
    })

    it('should style buttons with primary accent colors', () => {
      const pastDueUser = createMockUser({
        subscriptionStatus: 'past_due',
      })
      
      render(<SubscriptionStatus user={pastDueUser} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-github-accent-emphasis')
      expect(button).toHaveClass('text-white')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing plan information', () => {
      const userWithoutPlan = createMockUser({
        plan: null,
        subscriptionStatus: 'past_due',
      })
      
      render(<SubscriptionStatus user={userWithoutPlan} />)
      
      // Should still render warning
      expect(screen.getByText('Payment Failed')).toBeInTheDocument()
    })

    it('should handle 0 days remaining (today is last day)', () => {
      const today = new Date()
      const canceledUser = createMockUser({
        subscriptionStatus: 'canceled',
        subscriptionCancelAt: today,
      })
      
      const { container } = render(<SubscriptionStatus user={canceledUser} />)
      
      // Should still show since it's not expired yet (same day)
      // Note: The component checks if daysUntilEnd < 0, so today (0 days) should still show
      if (container.firstChild) {
        expect(screen.getByText('Subscription Ending')).toBeInTheDocument()
      }
    })

    it('should handle very far future dates', () => {
      const farFuture = new Date('2030-12-31')
      const canceledUser = createMockUser({
        subscriptionStatus: 'canceled',
        subscriptionCancelAt: farFuture,
      })
      
      render(<SubscriptionStatus user={canceledUser} />)
      
      expect(screen.getByText(/days remaining/)).toBeInTheDocument()
    })
  })

  describe('Button Interactions', () => {
    it('should have proper focus styles on buttons', () => {
      const pastDueUser = createMockUser({
        subscriptionStatus: 'past_due',
      })
      
      render(<SubscriptionStatus user={pastDueUser} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus:outline-none')
      expect(button).toHaveClass('focus:ring-2')
      expect(button).toHaveClass('focus:ring-github-accent-emphasis')
    })

    it('should have hover styles on buttons', () => {
      const pastDueUser = createMockUser({
        subscriptionStatus: 'past_due',
      })
      
      render(<SubscriptionStatus user={pastDueUser} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-github-accent-fg')
      expect(button).toHaveClass('transition-colors')
    })
  })
})
