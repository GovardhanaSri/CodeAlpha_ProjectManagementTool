/*
# Fix RLS for tasks table

The tasks policies reference projects which references project_members - circular.
Fix by using helper functions.
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "tasks_select_member" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_member" ON tasks;
DROP POLICY IF EXISTS "tasks_update_member" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_member" ON tasks;

-- Create helper function to check project access (owner or member)
CREATE OR REPLACE FUNCTION public.has_project_access(project_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN public.is_project_owner(project_uuid, user_uuid) OR
         public.is_project_member(project_uuid, user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate tasks policies using helper function
CREATE POLICY "tasks_select_member" ON tasks FOR SELECT
  TO authenticated USING (
    public.has_project_access(project_id, auth.uid())
  );

CREATE POLICY "tasks_insert_member" ON tasks FOR INSERT
  TO authenticated WITH CHECK (
    public.has_project_access(project_id, auth.uid())
  );

CREATE POLICY "tasks_update_member" ON tasks FOR UPDATE
  TO authenticated USING (
    public.has_project_access(project_id, auth.uid())
  ) WITH CHECK (
    public.has_project_access(project_id, auth.uid())
  );

CREATE POLICY "tasks_delete_member" ON tasks FOR DELETE
  TO authenticated USING (
    public.has_project_access(project_id, auth.uid())
  );