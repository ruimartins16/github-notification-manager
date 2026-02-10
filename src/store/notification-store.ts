import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { GitHubNotification, NotificationReason, SnoozedNotification } from '../types/github'
import { AutoArchiveRule } from '../types/rules'
import { applyRules } from '../utils/rule-matcher'
import { useSettingsStore } from './settings-store'

// Filter types based on notification reasons
export type NotificationFilter = 'all' | 'mentions' | 'reviews' | 'assigned'

// Mapping of reasons to filters
const MENTION_REASONS: NotificationReason[] = ['mention', 'team_mention', 'author']
const REVIEW_REASONS: NotificationReason[] = ['review_requested']
const ASSIGNED_REASONS: NotificationReason[] = ['assign']

// Dismissed notification tracking (for smart dismiss - reappear on new activity)
export interface DismissedNotification {
  id: string
  dismissedAt: number  // Timestamp when user dismissed it
  lastSeenUpdatedAt: string  // GitHub's updated_at value when dismissed
}

// Cleanup old dismissed notifications to prevent unbounded growth
// Keep dismissed entries for 30 days - after that, if notification comes back, treat as new
const DISMISSAL_RETENTION_DAYS = 30
const DISMISSAL_RETENTION_MS = DISMISSAL_RETENTION_DAYS * 24 * 60 * 60 * 1000

function cleanupOldDismissals(dismissedNotifications: DismissedNotification[]): DismissedNotification[] {
  const cutoffTime = Date.now() - DISMISSAL_RETENTION_MS
  const filtered = dismissedNotifications.filter(d => d.dismissedAt > cutoffTime)
  
  if (filtered.length < dismissedNotifications.length) {
    console.log(
      '[Cleanup] Removed',
      dismissedNotifications.length - filtered.length,
      'dismissed entries older than',
      DISMISSAL_RETENTION_DAYS,
      'days'
    )
  }
  
  return filtered
}

interface NotificationState {
  notifications: GitHubNotification[]
  snoozedNotifications: SnoozedNotification[]
  archivedNotifications: GitHubNotification[]
  autoArchiveRules: AutoArchiveRule[]
  isLoading: boolean
  error: string | null
  lastFetched: number | null
  activeFilter: NotificationFilter
  markAllBackup: GitHubNotification[] | null
  selectedNotificationIds: Set<string>
  dismissedNotifications: DismissedNotification[] // Notifications user marked as read (reappear on new activity)
  dismissedNotificationIds?: string[] // DEPRECATED: Legacy format for migration only
  
