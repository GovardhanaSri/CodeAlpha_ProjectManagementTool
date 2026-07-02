/*
# Fix RLS Infinite Recursion

The RLS policies for project_members and projects created circular dependencies.
This migration fixes it by using SECURITY DEFINER functions that bypass RLS for ownership checks.
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "project_members_select_member" ON project_members;
DROP POLICY IF EXISTS "project_members_insert_owner" ON project_members;
DROP POLICY IF EXISTS "project_members_delete_owner" ON project_members;

-- Create helper function to check if user is project owner (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_project_owner(project_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_uuid
    AND projects.owner_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create helper function to check if user is project member (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = project_uuid
    AND project_members.user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate project_members policies using helper functions
CREATE POLICY "project_members_select_member" ON project_members FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    public.is_project_owner(project_id, auth.uid()) OR
    public.is_project_member(project_id, auth.uid())
  );

CREATE POLICY "project_members_insert_owner" ON project_members FOR INSERT
  TO authenticated WITH CHECK (
    public.is_project_owner(project_id, auth.uid())
  );

CREATE POLICY "project_members_delete_owner" ON project_members FOR DELETE
  TO authenticated USING (
    public.is_project_owner(project_id, auth.uid())
  );