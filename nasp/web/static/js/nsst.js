/**
 * NSST (Network Subnet Slice Template) functionality
 */

const NSST = {
    /**
     * Initialize NSST functionality
     */
    init: function() {
        this.setupFormValidation();
        this.initializeFileUpload();
        this.addDomainBadges();
    },

    /**
     * Add domain badges to table rows
     */
    addDomainBadges: function() {
        const rows = document.querySelectorAll('#data tbody tr');
        rows.forEach(row => {
            const domainCell = row.cells[0];
            const domain = domainCell.textContent.trim().toLowerCase();
            
            if (domain) {
                domainCell.innerHTML = `<span class="nsst-domain-badge nsst-domain-${domain}">${domain.toUpperCase()}</span>`;
            }
        });
    },

    /**
     * Setup form validation for NSST creation
     */
    setupFormValidation: function() {
        const form = document.getElementById('subslice-template-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.validateAndSubmitForm(form);
            });
        }
    },

    /**
     * Initialize file upload functionality
     */
    initializeFileUpload: function() {
        const fileInput = document.getElementById('inputFile');
        if (fileInput) {
            const uploadArea = fileInput.closest('.form-group');
            if (uploadArea) {
                uploadArea.classList.add('file-upload-area');
                
                // Drag and drop functionality
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('dragover');
                });
                
                uploadArea.addEventListener('dragleave', () => {
                    uploadArea.classList.remove('dragover');
                });
                
                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('dragover');
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        fileInput.files = files;
                        this.handleFileSelection(files[0]);
                    }
                });
                
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) {
                        this.handleFileSelection(e.target.files[0]);
                    }
                });
            }
        }
    },

    /**
     * Handle file selection
     */
    handleFileSelection: function(file) {
        console.log('File selected:', file.name);
        
        // Validate file type
        if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml') && !file.name.endsWith('.json')) {
            alert('Please select a YAML or JSON file');
            return;
        }
        
        // Show file info
        const fileInfo = document.createElement('div');
        fileInfo.className = 'alert alert-info mt-2';
        fileInfo.innerHTML = `
            <i class="bi bi-file-earmark-text me-2"></i>
            Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)
        `;
        
        // Remove existing file info
        const existingInfo = document.querySelector('.file-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        fileInfo.classList.add('file-info');
        document.getElementById('inputFile').parentNode.appendChild(fileInfo);
    },

    /**
     * Validate and submit NSST form
     */
    validateAndSubmitForm: function(form) {
        const formData = new FormData(form);
        const data = {};
        
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Basic validation
        if (!data.name || data.name.trim() === '') {
            alert('Please enter a template name');
            return;
        }

        if (!data.domain) {
            alert('Please select a domain');
            return;
        }

        if (!data.inputInterface) {
            alert('Please select a network component');
            return;
        }

        this.createNSST(data);
    },

    /**
     * Create NSST via API
     */
    createNSST: function(data) {
        console.log('Creating NSST with data:', data);
        
        let uri;
        if (data.domain === "RAN") {
            uri = "/nssmfRAN/nsst";
        } else if (data.domain === "Core") {
            uri = "/nssmfCore/nsst";
        } else {
            alert('Unsupported domain: ' + data.domain);
            return;
        }

        const json = JSON.stringify(data);
        const settings = {
            "url": CONFIG.BASE_URL + uri,
            "method": "PUT",
            "timeout": 0,
            "headers": {
                "Content-Type": "application/json"
            },
            "data": json,
        };

        console.log('NSST creation settings:', settings);

        $.ajax(settings)
            .done((response) => {
                console.log('NSST created successfully:', response);
                alert('Network Subnet Slice Template created successfully!');
                window.location.href = 'nsst';
            })
            .fail((xhr, status, error) => {
                console.error('NSST creation failed:', error);
                alert('Failed to create template. Please try again.');
            });
    },

    /**
     * Export template data
     */
    exportTemplate: function(templateData) {
        const exportData = {
            timestamp: new Date().toISOString(),
            template: templateData,
            exportedBy: 'NASP NSST Management'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nsst-template-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('nsst-page') || 
        window.location.pathname.includes('nsst')) {
        NSST.init();
    }
});

// Legacy function support
function createNSST(form) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    NSST.createNSST(data);
}

function addAMF_temp(form) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    const json = JSON.stringify(data);
    const settings = {
        "url": "http://127.0.0.1:5000/nssmfCore/nsst",
        "method": "PUT",
        "timeout": 0,
        "headers": {
            "Content-Type": "application/json"
        },
        "data": json,
    };

    console.log('AMF template creation settings:', settings);

    $.ajax(settings)
        .done((response) => {
            console.log('AMF template created:', response);
            window.location.href = 'nsst';
        })
        .fail((xhr, status, error) => {
            console.error('AMF template creation failed:', error);
            alert('Failed to create AMF template. Please try again.');
        });
}

// Export to global scope
window.NSST = NSST;
window.createNSST = createNSST;
window.addAMF_temp = addAMF_temp;
