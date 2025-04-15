// Global variables
let currentProjectId = null;
let currentFormId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadProjects();
    loadUsers();
    loadForms();
    setupEventListeners();
    updateStats();
});

// Event Listeners
function setupEventListeners() {
    // Project creation
    document.getElementById('createProjectBtn').addEventListener('click', createProject);
    
    // User creation
    document.getElementById('createUserBtn').addEventListener('click', createUser);
    
    // Form creation
    document.getElementById('createFormBtn').addEventListener('click', createForm);
    document.getElementById('addFieldBtn').addEventListener('click', addFormField);
    
    // Add event listener for form modal opening
    document.getElementById('newFormModal').addEventListener('show.bs.modal', loadProjectsDropdown);
}

// Update stats
async function updateStats() {
    try {
        const [projects, users, forms] = await Promise.all([
            fetch('/api/projects').then(res => res.json()),
            fetch('/api/users').then(res => res.json()),
            fetch('/api/forms').then(res => res.json())
        ]);

        animateValue('projectsCount', 0, projects.length, 1000);
        animateValue('usersCount', 0, users.length, 1000);
        animateValue('formsCount', 0, forms.length, 1000);
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Animate number counting
function animateValue(id, start, end, duration) {
    const element = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        element.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Project Management
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        const projectsList = document.getElementById('projectsList');
        
        projectsList.innerHTML = projects.map(project => `
            <div class="col-md-4 mb-4">
                <div class="card project-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${project.name}</h5>
                        <p class="card-text">
                            <small class="text-muted">Created: ${new Date(project.created_at).toLocaleDateString()}</small>
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-primary">${project.forms_count || 0} Forms</span>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteProject('${project.id}')">
                                <i class="bi bi-trash"></i>
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

async function createProject() {
    const projectName = document.getElementById('projectName').value;
    if (!projectName) {
        showAlert('Please enter a project name', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: projectName })
        });

        if (response.ok) {
            document.getElementById('newProjectModal').querySelector('.btn-close').click();
            document.getElementById('projectName').value = '';
            loadProjects();
            showAlert('Project created successfully', 'success');
        } else {
            throw new Error('Failed to create project');
        }
    } catch (error) {
        console.error('Error creating project:', error);
        showAlert('Error creating project', 'danger');
    }
}

// User Management
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();
        const usersList = document.getElementById('usersList');
        
        usersList.innerHTML = users.map(user => `
            <tr>
                <td>${user.email}</td>
                <td>
                    <span class="badge ${user.is_admin ? 'bg-success' : 'bg-primary'}">
                        ${user.is_admin ? 'Admin' : 'User'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Error loading users', 'danger');
    }
}

async function createUser() {
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;
    const isAdmin = document.getElementById('isAdmin').checked;

    if (!email || !password) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, is_admin: isAdmin })
        });

        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('newUserModal').querySelector('.btn-close').click();
            document.getElementById('userEmail').value = '';
            document.getElementById('userPassword').value = '';
            document.getElementById('isAdmin').checked = false;
            loadUsers();
            showAlert('User created successfully', 'success');
        } else {
            showAlert(data.error || 'Failed to create user', 'danger');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showAlert('Error creating user: ' + error.message, 'danger');
    }
}

