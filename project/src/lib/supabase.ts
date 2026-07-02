import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
};

export type Project = {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  deadline: string | null;
  created_at: string;
  owner?: Profile;
  members?: ProjectMember[];
  task_count?: number;
  completed_task_count?: number;
};

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: Profile;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  deadline: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
  creator?: Profile;
  comments?: Comment[];
};

export type Comment = {
  id: string;
  task_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: Profile;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  related_id: string | null;
  related_type: string | null;
  created_at: string;
};

export type TaskStats = {
  total: number;
  todo: number;
  in_progress: number;
  completed: number;
};

export type ProjectStats = {
  total: number;
  owned: number;
  member: number;
};
