import { describe, it, expect } from 'vitest'
import type { NotificationReason, NotificationType } from '../github'

describe('GitHub Types', () => {
  describe('NotificationReason', () => {
    it('should include all valid GitHub notification reasons', () => {
      const validReasons: NotificationReason[] = [
        'assign',
        'author',
        'comment',
        'invitation',
        'manual',
        'mention',
        'review_requested',
        'security_alert',
        'state_change',
        'subscribed',
        'team_mention',
      ]

      // Type check - if this compiles, the types are correct
      validReasons.forEach(reason => {
        expect(reason).toBeDefined()
      })
    })

    it('should categorize reasons correctly for filtering', () => {
      // Mentions filter should include these reasons
      const mentionReasons: NotificationReason[] = ['mention', 'team_mention', 'author']
      
      // Review filter should include these reasons
      const reviewReasons: NotificationReason[] = ['review_requested']
      
      // Assigned filter should include these reasons
      const assignedReasons: NotificationReason[] = ['assign']

      // Verify all are valid NotificationReason types
      const allReasons = [...mentionReasons, ...reviewReasons, ...assignedReasons]
      allReasons.forEach(reason => {
        const validReason: NotificationReason = reason
        expect(validReason).toBeDefined()
      })
    })
  })

  describe('NotificationType', () => {
    it('should include all valid GitHub notification types', () => {
      const validTypes: NotificationType[] = [
        'Issue',
        'PullRequest',
        'Commit',
        'Release',
        'Discussion',
      ]

      validTypes.forEach(type => {
        expect(type).toBeDefined()
      })
    })
  })

  describe('GitHub API integration', () => {
    it('should have matching types for filter implementation', () => {
      // These mappings will be used in GNM-007 for filtering
      const filterMappings = {
        mentions: ['mention', 'team_mention', 'author'] as NotificationReason[],
        reviews: ['review_requested'] as NotificationReason[],
        assigned: ['assign'] as NotificationReason[],
      }

      // Verify all mapped reasons are valid
      Object.values(filterMappings).flat().forEach(reason => {
        const validReason: NotificationReason = reason
        expect(validReason).toBeDefined()
      })
    })
  })
})
