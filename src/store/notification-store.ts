import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { GitHubNotification, NotificationReason, SnoozedNotification } from '../types/github'
import { AutoArchiveRule } from '../types/rules'
import { applyRules } from '../utils/rule-matcher'
import { getActiveNotifications } from '../utils/notification-filter'
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
  getActiveNotifications: () => GitHubNotification[]
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

        console.log('[NotificationStore] Storing', notifications.length, 'raw notifications from GitHub')

        // CLEANUP: Remove old dismissed entries (older than 30 days)
        const cleanedDismissed = cleanupOldDismissals(state.dismissedNotifications)

        // Store the RAW list exactly as GitHub returned it.
        // Local state (dismissed, archived, snoozed) is applied at READ time by
        // getActiveNotifications/getFilteredNotifications, never destructively here.
        // This keeps the store idempotent: setNotifications can run any number of
        // times (popup open, background sync, manual refresh) without data loss.
        set({
          notifications,
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

      // Marking as read only records a smart-dismiss entry. The raw list is
      // left untouched; read-time filtering hides the item immediately and the
      // next GitHub fetch reconciles for real.
      markAsRead: (notificationId) =>
        set((state) => {
          const notification = state.notifications.find(n => n.id === notificationId)
          if (!notification) {
            console.warn('[markAsRead] Notification not found:', notificationId)
            return state
          }

          return {
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

        // Backup the marked notifications for undo (undo removes their dismiss entries)
        const backup = [...filteredNotifications]

        // Create dismissed entries with timestamps for all marked notifications
        const newDismissals: DismissedNotification[] = filteredNotifications.map(n => ({
          id: n.id,
          dismissedAt: Date.now(),
          lastSeenUpdatedAt: n.updated_at,
        }))

        set({
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

          // Remove restored notification IDs from dismissed list; they become
          // visible again because the raw list still contains them.
          const restoredIds = new Set(state.markAllBackup.map(n => n.id))
          const updatedDismissed = state.dismissedNotifications.filter(d => !restoredIds.has(d.id))

          return {
            markAllBackup: null,
            dismissedNotifications: updatedDismissed,
          }
        }),

      updateLastFetched: () =>
        set({ lastFetched: Date.now() }),

      setFilter: (filter) =>
        set({ activeFilter: filter }),

      // Archive actions
      // Archiving copies the notification into archivedNotifications (for the
      // Archived tab) and leaves the raw list untouched; read-time filtering
      // hides archived IDs from the Active view.
      archiveNotification: (notificationId) =>
        set((state) => {
          const notification = state.notifications.find(n => n.id === notificationId)
          if (!notification) {
            console.warn('Cannot archive: notification not found:', notificationId)
            return state
          }

          if (state.archivedNotifications.some(n => n.id === notificationId)) {
            return state
          }

          console.log('[Archive] Moving notification to archived:', notificationId)

          return {
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

          // Removing it from archivedNotifications is enough: if GitHub still
          // reports it unread it's in the raw list and reappears in Active.
          // Re-add defensively in case it dropped off the raw list meanwhile.
          const inRawList = state.notifications.some(n => n.id === notificationId)

          return {
            notifications: inRawList
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

            // Apply rules to the ACTIVE list only, so already-archived,
            // dismissed, or snoozed notifications are never re-archived.
            const { toArchive, ruleMatches } = applyRules(
              state.getActiveNotifications(),
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

            // Raw list untouched — archived IDs are hidden at read time
            return {
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

          // Raw list untouched — read-time filtering hides snoozed IDs.
          // Re-snoozing replaces the existing entry (updates the wake time),
          // mirroring chrome.alarms.create replacing the same-named alarm.
          return {
            snoozedNotifications: [
              ...state.snoozedNotifications.filter(s => s.notification.id !== notificationId),
              snoozed,
            ],
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

          // Removing the snooze entry is enough if GitHub still reports the
          // notification unread (it's in the raw list). Re-add the snapshot
          // defensively if it dropped off the raw list meanwhile.
          const inRawList = state.notifications.some(n => n.id === notificationId)

          return {
            notifications: inRawList
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

          const inRawList = state.notifications.some(n => n.id === notificationId)

          return {
            notifications: inRawList
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

        // Create dismissed entries with timestamps for all selected notifications.
        // Raw list untouched — read-time filtering hides them immediately.
        const newDismissals: DismissedNotification[] = selectedNotifications.map(n => ({
          id: n.id,
          dismissedAt: Date.now(),
          lastSeenUpdatedAt: n.updated_at,
        }))

        set((state) => ({
          selectedNotificationIds: new Set<string>(),
          dismissedNotifications: [...state.dismissedNotifications, ...newDismissals],
        }))

        // Return selected IDs for API calls
        return selectedIds
      },

      bulkArchive: () => {
        const state = get()
        const selectedIds = Array.from(state.selectedNotificationIds)
        const alreadyArchived = new Set(state.archivedNotifications.map(n => n.id))
        const notificationsToArchive = state.notifications.filter(
          n => selectedIds.includes(n.id) && !alreadyArchived.has(n.id)
        )

        // Copy selected notifications into the archive; raw list untouched
        set((state) => ({
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
      // The raw GitHub list minus archived, snoozed, and smart-dismissed items.
      // This is what the Active tab and the badge are based on.
      getActiveNotifications: () => {
        const state = get()
        return getActiveNotifications(state.notifications, {
          dismissedNotifications: state.dismissedNotifications,
          archivedNotifications: state.archivedNotifications,
          snoozedNotifications: state.snoozedNotifications,
        })
      },

      getFilteredNotifications: () => {
        const state = get()
        const active = state.getActiveNotifications()

        switch (state.activeFilter) {
          case 'mentions':
            return active.filter(n => MENTION_REASONS.includes(n.reason))
          case 'reviews':
            return active.filter(n => REVIEW_REASONS.includes(n.reason))
          case 'assigned':
            return active.filter(n => ASSIGNED_REASONS.includes(n.reason))
          case 'all':
          default:
            return active
        }
      },

      getFilterCounts: () => {
        const active = get().getActiveNotifications()

        return {
          all: active.length,
          mentions: active.filter(n => MENTION_REASONS.includes(n.reason)).length,
          reviews: active.filter(n => REVIEW_REASONS.includes(n.reason)).length,
          assigned: active.filter(n => ASSIGNED_REASONS.includes(n.reason)).length,
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
        return state.getActiveNotifications().filter(n => state.selectedNotificationIds.has(n.id))
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
        _dismissDataVersion: (state as any)._dismissDataVersion,
      }),
      // Migration and cleanup on rehydrate
      onRehydrateStorage: () => (state) => {
        if (!state) return
        
        // ONE-TIME RESET (v2): Clear dismissedNotifications that were corrupted by the
        // double-filtering bug where both background worker and store applied smart dismiss,
        // causing all notifications to be filtered out. We use a version flag to only run once.
        const DISMISS_DATA_VERSION = 2
        const currentVersion = (state as any)._dismissDataVersion || 0
        
        if (currentVersion < DISMISS_DATA_VERSION) {
          console.log('[Migration v2] Clearing corrupted dismissedNotifications data (had', 
            state.dismissedNotifications?.length || 0, 'entries)')
          state.dismissedNotifications = []
          // Also clean up legacy field if present
          delete state.dismissedNotificationIds
          ;(state as any)._dismissDataVersion = DISMISS_DATA_VERSION
          console.log('[Migration v2] Reset complete. Smart dismiss starts fresh.')
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
