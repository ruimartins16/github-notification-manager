import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AutoArchiveRules } from '../components/AutoArchiveRules'

export function SettingsPage() {
  const { logout } = useAuth()
  const [activeSection, setActiveSection] = useState<'rules' | 'account'>('rules')

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
          <button
            onClick={() => window.history.back()}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          {/* Section Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveSection('rules')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSection === 'rules'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Auto-Archive Rules
            </button>
            <button
              onClick={() => setActiveSection('account')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSection === 'account'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Account
            </button>
          </div>

          {/* Auto-Archive Rules Section */}
          {activeSection === 'rules' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <AutoArchiveRules />
            </div>
          )}

          {/* Account Section */}
          {activeSection === 'account' && (
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  Account Information
                </h2>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Logged in to GitHub
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Actions
                </h3>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Logout
                </button>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  About
                </h3>
                <p className="text-sm text-gray-600">
                  GitHub Notification Manager v1.0.0
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Manage your GitHub notifications with ease.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
