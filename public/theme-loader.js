/**
 * Theme Loader Script
 * 
 * Prevents flash of white content (FOWC) by applying dark mode ASAP.
 * Runs at start of <body> tag, before any content renders.
 * Reads cached theme from localStorage and applies dark class immediately.
 */

(function() {
  try {
    // Read from localStorage cache (synchronous - no flash!)
    const cachedTheme = localStorage.getItem('gnm-theme-cache');
    
    if (!cachedTheme) {
      return; // No cache, let React handle it
    }
    
    const { theme, isPro } = JSON.parse(cachedTheme);
    
    // Free users always get light theme
    if (!isPro) {
      return;
    }
    
    // Resolve theme preference
    let isDark = false;
    if (theme === 'dark') {
      isDark = true;
    } else if (theme === 'system') {
      // Check system preference
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    if (!isDark) {
      return; // Light theme, nothing to do
    }
    
    // Apply dark class immediately (synchronous, no flash!)
    // Both <html> and <body> exist at this point
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    
    console.log('[Theme Cache] Applied cached dark theme');
  } catch (e) {
    // Silently fail - useTheme hook will handle it
    console.error('[Theme Cache] Failed to apply cached theme:', e);
  }
})();
