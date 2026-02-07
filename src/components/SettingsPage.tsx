import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSettingsStore } from '../store/settings-store'
import { useNotificationStore } from '../store/notification-store'
import { AutoArchiveRules } from '../components/AutoArchiveRules'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SubscriptionStatus } from '../components/SubscriptionStatus'
import { FilterType } from '../types/storage'
import { useProStatus } from '../hooks/useProStatus'
import { extPayService } from '../utils/extpay-service'
import { trackEvent, ANALYTICS_EVENTS } from '../utils/analytics'

type SettingsSection = 'account' | 'notifications' | 'behavior' | 'advanced' | 'rules'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

export function SettingsPage() {
  const { logout } = useAuth()
  const [activeSection, setActiveSection] = useState<SettingsSection>('account')
  const [userInfo, setUserInfo] = useState<{ login: string; avatar_url: string } | null>(null)
  const [rateLimit, setRateLimit] = useState<{ limit: number; remaining: number; reset: number } | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant: 'danger' | 'warning' | 'default'
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'default',
    onConfirm: () => {},
  })
  
  // Pro status
  const { isPro, user: proUser, isLoading: isLoadingPro } = useProStatus()
  
  // Settings store
  const refreshInterval = useSettingsStore(state => state.refreshInterval)
  const badgeEnabled = useSettingsStore(state => state.badgeEnabled)
  const soundEnabled = useSettingsStore(state => state.soundEnabled)
  const defaultFilter = useSettingsStore(state => state.defaultFilter)
  const openLinksInNewTab = useSettingsStore(state => state.openLinksInNewTab)
  const setRefreshInterval = useSettingsStore(state => state.setRefreshInterval)
  const setBadgeEnabled = useSettingsStore(state => state.setBadgeEnabled)
  const setSoundEnabled = useSettingsStore(state => state.setSoundEnabled)
  const setDefaultFilter = useSettingsStore(state => state.setDefaultFilter)
  const setOpenLinksInNewTab = useSettingsStore(state => state.setOpenLinksInNewTab)
  const resetSettings = useSettingsStore(state => state.resetSettings)
  const isDefaultSettings = useSettingsStore(state => state.isDefaultSettings())
  
  // Notification store actions
  const clearNotifications = useNotificationStore(state => state.clearNotifications)

  // Toast helper
  const addToast = (message: string, variant: ToastVariant = 'success') => {
    const id = `toast-${Date.now()}`
    setToasts(prev => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  // Load user info
  useEffect(() => {
    chrome.storage.local.get(['github_user']).then((result) => {
      if (result.github_user) {
        setUserInfo(result.github_user)
      }
    })
  }, [])

  // Load rate limit info
  useEffect(() => {
    chrome.storage.local.get(['rate_limit']).then((result) => {
      if (result.rate_limit) {
        setRateLimit(result.rate_limit)
      }
    })
  }, [])

  const handleClearCache = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Cache',
      message: 'Are you sure you want to clear all cached notifications? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        clearNotifications()
        await chrome.storage.local.remove(['notifications', 'lastFetch'])
        addToast('Cache cleared successfully!', 'success')
      },
    })
  }

  const handleExportSettings = () => {
    const settings = {
      refreshInterval,
      badgeEnabled,
      soundEnabled,
      defaultFilter,
      openLinksInNewTab,
    }
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = `gnm-settings-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      addToast('Settings exported successfully!', 'success')
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const handleImportSettings = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return
      
      // Clear input so same file can be re-imported
      target.value = ''
      
      // Validate file size (max 100KB)
      if (file.size > 100 * 1024) {
        addToast('File too large. Maximum 100KB allowed.', 'error')
        return
      }
      
      try {
        const text = await file.text()
        const settings = JSON.parse(text)
        
        // Validate structure
        if (!settings || typeof settings !== 'object') {
          throw new Error('Invalid settings format')
        }
        
        // Validate and apply each setting with allowed values
        let appliedCount = 0
        
        if (typeof settings.refreshInterval === 'number' && settings.refreshInterval >= 10 && settings.refreshInterval <= 600) {
          setRefreshInterval(settings.refreshInterval)
          appliedCount++
        }
        if (typeof settings.badgeEnabled === 'boolean') {
          setBadgeEnabled(settings.badgeEnabled)
          appliedCount++
        }
        if (typeof settings.soundEnabled === 'boolean') {
          setSoundEnabled(settings.soundEnabled)
          appliedCount++
        }
        if (typeof settings.defaultFilter === 'string' && 
            ['all', 'mentions', 'reviews', 'assigned'].includes(settings.defaultFilter)) {
          setDefaultFilter(settings.defaultFilter as FilterType)
          appliedCount++
        }
        if (typeof settings.openLinksInNewTab === 'boolean') {
          setOpenLinksInNewTab(settings.openLinksInNewTab)
          appliedCount++
        }
        
        if (appliedCount > 0) {
          addToast(`Settings imported successfully! (${appliedCount} settings applied)`, 'success')
        } else {
          addToast('No valid settings found in file.', 'warning')
        }
      } catch (error) {
        console.error('Import error:', error)
        addToast('Failed to import settings. Please check the file format.', 'error')
      }
    }
    input.click()
  }

  const formatResetTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? '' : 's'}`
    }
    return date.toLocaleTimeString()
  }

  return (
    <div className="flex flex-col h-full bg-github-canvas-default">
      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto py-4 px-4">
          {/* Section Tabs */}
          <div className="flex gap-1 mb-4 border-b border-github-border-default overflow-x-auto">
            {[
              { id: 'account' as const, label: 'Account' },
              { id: 'notifications' as const, label: 'Notifications' },
              { id: 'behavior' as const, label: 'Behavior' },
              { id: 'rules' as const, label: 'Auto-Archive' },
              { id: 'advanced' as const, label: 'Advanced' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === tab.id
                    ? 'border-github-accent-emphasis text-github-accent-fg'
                    : 'border-transparent text-github-fg-muted hover:text-github-fg-default'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Account Section */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              {/* GitHub Account */}
              <div className="bg-github-canvas-subtle rounded-github border border-github-border-default p-6 space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-github-fg-default mb-4">
                    GitHub Account
                  </h2>

                  {userInfo ? (
                    <div className="flex items-center gap-4 p-4 bg-github-canvas-default rounded-github border border-github-border-default">
                      <img 
                        src={userInfo.avatar_url} 
                        alt={`${userInfo.login}'s avatar`}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-semibold text-github-fg-default">
                          @{userInfo.login}
                        </p>
                        <p className="text-xs text-github-fg-muted">
                          Connected to GitHub
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-github-canvas-default rounded-github border border-github-border-default">
                      <p className="text-sm text-github-fg-muted">
                        Logged in to GitHub
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-github-fg-default mb-2">
                    Actions
                  </h3>
                  <button
                    onClick={logout}
                    className="px-4 py-2 text-sm font-medium text-white bg-github-danger-emphasis rounded-github 
                             hover:bg-github-danger-fg transition-colors focus:outline-none focus:ring-2 
                             focus:ring-github-danger-emphasis"
                  >
                    Logout
                  </button>
                </div>
              </div>

              {/* Subscription Status */}
              <div className="bg-github-canvas-subtle rounded-github border border-github-border-default p-6 space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-github-fg-default mb-4">
                    Subscription
                  </h2>

                  {isLoadingPro ? (
                    <div className="animate-pulse">
                      <div className="h-20 bg-github-canvas-default rounded-github"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Subscription Status Warnings */}
                      <SubscriptionStatus user={proUser} />
                      
                      {/* Status Badge */}
                      <div className="flex items-center justify-between p-4 bg-github-canvas-default rounded-github border border-github-border-default">
                        <div>
                          <p className="text-sm font-medium text-github-fg-default mb-1">
                            Plan Status
                          </p>
                          <p className="text-xs text-github-fg-muted">
                            {isPro ? 'All Pro features unlocked' : 'Upgrade to unlock Pro features'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPro ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-yellow-950 rounded-full">
                              <span className="text-base">⭐</span>
                              <span className="text-sm font-semibold">Pro</span>
                            </div>
                          ) : (
                            <span className="px-3 py-1.5 bg-github-canvas-subtle border border-github-border-default text-github-fg-muted text-sm font-medium rounded-full">
                              Free
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pro User Details */}
                      {isPro && proUser && (
                        <div className="p-4 bg-github-canvas-default rounded-github border border-github-border-default space-y-3">
                          {proUser.email && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-github-fg-muted">Email</span>
                              <span className="text-github-fg-default font-mono">{proUser.email}</span>
                            </div>
                          )}
                          
                          {proUser.paidAt && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-github-fg-muted">Member since</span>
                              <span className="text-github-fg-default">
                                {new Date(proUser.paidAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      <button
                        onClick={() => {
                          trackEvent(
                            isPro ? ANALYTICS_EVENTS.PAYMENT_PAGE_OPENED : ANALYTICS_EVENTS.UPGRADE_BUTTON_CLICKED,
                            { location: 'settings', isPro }
                          )
                          extPayService.openPaymentPage()
                        }}
                        className={`w-full px-4 py-2.5 text-sm font-medium rounded-github transition-colors focus:outline-none focus:ring-2 ${
                          isPro
                            ? 'bg-github-canvas-default border border-github-border-default text-github-fg-default hover:bg-github-canvas-subtle focus:ring-github-accent-emphasis'
                            : 'bg-github-accent-emphasis text-white hover:bg-github-accent-fg focus:ring-github-accent-emphasis'
                        }`}
                      >
                        {isPro ? 'Manage Subscription' : 'Upgrade to Pro'}
                      </button>

                      {/* Pro Features List */}
                      {!isPro && (
                        <div className="pt-4 border-t border-github-border-default">
                          <h3 className="text-sm font-medium text-github-fg-default mb-3">
                            Pro Features
                          </h3>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-2 text-sm text-github-fg-muted">
                              <span className="text-github-success-fg mt-0.5">✓</span>
                              <span>Snooze notifications (30min, 1hr, 3hrs, tomorrow, next week)</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-github-fg-muted">
                              <span className="text-github-success-fg mt-0.5">✓</span>
                              <span>Custom auto-archive rules for advanced filtering</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-github-fg-muted">
                              <span className="text-github-success-fg mt-0.5">✓</span>
                              <span>All keyboard shortcuts (J/K navigation, D/A/S/O actions, 1-4 filters, Shift+D mark all)</span>
                            </li>
                          </ul>
                        </div>
                      )}

                      {/* Pricing Info for Free Users */}
                      {!isPro && (
                        <div className="pt-4 border-t border-github-border-default">
                          <h3 className="text-sm font-medium text-github-fg-default mb-3">
                            Pricing
                          </h3>
                          <div className="grid grid-cols-3 gap-3 text-center text-xs">
                            <div className="p-3 bg-github-canvas-default rounded-github border border-github-border-default">
                              <p className="font-semibold text-github-fg-default mb-1">Monthly</p>
                              <p className="text-github-fg-muted">$3/month</p>
                            </div>
                            <div className="p-3 bg-github-canvas-default rounded-github border-2 border-github-accent-emphasis relative">
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-github-accent-emphasis text-white rounded-full text-[10px] font-semibold whitespace-nowrap">
                                Save 16%
                              </div>
                              <p className="font-semibold text-github-fg-default mb-1">Yearly</p>
                              <p className="text-github-fg-muted">$30/year</p>
                            </div>
                            <div className="p-3 bg-github-canvas-default rounded-github border border-github-border-default">
                              <p className="font-semibold text-github-fg-default mb-1">Lifetime</p>
                              <p className="text-github-fg-muted">$100 once</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* About */}
              <div className="bg-github-canvas-subtle rounded-github border border-github-border-default p-6">
                <h3 className="text-sm font-medium text-github-fg-default mb-2">
                  About
                </h3>
                <p className="text-sm text-github-fg-muted">
                  GitHub Notification Manager v1.0.0
                </p>
                <p className="text-xs text-github-fg-subtle mt-1">
                  Manage your GitHub notifications with ease.
                </p>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="bg-github-canvas-subtle rounded-github border border-github-border-default p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-github-fg-default mb-4">
                  Notification Settings
                </h2>

                {/* Refresh Interval */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-github-fg-default mb-2">
                      Refresh Interval
                    </label>
                    <select
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-github-canvas-default border border-github-border-default 
                               rounded-github text-sm text-github-fg-default focus:outline-none focus:ring-2 
                               focus:ring-github-accent-emphasis"
                    >
                      <option value={10}>10 seconds</option>
                      <option value={30}>30 seconds (recommended)</option>
                      <option value={60}>1 minute</option>
                      <option value={300}>5 minutes</option>
                      <option value={600}>10 minutes</option>
                    </select>
                    <p className="text-xs text-github-fg-muted mt-1">
                      How often to check for new notifications
                    </p>
                  </div>

                  {/* Badge Toggle */}
                  <div className="flex items-center justify-between py-3 border-t border-github-border-default">
                    <div>
                      <label className="text-sm font-medium text-github-fg-default">
                        Show Badge Count
                      </label>
                      <p className="text-xs text-github-fg-muted mt-1">
                        Display unread count on extension icon
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={badgeEnabled}
                        onChange={(e) => setBadgeEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-github-canvas-subtle peer-focus:outline-none peer-focus:ring-2 
                                    peer-focus:ring-github-accent-emphasis rounded-full peer 
                                    peer-checked:after:translate-x-full peer-checked:after:border-white 
                                    after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                    after:bg-white after:border-gray-300 after:border after:rounded-full 
                                    after:h-5 after:w-5 after:transition-all border border-github-border-default
                                    peer-checked:bg-github-accent-emphasis"></div>
                    </label>
                  </div>

                  {/* Sound Toggle */}
                  <div className="flex items-center justify-between py-3 border-t border-github-border-default">
                    <div>
                      <label className="text-sm font-medium text-github-fg-default">
                        Sound Notifications
                      </label>
                      <p className="text-xs text-github-fg-muted mt-1">
                        Play a sound when new notifications arrive
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={soundEnabled}
                        onChange={(e) => setSoundEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-github-canvas-subtle peer-focus:outline-none peer-focus:ring-2 
                                    peer-focus:ring-github-accent-emphasis rounded-full peer 
                                    peer-checked:after:translate-x-full peer-checked:after:border-white 
                                    after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                    after:bg-white after:border-gray-300 after:border after:rounded-full 
                                    after:h-5 after:w-5 after:transition-all border border-github-border-default
                                    peer-checked:bg-github-accent-emphasis"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Behavior Section */}
          {activeSection === 'behavior' && (
            <div className="bg-github-canvas-subtle rounded-github border border-github-border-default p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-github-fg-default mb-4">
                  Behavior Settings
                </h2>

                <div className="space-y-4">
                  {/* Default Filter */}
                  <div>
                    <label className="block text-sm font-medium text-github-fg-default mb-2">
                      Default Filter
                    </label>
                    <select
                      value={defaultFilter}
                      onChange={(e) => setDefaultFilter(e.target.value as FilterType)}
                      className="w-full px-3 py-2 bg-github-canvas-default border border-github-border-default 
                               rounded-github text-sm text-github-fg-default focus:outline-none focus:ring-2 
                               focus:ring-github-accent-emphasis"
                    >
                      <option value="all">All Notifications</option>
                      <option value="mentions">Mentions Only</option>
                      <option value="reviews">Review Requests</option>
                      <option value="assigned">Assigned to Me</option>
                    </select>
                    <p className="text-xs text-github-fg-muted mt-1">
                      Which filter to show when opening the extension
                    </p>
                  </div>

                  {/* Open Links Behavior */}
                  <div className="flex items-center justify-between py-3 border-t border-github-border-default">
                    <div>
                      <label className="text-sm font-medium text-github-fg-default">
                        Open Links in New Tab
                      </label>
                      <p className="text-xs text-github-fg-muted mt-1">
                        Open notification links in a new browser tab
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={openLinksInNewTab}
                        onChange={(e) => setOpenLinksInNewTab(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-github-canvas-subtle peer-focus:outline-none peer-focus:ring-2 
                                    peer-focus:ring-github-accent-emphasis rounded-full peer 
                                    peer-checked:after:translate-x-full peer-checked:after:border-white 
                                    after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                    after:bg-white after:border-gray-300 after:border after:rounded-full 
                                    after:h-5 after:w-5 after:transition-all border border-github-border-default
                                    peer-checked:bg-github-accent-emphasis"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Auto-Archive Rules Section */}
          {activeSection === 'rules' && (
            <div className="bg-github-canvas-subtle rounded-github border border-github-border-default p-6">
              <AutoArchiveRules />
            </div>
          )}

          {/* Advanced Section */}
          {activeSection === 'advanced' && (
            <div className="bg-github-canvas-subtle rounded-github border border-github-border-default p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-github-fg-default mb-4">
                  Advanced Settings
                </h2>

                <div className="space-y-4">
                  {/* GitHub API Rate Limit */}
                  {rateLimit && (
                    <div className="p-4 bg-github-canvas-default rounded-github border border-github-border-default">
                      <h3 className="text-sm font-medium text-github-fg-default mb-2">
                        GitHub API Rate Limit
                      </h3>
                      <div className="space-y-2 text-xs text-github-fg-muted">
                        <div className="flex justify-between">
                          <span>Remaining:</span>
                          <span className="font-mono">{rateLimit.remaining} / {rateLimit.limit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Resets in:</span>
                          <span className="font-mono">{formatResetTime(rateLimit.reset)}</span>
                        </div>
                        <div className="w-full bg-github-canvas-subtle rounded-full h-2 mt-2">
                          <div
                            className="bg-github-accent-emphasis h-2 rounded-full transition-all"
                            style={{ width: `${(rateLimit.remaining / rateLimit.limit) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Clear Cache */}
                  <div className="pt-4 border-t border-github-border-default">
                    <h3 className="text-sm font-medium text-github-fg-default mb-2">
                      Clear Cache
                    </h3>
                    <p className="text-xs text-github-fg-muted mb-3">
                      Remove all cached notifications from local storage
                    </p>
                    <button
                      onClick={handleClearCache}
                      className="px-4 py-2 text-sm font-medium text-white bg-github-danger-emphasis 
                               rounded-github hover:bg-github-danger-fg transition-colors"
                    >
                      Clear Cache
                    </button>
                  </div>

                  {/* Export/Import Settings */}
                  <div className="pt-4 border-t border-github-border-default">
                    <h3 className="text-sm font-medium text-github-fg-default mb-2">
                      Settings Backup
                    </h3>
                    <p className="text-xs text-github-fg-muted mb-3">
                      Export or import your extension settings
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleExportSettings}
                        className="px-4 py-2 text-sm font-medium bg-github-canvas-default border 
                                 border-github-border-default text-github-fg-default rounded-github 
                                 hover:bg-github-canvas-subtle transition-colors"
                      >
                        Export Settings
                      </button>
                      <button
                        onClick={handleImportSettings}
                        className="px-4 py-2 text-sm font-medium bg-github-canvas-default border 
                                 border-github-border-default text-github-fg-default rounded-github 
                                 hover:bg-github-canvas-subtle transition-colors"
                      >
                        Import Settings
                      </button>
                    </div>
                  </div>

                  {/* Reset Settings */}
                  <div className="pt-4 border-t border-github-border-default">
                    <h3 className="text-sm font-medium text-github-fg-default mb-2">
                      Reset Settings
                    </h3>
                    <p className="text-xs text-github-fg-muted mb-3">
                      Restore all settings to their default values
                    </p>
                    <button
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Reset Settings',
                          message: 'Are you sure you want to reset all settings to default? This action cannot be undone.',
                          variant: 'danger',
                          onConfirm: () => {
                            resetSettings()
                            addToast('Settings reset to default!', 'success')
                          },
                        })
                      }}
                      disabled={isDefaultSettings}
                      className="px-4 py-2 text-sm font-medium text-white bg-github-danger-emphasis 
                               rounded-github hover:bg-github-danger-fg transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reset to Defaults
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={() => {
          confirmDialog.onConfirm()
          setConfirmDialog({ ...confirmDialog, isOpen: false })
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-github shadow-lg text-sm font-medium animate-slide-up ${
              toast.variant === 'success'
                ? 'bg-github-success-emphasis text-white'
                : toast.variant === 'error'
                ? 'bg-github-danger-emphasis text-white'
                : toast.variant === 'warning'
                ? 'bg-github-attention-emphasis text-white'
                : 'bg-github-accent-emphasis text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
