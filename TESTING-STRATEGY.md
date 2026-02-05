# Testing Strategy - GitHub Notification Manager

## Overview

This document outlines our testing approach for the GitHub Notification Manager Chrome extension. We follow a **test-driven development (TDD)** approach where unit tests are created alongside implementation.

**Testing Framework:** Vitest + React Testing Library + jsdom

---

## Testing Philosophy

### Core Principles

1. **Write tests alongside code** - Not after, not before completion
2. **Aim for >70% code coverage** - Focus on critical paths
3. **Test behavior, not implementation** - Tests should be refactor-safe
4. **Fast feedback** - Tests run in <1 second
5. **Clear test names** - Describe what's being tested in plain English

### What to Test

✅ **DO Test:**
- Component rendering and output
- User interactions (clicks, typing)
- State changes and updates
- Utility function logic
- Type definitions and schemas
- API integration points (mocked)
- Error handling

❌ **DON'T Test:**
- Third-party library internals
- CSS styling (use visual regression for that)
- Trivial code (getters/setters with no logic)
- Configuration files (unless complex logic)

---

## Test Structure

### Directory Layout

```
src/
├── popup/
│   ├── App.tsx
│   └── __tests__/
│       └── App.test.tsx
├── components/
│   ├── NotificationList.tsx
│   └── __tests__/
│       └── NotificationList.test.tsx
├── utils/
│   ├── github-api.ts
│   └── __tests__/
│       └── github-api.test.ts
├── types/
│   ├── github.ts
│   └── __tests__/
│       └── github.test.ts
└── test/
    ├── setup.ts           # Global test setup
    └── mocks/
        └── chrome.ts      # Chrome API mocks
```

### Naming Conventions

- Test files: `ComponentName.test.tsx` or `utilityName.test.ts`
- Test suites: `describe('ComponentName', ...)`
- Test cases: `it('should do something specific', ...)`
- Use nested `describe` blocks for logical grouping

---

## Testing Patterns

### 1. Component Testing

**Template:**
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ComponentName from '../ComponentName'

describe('ComponentName', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<ComponentName />)
      expect(screen.getByText(/expected text/i)).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should handle click events', () => {
      render(<ComponentName />)
      const button = screen.getByRole('button', { name: /button name/i })
      fireEvent.click(button)
      expect(button).toHaveTextContent('updated text')
    })
  })

  describe('Props', () => {
    it('should accept and render props correctly', () => {
      render(<ComponentName title="Test Title" />)
      expect(screen.getByText('Test Title')).toBeInTheDocument()
    })
  })
})
```

**Key Points:**
- Use `screen.getByRole()` for accessibility testing
- Use `fireEvent` for user interactions
- Test both positive and negative cases

### 2. Utility Function Testing

**Template:**
```typescript
import { describe, it, expect } from 'vitest'
import { utilityFunction } from '../utility'

describe('utilityFunction', () => {
  it('should return expected output for valid input', () => {
    const result = utilityFunction('valid input')
    expect(result).toBe('expected output')
  })

  it('should handle edge cases', () => {
    expect(utilityFunction('')).toBe(null)
    expect(utilityFunction(null)).toBe(null)
  })

  it('should throw error for invalid input', () => {
    expect(() => utilityFunction('invalid')).toThrow('Error message')
  })
})
```

### 3. Type Definition Testing

**Template:**
```typescript
import { describe, it, expect } from 'vitest'
import type { TypeName } from '../types'

describe('TypeName', () => {
  it('should have all required properties', () => {
    const instance: TypeName = {
      prop1: 'value',
      prop2: 123,
    }
    
    expect(instance).toHaveProperty('prop1')
    expect(instance).toHaveProperty('prop2')
  })

  it('should enforce type constraints', () => {
    const validValues: TypeName[] = ['option1', 'option2']
    validValues.forEach(value => {
      const typed: TypeName = value
      expect(typed).toBeDefined()
    })
  })
})
```

### 4. Chrome API Testing

**Mocking Chrome APIs:**
```typescript
import { vi } from 'vitest'
import { mockChromeStorage } from '@/test/mocks/chrome'

describe('Feature using Chrome Storage', () => {
  it('should save data to chrome.storage.local', async () => {
    const spy = vi.spyOn(chrome.storage.local, 'set')
    
    await saveData({ key: 'value' })
    
    expect(spy).toHaveBeenCalledWith({ key: 'value' })
  })
})
```

**Chrome APIs are automatically mocked in `src/test/setup.ts`**

---

## Test Commands

### Run Tests

```bash
# Run all tests in watch mode (for development)
npm test

# Run all tests once (for CI/CD)
npm run test:run

# Run tests with UI (visual test runner)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Coverage Thresholds

**Target Coverage:**
- Statements: >70%
- Branches: >70%
- Functions: >70%
- Lines: >70%

**Critical Code (100% coverage):**
- Authentication logic
- Data synchronization
- Notification filtering

---

## Testing Checklist per Ticket

For every ticket (GNM-002 onwards), ensure:

- [ ] **Unit tests created** in `__tests__/` directory
- [ ] **All tests pass** (`npm run test:run`)
- [ ] **Coverage maintained** (>70% overall)
- [ ] **Edge cases tested** (null, undefined, empty, large data)
- [ ] **Error cases tested** (API failures, invalid input)
- [ ] **Accessibility tested** (proper roles, labels)
- [ ] **No console errors** during test runs

---

## Test-Driven Development Workflow

### Step-by-Step Process

1. **Read the ticket** (e.g., GNM-002: GitHub OAuth)
2. **Write test cases** based on acceptance criteria
3. **Run tests** - they should fail (red)
4. **Implement the feature** to make tests pass
5. **Run tests again** - they should pass (green)
6. **Refactor** if needed, keeping tests green
7. **Check coverage** - ensure >70%
8. **Commit** with message: "test(GNM-XXX): Add tests for [feature]"

