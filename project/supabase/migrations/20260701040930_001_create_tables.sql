/*
# Project Management Tool - Tables Setup

This migration creates all database tables for the project management platform.

## New Tables

1. **profiles** - Extended user information linked to Supabase auth
   - id (uuid, primary key, references auth.users)
   - name (text, user's display name)
   - avatar_url (text, optional profile image URL)
   - created_at (timestamp)

2. **projects** - Project containers
   - id (uuid, primary key)
   - title (text, project name)
   - description (text, project details)
   - owner_id (uuid, references profiles, defaults to authenticated user)
   - deadline (timestamp, optional project deadline)
   - created_at (timestamp)

3. **project_members** - Project team membership (junction table)
   - id (uuid, primary key)
   - project_id (uuid, references projects)
   - user_id (uuid, references profiles)
   - role (text, default 'member', can be 'owner' or 'member')
   - joined_at (timestamp)

4. **tasks** - Task items within projects
   - id (uuid, primary key)
   - project_id (uuid, references projects)
   - title (text, task name)
   - description (text, task details)
   - status (text, 'todo', 'in_progress', or 'completed')
   - priority (text, 'low', 'medium', or 'high')
   - assigned_to (uuid, references profiles, optional)
   - deadline (timestamp, optional task deadline)
   - created_by (uuid, references profiles)
   - created_at (timestamp)
   - updated_at (timestamp)

5. **comments** - Task discussion
   - id (uuid, primary key)
   - task_id (uuid, references tasks)
   - user_id (uuid, references profiles)
   - message (text, comment content)
   - created_at (timestamp)

6. **notifications** - User notifications
   - id (uuid, primary key)
   - user_id (uuid, references profiles, recipient)
   - type (text, 'task_assigned', 'deadline_reminder', 'comment', etc.)
   - title (text, notification headline)
   - message (text, notification content)
   - read (boolean, default false)
   - related_id (uuid, optional reference to related entity)
   - related_type (text, 'task', 'project', 'comment')
   - created_at (timestamp)

All tables have Row Level Security enabled.
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  deadline timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Project members junction table
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  deadline timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraint for valid status values
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'completed'));

-- Add constraint for valid priority values
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  related_id uuid,
  related_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
