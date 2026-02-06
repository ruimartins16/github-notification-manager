import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKeyboardShortcuts } from '../useKeyboardShortcuts'
import { useNotificationStore } from '../../store/notification-store'

// Mock the notification store
vi.mock('../../store/notification-store', () => ({
  useNotificationStore: vi.fn(),
}))

describe('useKeyboardShortcuts', () => {
  let mockSetFilter: ReturnType<typeof vi.fn>
  let mockSetFocusedIndex: ReturnType<typeof vi.fn>
  let mockOnOpenFocused: ReturnType<typeof vi.fn>
  let mockOnMarkFocusedDone: ReturnType<typeof vi.fn>
  let mockOnArchiveFocused: ReturnType<typeof vi.fn>
  let mockOnSnoozeFocused: ReturnType<typeof vi.fn>
  let mockOnMarkAllRead: ReturnType<typeof vi.fn>
  let mockOnOpenHelp: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSetFilter = vi.fn()
    mockSetFocusedIndex = vi.fn()
    mockOnOpenFocused = vi.fn()
    mockOnMarkFocusedDone = vi.fn()
    mockOnArchiveFocused = vi.fn()
    mockOnSnoozeFocused = vi.fn()
    mockOnMarkAllRead = vi.fn()
    mockOnOpenHelp = vi.fn()

    // Mock the store
    ;(useNotificationStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const state = {
        setFilter: mockSetFilter,
      }
      return selector(state)
    })
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useKeyboardShortcuts({
        focusedIndex: -1,
        setFocusedIndex: mockSetFocusedIndex,
        notificationCount: 5,
        enabled: true,
      })
    )

    expect(result.current.focusedIndex).toBe(-1)
    expect(typeof result.current.navigateNext).toBe('function')
    expect(typeof result.current.navigatePrevious).toBe('function')
    expect(typeof result.current.getShortcuts).toBe('function')
  })

  describe('Navigation', () => {
    it('should navigate to next item with J key', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: 0,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          enabled: true,
        })
      )

      const event = new KeyboardEvent('keydown', { key: 'j' })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(mockSetFocusedIndex).toHaveBeenCalledWith(1)
    })

    it('should navigate to previous item with K key', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: 2,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          enabled: true,
        })
      )

      const event = new KeyboardEvent('keydown', { key: 'k' })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(mockSetFocusedIndex).toHaveBeenCalledWith(1)
    })

    it('should not navigate beyond last item', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: 4,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          enabled: true,
        })
      )

      const event = new KeyboardEvent('keydown', { key: 'j' })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(mockSetFocusedIndex).not.toHaveBeenCalled()
    })

    it('should not navigate before first item', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: 0,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          enabled: true,
        })
      )

      const event = new KeyboardEvent('keydown', { key: 'k' })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(mockSetFocusedIndex).not.toHaveBeenCalled()
    })

    it('should focus first item when K is pressed and nothing is focused', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: -1,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          enabled: true,
        })
      )

      const event = new KeyboardEvent('keydown', { key: 'k' })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(mockSetFocusedIndex).toHaveBeenCalledWith(0)
    })
  })

  describe('Actions', () => {
    it('should call onMarkFocusedDone when D is pressed', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: 1,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          onMarkFocusedDone: mockOnMarkFocusedDone,
          enabled: true,
        })
      )

      const event = new KeyboardEvent('keydown', { key: 'd' })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(mockOnMarkFocusedDone).toHaveBeenCalled()
    })

    it('should call onArchiveFocused when A is pressed', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: 1,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          onArchiveFocused: mockOnArchiveFocused,
          enabled: true,
        })
      )

      const event = new KeyboardEvent('keydown', { key: 'a' })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(mockOnArchiveFocused).toHaveBeenCalled()
    })

    it('should call onSnoozeFocused when S is pressed', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: 1,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          onSnoozeFocused: mockOnSnoozeFocused,
          enabled: true,
        })
      )

      const event = new KeyboardEvent('keydown', { key: 's' })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(mockOnSnoozeFocused).toHaveBeenCalled()
    })

    it('should call onOpenFocused when O is pressed', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: 1,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          onOpenFocused: mockOnOpenFocused,
          enabled: true,
        })
      )

      const event = new KeyboardEvent('keydown', { key: 'o' })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(mockOnOpenFocused).toHaveBeenCalled()
    })

    it('should not call action callbacks when no item is focused', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: -1,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          onMarkFocusedDone: mockOnMarkFocusedDone,
          enabled: true,
        })
      )

      const event = new KeyboardEvent('keydown', { key: 'd' })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(mockOnMarkFocusedDone).not.toHaveBeenCalled()
    })
  })

  describe('Global shortcuts', () => {
    it('should call onMarkAllRead when Shift+D is pressed', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: -1,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          onMarkAllRead: mockOnMarkAllRead,
          enabled: true,
        })
      )

      const event = new KeyboardEvent('keydown', { key: 'D', shiftKey: true })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(mockOnMarkAllRead).toHaveBeenCalled()
    })

    it('should call onOpenHelp when ? is pressed', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: -1,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          onOpenHelp: mockOnOpenHelp,
          enabled: true,
        })
      )

      const event = new KeyboardEvent('keydown', { key: '?', shiftKey: true })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(mockOnOpenHelp).toHaveBeenCalled()
    })
  })

  describe('Disabled state', () => {
    it('should not respond to shortcuts when disabled', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: 1,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          onMarkFocusedDone: mockOnMarkFocusedDone,
          enabled: false,
        })
      )

      const event = new KeyboardEvent('keydown', { key: 'd' })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(mockOnMarkFocusedDone).not.toHaveBeenCalled()
    })
  })

  describe('Input element handling', () => {
    it('should not trigger shortcuts when typing in an input', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: 1,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          onMarkFocusedDone: mockOnMarkFocusedDone,
          enabled: true,
        })
      )

      const input = document.createElement('input')
      document.body.appendChild(input)

      const event = new KeyboardEvent('keydown', { key: 'd', bubbles: true })
      Object.defineProperty(event, 'target', { value: input, enumerable: true })

      act(() => {
        input.dispatchEvent(event)
      })

      expect(mockOnMarkFocusedDone).not.toHaveBeenCalled()

      document.body.removeChild(input)
    })
  })

  describe('getShortcuts', () => {
    it('should return all available shortcuts', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: -1,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          enabled: true,
        })
      )

      const shortcuts = result.current.getShortcuts()

      expect(shortcuts.length).toBeGreaterThan(0)
      expect(shortcuts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'J',
            category: 'navigation',
          }),
          expect.objectContaining({
            key: 'K',
            category: 'navigation',
          }),
          expect.objectContaining({
            key: 'D',
            category: 'actions',
          }),
        ])
      )
    })

    it('should group shortcuts by category', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({
          focusedIndex: -1,
          setFocusedIndex: mockSetFocusedIndex,
          notificationCount: 5,
          enabled: true,
        })
      )

      const shortcuts = result.current.getShortcuts()
      const categories = [...new Set(shortcuts.map((s) => s.category))]

      expect(categories).toContain('navigation')
      expect(categories).toContain('actions')
      expect(categories).toContain('filters')
      expect(categories).toContain('global')
    })
  })
})
