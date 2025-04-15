# MoAfyaCamps

A dynamic Flask web application for real-time, multi-user health camp data collection.

## Features

- User Management
  - Admin and regular user roles
  - Secure authentication
  - User management for admins

- Project System
  - Create and manage health camp projects
  - Automatic camp date capture
  - Project-specific forms

- Dynamic Form Builder
  - Create custom forms with various field types
  - Support for text, number, dropdown, radio, and checkbox fields
  - Dynamic form rendering

- Form Submission
  - Patient ID generation
  - Real-time data collection
  - Submission history

- Supabase Integration
  - Secure data storage
  - Real-time updates
  - Scalable backend

## Tech Stack

- Backend: Flask, Flask-Login
- Database: Supabase (PostgreSQL)
- Frontend: Jinja2, HTML, CSS, Bootstrap
- Authentication: Supabase Auth

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/MoAfyaCamps.git
cd MoAfyaCamps
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the project root with the following variables:
```
SECRET_KEY=your-secret-key-here
SUPABASE_URL=your-supabase-url-here
SUPABASE_KEY=your-supabase-key-here
```

5. Set up Supabase:
   - Create a new Supabase project
   - Create the following tables:
     - users
     - projects
     - forms
     - submissions
   - Enable authentication
   - Set up appropriate RLS policies

6. Run the application:
```bash
python app.py
```

## Database Schema

### Users Table
```sql
create table users (
  id uuid references auth.users on delete cascade,
  email text,
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (id)
);
```

### Projects Table
```sql
create table projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  camp_date text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

### Forms Table
```sql
create table forms (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects on delete cascade,
  name text not null,
  fields jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

### Submissions Table
```sql
create table submissions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users on delete cascade,
  form_id uuid references forms on delete cascade,
  patient_id text not null,
  fields jsonb not null,
  submitted_at timestamp with time zone default timezone('utc'::text, now())
);
```

## Usage

1. Access the application at `http://localhost:5000`
2. Log in as an admin to:
   - Create and manage users
   - Create projects
   - Design forms
3. Log in as a regular user to:
   - View available projects
   - Fill and submit forms
   - View submission history

## Security

- All routes are protected with authentication
- Admin-only routes have additional authorization checks
- Sensitive data is stored securely in Supabase
- Passwords are hashed using Supabase Auth
- CSRF protection is enabled
- Secure session management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 