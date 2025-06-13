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
        console.log('Refreshing metrics dashboard...');
        
        // Update timestamp
        const timestampEl = document.querySelector('.last-updated');
        if (timestampEl) {
            timestampEl.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
        }

        // Simulate metrics update
        this.updateMetricCards();
        
        // Show refresh feedback
        const btn = event?.target?.closest('button');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.add('spin-animation');
                setTimeout(() => icon.classList.remove('spin-animation'), 1000);
            }
        }
    },

    /**
     * Refresh logs dashboard
     */
    refreshLogs: function() {
        console.log('Refreshing logs dashboard...');
        
        // Update timestamp
        const timestampEl = document.querySelector('.last-updated');
        if (timestampEl) {
            timestampEl.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
        }

        // Simulate new log entries
        this.addNewLogEntries();
        
        // Show refresh feedback
        const btn = event?.target?.closest('button');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.add('spin-animation');
                setTimeout(() => icon.classList.remove('spin-animation'), 1000);
            }
        }
    },

    /**
     * Refresh tracing dashboard
     */
    refreshTracing: function() {
        console.log('Refreshing tracing dashboard...');
        
        // Update timestamp
        const timestampEl = document.querySelector('.last-updated');
        if (timestampEl) {
            timestampEl.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
        }

        // Simulate trace update
        this.updateTraceData();
        
        // Show refresh feedback
        const btn = event?.target?.closest('button');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.add('spin-animation');
                setTimeout(() => icon.classList.remove('spin-animation'), 1000);
            }
        }
    },

    /**
     * Export metrics data
     */
    exportMetrics: function() {
        const metricsData = {
            timestamp: new Date().toISOString(),
            slice_id: new URLSearchParams(window.location.search).get('s_nssai') || 'unknown',
            metrics: {
                active_sessions: Math.floor(Math.random() * 100) + 50,
                throughput_mbps: (Math.random() * 1000 + 500).toFixed(2),
                latency_ms: (Math.random() * 20 + 5).toFixed(1),
                packet_loss_pct: (Math.random() * 2).toFixed(3)
            }
        };

        const blob = new Blob([JSON.stringify(metricsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'metrics-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Export logs data
     */
    exportLogs: function() {
        const logsData = {
            timestamp: new Date().toISOString(),
            slice_id: new URLSearchParams(window.location.search).get('s_nssai') || 'unknown',
            logs: [
                { level: 'INFO', message: 'Slice initialization completed', timestamp: new Date().toISOString() },
                { level: 'INFO', message: 'UE attachment successful', timestamp: new Date().toISOString() },
                { level: 'WARN', message: 'High latency detected', timestamp: new Date().toISOString() }
            ]
        };

        const blob = new Blob([JSON.stringify(logsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'logs-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Export tracing data
     */
    exportTracing: function() {
        const tracingData = {
            timestamp: new Date().toISOString(),
            slice_id: new URLSearchParams(window.location.search).get('s_nssai') || 'unknown',
            traces: [
                { trace_id: 'trace_001', span_id: 'span_001', operation: 'registration', duration_ms: 150 },
                { trace_id: 'trace_002', span_id: 'span_002', operation: 'authentication', duration_ms: 75 },
                { trace_id: 'trace_003', span_id: 'span_003', operation: 'session_establishment', duration_ms: 200 }
            ]
        };

        const blob = new Blob([JSON.stringify(tracingData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tracing-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Update metric cards with simulated data
     */
    updateMetricCards: function() {
        // Update active sessions
        const sessionEl = document.querySelector('[data-metric="sessions"]');
        if (sessionEl) {
            sessionEl.textContent = Math.floor(Math.random() * 100) + 50;
        }

        // Update throughput
        const throughputEl = document.querySelector('[data-metric="throughput"]');
        if (throughputEl) {
            throughputEl.textContent = (Math.random() * 1000 + 500).toFixed(1) + ' Mbps';
        }

        // Update latency
        const latencyEl = document.querySelector('[data-metric="latency"]');
        if (latencyEl) {
            latencyEl.textContent = (Math.random() * 20 + 5).toFixed(1) + ' ms';
        }
    },

    /**
     * Add new log entries
     */
    addNewLogEntries: function() {
        const logContainer = document.querySelector('.log-entries');
        if (logContainer) {
            const newLog = document.createElement('div');
            newLog.className = 'log-entry';
            newLog.innerHTML = `
                <span class="log-time">${new Date().toLocaleTimeString()}</span>
                <span class="log-level info">INFO</span>
                <span class="log-message">Periodic status update - System healthy</span>
            `;
            logContainer.insertBefore(newLog, logContainer.firstChild);
            
            // Keep only last 100 entries
            while (logContainer.children.length > 100) {
                logContainer.removeChild(logContainer.lastChild);
            }
        }
    },

    /**
     * Update trace data
     */
    updateTraceData: function() {
        const traceContainer = document.querySelector('.trace-timeline');
        if (traceContainer) {
            // Simulate trace update by highlighting recent activity
            const traces = traceContainer.querySelectorAll('.trace-item');
            traces.forEach((trace, index) => {
                if (index < 3) {
                    trace.classList.add('recent-activity');
                    setTimeout(() => trace.classList.remove('recent-activity'), 2000);
                }
            });
        }
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
