/**
 * Dashboard functionality for topology, metrics, tracing, and logs
 */

const Dashboard = {
    liveUpdateInterval: null,

    /**
     * Initialize dashboard
     */
    init: function() {
        this.updateNetworkStats();
        this.updateTopologyStatus();
        this.startLiveUpdates();
        
        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementById('autoRefresh');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startLiveUpdates();
                } else {
                    this.stopLiveUpdates();
                }
            });
        }
    },

    /**
     * Start live updates
     */
    startLiveUpdates: function() {
        this.liveUpdateInterval = setInterval(() => {
            this.updateNetworkStats();
            this.updateTopologyStatus();
            this.updateLastRefreshTime();
        }, CONFIG.REFRESH_INTERVAL);
    },

    /**
     * Stop live updates
     */
    stopLiveUpdates: function() {
        if (this.liveUpdateInterval) {
            clearInterval(this.liveUpdateInterval);
        }
    },

    /**
     * Update network statistics
     */
    updateNetworkStats: function() {
        // Simulate real-time network statistics
        const totalNodesEl = document.getElementById('totalNodes');
        const activeNodesEl = document.getElementById('activeNodes');
        const throughputEl = document.getElementById('throughput');
        const latencyEl = document.getElementById('latency');

        if (totalNodesEl) {
            totalNodesEl.textContent = Math.floor(Math.random() * 10) + 15;
        }
        if (activeNodesEl) {
            activeNodesEl.textContent = Math.floor(Math.random() * 5) + 18;
        }
        if (throughputEl) {
            throughputEl.textContent = (Math.random() * 100 + 850).toFixed(1) + ' Mbps';
        }
        if (latencyEl) {
            latencyEl.textContent = (Math.random() * 5 + 12).toFixed(1) + ' ms';
        }
    },

    /**
     * Update topology status indicator
     */
    updateTopologyStatus: function() {
        const statusEl = document.getElementById('topologyStatus');
        if (statusEl) {
            const isConnected = Math.random() > 0.1; // 90% uptime simulation
            statusEl.className = `status-indicator ${isConnected ? '' : 'disconnected'}`;
        }
    },

    /**
     * Update last refresh time
     */
    updateLastRefreshTime: function() {
        const lastUpdateEl = document.getElementById('lastUpdate');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = new Date().toLocaleTimeString();
        }
    },

    /**
     * Refresh topology
     */
    refreshTopology: function() {
        console.log('Refreshing topology...');
        this.updateNetworkStats();
        this.updateTopologyStatus();
        
        // Visual feedback
        const refreshBtn = document.querySelector('[onclick="refreshTopology()"]');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            Utils.showLoading(refreshBtn, 'Refreshing...');
            
            setTimeout(() => {
                Utils.hideLoading(refreshBtn, originalText);
            }, 1500);
        }
    },

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen: function() {
        const topologyContainer = document.querySelector('.topology-container iframe');
        if (topologyContainer) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                topologyContainer.requestFullscreen();
            }
        }
    },

    /**
     * Export topology data
     */
    exportTopology: function() {
        const exportData = {
            timestamp: new Date().toISOString(),
            networkStats: {
                totalNodes: document.getElementById('totalNodes')?.textContent || '0',
                activeNodes: document.getElementById('activeNodes')?.textContent || '0',
                throughput: document.getElementById('throughput')?.textContent || '0',
                latency: document.getElementById('latency')?.textContent || '0'
            },
            exportedBy: 'NASP Dashboard'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'network-topology-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Refresh metrics dashboard
     */
    refreshMetrics: function() {
        const iframe = document.querySelector('.metrics-container embed');
        if (iframe) {
            const src = iframe.src;
            iframe.src = '';
            setTimeout(() => {
                iframe.src = src;
            }, 100);
        }
        console.log('Metrics dashboard refreshed');
    },

    /**
     * Export metrics data
     */
    exportMetrics: function() {
        const exportData = {
            timestamp: new Date().toISOString(),
            type: 'metrics',
            source: 'NASP Dashboard',
            note: 'Metrics data export - actual implementation depends on Grafana API'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nasp-metrics-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Refresh logs dashboard
     */
    refreshLogs: function() {
        const iframe = document.querySelector('.logs-container embed');
        if (iframe) {
            const src = iframe.src;
            iframe.src = '';
            setTimeout(() => {
                iframe.src = src;
            }, 100);
        }
        console.log('Logs dashboard refreshed');
    },

    /**
     * Export logs data
     */
    exportLogs: function() {
        const exportData = {
            timestamp: new Date().toISOString(),
            type: 'logs',
            source: 'NASP Dashboard',
            note: 'Logs data export - actual implementation depends on Loki API'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nasp-logs-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Refresh tracing dashboard
     */
    refreshTracing: function() {
        const iframe = document.querySelector('.tracing-container embed');
        if (iframe) {
            const src = iframe.src;
            iframe.src = '';
            setTimeout(() => {
                iframe.src = src;
            }, 100);
        }
        console.log('Tracing dashboard refreshed');
    },

    /**
     * Export tracing data
     */
    exportTracing: function() {
        const exportData = {
            timestamp: new Date().toISOString(),
            type: 'tracing',
            source: 'NASP Dashboard',
            note: 'Tracing data export - actual implementation depends on Kiali API'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nasp-tracing-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Cleanup on page unload
     */
    cleanup: function() {
        this.stopLiveUpdates();
    }
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('dashboard-page')) {
        Dashboard.init();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    Dashboard.cleanup();
});

// Export to global scope
window.Dashboard = Dashboard;
window.refreshTopology = Dashboard.refreshTopology.bind(Dashboard);
window.toggleFullscreen = Dashboard.toggleFullscreen.bind(Dashboard);
window.exportTopology = Dashboard.exportTopology.bind(Dashboard);

// Export new functions to global scope
window.refreshMetrics = Dashboard.refreshMetrics.bind(Dashboard);
window.exportMetrics = Dashboard.exportMetrics.bind(Dashboard);
window.refreshLogs = Dashboard.refreshLogs.bind(Dashboard);
window.exportLogs = Dashboard.exportLogs.bind(Dashboard);
window.refreshTracing = Dashboard.refreshTracing.bind(Dashboard);
window.exportTracing = Dashboard.exportTracing.bind(Dashboard);
