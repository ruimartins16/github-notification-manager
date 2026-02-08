import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { GitHubNotification, NotificationReason, SnoozedNotification } from '../types/github'
import { AutoArchiveRule } from '../types/rules'
import { NOTIFICATIONS_STORAGE_KEY } from '../utils/notification-service'
import { applyRules } from '../utils/rule-matcher'
import { useSettingsStore } from './settings-store'

// Filter types based on notification reasons
export type NotificationFilter = 'all' | 'mentions' | 'reviews' | 'assigned'

// Mapping of reasons to filters
const MENTION_REASONS: NotificationReason[] = ['mention', 'team_mention', 'author']
const REVIEW_REASONS: NotificationReason[] = ['review_requested']
const ASSIGNED_REASONS: NotificationReason[] = ['assign']

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
  dismissedNotificationIds: string[] // IDs user explicitly marked as read (persisted)
  
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
      dismissedNotificationIds: [],

      // Actions
      setNotifications: (notifications) => {
        const state = get()
        
        // Filter out notifications that user explicitly dismissed (marked as read)
        // GitHub's API inconsistently returns marked-as-read notifications with unread:true
        const dismissedSet = new Set(state.dismissedNotificationIds)
        const filteredNotifications = notifications.filter(n => !dismissedSet.has(n.id))
        
        // Cleanup: Remove dismissed IDs that are no longer in the API response
        // This prevents unbounded growth of the dismissed list
        const currentIds = new Set(notifications.map(n => n.id))
        const cleanedDismissedIds = state.dismissedNotificationIds.filter(id => currentIds.has(id))
        
        set({ 
          notifications: filteredNotifications, 
          dismissedNotificationIds: cleanedDismissedIds,
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
        set((state) => ({
          notifications: state.notifications.filter(
            (n) => n.id !== notificationId
          ),
          dismissedNotificationIds: [...state.dismissedNotificationIds, notificationId],
        })),

      markAllAsRead: () => {
        const state = get()
        const filteredNotifications = state.getFilteredNotifications()
        
        // Create backup of all current notifications for undo
        const backup = [...state.notifications]
        
        // Get IDs of filtered notifications to mark as read
        const idsToMarkAsRead = filteredNotifications.map(n => n.id)
        const idsToMarkAsReadSet = new Set(idsToMarkAsRead)
        
        // Remove marked notifications from the list (consistent with individual markAsRead)
        const updatedNotifications = state.notifications.filter(n => 
          !idsToMarkAsReadSet.has(n.id)
        )
        
        set({ 
          notifications: updatedNotifications,
          markAllBackup: backup,
          dismissedNotificationIds: [...state.dismissedNotificationIds, ...idsToMarkAsRead],
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
          const updatedDismissedIds = state.dismissedNotificationIds.filter(id => !restoredIds.has(id))
          
          return {
            notifications: state.markAllBackup,
            markAllBackup: null,
            dismissedNotificationIds: updatedDismissedIds,
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
        
        // Remove selected notifications from active list and add to dismissed
        set((state) => ({
          notifications: state.notifications.filter(
            n => !selectedIds.includes(n.id)
          ),
          selectedNotificationIds: new Set<string>(),
          dismissedNotificationIds: [...state.dismissedNotificationIds, ...selectedIds],
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
      // Persist notifications, snoozed notifications, archived notifications, rules, selected filter, dismissed IDs
      partialize: (state) => ({
        notifications: state.notifications,
        snoozedNotifications: state.snoozedNotifications,
        archivedNotifications: state.archivedNotifications,
        autoArchiveRules: state.autoArchiveRules,
        lastFetched: state.lastFetched,
        activeFilter: state.activeFilter,
        dismissedNotificationIds: state.dismissedNotificationIds,
      }),
    }
  )
)

// Sync with background worker updates
// Listen to the 'notifications' key written by NotificationService
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[NOTIFICATIONS_STORAGE_KEY]) {
      const change = changes[NOTIFICATIONS_STORAGE_KEY]
      
      // Only sync if there's a new value and it's an array
      if (change.newValue && Array.isArray(change.newValue)) {
        console.log('[Zustand] Syncing notifications from background worker:', change.newValue.length)
        
        // Update Zustand store with background worker's data
        // Only touch notifications array, leave snoozedNotifications alone
        useNotificationStore.getState().setNotifications(change.newValue)
        useNotificationStore.getState().updateLastFetched()
      }
    }
  })
}

// Setup message listeners after a short delay to ensure store is ready
if (typeof chrome !== 'undefined' && chrome.runtime) {
  // Use setTimeout to defer listener setup until after module initialization
  setTimeout(() => {
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
    
    // Process any pending wake-ups after listener is set up
    if (chrome.storage) {
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
  }, 0)
}