  // Actions
  setNotifications: (notifications: GitHubNotification[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clearNotifications: () => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => GitHubNotification[]
  undoMarkAllAsRead: () => void
  updateLastFetched: () => void
  setFilter: (filter: NotificationFilter) => void
  
  // Archive actions
  archiveNotification: (notificationId: string) => void
  unarchiveNotification: (notificationId: string) => void
  
  // Auto-archive rule actions
  addRule: (rule: AutoArchiveRule) => void
  updateRule: (ruleId: string, updates: Partial<AutoArchiveRule>) => void
  deleteRule: (ruleId: string) => void
  toggleRule: (ruleId: string) => void
  applyAutoArchiveRules: () => void
  incrementRuleArchivedCount: (ruleId: string, count: number) => void
  
  // Snooze actions
  snoozeNotification: (notificationId: string, wakeTime: number) => void
  unsnoozeNotification: (notificationId: string) => void
  wakeNotification: (notificationId: string) => void
  setSnoozedNotifications: (snoozed: SnoozedNotification[]) => void
  
  // Selection actions
  toggleSelection: (notificationId: string) => void
  selectAll: () => void
  clearSelection: () => void
  bulkMarkAsRead: () => string[]
  bulkArchive: () => GitHubNotification[]
  
  // Selectors
  getFilteredNotifications: () => GitHubNotification[]
  getFilterCounts: () => Record<NotificationFilter, number>
  getSnoozedCount: () => number
  getArchivedCount: () => number
  getSelectedCount: () => number
  getSelectedNotifications: () => GitHubNotification[]
}

// Chrome storage adapter for Zustand persist middleware
const chromeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get(name)
      const value = result[name]
      
      // Validate it's a string (Zustand expects JSON string)
      if (value !== undefined && typeof value !== 'string') {
        console.warn(`Invalid data type in storage for key "${name}", expected string, got:`, typeof value)
        return null
      }
      
      return value ?? null
    } catch (error) {
      console.error('Error reading from chrome.storage:', error)
      return null
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await chrome.storage.local.set({ [name]: value })
    } catch (error) {
      console.error('Error writing to chrome.storage:', error)
      // Re-throw to let Zustand know persistence failed
      throw error
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await chrome.storage.local.remove(name)
    } catch (error) {
      console.error('Error removing from chrome.storage:', error)
      throw error
    }
  },
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      notifications: [],
      snoozedNotifications: [],
      archivedNotifications: [],
      autoArchiveRules: [],
      isLoading: false,
      error: null,
      lastFetched: null,
      activeFilter: useSettingsStore.getState().defaultFilter,
      markAllBackup: null,
      selectedNotificationIds: new Set<string>(),
      dismissedNotifications: [], // Smart dismiss - tracks when and what version was dismissed

      // Actions
      setNotifications: (notifications) => {
        const state = get()
        
        console.log('[NotificationStore] Received', notifications.length, 'notifications to store')
        
        // CLEANUP: Remove old dismissed entries (older than 30 days)
        const cleanedDismissed = cleanupOldDismissals(state.dismissedNotifications)
        
        // SMART DISMISS FILTERING:
        // Filter out notifications that user explicitly dismissed (marked as read)
        // BUT if there's new activity (updated_at changed), show them again!
        // This prevents dismissed notifications from permanently disappearing if someone replies.
        
        // Build lookup maps for efficient filtering
        const dismissedMap = new Map(cleanedDismissed.map(d => [d.id, d]))
        const archivedSet = new Set(state.archivedNotifications.map(n => n.id))
        
        const filteredNotifications = notifications.filter(n => {
          // Always filter out archived notifications (they're in separate tab)
          if (archivedSet.has(n.id)) return false
          
          // Check if notification was dismissed
          const dismissed = dismissedMap.get(n.id)
          if (!dismissed) return true  // Not dismissed, show it
          
          // It was dismissed - check if there's NEW ACTIVITY since dismissal
          const lastSeenUpdate = new Date(dismissed.lastSeenUpdatedAt)
          const currentUpdate = new Date(n.updated_at)
          
          // If GitHub's updated_at is AFTER what we saw when dismissing = new activity!
          if (currentUpdate > lastSeenUpdate) {
            console.log(
              '[NotificationStore] 🔔 Dismissed notification has NEW ACTIVITY, showing again:',
              n.subject.title,
              '| Last seen:', lastSeenUpdate.toISOString(),
              '| Current:', currentUpdate.toISOString()
            )
            return true  // Show it again!
          }
          
          // No new activity since dismissal, keep it hidden
          return false
        })
        
        const dismissedCount = notifications.filter(n => {
          const dismissed = dismissedMap.get(n.id)
          if (!dismissed) return false
          const currentUpdate = new Date(n.updated_at)
          return currentUpdate <= new Date(dismissed.lastSeenUpdatedAt)
        }).length
        
        const archivedCount = notifications.filter(n => archivedSet.has(n.id)).length
        
        if (dismissedCount > 0) {
          console.log('[NotificationStore] Filtered out', dismissedCount, 'dismissed notifications (no new activity)')
        }
        if (archivedCount > 0) {
          console.log('[NotificationStore] Filtered out', archivedCount, 'archived notifications')
        }
        console.log('[NotificationStore] Storing', filteredNotifications.length, 'notifications')
        
        set({ 
          notifications: filteredNotifications,
          dismissedNotifications: cleanedDismissed, // Store cleaned list
          error: null 
        })
      },

      setLoading: (isLoading) =>
        set({ isLoading }),

      setError: (error) =>
        set({ error, isLoading: false }),

      clearNotifications: () =>
        set({ notifications: [], error: null, lastFetched: null }),

      markAsRead: (notificationId) =>
        set((state) => {
          const notification = state.notifications.find(n => n.id === notificationId)
          if (!notification) {
            console.warn('[markAsRead] Notification not found:', notificationId)
            return state
          }
          
          return {
            notifications: state.notifications.filter(n => n.id !== notificationId),
            dismissedNotifications: [
              ...state.dismissedNotifications,
              {
                id: notificationId,
                dismissedAt: Date.now(),
                lastSeenUpdatedAt: notification.updated_at,
              }
            ],
          }
        }),

      markAllAsRead: () => {
        const state = get()
        const filteredNotifications = state.getFilteredNotifications()
        
        // Create backup of all current notifications for undo
        const backup = [...state.notifications]
        
        // Get IDs of filtered notifications to mark as read
        const idsToMarkAsRead = filteredNotifications.map(n => n.id)
        const idsToMarkAsReadSet = new Set(idsToMarkAsRead)
        
        // Create dismissed entries with timestamps for all marked notifications
        const newDismissals: DismissedNotification[] = filteredNotifications.map(n => ({
          id: n.id,
          dismissedAt: Date.now(),
          lastSeenUpdatedAt: n.updated_at,
        }))
        
        // Remove marked notifications from the list (consistent with individual markAsRead)
        const updatedNotifications = state.notifications.filter(n => 
          !idsToMarkAsReadSet.has(n.id)
        )
        
        set({ 
          notifications: updatedNotifications,
          markAllBackup: backup,
          dismissedNotifications: [...state.dismissedNotifications, ...newDismissals],
        })
        
        return filteredNotifications
      },

      undoMarkAllAsRead: () =>
        set((state) => {
          if (!state.markAllBackup) {
            console.warn('No backup available for undo')
            return state
          }
          
          // Remove restored notification IDs from dismissed list
          const restoredIds = new Set(state.markAllBackup.map(n => n.id))
          const updatedDismissed = state.dismissedNotifications.filter(d => !restoredIds.has(d.id))
          
          return {
            notifications: state.markAllBackup,
            markAllBackup: null,
            dismissedNotifications: updatedDismissed,
          }
        }),

      updateLastFetched: () =>
        set({ lastFetched: Date.now() }),

      setFilter: (filter) =>
        set({ activeFilter: filter }),

      // Archive actions
      archiveNotification: (notificationId) =>
        set((state) => {
          const notification = state.notifications.find(n => n.id === notificationId)
          if (!notification) {
            console.warn('Cannot archive: notification not found:', notificationId)
            return state
          }

          console.log('[Archive] Moving notification to archived:', notificationId)

          return {
            notifications: state.notifications.filter(n => n.id !== notificationId),
            archivedNotifications: [...state.archivedNotifications, notification],
          }
        }),

      unarchiveNotification: (notificationId) =>
        set((state) => {
          const archived = state.archivedNotifications.find(n => n.id === notificationId)
          if (!archived) {
            console.warn('Cannot unarchive: archived notification not found:', notificationId)
            return state
          }

          console.log('[Unarchive] Moving notification back to active:', notificationId)

          // Check if notification already exists in active list (defensive)
          const notificationExists = state.notifications.some(n => n.id === notificationId)

          return {
            notifications: notificationExists
              ? state.notifications
              : [...state.notifications, archived],
            archivedNotifications: state.archivedNotifications.filter(
              n => n.id !== notificationId
            ),
          }
        }),

      // Auto-archive rule actions
      addRule: (rule) =>
        set((state) => ({
          autoArchiveRules: [...state.autoArchiveRules, rule],
        })),

      updateRule: (ruleId, updates) =>
        set((state) => ({
          autoArchiveRules: state.autoArchiveRules.map((rule) => {
            if (rule.id !== ruleId) return rule
            
            // Type-safe update: prevent changing rule type which would break discriminated union
            if ('type' in updates && updates.type !== undefined && updates.type !== rule.type) {
              console.error('[Store] Cannot change rule type via update')
              return rule
            }
            
            return { ...rule, ...updates } as AutoArchiveRule
          }),
        })),

      deleteRule: (ruleId) =>
        set((state) => ({
          autoArchiveRules: state.autoArchiveRules.filter((rule) => rule.id !== ruleId),
        })),

      toggleRule: (ruleId) =>
        set((state) => ({
          autoArchiveRules: state.autoArchiveRules.map((rule) =>
            rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
          ),
        })),

      applyAutoArchiveRules: () =>
        set((state) => {
          try {
            if (!state.autoArchiveRules || !Array.isArray(state.autoArchiveRules) || state.autoArchiveRules.length === 0) {
              return state
            }

            const { toArchive, toKeep, ruleMatches } = applyRules(
              state.notifications,
              state.autoArchiveRules
            )

            if (toArchive.length === 0) {
              return state
            }

            console.log('[Auto-Archive] Archiving', toArchive.length, 'notifications')

            // Update rule statistics
            const updatedRules = state.autoArchiveRules.map((rule) => {
              const matches = ruleMatches.get(rule.id) || []
              if (matches.length > 0) {
                return {
                  ...rule,
                  archivedCount: rule.archivedCount + matches.length,
                }
              }
              return rule
            })

            return {
              notifications: toKeep,
              archivedNotifications: [...state.archivedNotifications, ...toArchive],
              autoArchiveRules: updatedRules,
            }
          } catch (error) {
            console.error('[Auto-Archive] Error applying rules:', error)
            return state
          }
        }),

      incrementRuleArchivedCount: (ruleId, count) =>
        set((state) => ({
          autoArchiveRules: state.autoArchiveRules.map((rule) =>
            rule.id === ruleId
              ? { ...rule, archivedCount: rule.archivedCount + count }
              : rule
          ),
        })),

      // Snooze actions
      snoozeNotification: (notificationId, wakeTime) =>
        set((state) => {
          const notification = state.notifications.find(n => n.id === notificationId)
          if (!notification) {
            console.warn('Cannot snooze: notification not found:', notificationId)
            return state
          }

          const alarmName = `snooze-${notificationId}`
          const snoozed: SnoozedNotification = {
            notification,
            snoozedAt: Date.now(),
            wakeTime,
            alarmName,
          }

          // Create chrome alarm with error handling
          if (typeof chrome !== 'undefined' && chrome.alarms) {
            chrome.alarms.create(alarmName, { when: wakeTime }, () => {
              if (chrome.runtime.lastError) {
                console.error('[Snooze] Failed to create alarm:', chrome.runtime.lastError)
              } else {
                console.log('[Snooze] Alarm created:', alarmName)
              }
            })
          }

          return {
            notifications: state.notifications.filter(n => n.id !== notificationId),
            snoozedNotifications: [...state.snoozedNotifications, snoozed],
          }
        }),

      unsnoozeNotification: (notificationId) =>
        set((state) => {
          const snoozed = state.snoozedNotifications.find(s => s.notification.id === notificationId)
          if (!snoozed) {
            console.warn('Cannot unsnooze: snoozed notification not found:', notificationId)
            return state
          }

          // Clear chrome alarm with error handling
          if (typeof chrome !== 'undefined' && chrome.alarms) {
            chrome.alarms.clear(snoozed.alarmName, (wasCleared) => {
              if (chrome.runtime.lastError) {
                console.error('[Unsnooze] Failed to clear alarm:', chrome.runtime.lastError)
              } else if (wasCleared) {
                console.log('[Unsnooze] Alarm cleared:', snoozed.alarmName)
              }
            })
          }

          // Check if notification already exists (defensive)
          const notificationExists = state.notifications.some(n => n.id === notificationId)
          
          return {
            notifications: notificationExists 
              ? state.notifications
              : [...state.notifications, snoozed.notification],
            snoozedNotifications: state.snoozedNotifications.filter(
              s => s.notification.id !== notificationId
            ),
          }
        }),

      wakeNotification: (notificationId) =>
        set((state) => {
          const snoozed = state.snoozedNotifications.find(s => s.notification.id === notificationId)
          if (!snoozed) {
            console.warn('Cannot wake: snoozed notification not found:', notificationId)
            return state
          }

          console.log('[Wake] Moving notification back to active:', notificationId)

          // Check if notification already exists (defensive)
          const notificationExists = state.notifications.some(n => n.id === notificationId)

          return {
            notifications: notificationExists
              ? state.notifications
              : [...state.notifications, snoozed.notification],
            snoozedNotifications: state.snoozedNotifications.filter(
              s => s.notification.id !== notificationId
            ),
          }
        }),

      setSnoozedNotifications: (snoozed) =>
        set({ snoozedNotifications: snoozed }),

      // Selection actions
      toggleSelection: (notificationId) =>
        set((state) => {
          const newSelection = new Set(state.selectedNotificationIds)
          if (newSelection.has(notificationId)) {
            newSelection.delete(notificationId)
          } else {
            newSelection.add(notificationId)
          }
          return { selectedNotificationIds: newSelection }
        }),

      selectAll: () =>
        set((state) => {
          const filteredNotifications = state.getFilteredNotifications()
          const allIds = new Set(filteredNotifications.map(n => n.id))
          return { selectedNotificationIds: allIds }
        }),

      clearSelection: () =>
        set({ selectedNotificationIds: new Set<string>() }),

      bulkMarkAsRead: () => {
        const state = get()
        const selectedIds = Array.from(state.selectedNotificationIds)
        const selectedNotifications = state.notifications.filter(n => selectedIds.includes(n.id))
        
        // Create dismissed entries with timestamps for all selected notifications
        const newDismissals: DismissedNotification[] = selectedNotifications.map(n => ({
          id: n.id,
          dismissedAt: Date.now(),
          lastSeenUpdatedAt: n.updated_at,
        }))
        
        // Remove selected notifications from active list and add to dismissed
        set((state) => ({
          notifications: state.notifications.filter(
            n => !selectedIds.includes(n.id)
          ),
          selectedNotificationIds: new Set<string>(),
          dismissedNotifications: [...state.dismissedNotifications, ...newDismissals],
        }))
        
        // Return selected IDs for API calls
        return selectedIds
      },

      bulkArchive: () => {
        const state = get()
        const selectedIds = Array.from(state.selectedNotificationIds)
        const notificationsToArchive = state.notifications.filter(
          n => selectedIds.includes(n.id)
        )
        
        // Move selected notifications to archive
        set((state) => ({
          notifications: state.notifications.filter(
            n => !selectedIds.includes(n.id)
          ),
          archivedNotifications: [
            ...state.archivedNotifications,
            ...notificationsToArchive,
          ],
          selectedNotificationIds: new Set<string>(),
        }))
        
        // Return archived notifications
        return notificationsToArchive
      },

      // Selectors
      getFilteredNotifications: () => {
        const state = get()
        const { notifications, activeFilter } = state

        switch (activeFilter) {
          case 'mentions':
            return notifications.filter(n => MENTION_REASONS.includes(n.reason))
          case 'reviews':
            return notifications.filter(n => REVIEW_REASONS.includes(n.reason))
          case 'assigned':
            return notifications.filter(n => ASSIGNED_REASONS.includes(n.reason))
          case 'all':
          default:
            return notifications
        }
      },

      getFilterCounts: () => {
        const { notifications } = get()

        return {
          all: notifications.length,
          mentions: notifications.filter(n => MENTION_REASONS.includes(n.reason)).length,
          reviews: notifications.filter(n => REVIEW_REASONS.includes(n.reason)).length,
          assigned: notifications.filter(n => ASSIGNED_REASONS.includes(n.reason)).length,
        }
      },

      getSnoozedCount: () => {
        const { snoozedNotifications } = get()
        return snoozedNotifications.length
      },

      getArchivedCount: () => {
        const { archivedNotifications } = get()
        return archivedNotifications.length
      },

      getSelectedCount: () => {
        const { selectedNotificationIds } = get()
        return selectedNotificationIds.size
      },

      getSelectedNotifications: () => {
        const state = get()
        const { notifications, selectedNotificationIds } = state
        return notifications.filter(n => selectedNotificationIds.has(n.id))
      },
    }),
    {
      name: 'zustand-notifications', // Use different key from NotificationService
      storage: createJSONStorage(() => chromeStorage),
      // Persist notifications, snoozed notifications, archived notifications, rules, selected filter, dismissed notifications
      partialize: (state) => ({
        notifications: state.notifications,
        snoozedNotifications: state.snoozedNotifications,
        archivedNotifications: state.archivedNotifications,
        autoArchiveRules: state.autoArchiveRules,
        lastFetched: state.lastFetched,
        activeFilter: state.activeFilter,
        dismissedNotifications: state.dismissedNotifications,
      }),
      // Migration: Convert old dismissedNotificationIds to new dismissedNotifications format
      onRehydrateStorage: () => (state) => {
        if (!state) return
        
        // Check if we need to migrate from old format
        if (state.dismissedNotificationIds && Array.isArray(state.dismissedNotificationIds) && state.dismissedNotificationIds.length > 0) {
          console.log('[Migration] Converting', state.dismissedNotificationIds.length, 'old dismissedNotificationIds to new format')
          
          // Convert old IDs to new format with dummy timestamps
          // We use 7 days ago as the dismissal time (arbitrary but reasonable)
          const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
          const migratedDismissals: DismissedNotification[] = state.dismissedNotificationIds.map(id => ({
            id,
            dismissedAt: sevenDaysAgo,
            // Use a timestamp from 7 days ago as lastSeenUpdatedAt
            // This means any activity in the last 7 days will cause the notification to reappear
            lastSeenUpdatedAt: new Date(sevenDaysAgo).toISOString(),
          }))
          
          // Merge with existing dismissedNotifications (if any)
          state.dismissedNotifications = [...(state.dismissedNotifications || []), ...migratedDismissals]
          
          // Clean up old field
          delete state.dismissedNotificationIds
          
          console.log('[Migration] Successfully migrated to new format:', state.dismissedNotifications.length, 'dismissed notifications')
        }
      },
    }
  )
)

