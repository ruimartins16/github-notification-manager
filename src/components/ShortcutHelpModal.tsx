import { memo } from 'react'
import type { KeyboardShortcut } from '../hooks/useKeyboardShortcuts'

interface ShortcutHelpModalProps {
  isOpen: boolean
  onClose: () => void
  shortcuts: KeyboardShortcut[]
}

interface GroupedShortcuts {
  navigation: KeyboardShortcut[]
  actions: KeyboardShortcut[]
  filters: KeyboardShortcut[]
  global: KeyboardShortcut[]
}

export const ShortcutHelpModal = memo(({ isOpen, onClose, shortcuts }: ShortcutHelpModalProps) => {
  if (!isOpen) return null

  // Group shortcuts by category
  const grouped: GroupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      acc[shortcut.category].push(shortcut)
      return acc
    },
    { navigation: [], actions: [], filters: [], global: [] } as GroupedShortcuts
  )

  const categories = [
    { key: 'navigation' as const, title: 'Navigation', icon: '🧭' },
    { key: 'actions' as const, title: 'Actions', icon: '⚡' },
    { key: 'filters' as const, title: 'Filters', icon: '🔍' },
    { key: 'global' as const, title: 'Global', icon: '🌐' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
                   w-[90%] max-w-[500px] max-h-[80vh] overflow-auto
                   bg-github-canvas-default rounded-github border border-github-border-default shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-github-canvas-default border-b border-github-border-default px-6 py-4 flex items-center justify-between">
          <h2
            id="shortcut-help-title"
            className="text-lg font-semibold text-github-fg-default flex items-center gap-2"
          >
            <span>⌨️</span>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-github-fg-muted hover:text-github-fg-default
                     hover:bg-github-canvas-subtle rounded-github transition-colors"
            aria-label="Close help modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {categories.map(({ key, title, icon }) => {
            const categoryShortcuts = grouped[key]
            if (categoryShortcuts.length === 0) return null

            return (
              <div key={key}>
                <h3 className="text-sm font-semibold text-github-fg-default mb-3 flex items-center gap-2">
                  <span>{icon}</span>
                  {title}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between py-2 px-3 rounded-github
                               bg-github-canvas-subtle border border-github-border-default
                               hover:bg-github-canvas-default transition-colors"
                    >
                      <span className="text-sm text-github-fg-default">
                        {shortcut.description}
                      </span>
                      <kbd
                        className="px-2.5 py-1 text-xs font-mono font-semibold
                                 bg-github-canvas-default text-github-fg-default
                                 border border-github-border-default rounded shadow-sm"
                      >
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-github-canvas-default border-t border-github-border-default px-6 py-4">
          <p className="text-xs text-github-fg-muted text-center">
            Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-github-canvas-subtle border border-github-border-default rounded">?</kbd> to toggle this help
          </p>
        </div>
      </div>
    </>
  )
})

ShortcutHelpModal.displayName = 'ShortcutHelpModal'
