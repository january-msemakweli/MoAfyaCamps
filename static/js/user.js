// Global variables
let currentProjectId = null;
let currentFormId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadProjects();
    loadSubmissions();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('submitFormBtn').addEventListener('click', submitForm);
}

// Project Management
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        const projectsList = document.getElementById('projectsList');
        
        projectsList.innerHTML = projects.map(project => `
            <div class="col-md-4">
                <div class="card project-card" data-project-id="${project.id}">
                    <div class="card-body">
                        <h5 class="card-title">${project.name}</h5>
                        <p class="card-text">
                            <small class="text-muted">Created: ${new Date(project.created_at).toLocaleDateString()}</small>
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-primary">${project.forms_count} Forms</span>
                            <button class="btn btn-sm btn-primary" onclick="showProjectForms('${project.id}')">
                                View Forms
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading projects:', error);
        showAlert('Error loading projects', 'danger');
    }
}

async function showProjectForms(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}/forms`);
        const forms = await response.json();
        
        const formsHtml = forms.map(form => `
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${form.name}</h5>
                        <p class="card-text">
                            <small class="text-muted">${form.fields_count} Fields</small>
                        </p>
                        <button class="btn btn-primary" onclick="showForm('${form.id}')">
                            Fill Form
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        const projectsList = document.getElementById('projectsList');
        projectsList.innerHTML = `
            <div class="col-12 mb-3">
                <button class="btn btn-secondary" onclick="loadProjects()">
                    <i class="bi bi-arrow-left"></i> Back to Projects
                </button>
            </div>
            ${formsHtml}
        `;
    } catch (error) {
        console.error('Error loading forms:', error);
        showAlert('Error loading forms', 'danger');
    }
}

// Form Submission
async function showForm(formId) {
    try {
        const response = await fetch(`/api/forms/${formId}`);
        const form = await response.json();
        
        currentFormId = formId;
        document.getElementById('formModalTitle').textContent = form.name;
        
        const formFields = document.getElementById('formFields');
        formFields.innerHTML = form.fields.map(field => {
            let fieldHtml = '';
            
            switch (field.type) {
                case 'text':
                    fieldHtml = `
                        <div class="mb-3">
                            <label class="form-label">${field.label}</label>
                            <input type="text" class="form-control" name="${field.label}" required>
                        </div>
                    `;
                    break;
                    
                case 'number':
                    fieldHtml = `
                        <div class="mb-3">
                            <label class="form-label">${field.label}</label>
                            <input type="number" class="form-control" name="${field.label}" required>
                        </div>
                    `;
                    break;
                    
                case 'dropdown':
                    fieldHtml = `
                        <div class="mb-3">
                            <label class="form-label">${field.label}</label>
                            <select class="form-select" name="${field.label}" required>
                                ${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                            </select>
                        </div>
                    `;
                    break;
                    
                case 'radio':
                    fieldHtml = `
                        <div class="mb-3">
                            <label class="form-label">${field.label}</label>
                            <div>
                                ${field.options.map(opt => `
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="${field.label}" value="${opt}" required>
                                        <label class="form-check-label">${opt}</label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                    break;
                    
                case 'checkbox':
                    fieldHtml = `
                        <div class="mb-3">
                            <label class="form-label">${field.label}</label>
                            <div>
                                ${field.options.map(opt => `
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="${field.label}" value="${opt}">
                                        <label class="form-check-label">${opt}</label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                    break;
            }
            
            return fieldHtml;
        }).join('');
        
        const formModal = new bootstrap.Modal(document.getElementById('formModal'));
        formModal.show();
    } catch (error) {
        console.error('Error loading form:', error);
        showAlert('Error loading form', 'danger');
    }
}

async function submitForm() {
    const patientNumber = document.getElementById('patientNumber').value;
    if (!patientNumber) {
        showAlert('Please enter a patient number', 'warning');
        return;
    }

    const formData = new FormData(document.getElementById('formSubmissionForm'));
    const data = {
        patient_number: patientNumber,
        form_id: currentFormId,
        fields: {}
    };

    // Collect form field values
    formData.forEach((value, key) => {
        if (key !== 'patientNumber') {
            data.fields[key] = value;
        }
    });

    try {
        const response = await fetch('/api/submissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            document.getElementById('formModal').querySelector('.btn-close').click();
            document.getElementById('patientNumber').value = '';
            loadSubmissions();
            showAlert('Form submitted successfully', 'success');
        } else {
            throw new Error('Failed to submit form');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showAlert('Error submitting form', 'danger');
    }
}

// Submissions Management
async function loadSubmissions() {
    try {
        const response = await fetch('/api/submissions');
        const submissions = await response.json();
        const submissionsList = document.getElementById('submissionsList');
        
        submissionsList.innerHTML = submissions.map(submission => `
            <tr>
                <td>${submission.project_name}</td>
                <td>${submission.form_name}</td>
                <td>${submission.patient_id}</td>
                <td>${new Date(submission.submitted_at).toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewSubmission('${submission.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading submissions:', error);
        showAlert('Error loading submissions', 'danger');
    }
}

async function viewSubmission(submissionId) {
    try {
        const response = await fetch(`/api/submissions/${submissionId}`);
        const submission = await response.json();
        
        // Create modal content
        const modalContent = `
            <div class="modal-header">
                <h5 class="modal-title">Submission Details</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <p><strong>Project:</strong> ${submission.project_name}</p>
                <p><strong>Form:</strong> ${submission.form_name}</p>
                <p><strong>Patient ID:</strong> ${submission.patient_id}</p>
                <p><strong>Submitted:</strong> ${new Date(submission.submitted_at).toLocaleString()}</p>
                <hr>
                <h6>Form Data:</h6>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Field</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(submission.fields).map(([key, value]) => `
                                <tr>
                                    <td>${key}</td>
                                    <td>${value}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        `;
        
        // Create and show modal
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'submissionModal';
        modalDiv.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    ${modalContent}
                </div>
            </div>
        `;
        
        document.body.appendChild(modalDiv);
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();
        
        // Clean up modal after it's closed
        modalDiv.addEventListener('hidden.bs.modal', function() {
            document.body.removeChild(modalDiv);
        });
    } catch (error) {
        console.error('Error loading submission:', error);
        showAlert('Error loading submission', 'danger');
    }
}

// Utility Functions
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
} 