from flask import Flask, render_template, request, redirect, url_for, flash, current_app, jsonify
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from supabase import create_client, Client
from datetime import datetime
import os
from dotenv import load_dotenv
from routes import api

# Load environment variables
load_dotenv()

# Debug logging for environment variables
supabase_url = os.getenv('SUPABASE_URL')
supabase_service_key = os.getenv('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_service_key:
    raise ValueError(
        "Missing required environment variables. "
        "Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set."
    )

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'MoAfyaCamps')

# Initialize Supabase client
supabase: Client = create_client(
    supabase_url,
    supabase_service_key,
    options={
        'headers': {
            'X-Client-Info': 'moafyacamps-flask'
        },
        'auth': {
            'autoRefreshToken': True,
            'persistSession': True
        }
    }
)

# Make supabase client available in app context
app.supabase = supabase

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# User class for Flask-Login
class User(UserMixin):
    def __init__(self, id, email, is_admin):
        self.id = id
        self.email = email
        self.is_admin = is_admin

@login_manager.user_loader
def load_user(user_id):
    try:
        # First get the user from auth.users
        auth_user = supabase.auth.admin.get_user(user_id)
        if not auth_user:
            return None
            
        # Then get the profile data
        profile = supabase.table('profiles').select('*').eq('id', user_id).execute()
        if not profile.data:
            return None
            
        return User(
            auth_user.user.id,
            auth_user.user.email,
            profile.data[0]['is_admin']
        )
    except Exception as e:
        print(f"Error loading user: {str(e)}")
        return None

# Register API routes
app.register_blueprint(api)

# Routes
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        try:
            # Special case for admin user first login
            if email == "admin@moafyacamps.com" and password == "Admin@123":
                try:
                    # Try to sign in first
                    auth = supabase.auth.sign_in_with_password({
                        'email': email,
                        'password': password
                    })
                except:
                    # If sign in fails, create the admin account
                    auth = supabase.auth.sign_up({
                        'email': email,
                        'password': password
                    })
                    
                    # Create admin profile
                    supabase.table('profiles').insert({
                        'id': auth.user.id,
                        'is_admin': True
                    }).execute()
            else:
                # Regular user login
                auth = supabase.auth.sign_in_with_password({
                    'email': email,
                    'password': password
                })
            
            if auth.user:
                # Get profile data
                profile = supabase.table('profiles').select('*').eq('id', auth.user.id).execute()
                is_admin = profile.data[0]['is_admin'] if profile.data else False
                
                # Create User object and login
                user = User(auth.user.id, auth.user.email, is_admin)
                login_user(user)
                return redirect(url_for('dashboard'))
                
        except Exception as e:
            print(f"Login error: {str(e)}")
            flash('Invalid email or password')
            
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    if current_user.is_admin:
        return render_template('admin_dashboard.html')
    return render_template('user_dashboard.html')

# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 10000))
    app.run(host='0.0.0.0', port=port) 