// Form Management
async function loadForms() {
    try {
        const response = await fetch('/api/forms');
        const forms = await response.json();
        const formsList = document.getElementById('formsList');
        
        formsList.innerHTML = forms.map(form => `
            <div class="col-md-4 mb-4">
                <div class="card form-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${form.name}</h5>
                        <p class="card-text">
                            <small class="text-muted">Project: ${form.project_name}</small>
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-primary">${form.fields_count || 0} Fields</span>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteForm('${form.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading forms:', error);
        showAlert('Error loading forms', 'danger');
    }
}

function addFormField() {
    const formFields = document.getElementById('formFields');
    const fieldId = Date.now();
    
    const fieldHtml = `
        <div class="form-field-group" id="field-${fieldId}">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6>New Field</h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeField('${fieldId}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="mb-3">
                <label class="form-label">Field Label</label>
                <input type="text" class="form-control" name="field-label-${fieldId}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Field Type</label>
                <select class="form-select" name="field-type-${fieldId}" onchange="handleFieldTypeChange(this, '${fieldId}')">
                    <option value="text">Text Input</option>
                    <option value="number">Number Input</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="radio">Radio Buttons</option>
                    <option value="checkbox">Checkboxes</option>
                </select>
            </div>
            <div id="field-options-${fieldId}" class="mb-3" style="display: none;">
                <label class="form-label">Options (one per line)</label>
                <textarea class="form-control" name="field-options-${fieldId}" rows="3"></textarea>
            </div>
        </div>
    `;
    
    formFields.insertAdjacentHTML('beforeend', fieldHtml);
}

function handleFieldTypeChange(select, fieldId) {
    const optionsDiv = document.getElementById(`field-options-${fieldId}`);
    const fieldTypesWithOptions = ['dropdown', 'radio', 'checkbox'];
    
    if (fieldTypesWithOptions.includes(select.value)) {
        optionsDiv.style.display = 'block';
    } else {
        optionsDiv.style.display = 'none';
    }
}

function removeField(fieldId) {
    document.getElementById(`field-${fieldId}`).remove();
}

async function createForm() {
    const formName = document.getElementById('formName').value;
    const projectId = document.getElementById('formProject').value;
    
    if (!formName || !projectId) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }

    const fields = [];
    const fieldGroups = document.querySelectorAll('.form-field-group');
    
    fieldGroups.forEach(group => {
        const fieldId = group.id.split('-')[1];
        const label = document.querySelector(`input[name="field-label-${fieldId}"]`).value;
        const type = document.querySelector(`select[name="field-type-${fieldId}"]`).value;
        const options = document.querySelector(`textarea[name="field-options-${fieldId}"]`)?.value.split('\n').filter(opt => opt.trim());
        
        fields.push({
            label,
            type,
            options: options || []
        });
    });

    try {
        const response = await fetch('/api/forms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: formName,
                project_id: projectId,
                fields: fields
            })
        });

        if (response.ok) {
            document.getElementById('newFormModal').querySelector('.btn-close').click();
            document.getElementById('formName').value = '';
            document.getElementById('formFields').innerHTML = '';
            loadForms();
            showAlert('Form created successfully', 'success');
        } else {
            throw new Error('Failed to create form');
        }
    } catch (error) {
        console.error('Error creating form:', error);
        showAlert('Error creating form', 'danger');
    }
}

// Add this new function to populate the projects dropdown
async function loadProjectsDropdown() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        const projectSelect = document.getElementById('formProject');
        
        projectSelect.innerHTML = `
            <option value="">Select a project</option>
            ${projects.map(project => `
                <option value="${project.id}">${project.name}</option>
            `).join('')}
        `;
    } catch (error) {
        console.error('Error loading projects for dropdown:', error);
        showAlert('Error loading projects', 'danger');
    }
}

// Utility Functions
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '1000';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Delete Functions
async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadProjects();
            showAlert('Project deleted successfully', 'success');
        } else {
            throw new Error('Failed to delete project');
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        showAlert('Error deleting project', 'danger');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (response.ok) {
            loadUsers();
            showAlert('User deleted successfully', 'success');
        } else {
            throw new Error(data.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert(error.message || 'Error deleting user', 'danger');
    }
}

async function deleteForm(formId) {
    if (!confirm('Are you sure you want to delete this form?')) return;
    
    try {
        const response = await fetch(`/api/forms/${formId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadForms();
            showAlert('Form deleted successfully', 'success');
        } else {
            throw new Error('Failed to delete form');
        }
    } catch (error) {
        console.error('Error deleting form:', error);
        showAlert('Error deleting form', 'danger');
    }
} 