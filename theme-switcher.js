/**
 * Theme Switcher - Detects OS dark mode preference and applies it to the page
 * Uses Bootstrap 5.3 data-bs-theme attribute for theming
 */

(function() {
    // Configuration
    const STORAGE_KEY = 'timesheet-theme-preference';
    const THEME_ATTRIBUTE = 'data-bs-theme';
    const LIGHT_THEME = 'light';
    const DARK_THEME = 'dark';

    /**
     * Initialize theme on page load
     */
    function initializeTheme() {
        const savedPreference = localStorage.getItem(STORAGE_KEY);
        
        if (savedPreference) {
            // Use saved preference
            setTheme(savedPreference);
        } else {
            // Use OS preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
            setTheme(prefersDark.matches ? DARK_THEME : LIGHT_THEME);
        }

        // Listen for changes in OS preference
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only auto-switch if user hasn't saved a preference
            if (!localStorage.getItem(STORAGE_KEY)) {
                setTheme(e.matches ? DARK_THEME : LIGHT_THEME);
            }
        });
    }

    /**
     * Set the theme on the HTML element
     * @param {string} theme - 'light' or 'dark'
     */
    function setTheme(theme) {
        const html = document.documentElement;
        
        if (theme === DARK_THEME) {
            html.setAttribute(THEME_ATTRIBUTE, DARK_THEME);
        } else {
            html.setAttribute(THEME_ATTRIBUTE, LIGHT_THEME);
        }
    }

    /**
     * Toggle between light and dark theme
     */
    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute(THEME_ATTRIBUTE) || LIGHT_THEME;
        const newTheme = currentTheme === LIGHT_THEME ? DARK_THEME : LIGHT_THEME;
        
        setTheme(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
    }

    /**
     * Get current theme
     * @returns {string} Current theme ('light' or 'dark')
     */
    function getCurrentTheme() {
        return document.documentElement.getAttribute(THEME_ATTRIBUTE) || LIGHT_THEME;
    }

    /**
     * Reset theme to OS preference
     */
    function resetToSystemPreference() {
        localStorage.removeItem(STORAGE_KEY);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        setTheme(prefersDark.matches ? DARK_THEME : LIGHT_THEME);
    }

    // Export functions globally so they can be used from console or other scripts
    window.ThemeSwitcher = {
        toggle: toggleTheme,
        getCurrent: getCurrentTheme,
        set: setTheme,
        reset: resetToSystemPreference
    };

    // Initialize theme when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTheme);
    } else {
        initializeTheme();
    }
})();
