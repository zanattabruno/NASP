/**
 * NST (Network Slice Template) functionality
 */

const NST = {
    /**
     * Initialize NST functionality
     */
    init: function() {
        this.initializeTemplateFormatting();
        this.setupFormValidation();
    },

    /**
     * Initialize template JSON formatting in modals
     */
    initializeTemplateFormatting: function() {
        // Format all template data when modals are shown
        const modals = document.querySelectorAll('[id^="sec-modal"]');
        modals.forEach(modal => {
            modal.addEventListener('shown.bs.modal', () => {
                const modalId = modal.id;
                const caseId = modalId.replace('sec-modal', '');
                this.formatTemplateData(caseId);
            });
        });
    },

    /**
     * Format template data for display
     */
    formatTemplateData: function(caseId) {
        const preElement = document.querySelector(`#teste${caseId}`);
        if (preElement && preElement.dataset.templateData) {
            try {
                const templateData = JSON.parse(preElement.dataset.templateData);
                preElement.innerHTML = JSON.stringify(templateData, null, 2);
                preElement.classList.add('template-preview');
                this.highlightJSON(preElement);
            } catch (error) {
                console.error('Error formatting template data:', error);
                preElement.innerHTML = 'Error formatting template data';
            }
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
    }
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
