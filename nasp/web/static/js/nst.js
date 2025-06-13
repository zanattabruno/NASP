/**
 * NST (Network Slice Template) functionality
 */

const NST = {
    /**
     * Initialize NST functionality
     */
    init: function() {
        console.log('Initializing NST...');
        this.initializeTemplateFormatting();
        this.setupFormValidation();
        
        // Add debug function to window for console access
        window.debugNST = this.debugTemplateData.bind(this);
        
        // Run debug after a short delay to allow DOM to be ready
        setTimeout(() => {
            this.debugTemplateData();
        }, 500);
    },

    /**
     * Initialize template JSON formatting in modals
     */
    initializeTemplateFormatting: function() {
        // Format all template data when modals are shown
        const modals = document.querySelectorAll('[id^="sec-modal"]');
        console.log('Found modals:', modals.length);
        
        modals.forEach(modal => {
            modal.addEventListener('shown.bs.modal', () => {
                const modalId = modal.id;
                const caseId = modalId.replace('sec-modal', '');
                console.log('Modal shown for case ID:', caseId);
                this.formatTemplateData(caseId);
            });
        });
        
        // Also format any existing template data on page load
        setTimeout(() => {
            const preElements = document.querySelectorAll('[id^="teste"]');
            preElements.forEach(preElement => {
                const elementId = preElement.id;
                const caseId = elementId.replace('teste', '');
                if (caseId) {
                    this.formatTemplateData(caseId);
                }
            });
        }, 100);
    },

    /**
     * Format template data for display
     */
    formatTemplateData: function(caseId) {
        const preElement = document.querySelector(`#teste${caseId}`);
        const jsonScript = document.querySelector(`#json-data-${caseId}`);
        
        if (preElement) {
            try {
                let templateData;
                
                // Try to get data from the dedicated script tag first (safer approach)
                if (jsonScript && jsonScript.textContent) {
                    templateData = JSON.parse(jsonScript.textContent);
                }
                // Fallback to data attribute
                else if (preElement.dataset.templateData) {
                    // Clean the data first to handle any encoding issues
                    let rawData = preElement.dataset.templateData;
                    
                    // Decode HTML entities that might have been escaped
                    const textarea = document.createElement('textarea');
                    textarea.innerHTML = rawData;
                    rawData = textarea.value;
                    
                    templateData = JSON.parse(rawData);
                } 
                // Fallback to text content
                else {
                    const textContent = preElement.textContent || preElement.innerText;
                    if (textContent && textContent.trim() !== '' && !textContent.includes('No template data available')) {
                        templateData = JSON.parse(textContent);
                    } else {
                        // Default template structure if no data is available
                        templateData = {
                            "message": "No template data available",
                            "type": "template", 
                            "status": "empty"
                        };
                    }
                }
                
                // Format and display the JSON with better formatting
                preElement.innerHTML = JSON.stringify(templateData, null, 4);
                preElement.classList.remove('template-error');
                preElement.classList.add('template-preview');
                this.highlightJSON(preElement);
                
                console.log(`✅ Successfully formatted template data for case ${caseId}`);
                
            } catch (error) {
                console.error('Error formatting template data for case', caseId, ':', error);
                
                // Try to show the raw data if JSON parsing fails
                let fallbackContent = '';
                if (jsonScript && jsonScript.textContent) {
                    fallbackContent = 'From script tag:\n' + jsonScript.textContent;
                } else if (preElement.dataset.templateData) {
                    fallbackContent = 'From data attribute:\n' + preElement.dataset.templateData;
                } else {
                    fallbackContent = 'No data source found';
                }
                
                const errorInfo = `Template Data Format Error

Error: ${error.message}

Case ID: ${caseId}

Debug Info:
${fallbackContent.substring(0, 500)}${fallbackContent.length > 500 ? '...' : ''}

This error usually occurs when:
1. The JSON contains invalid characters
2. Scientific notation numbers are not properly handled
3. The data was corrupted during transfer

Please check the template configuration or contact support.`;

                preElement.innerHTML = errorInfo;
                preElement.classList.remove('template-preview');
                preElement.classList.add('template-error');
            }
        } else {
            console.warn('Pre element not found for case:', caseId);
        }
    },

    /**
     * Add JSON syntax highlighting
     */
    highlightJSON: function(element) {
        let content = element.innerHTML;
        
        // Highlight JSON syntax
        content = content.replace(/"([^"]+)":/g, '<span class="json-key">"$1":</span>');
        content = content.replace(/:\s*"([^"]*)"/g, ': <span class="json-string">"$1"</span>');
        content = content.replace(/:\s*(\d+(?:\.\d+)?)/g, ': <span class="json-number">$1</span>');
        content = content.replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>');
        content = content.replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
        
        element.innerHTML = content;
    },

    /**
     * Setup form validation for NST creation
     */
    setupFormValidation: function() {
        const form = document.getElementById('slice-template-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.validateAndSubmitForm(form);
            });
        }
    },

    /**
     * Validate and submit NST form
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

        if (!data.ran_template || !data.core_template) {
            alert('Please select both RAN and Core templates');
            return;
        }

        this.createNST(data);
    },

    /**
     * Create NST via API
     */
    createNST: function(data) {
        const uri = "/nasp/nst";
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

        console.log('Creating NST with settings:', settings);

        $.ajax(settings)
            .done((response) => {
                console.log('NST created successfully:', response);
                alert('Network Slice Template created successfully!');
                window.location.href = '/';
            })
            .fail((xhr, status, error) => {
                console.error('NST creation failed:', error);
                alert('Failed to create template. Please try again.');
            });
    },

    /**
     * Export template data
     */
    exportTemplate: function(templateId, templateName) {
        const templateElement = document.querySelector(`#teste${templateId}`);
        if (!templateElement) {
            alert('Template data not found');
            return;
        }

        const templateData = {
            id: templateId,
            name: templateName,
            exported_at: new Date().toISOString(),
            template: templateElement.dataset.templateData ? 
                     JSON.parse(templateElement.dataset.templateData) : 
                     templateElement.textContent
        };

        const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nst-${templateName}-${templateId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Duplicate template
     */
    duplicateTemplate: function(templateId) {
        if (confirm('Create a duplicate of this template?')) {
            // Implementation would need backend support
            alert('Template duplication feature will be implemented');
        }
    },

    /**
     * Debug function to help troubleshoot template data issues
     */
    debugTemplateData: function() {
        console.log('=== NST Template Data Debug ===');
        
        // Check all pre elements with template data
        const preElements = document.querySelectorAll('[id^="teste"]');
        console.log('Found pre elements:', preElements.length);
        
        preElements.forEach((preElement, index) => {
            console.log(`Pre element ${index + 1}:`, {
                id: preElement.id,
                hasDataAttribute: !!preElement.dataset.templateData,
                dataLength: preElement.dataset.templateData ? preElement.dataset.templateData.length : 0,
                textContent: preElement.textContent?.substring(0, 100) + '...',
                classes: preElement.className
            });
            
            if (preElement.dataset.templateData) {
                try {
                    const parsed = JSON.parse(preElement.dataset.templateData);
                    console.log(`✅ Valid JSON for ${preElement.id}`);
                } catch (e) {
                    console.log(`❌ Invalid JSON for ${preElement.id}:`, e.message);
                    console.log('Raw data:', preElement.dataset.templateData.substring(0, 200));
                }
            }
        });
        
        console.log('=== End Debug ===');
    },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('nst-page') || 
        window.location.pathname.includes('nst') || 
        window.location.pathname === '/') {
        NST.init();
    }
});

// Legacy function support
function createNST(form) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    NST.createNST(data);
}

// Export to global scope
window.NST = NST;
window.createNST = createNST;
window.exportTemplate = NST.exportTemplate.bind(NST);
window.duplicateTemplate = NST.duplicateTemplate.bind(NST);
