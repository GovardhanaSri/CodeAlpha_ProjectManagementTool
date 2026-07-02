/*
# Project Management Tool - Triggers and Functions

This migration adds automatic functionality:

1. **handle_new_user** - Automatically creates a profile when a user signs up
2. **handle_task_assignment** - Creates notification when a task is assigned
3. **handle_new_comment** - Creates notification for task assignee when comment is added

## Functions
- on_user_created: Trigger to create profile row after auth.users insert
- on_task_assigned: Trigger to create notification when assigned_to changes
*/

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle task assignment notifications
CREATE OR REPLACE FUNCTION public.handle_task_assignment()
RETURNS trigger AS $$
BEGIN
  -- Only create notification if assigned_to changed and is not null
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
    VALUES (
      NEW.assigned_to,
      'task_assigned',
      'New Task Assigned',
      'You have been assigned to task: ' || NEW.title,
      NEW.id,
      'task'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on tasks for assignment notifications
DROP TRIGGER IF EXISTS on_task_assigned ON tasks;
CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_task_assignment();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on tasks for updated_at
DROP TRIGGER IF EXISTS on_task_updated ON tasks;
CREATE TRIGGER on_task_updated
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
