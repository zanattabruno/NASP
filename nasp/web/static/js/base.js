/**
 * Base utility functions and common functionality
 */

// Global configuration
const CONFIG = {
    BASE_URL: "http://localhost:5000",
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
        return new Promise((resolve, reject) => {
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

            $.ajax(settings)
                .done(resolve)
                .fail(reject);
        });
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
 * Initialize common functionality when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Base utilities loaded');
    
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

// Export to global scope for backward compatibility
window.Utils = Utils;
window.CONFIG = CONFIG;

// Export navigation functions to global scope
window.navigateWithLoader = Navigation.navigateWithLoader.bind(Navigation);
