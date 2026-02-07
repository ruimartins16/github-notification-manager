import { describe, it, expect } from 'vitest'
import { convertApiUrlToWebUrl } from '../url-converter'

describe('convertApiUrlToWebUrl', () => {
  it('should convert pull request API URL to web URL', () => {
    const apiUrl = 'https://api.github.com/repos/facebook/react/pulls/123'
    const expected = 'https://github.com/facebook/react/pull/123'
    expect(convertApiUrlToWebUrl(apiUrl)).toBe(expected)
  })

  it('should convert issue API URL to web URL', () => {
    const apiUrl = 'https://api.github.com/repos/facebook/react/issues/456'
    const expected = 'https://github.com/facebook/react/issue/456'
    expect(convertApiUrlToWebUrl(apiUrl)).toBe(expected)
  })

  it('should convert commit API URL to web URL', () => {
    const apiUrl = 'https://api.github.com/repos/facebook/react/commits/abc123'
    const expected = 'https://github.com/facebook/react/commit/abc123'
    expect(convertApiUrlToWebUrl(apiUrl)).toBe(expected)
  })

  it('should handle URLs with query parameters', () => {
    const apiUrl = 'https://api.github.com/repos/facebook/react/pulls/123?per_page=100'
    const expected = 'https://github.com/facebook/react/pull/123?per_page=100'
    expect(convertApiUrlToWebUrl(apiUrl)).toBe(expected)
  })

  it('should return non-API URLs unchanged', () => {
    const webUrl = 'https://github.com/facebook/react'
    expect(convertApiUrlToWebUrl(webUrl)).toBe(webUrl)
  })

  it('should handle invalid URLs gracefully', () => {
    const invalidUrl = 'not-a-valid-url'
    // Should return the original string if URL parsing fails
    expect(convertApiUrlToWebUrl(invalidUrl)).toBe(invalidUrl)
  })

  it('should only process api.github.com URLs', () => {
    const otherApiUrl = 'https://api.example.com/repos/owner/repo/pulls/123'
    expect(convertApiUrlToWebUrl(otherApiUrl)).toBe(otherApiUrl)
  })

  it('should handle complex repo names with dots and dashes', () => {
    const apiUrl = 'https://api.github.com/repos/my-org/my.awesome-repo/pulls/789'
    const expected = 'https://github.com/my-org/my.awesome-repo/pull/789'
    expect(convertApiUrlToWebUrl(apiUrl)).toBe(expected)
  })
})
