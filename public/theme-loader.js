/**
 * Theme Loader Script
 * 
 * Loads BEFORE React to prevent flash of white content (FOWC).
 * Reads cached theme from localStorage and applies dark class immediately.
 * 
 * CRITICAL: This must be loaded as early as possible in index.html
 */

(function() {
  try {
    // Read from localStorage cache (synchronous - no flash!)
    const cachedTheme = localStorage.getItem('gnm-theme-cache');
    
    if (cachedTheme) {
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
      
      // Apply dark class immediately (synchronous, no flash!)
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      }
    }
  } catch (e) {
    // Silently fail - useTheme hook will handle it
    console.error('[Theme Cache] Failed to apply cached theme:', e);
  }
})();
