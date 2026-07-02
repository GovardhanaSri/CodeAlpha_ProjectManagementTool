/*
# Fix RLS for comments table

The comments policies reference tasks -> projects which can cause issues.
Fix by using helper function.
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "comments_select_member" ON comments;
DROP POLICY IF EXISTS "comments_insert_member" ON comments;

-- Create helper function to check comment access (via task's project)
CREATE OR REPLACE FUNCTION public.has_comment_access(comment_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.comments c
    JOIN public.tasks t ON t.id = c.task_id
    WHERE c.id = comment_uuid
    AND public.has_project_access(t.project_id, user_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate comments policies
CREATE POLICY "comments_select_member" ON comments FOR SELECT
  TO authenticated USING (
    public.has_project_access(
      (SELECT project_id FROM tasks WHERE tasks.id = comments.task_id),
      auth.uid()
    )
  );

CREATE POLICY "comments_insert_member" ON comments FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    public.has_project_access(
      (SELECT project_id FROM tasks WHERE tasks.id = comments.task_id),
      auth.uid()
    )
  );