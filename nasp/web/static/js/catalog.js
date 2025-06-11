/**
 * Catalog functionality for network slice templates
 */

const Catalog = {
    deploymentInProgress: false,

    /**
     * Initialize catalog functionality
     */
    init: function() {
        this.updateStatistics();
        this.initializeSearch();
        this.bindEventListeners();
        this.setupEmergencyHandlers();
    },

    /**
     * Update catalog statistics
     */
    updateStatistics: function() {
        const rows = document.querySelectorAll('#data tbody tr');
        let active = 0, pending = 0, shared = 0;
        
        rows.forEach(row => {
            const status = row.cells[3].textContent.toLowerCase().trim();
            const sharing = row.cells[4].querySelector('i')?.classList.contains('bi-share-fill');
            
            if (status.includes('active')) active++;
            if (status.includes('pending')) pending++;
            if (sharing) shared++;
        });
        
        const activeEl = document.getElementById('activeCount');
        const pendingEl = document.getElementById('pendingCount');
        const sharedEl = document.getElementById('sharedCount');
        
        if (activeEl) activeEl.textContent = active;
        if (pendingEl) pendingEl.textContent = pending;
        if (sharedEl) sharedEl.textContent = shared;
    },

    /**
     * Initialize search functionality
     */
    initializeSearch: function() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterTable(e.target.value.toLowerCase());
            });
        }
    },

    /**
     * Filter table by search term
     */
    filterTable: function(searchTerm) {
        const rows = document.querySelectorAll('#data tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    },

    /**
     * Filter table by status
     */
    filterByStatus: function(status) {
        const rows = document.querySelectorAll('#data tbody tr');
        
        rows.forEach(row => {
            if (status === 'all') {
                row.style.display = '';
            } else {
                const rowStatus = row.cells[3].textContent.toLowerCase().trim();
                row.style.display = rowStatus.includes(status) ? '' : 'none';
            }
        });
    },

    /**
     * Deploy slice from template
     */
    deploySliceFromTemplate: function(templateId, buttonElement) {
        console.log("Starting deployment for template:", templateId);
        
        if (this.deploymentInProgress) {
            console.warn("Deployment already in progress");
            alert("A deployment is already in progress. Please wait or use the Emergency Reset button if needed.");
            return;
        }
        
        try {
            this.deploymentInProgress = true;
            
            // Get form data
            const form = document.getElementById('deploy-form-' + templateId);
            if (!form) {
                throw new Error("Could not find deployment form");
            }
            
            const formData = new FormData(form);
            const object = {};
            formData.forEach((value, key) => object[key] = value);
            
            // Process authentication config if present
            if (object.auth_method) {
                this.processAuthConfig(object);
            }
            
            // Parse template data
            try {
                if (object.template_data) {
                    if (typeof object.template_data === 'string') {
                        object.description = JSON.parse(object.template_data);
                    } else {
                        object.description = object.template_data;
                    }
                } else {
                    object.description = {};
                }
            } catch (e) {
                console.warn("Could not parse template data:", e);
                object.description = object.template_data || {};
            }
            
            // Set button loading state
            const button = buttonElement || event.target;
            const originalText = button.innerHTML;
            Utils.showLoading(button, 'Deploying...');
            
            // Make deployment request
            this.makeDeploymentRequest(object, templateId, button, originalText);
            
        } catch (error) {
            console.error("Error in deploySliceFromTemplate:", error);
            alert("An error occurred during deployment: " + error.message);
            this.deploymentInProgress = false;
        }
    },

    /**
     * Process authentication configuration
     */
    processAuthConfig: function(object) {
        switch (object.auth_method) {
            case 'shared':
                object.auth_config = {
                    method: 'shared',
                    ki: object.shared_ki,
                    opc: object.shared_opc
                };
                break;
            case 'pattern':
                object.auth_config = {
                    method: 'pattern',
                    pattern: object.key_pattern,
                    base_k: object.base_k || null,
                    base_opc: object.base_opc || null
                };
                break;
            default:
                object.auth_config = {
                    method: 'auto'
                };
        }
    },

    /**
     * Make deployment request
     */
    makeDeploymentRequest: function(data, templateId, button, originalText) {
        const requestTimeout = setTimeout(() => {
            alert("Request timed out. Please try again.");
            this.resetDeploymentState(templateId, button, originalText);
        }, CONFIG.API_TIMEOUT);

        Utils.makeRequest('PUT', CONFIG.BASE_URL + '/nasp/nsi', data)
            .done((response) => {
                clearTimeout(requestTimeout);
                console.log("Deployment successful:", response);
                this.handleDeploymentSuccess(templateId, button, originalText);
            })
            .fail((xhr, status, error) => {
                clearTimeout(requestTimeout);
                console.error("Deployment failed:", {xhr, status, error});
                this.handleDeploymentError(xhr, status, error, templateId, button, originalText);
            });
    },

    /**
     * Handle deployment success
     */
    handleDeploymentSuccess: function(templateId, button, originalText) {
        this.deploymentInProgress = false;
        Utils.hideLoading(button, originalText);
        
        // Close modal
        const modal = document.querySelector('#deployModal' + templateId);
        if (modal) {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        }
        
        alert('Slice deployment initiated successfully! Check the Instances tab to see deployment progress.');
    },

    /**
     * Handle deployment error
     */
    handleDeploymentError: function(xhr, status, error, templateId, button, originalText) {
        this.deploymentInProgress = false;
        Utils.hideLoading(button, originalText);
        
        let errorMessage = "Deployment failed. ";
        
        if (status === 'timeout') {
            errorMessage = "Request timed out. The server may be busy. Please try again in a moment.";
        } else if (xhr.responseText) {
            try {
                const errorData = JSON.parse(xhr.responseText);
                errorMessage += errorData.message || errorData.error || xhr.responseText;
            } catch (e) {
                errorMessage += xhr.responseText;
            }
        } else if (xhr.status === 0) {
            errorMessage = "Cannot connect to server. Please check if the server is running and try again.";
        } else {
            errorMessage += "Please check the server logs for details.";
        }
        
        alert(errorMessage);
    },

    /**
     * Reset deployment state
     */
    resetDeploymentState: function(templateId, button, originalText) {
        this.deploymentInProgress = false;
        Utils.hideLoading(button, originalText);
        
        const modal = document.querySelector('#deployModal' + templateId);
        if (modal) {
            modal.style.pointerEvents = 'auto';
            modal.style.opacity = '1';
        }
    },

    /**
     * Check server status
     */
    checkServerStatus: function() {
        const statusButton = event.target;
        const originalText = statusButton.innerHTML;
        Utils.showLoading(statusButton, 'Checking...');
        
        Utils.makeRequest('GET', CONFIG.BASE_URL + '/', null, 3000)
            .done((response) => {
                console.log("Server is running:", response);
                alert("✅ Server is running and accessible");
            })
            .fail((xhr, status, error) => {
                console.error("Server check failed:", status, error);
                if (status === 'timeout') {
                    alert("⚠️ Server connection timed out. The server may be slow or not responding.");
                } else {
                    alert("❌ Server is not accessible. Please start the Flask server.");
                }
            })
            .always(() => {
                Utils.hideLoading(statusButton, originalText);
            });
    },

    /**
     * Emergency unfreeze function
     */
    emergencyUnfreeze: function() {
        console.log("EMERGENCY UNFREEZE ACTIVATED");
        
        this.deploymentInProgress = false;
        
        // Re-enable all deploy buttons
        document.querySelectorAll('[id^="deploy-btn-"]').forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-play-circle me-1"></i>Deploy Now';
        });
        
        // Reset all modals
        document.querySelectorAll('[id^="deployModal"]').forEach(modal => {
            modal.style.pointerEvents = 'auto';
            modal.style.opacity = '1';
        });
        
        // Remove any status messages
        document.querySelectorAll('[id^="deployment-status-"]').forEach(div => div.remove());
        
        alert("Emergency reset completed. All deployment states have been cleared.");
    },

    /**
     * Bind event listeners
     */
    bindEventListeners: function() {
        // Bind deployment buttons using data attributes
        document.querySelectorAll('[data-deploy-template]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const templateId = button.getAttribute('data-deploy-template');
                this.deploySliceFromTemplate(templateId, button);
            });
        });

        // Bind filter dropdown items using data attributes
        document.querySelectorAll('[data-filter]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const status = item.getAttribute('data-filter');
                this.filterByStatus(status);
            });
        });

        // Bind emergency reset button
        const emergencyBtn = document.getElementById('emergency-reset-btn');
        if (emergencyBtn) {
            emergencyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.emergencyUnfreeze();
            });
        }

        // Bind server status button
        const serverStatusBtn = document.getElementById('server-status-btn');
        if (serverStatusBtn) {
            serverStatusBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.checkServerStatus();
            });
        }
    },

    /**
     * Setup emergency handlers
     */
    setupEmergencyHandlers: function() {
        // Keyboard shortcut for emergency unfreeze
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.altKey && e.key === 'u') {
                this.emergencyUnfreeze();
            }
        });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('catalog-page')) {
        Catalog.init();
    }
});

// Export to global scope
window.Catalog = Catalog;
window.deploySliceFromTemplate = Catalog.deploySliceFromTemplate.bind(Catalog);
window.checkServerStatus = Catalog.checkServerStatus.bind(Catalog);
window.emergencyUnfreeze = Catalog.emergencyUnfreeze.bind(Catalog);
