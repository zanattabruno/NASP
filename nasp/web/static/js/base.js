/**
 * Base utility functions and common functionality
 */

// Global configuration
const CONFIG = {
    BASE_URL: window.location.origin,
    API_TIMEOUT: 8000,
    REFRESH_INTERVAL: 5000
};

/**
 * Utility functions
 */
const Utils = {
    /**
     * Navigate with loading effect
     */
    navigateWithLoader: function(url) {
        document.body.style.opacity = '0.7';
        window.location.href = url;
    },

    /**
     * Show loading spinner on element
     */
    showLoading: function(element, text = 'Loading...') {
        if (element) {
            element.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${text}`;
            element.disabled = true;
        }
    },

    /**
     * Hide loading spinner and restore element
     */
    hideLoading: function(element, originalText) {
        if (element) {
            element.innerHTML = originalText;
            element.disabled = false;
        }
    },

    /**
     * Make HTTP request with error handling
     */
    makeRequest: function(method, url, data = null, timeout = CONFIG.API_TIMEOUT) {
        const settings = {
            url: url,
            method: method,
            timeout: timeout,
            headers: {
                "Content-Type": "application/json"
            }
        };

        if (data) {
            settings.data = JSON.stringify(data);
        }

        return $.ajax(settings);
    },

    /**
     * Validate IMSI range format
     */
    validateIMSIRange: function(imsiRange) {
        const pattern = /^\d{15}-\d{15}$/;
        if (!pattern.test(imsiRange)) {
            return false;
        }
        
        const [start, end] = imsiRange.split('-').map(Number);
        return start < end;
    },

    /**
     * Parse IMSI range into start and end values
     */
    parseIMSIRange: function(imsiRange) {
        if (!this.validateIMSIRange(imsiRange)) {
            throw new Error('Invalid IMSI range format');
        }
        
        const [start, end] = imsiRange.split('-');
        return { start, end };
    },

    /**
     * Validate hexadecimal key
     */
    validateHexKey: function(key) {
        return /^[0-9A-Fa-f]+$/.test(key) && key.length === 32;
    }
};

/**
 * Enhanced Navigation System
 */
const Navigation = {
    /**
     * Initialize navigation handlers
     */
    init: function() {
        this.setupNavigationHandlers();
        this.setupTabSwitching();
    },

    /**
     * Setup navigation event handlers for data-navigate attributes
     */
    setupNavigationHandlers: function() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-navigate]');
            if (target) {
                e.preventDefault();
                const url = target.getAttribute('data-navigate');
                this.navigateWithLoader(url);
            }
        });
    },

    /**
     * Setup tab switching for body-title navigation
     */
    setupTabSwitching: function() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('.body-title-opt1, .body-title-opt2');
            if (target && target.hasAttribute('data-navigate')) {
                // Remove active class from all tabs
                const tabs = document.querySelectorAll('.body-title-opt1, .body-title-opt2');
                tabs.forEach(tab => tab.classList.remove('active'));
                
                // Add active class to clicked tab
                target.classList.add('active');
            }
        });
    },

    /**
     * Navigate with loading indicator
     */
    navigateWithLoader: function(url) {
        // Show loading state
        document.body.style.opacity = '0.7';
        document.body.style.pointerEvents = 'none';
        
        // Add loading cursor
        document.body.style.cursor = 'wait';
        
        // Navigate after short delay for visual feedback
        setTimeout(() => {
            window.location.href = url;
        }, 300);
    }
};

/**
 * Enhanced menu highlighting functionality
 */
const MenuHighlighter = {
    init: function() {
        this.highlightCurrentPage();
        this.addClickHandlers();
    },

    /**
     * Ensure the current page menu item is highlighted
     */
    highlightCurrentPage: function() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.sidebar .nav-link');
        
        // Remove any existing active classes
        navLinks.forEach(link => link.classList.remove('active'));
        
        // Add active class based on current path
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && this.matchesCurrentPath(href, currentPath)) {
                link.classList.add('active');
            }
        });
    },

    /**
     * Check if the href matches the current path
     */
    matchesCurrentPath: function(href, currentPath) {
        // Remove query parameters for comparison
        const linkPath = href.split('?')[0];
        
        // Handle root path
        if (currentPath === '/' && linkPath === '/') {
            return true;
        }
        
        // Handle other paths
        if (currentPath.includes('/nsi') && linkPath.includes('/nsi')) {
            return true;
        }
        if (currentPath.includes('/catalog') && linkPath.includes('/catalog')) {
            return true;
        }
        if (currentPath.includes('/dashboard') && linkPath.includes('/dashboard')) {
            return true;
        }
        
        return false;
    },

    /**
     * Add click handlers for smooth navigation
     */
    addClickHandlers: function() {
        const navLinks = document.querySelectorAll('.sidebar .nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Add loading state
                this.style.opacity = '0.7';
                setTimeout(() => {
                    this.style.opacity = '1';
                }, 200);
            });
        });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    MenuHighlighter.init();
});

/**
 * Initialize common functionality when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Base utilities loaded');
    
    // CRITICAL FIX: Clean up dropdown positioning issues globally
    setTimeout(() => {
        if (window.cleanupDropdownPositioning) {
            window.cleanupDropdownPositioning();
        }
        if (window.initDropdownWatcher) {
            window.initDropdownWatcher();
        }
    }, 100);
    
    // Add smooth transitions to interactive elements
    const rows = document.querySelectorAll('table tbody tr');
    rows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(5px)';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
    });

    // Initialize navigation when DOM is ready
    Navigation.init();
});

/**
 * Global function to fix dropdown positioning issues
 */
window.cleanupDropdownPositioning = function() {
    // Remove any problematic inline styles from all dropdown menus
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        // Only fix table dropdowns, preserve sidebar dropdowns
        if (menu.closest('.table')) {
            menu.removeAttribute('style');
            menu.style.position = 'absolute';
            menu.style.transform = 'none';
            menu.style.inset = 'auto';
            menu.style.top = '100%';
            menu.style.right = '0';
            menu.style.left = 'auto';
            menu.style.zIndex = '1060';
        }
    });
    
    // Fix any Bootstrap popper positioning data
    document.querySelectorAll('[data-popper-placement]').forEach(element => {
        if (element.closest('.table')) {
            element.removeAttribute('data-popper-placement');
        }
    });
    
    console.log('Dropdown positioning cleanup completed');
};

/**
 * Watch for dynamically created dropdown menus and fix them
 */
window.initDropdownWatcher = function() {
    if (window.dropdownObserver) {
        return; // Already initialized
    }
    
    window.dropdownObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the added node is a dropdown menu or contains one
                        const dropdownMenus = node.classList && node.classList.contains('dropdown-menu') 
                            ? [node] 
                            : node.querySelectorAll ? node.querySelectorAll('.dropdown-menu') : [];
                        
                        dropdownMenus.forEach(menu => {
                            if (menu.closest('.table')) {
                                setTimeout(() => {
                                    menu.removeAttribute('style');
                                    menu.style.position = 'absolute';
                                    menu.style.transform = 'none';
                                    menu.style.inset = 'auto';
                                }, 10);
                            }
                        });
                    }
                });
            }
            
            // Also check for attribute changes that might affect positioning
            if (mutation.type === 'attributes' && 
                mutation.target.classList.contains('dropdown-menu') && 
                mutation.target.closest('.table')) {
                setTimeout(() => {
                    const menu = mutation.target;
                    menu.style.position = 'absolute';
                    menu.style.transform = 'none';
                    menu.style.inset = 'auto';
                }, 10);
            }
        });
    });
    
    window.dropdownObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'data-popper-placement']
    });
};

// Export to global scope for backward compatibility
window.Utils = Utils;
window.CONFIG = CONFIG;

// Export navigation functions to global scope
window.navigateWithLoader = Navigation.navigateWithLoader.bind(Navigation);
