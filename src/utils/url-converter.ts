/**
 * Converts GitHub API URLs to web URLs
 * 
 * @param apiUrl - GitHub API URL (e.g., https://api.github.com/repos/owner/repo/pulls/123)
 * @returns Web URL (e.g., https://github.com/owner/repo/pull/123)
 */
export function convertApiUrlToWebUrl(apiUrl: string): string {
  try {
    // API URL format: https://api.github.com/repos/owner/repo/pulls/123
    // Web URL format: https://github.com/owner/repo/pull/123
    
    const url = new URL(apiUrl)
    
    // Only process GitHub API URLs
    if (url.hostname !== 'api.github.com') {
      return apiUrl
    }
    
    // Extract path: /repos/owner/repo/pulls/123
    let path = url.pathname
    
    // Remove /repos prefix
    path = path.replace(/^\/repos\//, '')
    
    // Convert API endpoints to web URLs
    path = path
      .replace('/pulls/', '/pull/')      // Pull requests
      .replace('/issues/', '/issue/')    // Issues
      .replace('/commits/', '/commit/')  // Commits
    
    // Construct web URL with query params and hash preserved
    const webUrl = `https://github.com/${path}${url.search}${url.hash}`
    return webUrl
  } catch (error) {
    console.error('Failed to convert API URL to web URL:', error)
    return apiUrl
  }
}