### Example: GNM-002 (GitHub OAuth)

**Acceptance Criteria from Backlog:**
- OAuth flow initiates when user clicks "Connect GitHub"
- Access token is securely stored
- User sees authenticated state

**Tests to Write:**
```typescript
// src/utils/__tests__/auth.test.ts
describe('GitHub OAuth', () => {
  it('should initiate OAuth flow on connect', async () => {
    // Test implementation
  })

  it('should store access token securely', async () => {
    // Test implementation
  })

  it('should show authenticated state after login', () => {
    // Test implementation
  })
})
```

---

## Mocking Strategy

### Chrome APIs

All Chrome APIs are mocked globally in `src/test/setup.ts`:
- `chrome.storage.local`
- `chrome.storage.sync`
- `chrome.runtime`
- `chrome.action`
- `chrome.alarms`
- `chrome.identity`

**Usage in tests:**
```typescript
import { vi } from 'vitest'

it('should use chrome.storage', () => {
  const spy = vi.spyOn(chrome.storage.local, 'set')
  // ... test code
  expect(spy).toHaveBeenCalled()
})
```

### GitHub API (Octokit)

Will be mocked using Vitest's `vi.mock()`:
```typescript
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => ({
    rest: {
      activity: {
        listNotificationsForAuthenticatedUser: vi.fn(),
      },
    },
  })),
}))
```

### Network Requests

Use MSW (Mock Service Worker) for integration tests if needed:
```bash
npm install -D msw
```

---

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Every commit to main
- Every pull request
- Before deployment

**Workflow:**
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:run
      - run: npm run test:coverage
```

---

## Common Testing Patterns

### Testing Async Operations

```typescript
it('should fetch notifications', async () => {
  const promise = fetchNotifications()
  
  await expect(promise).resolves.toEqual(expectedData)
})
```

### Testing User Events

```typescript
import userEvent from '@testing-library/user-event'

it('should type in input field', async () => {
  const user = userEvent.setup()
  render(<Component />)
  
  const input = screen.getByRole('textbox')
  await user.type(input, 'Hello')
  
  expect(input).toHaveValue('Hello')
})
```

### Testing Error Boundaries

```typescript
it('should catch and display errors', () => {
  const ThrowError = () => {
    throw new Error('Test error')
  }
  
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  )
  
  expect(screen.getByText(/error occurred/i)).toBeInTheDocument()
})
```

---

## Best Practices

### DO ✅

1. **Test user-facing behavior** - What users see and interact with
2. **Use semantic queries** - `getByRole`, `getByLabelText`, `getByText`
3. **Keep tests simple** - One assertion per test when possible
4. **Test accessibility** - Use `getByRole` to ensure proper ARIA
5. **Clean up after tests** - `afterEach(() => cleanup())`
6. **Mock external dependencies** - Don't make real API calls
7. **Test error states** - Not just happy paths

### DON'T ❌

1. **Don't test implementation details** - Test what users see
2. **Don't use `querySelector`** - Use Testing Library queries
3. **Don't skip edge cases** - Null, undefined, empty arrays
4. **Don't make tests dependent** - Each test should be independent
5. **Don't ignore failing tests** - Fix or remove them
6. **Don't test third-party code** - Trust libraries you use
7. **Don't over-mock** - Only mock what's necessary

---

## Coverage Reports

### View Coverage

After running `npm run test:coverage`:

```bash
# Open HTML report in browser
open coverage/index.html

# Or view in terminal
cat coverage/coverage-summary.json
```

### Coverage by File Type

**Expected Coverage Levels:**
- Components: 80-90% (high user interaction)
- Utilities: 90-100% (pure logic, testable)
- Types: 60-70% (type checking, less critical)
- Background: 70-80% (Chrome API heavy, harder to test)

---

## Debugging Tests

### Visual Debugging

```typescript
import { screen } from '@testing-library/react'

it('debug test', () => {
  render(<Component />)
  screen.debug() // Prints current DOM to console
})
```

### Vitest UI

```bash
npm run test:ui
```

Opens browser with interactive test runner.

### VSCode Integration

Install **Vitest extension** for VSCode:
- Run tests from sidebar
- Debug tests with breakpoints
- See coverage inline

---

## Performance

### Keep Tests Fast

- Target: <1 second for all tests
- Use `vi.mock()` instead of real implementations
- Avoid unnecessary `waitFor()` calls
- Don't test animations (mock timers)

### Optimize Slow Tests

```typescript
// Slow: Multiple renders
it('slow test', () => {
  render(<Component />)
  // ... test 1
  cleanup()
  render(<Component />)
  // ... test 2
})

// Fast: Single render
it('fast test', () => {
  render(<Component />)
  // ... test 1 and 2
})
```

---

## Future Enhancements

### E2E Testing (Post-MVP)

- Use Playwright for end-to-end tests
- Test complete user flows
- Test in real Chrome environment

### Visual Regression (Post-MVP)

- Use Chromatic or Percy
- Catch visual bugs automatically
- Test across different screen sizes

### Performance Testing (Post-MVP)

- Lighthouse CI
- Bundle size monitoring
- Render performance benchmarks

---

## Resources

### Documentation
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Our Tests
- See `src/popup/__tests__/App.test.tsx` for component examples
- See `src/types/__tests__/storage.test.ts` for type examples
- See `src/test/mocks/chrome.ts` for Chrome API mocks

---

**Last Updated:** February 5, 2026
**Test Count:** 31 tests (all passing ✅)
**Coverage:** Baseline established (will track after GNM-002)
