/**
 * Conditional Request Plugin for Octokit
 * 
 * Implements GitHub's recommended conditional request pattern using ETags.
 * Automatically adds "If-None-Match" headers to requests and handles 304 responses.
 * 
 * Benefits:
 * - 304 responses don't count against GitHub's primary rate limit (when authenticated)
 * - Reduces bandwidth (no response body on 304)
 * - Always ensures data freshness (validates every request)
 * 
 * Flow:
 * 1. Before request: Check ETag cache, add If-None-Match header if ETag exists
 * 2. Send request to GitHub
 * 3. GitHub returns either:
 *    - 200 OK with fresh data + new ETag → Store new ETag, return data
 *    - 304 Not Modified → Data unchanged, throw NotModifiedError
 * 4. Caller catches NotModifiedError and uses cached data
 * 
 * See: https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#use-conditional-requests-if-appropriate
 */

import { Octokit } from '@octokit/core'
import { RequestError } from '@octokit/request-error'
import { etagCache, type ETagEntry } from './etag-cache'

/**
 * Error thrown when GitHub returns 304 Not Modified
 * Indicates that the cached data is still valid
 */
export class NotModifiedError extends Error {
  status = 304
  
  constructor(message = 'Data has not been modified since last fetch') {
    super(message)
    this.name = 'NotModifiedError'
    
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotModifiedError)
    }
  }
}

/**
 * Octokit plugin that adds conditional request support
 */
export function conditionalRequestPlugin(octokit: Octokit) {
  // Hook: BEFORE sending request
  // Add If-None-Match and If-Modified-Since headers from cache
  octokit.hook.before('request', async (options) => {
    // Build full URL for cache lookup (Octokit uses baseUrl + url)
    const fullUrl = options.baseUrl + options.url
    
    const entry = await etagCache.get(fullUrl)
    
    if (entry) {
      // Add conditional request headers
      if (entry.etag) {
        options.headers['if-none-match'] = entry.etag
        console.log('[ConditionalRequest] Adding If-None-Match header:', entry.etag.substring(0, 20) + '...')
      }
      
      if (entry.lastModified) {
        options.headers['if-modified-since'] = entry.lastModified
        console.log('[ConditionalRequest] Adding If-Modified-Since header:', entry.lastModified)
      }
    } else {
      console.log('[ConditionalRequest] No cached ETag for:', fullUrl)
    }
  })
  
  // Hook: AFTER successful request
  // Store ETag and Last-Modified headers from response
  octokit.hook.after('request', async (response, options) => {
    const fullUrl = options.baseUrl + options.url
    
    // Extract ETag and Last-Modified from response headers
    const etag = response.headers.etag
    const lastModified = response.headers['last-modified']
    
    if (etag || lastModified) {
      const entry: Omit<ETagEntry, 'timestamp'> = {
        etag: etag || '',
        lastModified: lastModified,
      }
      
      await etagCache.set(fullUrl, entry)
      console.log('[ConditionalRequest] Stored ETag for future requests')
    }
    
    // hook.after is for side effects only - don't return response
  })
  
  // Hook: ERROR handling
  // Convert 304 Not Modified into NotModifiedError
  octokit.hook.error('request', async (error, options) => {
    // Check if this is a 304 Not Modified response
    if (error instanceof RequestError && error.status === 304) {
      const fullUrl = options.baseUrl + options.url
      console.log('[ConditionalRequest] Received 304 Not Modified for:', fullUrl)
      console.log('[ConditionalRequest] Data unchanged since last fetch - use cached data')
      
      throw new NotModifiedError('Data has not been modified since last fetch')
    }
    
    // Re-throw all other errors unchanged
    throw error
  })
  
  return {}
}

// Export a convenience function to check if error is NotModifiedError
export function isNotModifiedError(error: unknown): error is NotModifiedError {
  return error instanceof NotModifiedError || (error as any)?.status === 304
}
