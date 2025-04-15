from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user
from datetime import datetime
import re

# Create blueprint
api = Blueprint('api', __name__)

# Project Routes
@api.route('/api/projects', methods=['GET'])
@login_required
def get_projects():
    try:
        response = current_app.supabase.table('projects').select('*').execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/projects', methods=['POST'])
@login_required
def create_project():
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        data = request.get_json()
        project_data = {
            'name': data['name'],
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'camp_date': datetime.now().strftime('%d%m%y')
        }
        
        response = current_app.supabase.table('projects').insert(project_data).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/projects/<project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        response = current_app.supabase.table('projects').delete().eq('id', project_id).execute()
        return jsonify({'message': 'Project deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# User Routes
@api.route('/api/users', methods=['GET'])
@login_required
def get_users():
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        # Get all auth users
        users = current_app.supabase.auth.admin.list_users()
        
        # Get all profiles
        profiles = current_app.supabase.table('profiles').select('*').execute()
        profiles_dict = {p['id']: p for p in profiles.data}
        
        # Combine user data
        user_list = []
        for user in users:
            profile = profiles_dict.get(user.id, {'is_admin': False})
            user_list.append({
                'id': user.id,
                'email': user.email,
                'is_admin': profile.get('is_admin', False)
            })
            
        return jsonify(user_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/users', methods=['POST'])
@login_required
def create_user():
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        data = request.get_json()
        
        # Validate input
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
            
        # Validate email format
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
            
        # Validate password strength
        if len(data['password']) < 8:
            return jsonify({'error': 'Password must be at least 8 characters long'}), 400
            
        # Create auth user
        try:
            auth_response = current_app.supabase.auth.admin.create_user({
                'email': data['email'],
                'password': data['password'],
                'email_confirm': True
            })
        except Exception as auth_error:
            print(f"Auth error: {str(auth_error)}")
            return jsonify({'error': 'Failed to create auth user: ' + str(auth_error)}), 500
            
        if not auth_response.user:
            return jsonify({'error': 'Failed to create auth user'}), 500
            
        # Create profile record
        try:
            profile_data = {
                'id': auth_response.user.id,
                'is_admin': data.get('is_admin', False)
            }
            
            response = current_app.supabase.table('profiles').insert(profile_data).execute()
            if not response.data:
                # If profile creation fails, delete the auth user
                current_app.supabase.auth.admin.delete_user(auth_response.user.id)
                return jsonify({'error': 'Failed to create user profile'}), 500
                
            return jsonify({
                'id': auth_response.user.id,
                'email': auth_response.user.email,
                'is_admin': profile_data['is_admin']
            })
        except Exception as db_error:
            print(f"Database error: {str(db_error)}")
            # If profile creation fails, delete the auth user
            current_app.supabase.auth.admin.delete_user(auth_response.user.id)
            return jsonify({'error': 'Failed to create user profile: ' + str(db_error)}), 500
            
    except Exception as e:
        print(f"General error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api.route('/api/users/<user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        # Delete profile first
        current_app.supabase.table('profiles').delete().eq('id', user_id).execute()
        
        # Then delete the auth user
        current_app.supabase.auth.admin.delete_user(user_id)
        return jsonify({'message': 'User deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Form Routes
@api.route('/api/forms', methods=['GET'])
@login_required
def get_forms():
    try:
        response = current_app.supabase.table('forms').select('*').execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/forms/<form_id>', methods=['GET'])
@login_required
def get_form(form_id):
    try:
        response = current_app.supabase.table('forms').select('*').eq('id', form_id).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/forms', methods=['POST'])
@login_required
def create_form():
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        data = request.get_json()
        form_data = {
            'name': data['name'],
            'project_id': data['project_id'],
            'fields': data['fields']
        }
        
        response = current_app.supabase.table('forms').insert(form_data).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/forms/<form_id>', methods=['DELETE'])
@login_required
def delete_form(form_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        response = current_app.supabase.table('forms').delete().eq('id', form_id).execute()
        return jsonify({'message': 'Form deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Submission Routes
@api.route('/api/submissions', methods=['GET'])
@login_required
def get_submissions():
    try:
        response = current_app.supabase.table('submissions').select('*').eq('user_id', current_user.id).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/submissions/<submission_id>', methods=['GET'])
@login_required
def get_submission(submission_id):
    try:
        response = current_app.supabase.table('submissions').select('*').eq('id', submission_id).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/submissions', methods=['POST'])
@login_required
def create_submission():
    try:
        data = request.get_json()
        
        # Get form details
        form_response = current_app.supabase.table('forms').select('*').eq('id', data['form_id']).execute()
        form = form_response.data[0]
        
        # Get project details
        project_response = current_app.supabase.table('projects').select('*').eq('id', form['project_id']).execute()
        project = project_response.data[0]
        
        # Generate patient ID
        patient_id = f"{project['camp_date']}-{data['patient_number']}"
        
        # Create submission
        submission_data = {
            'user_id': current_user.id,
            'form_id': data['form_id'],
            'patient_id': patient_id,
            'fields': data['fields'],
            'submitted_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        response = current_app.supabase.table('submissions').insert(submission_data).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Project Forms Route
@api.route('/api/projects/<project_id>/forms', methods=['GET'])
@login_required
def get_project_forms(project_id):
    try:
        response = current_app.supabase.table('forms').select('*').eq('project_id', project_id).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500 