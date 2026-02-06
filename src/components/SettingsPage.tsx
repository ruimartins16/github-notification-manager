import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSettingsStore } from '../store/settings-store'
import { useNotificationStore } from '../store/notification-store'
import { AutoArchiveRules } from '../components/AutoArchiveRules'
import { FilterType } from '../types/storage'

type SettingsSection = 'account' | 'notifications' | 'behavior' | 'advanced' | 'rules'

export function SettingsPage() {
  const { logout } = useAuth()
  const [activeSection, setActiveSection] = useState<SettingsSection>('account')
  const [userInfo, setUserInfo] = useState<{ login: string; avatar_url: string } | null>(null)
  const [rateLimit, setRateLimit] = useState<{ limit: number; remaining: number; reset: number } | null>(null)
  
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
    if (confirm('Are you sure you want to clear all cached notifications? This action cannot be undone.')) {
      clearNotifications()
      // Also clear from chrome.storage
      await chrome.storage.local.remove(['notifications', 'lastFetch'])
      alert('Cache cleared successfully!')
    }
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
    const a = document.createElement('a')
    a.href = url
    a.download = `gnm-settings-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportSettings = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      try {
        const text = await file.text()
        const settings = JSON.parse(text)
        
        // Validate and apply settings
        if (typeof settings.refreshInterval === 'number') setRefreshInterval(settings.refreshInterval)
        if (typeof settings.badgeEnabled === 'boolean') setBadgeEnabled(settings.badgeEnabled)
        if (typeof settings.soundEnabled === 'boolean') setSoundEnabled(settings.soundEnabled)
        if (typeof settings.defaultFilter === 'string') setDefaultFilter(settings.defaultFilter as FilterType)
        if (typeof settings.openLinksInNewTab === 'boolean') setOpenLinksInNewTab(settings.openLinksInNewTab)
        
        alert('Settings imported successfully!')
      } catch (error) {
        alert('Failed to import settings. Please check the file format.')
        console.error('Import error:', error)
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
            <div className="bg-github-canvas-subtle rounded-github border border-github-border-default p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-github-fg-default mb-4">
                  Account Information
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

              <div className="pt-6 border-t border-github-border-default">
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
                        if (confirm('Are you sure you want to reset all settings to default?')) {
                          resetSettings()
                          alert('Settings reset to default!')
                        }
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
    </div>
  )
}
