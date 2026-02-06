# Development Workflow

## ⚠️ CRITICAL: Code Review Before Every Commit

**MANDATORY WORKFLOW FOR ALL CODE CHANGES:**

```
1. Implement feature/fix
2. ✅ RUN CODE REVIEW FLOW (use code-reviewer agent)
3. Fix any issues found in review
4. Run tests (npm run test:run)
5. Build verification (npm run build)
6. Commit with descriptive message
```

## 🚨 DO NOT COMMIT WITHOUT CODE REVIEW

**Never skip the code review step.** The code-reviewer agent catches:
- React best practices violations
- Performance issues
- Accessibility problems
- Type safety issues
- Security vulnerabilities
- Code quality issues

**If you commit without review, you WILL need to:**
1. Run the review after commit
2. Create a second "fix" commit
3. Waste time that could have been saved

## Standard Development Flow

### Starting a New Feature (e.g., GNM-005)

1. **Read the backlog ticket** (BACKLOG.md)
   - Understand acceptance criteria
   - Note dependencies
   - Check story points

2. **Plan the implementation**
   - Create todo list if needed (TodoWrite tool)
   - Identify files to modify
   - Consider architectural impact

3. **Implement the feature**
   - Write code following existing patterns
   - Add TypeScript types
   - Follow React best practices
   - Add proper error handling

4. **🔴 CRITICAL: Run Code Review** ⚠️
   ```bash
   # Use the code-reviewer agent
   "Invoke code-reviewer to review my changes for [FEATURE_NAME]"
   ```
   - Review finds issues BEFORE they're committed
   - Fix all critical issues immediately
   - Consider suggestions for improvements
   - Re-run review if major changes made

5. **Run Tests**
   ```bash
   npm run test:run
   ```
   - Ensure all 92 tests pass
   - Check for new test requirements
   - Add tests if coverage drops

6. **Verify Build**
   ```bash
   npm run build
   ```
   - Check for TypeScript errors
   - Verify bundle size is reasonable
   - Ensure no build warnings

7. **Commit Changes**
   ```bash
   git add [files]
   git commit -m "feat(TICKET): Description"
   ```
   - Use conventional commit format
   - Reference ticket number (e.g., GNM-005)
   - Describe what and why, not how

8. **Optional: QA Testing** (for user-facing features)
   ```bash
   # Use the qa agent if needed
   "Invoke qa to test the feature against requirements"
   ```

## Commit Message Format

Follow this pattern:

```
<type>(<ticket>): <short description>

<detailed description>

<additional notes>

Tests: X/X passing ✅
Build: Successful ✅
Bundle: XXX kB (XX kB gzipped)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `test`: Test additions/changes
- `docs`: Documentation updates
- `chore`: Maintenance tasks

**Examples:**
```
feat(GNM-005): Add notification badge counter

Implementation:
- Use chrome.action.setBadgeText() API
- Update badge on storage changes
- Blue badge for unread, green for priority

Tests: 95/95 passing ✅
Build: Successful ✅
```

```
fix(GNM-004): Address code review findings for Octicons

Code Review Fixes:
- Add aria-hidden for accessibility
- Extract ICON_PROPS as constant
- Add proper TypeScript types

Tests: 92/92 passing ✅
```

## Code Review Workflow

### When to Run Review

**ALWAYS** run before commit, especially for:
- New features
- Bug fixes
- Refactoring
- UI changes
- API integrations
- Performance optimizations

**Can skip** for:
- Documentation-only changes (*.md files)
- Configuration tweaks (package.json versions)
- Test-only changes (if trivial)

### How to Run Review

Use the Task tool with code-reviewer agent:

```typescript
// Example invocation
"Invoke code-reviewer to review my changes for GNM-005 badge counter implementation.

Files changed:
- src/background/service-worker.ts
- src/popup/App.tsx
- src/hooks/useBadge.ts

Please check for:
- Chrome API usage
- Performance implications
- React patterns
- TypeScript types
- Accessibility

All tests passing, build successful."
```

### What to Look For in Review

The code-reviewer checks:
- ✅ React best practices
- ✅ Performance optimization
- ✅ Accessibility (a11y)
- ✅ Type safety
- ✅ Security issues
- ✅ Code maintainability

### Handling Review Feedback

**Critical Issues (Must Fix):**
- Type errors
- Security vulnerabilities
- Accessibility violations
- Memory leaks
- Breaking changes

**Suggestions (Should Consider):**
- Performance optimizations
- Code organization
- Better naming
- Additional edge cases

**After Fixing:**
- Re-run tests
- Verify build
- Commit with review fixes if major

## Testing Requirements

### Before Every Commit

```bash
npm run test:run
```

**All tests must pass.** No exceptions.

### Test Coverage

- Maintain >70% coverage
- Add tests for new features
- Update tests when behavior changes
- Mock Chrome APIs properly

### Writing Tests

Follow patterns in existing test files:
- `src/**/__tests__/*.test.ts`
- Use Vitest + Testing Library
- Mock external dependencies
- Test edge cases

## Build Verification

### Development Build

```bash
npm run dev
```

- Runs Vite dev server
- Hot module reloading
- Fast feedback loop

### Production Build

```bash
npm run build
```

**Check:**
- No TypeScript errors
- No ESLint warnings
- Bundle size reasonable (<500 kB)
- All assets generated

### Load Extension

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist/` folder
5. Test functionality manually

## Quality Checklist

Before marking a ticket as DONE:

- [ ] Code review completed and issues fixed
- [ ] All tests passing (92/92 or higher)
- [ ] Build successful
- [ ] TypeScript strict mode satisfied
- [ ] ESLint warnings = 0
- [ ] Bundle size acceptable
- [ ] Manual testing in Chrome
- [ ] Acceptance criteria met
- [ ] Committed with good message
- [ ] Documentation updated if needed

## Common Mistakes to Avoid

### ❌ Committing Without Review
**Never do this.** Always run code-reviewer first.

### ❌ Skipping Tests
Tests catch regressions. Always run them.

### ❌ Ignoring Build Warnings
Fix warnings, don't ignore them.

### ❌ Poor Commit Messages
Be descriptive. Future you will thank you.

### ❌ Not Testing in Chrome
Build success ≠ working extension. Test it.

### ❌ Breaking Changes Without Notice
Check impact before changing shared code.

## Tools Available

- **code-reviewer**: Automated code review
- **qa**: Test UI against requirements
- **TodoWrite**: Track multi-step tasks
- **Task/explore**: Search codebase
- **impact-analysis**: Check change impact (monorepo)

## Summary: The Golden Rule

```
🔴 IMPLEMENT → REVIEW → FIX → TEST → BUILD → COMMIT
              ^^^^^^^^
         NEVER SKIP THIS!
```

**Code review before commit is MANDATORY.**  
**No exceptions. No shortcuts.**

---

*This workflow ensures high quality, maintainable code that passes review on the first try.*