// Storage key must match the persist config `name` above
const ZUSTAND_STORAGE_KEY = 'zustand-notifications'

// Setup message listeners and storage sync after a short delay to ensure store is ready
if (typeof chrome !== 'undefined' && chrome.runtime) {
  // Use setTimeout to defer listener setup until after module initialization
  setTimeout(() => {
    // Defensive checks INSIDE setTimeout: in test environments, chrome mocks
    // may be cleaned up before this callback fires. Every chrome API access
    // must be re-checked here.
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'SNOOZE_WAKEUP') {
          console.log('[Zustand] Received wake-up message for:', message.notificationId)
          useNotificationStore.getState().wakeNotification(message.notificationId)
          return false
        } else if (message.type === 'APPLY_AUTO_ARCHIVE_RULES') {
          console.log('[Zustand] Received request to apply auto-archive rules')
          useNotificationStore.getState().applyAutoArchiveRules()
          return true // Indicates message was handled successfully
        }
        return false
      })
    }
    
    // Process any pending wake-ups after listener is set up
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get('pending-wakeups').then((result) => {
        const pending: string[] = result['pending-wakeups'] || []
        if (pending.length > 0) {
          console.log('[Zustand] Processing pending wake-ups:', pending.length)
          const store = useNotificationStore.getState()
          pending.forEach((notificationId) => {
            store.wakeNotification(notificationId)
          })
          // Clear pending wake-ups
          chrome.storage.local.set({ 'pending-wakeups': [] })
        }
      })
    }

    // Listen for external storage changes (from background worker)
    // Zustand's persist middleware does NOT detect external writes to chrome.storage.
    // This listener bridges that gap: when the background worker writes fresh
    // notifications to 'zustand-notifications', we sync them into the live store.
    //
    // Infinite loop prevention: We compare the incoming lastFetched timestamp
    // against the store's current lastFetched. We only update if the incoming
    // timestamp is newer, which means it came from the background worker.
    // When the store itself writes (via persist middleware), the timestamps
    // will match, so the listener is a no-op.
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !changes[ZUSTAND_STORAGE_KEY]) {
          return
        }

        const newValue = changes[ZUSTAND_STORAGE_KEY].newValue
        if (!newValue || typeof newValue !== 'string') {
          return
        }

        try {
          const parsed = JSON.parse(newValue)
          const incomingNotifications = parsed.state?.notifications
          const incomingLastFetched = parsed.state?.lastFetched

          // Guard: Only sync if the incoming data has a newer timestamp
          // This prevents infinite loops when persist middleware writes back
          const currentLastFetched = useNotificationStore.getState().lastFetched
          if (!incomingLastFetched || (currentLastFetched && incomingLastFetched <= currentLastFetched)) {
            return
          }

          if (Array.isArray(incomingNotifications)) {
            console.log(
              '[Zustand] External storage update detected (background worker).',
              'Syncing', incomingNotifications.length, 'notifications.',
              'lastFetched:', new Date(incomingLastFetched).toLocaleTimeString()
            )

            // Use setNotifications which applies dismissedNotificationIds filtering
            useNotificationStore.getState().setNotifications(incomingNotifications)
            // Update lastFetched to match background worker's timestamp
            useNotificationStore.setState({ lastFetched: incomingLastFetched })
          }
        } catch (error) {
          console.error('[Zustand] Failed to parse external storage update:', error)
        }
      })
      console.log('[Zustand] Storage sync listener registered for background updates')
    }
  }, 0)
}
