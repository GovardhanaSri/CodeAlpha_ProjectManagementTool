/*
# Fix RLS for projects table

The projects SELECT policy references project_members which references projects - circular.
Fix by using the helper function for member check.
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "projects_select_member" ON projects;

-- Recreate using the helper function (bypasses RLS via SECURITY DEFINER)
CREATE POLICY "projects_select_member" ON projects FOR SELECT
  TO authenticated USING (
    auth.uid() = owner_id OR
    public.is_project_member(id, auth.uid())
  );