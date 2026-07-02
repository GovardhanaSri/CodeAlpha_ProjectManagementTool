/*
# Project Management Tool - RLS Policies

This migration adds Row Level Security policies for all tables.

## Security Policies

### profiles
- Users can only read/update their own profile

### projects
- Users can read projects they own or are members of
- Users can create projects (become owner automatically)
- Only owners can update/delete their projects

### project_members
- Members can view who's in their projects
- Only project owners can add/remove members

### tasks
- Project members can CRUD tasks in their projects

### comments
- Project members can view and add comments
- Users can only delete their own comments

### notifications
- Users can only access their own notifications
*/

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Projects policies
DROP POLICY IF EXISTS "projects_select_member" ON projects;
CREATE POLICY "projects_select_member" ON projects FOR SELECT
  TO authenticated USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "projects_insert_owner" ON projects;
CREATE POLICY "projects_insert_owner" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "projects_update_owner" ON projects;
CREATE POLICY "projects_update_owner" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "projects_delete_owner" ON projects;
CREATE POLICY "projects_delete_owner" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- Project members policies
DROP POLICY IF EXISTS "project_members_select_member" ON project_members;
CREATE POLICY "project_members_select_member" ON project_members FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "project_members_insert_owner" ON project_members;
CREATE POLICY "project_members_insert_owner" ON project_members FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "project_members_delete_owner" ON project_members;
CREATE POLICY "project_members_delete_owner" ON project_members FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Tasks policies
DROP POLICY IF EXISTS "tasks_select_member" ON tasks;
CREATE POLICY "tasks_select_member" ON tasks FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND (projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "tasks_insert_member" ON tasks;
CREATE POLICY "tasks_insert_member" ON tasks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND (projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "tasks_update_member" ON tasks;
CREATE POLICY "tasks_update_member" ON tasks FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND (projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND (projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "tasks_delete_member" ON tasks;
CREATE POLICY "tasks_delete_member" ON tasks FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND (projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

-- Comments policies
DROP POLICY IF EXISTS "comments_select_member" ON comments;
CREATE POLICY "comments_select_member" ON comments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = comments.task_id
      AND (projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "comments_insert_member" ON comments;
CREATE POLICY "comments_insert_member" ON comments FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = comments.task_id
      AND (projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "comments_delete_own" ON comments;
CREATE POLICY "comments_delete_own" ON comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Notifications policies
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
