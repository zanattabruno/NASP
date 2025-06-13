/**
 * NSI (Network Slice Instances) functionality
 */

const NSI = {
    /**
     * Initialize NSI functionality
     */
    init: function() {
        this.startMetricsUpdates();
        this.updateInstanceStats();
        this.initializeSearch();
    },

    /**
     * Navigate to instance details
     */
    navigateToInstance: function(instanceId) {
        const currentRole = new URLSearchParams(window.location.search).get('role') || 'operator';
        const url = `/nsi/${instanceId}?role=${currentRole}`;
        Utils.navigateWithLoader(url);
    },

    /**
     * Start metrics updates
     */
    startMetricsUpdates: function() {
        setInterval(() => {
            const avgResponseElement = document.querySelector('.card-modern:last-child .card-title');
            if (avgResponseElement) {
                const randomResponse = (Math.random() * 50 + 10).toFixed(1);
                avgResponseElement.innerHTML = randomResponse + 'ms';
            }
        }, 3000);
    },

    /**
     * Update instance statistics
     */
    updateInstanceStats: function() {
        const rows = document.querySelectorAll('#data tbody tr');
        let active = 0, inactive = 0, deploying = 0;
        
        rows.forEach(row => {
            const statusCell = row.cells[3];
            const statusText = statusCell.textContent.toLowerCase().trim();
            
            if (statusText.includes('active')) {
                active++;
            } else if (statusText.includes('inactive')) {
                inactive++;
            } else if (statusText.includes('deploying') || statusText.includes('pending')) {
                deploying++;
            }
        });
        
        const activeEl = document.getElementById('activeCount');
        const inactiveEl = document.getElementById('inactiveCount');
        const deployingEl = document.getElementById('deployingCount');
        
        if (activeEl) activeEl.textContent = active;
        if (inactiveEl) inactiveEl.textContent = inactive;
        if (deployingEl) deployingEl.textContent = deploying;
    },

    /**
     * Terminate slice instance
     */
    terminateInstance: function(instanceId) {
        if (!confirm('Are you sure you want to terminate this slice instance? This action cannot be undone.')) {
            return;
        }

        const button = event.target;
        const originalText = button.innerHTML;
        Utils.showLoading(button, 'Terminating...');

        Utils.makeRequest('DELETE', `${CONFIG.BASE_URL}/nasp/nsi/${instanceId}`)
            .done((response) => {
                console.log('Instance terminated:', response);
                alert('Slice instance terminated successfully.');
                location.reload();
            })
            .fail((xhr, status, error) => {
                console.error('Termination failed:', error);
                alert('Failed to terminate instance. Please try again.');
                Utils.hideLoading(button, originalText);
            });
    },

    /**
     * Restart slice instance
     */
    restartInstance: function(instanceId) {
        if (!confirm('Are you sure you want to restart this slice instance?')) {
            return;
        }

        const button = event.target;
        const originalText = button.innerHTML;
        Utils.showLoading(button, 'Restarting...');

        Utils.makeRequest('POST', `${CONFIG.BASE_URL}/nasp/nsi/${instanceId}/restart`)
            .done((response) => {
                console.log('Instance restarted:', response);
                alert('Slice instance restart initiated successfully.');
                location.reload();
            })
            .fail((xhr, status, error) => {
                console.error('Restart failed:', error);
                alert('Failed to restart instance. Please try again.');
                Utils.hideLoading(button, originalText);
            });
    },

    /**
     * View instance logs
     */
    viewInstanceLogs: function(instanceId) {
        const currentRole = new URLSearchParams(window.location.search).get('role') || 'operator';
        const url = `/nsi/${instanceId}/logs?role=${currentRole}`;
        Utils.navigateWithLoader(url);
    },

    /**
     * Export instances data
     */
    exportInstances: function() {
        const rows = document.querySelectorAll('#data tbody tr');
        const instances = [];
        
        rows.forEach(row => {
            const cells = row.cells;
            instances.push({
                id: cells[0].textContent.trim(),
                name: cells[1].textContent.trim(),
                description: cells[2].textContent.trim(),
                status: cells[3].textContent.trim(),
                created: cells[4] ? cells[4].textContent.trim() : 'N/A'
            });
        });

        const exportData = {
            timestamp: new Date().toISOString(),
            instances: instances,
            total: instances.length,
            exportedBy: 'NASP NSI Management'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'network-slice-instances-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Initialize search functionality for NSI table
     */
    initializeSearch: function() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const rows = document.querySelectorAll('#nsi-data tbody tr');
                
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            });
        }
    },

    /**
     * Filter instances by status
     */
    filterByStatus: function(status) {
        const rows = document.querySelectorAll('#nsi-data tbody tr');
        
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
     * Refresh instances data
     */
    refreshInstances: function() {
        const button = event.target.closest('button');
        const icon = button.querySelector('i');
        icon.classList.add('spin-animation');
        
        // Simulate refresh
        setTimeout(() => {
            icon.classList.remove('spin-animation');
            location.reload();
        }, 1000);
    },

    /**
     * Open metrics dashboard for a slice
     */
    openMetrics: function(snssai) {
        window.open('/dashboard-metrics?s_nssai=' + snssai, '_blank');
    },

    /**
     * View slice details - Navigate to metrics page
     */
    viewSliceDetails: function(snssai) {
        const currentRole = new URLSearchParams(window.location.search).get('role') || 'operator';
        const url = `/dashboard-metrics?s_nssai=${snssai}&role=${currentRole}`;
        Utils.navigateWithLoader(url);
    },

    /**
     * Export slice configuration
     */
    exportSliceConfig: function(snssai) {
        const config = {
            slice_id: snssai,
            exported_at: new Date().toISOString(),
            status: "active",
            configuration: {
                sst: 1,
                sd: snssai,
                type: "eMBB"
            }
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'slice-' + snssai + '-config.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Update instance statistics for dashboard cards
     */
    updateInstanceStatistics: function() {
        const rows = document.querySelectorAll('#nsi-data tbody tr');
        let active = 0, deploying = 0;
        
        rows.forEach(row => {
            const status = row.cells[3].textContent.toLowerCase().trim();
            if (status.includes('active')) active++;
            if (status.includes('deploying')) deploying++;
        });
        
        const activeCountEl = document.getElementById('activeInstancesCount');
        const deployingCountEl = document.getElementById('deployingCount');
        
        if (activeCountEl) activeCountEl.textContent = active;
        if (deployingCountEl) deployingCountEl.textContent = deploying;
    },

    /**
     * Clear environment - Remove all NSI data
     */
    clearEnvironment: function() {
        if (!confirm('Are you sure you want to clear the entire environment? This will remove all network slice instances and cannot be undone.')) {
            return;
        }

        Utils.makeRequest('POST', CONFIG.BASE_URL + '/nasp/clear')
            .done((response) => {
                console.log('Environment cleared successfully:', response);
                alert('Environment cleared successfully!');
                location.reload();
            })
            .fail((xhr, status, error) => {
                console.error('Clear environment failed:', error);
                alert('Failed to clear environment. Please try again.');
            });
    },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('nsi-page')) {
        NSI.init();
        NSI.updateInstanceStatistics();
    }
});

// Export to global scope for backward compatibility
window.NSI = NSI;
window.navigateToInstance = NSI.navigateToInstance.bind(NSI);
window.terminateInstance = NSI.terminateInstance.bind(NSI);
window.restartInstance = NSI.restartInstance.bind(NSI);
window.viewInstanceLogs = NSI.viewInstanceLogs.bind(NSI);

// Export new functions
window.filterByStatus = NSI.filterByStatus.bind(NSI);
window.refreshInstances = NSI.refreshInstances.bind(NSI);
window.openMetrics = NSI.openMetrics.bind(NSI);
window.viewSliceDetails = NSI.viewSliceDetails.bind(NSI);
window.exportSliceConfig = NSI.exportSliceConfig.bind(NSI);
window.clearEnvironment = NSI.clearEnvironment.bind(NSI);
window.clearEnvironment = NSI.clearEnvironment.bind(NSI);
