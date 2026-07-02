import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, TaskStats } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

interface DashboardStats {
  totalProjects: number;
  totalTasks: TaskStats;
  ownedProjects: number;
  assignedTasks: number;
}

interface RecentProject {
  id: string;
  title: string;
  description: string | null;
}

interface AssignedTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  project_id: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalTasks: { total: 0, todo: 0, in_progress: 0, completed: 0 },
    ownedProjects: 0,
    assignedTasks: 0,
  });
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchDashboardData() {
    setLoading(true);

    try {
      // Fetch owned projects
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('id, title, description, created_at, deadline')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch member projects
      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user!.id);

      const memberProjectIds = memberProjects?.map((m) => m.project_id) || [];
      const allProjectIds = [
        ...(ownedProjects?.map((p) => p.id) || []),
        ...memberProjectIds,
      ];

      // Fetch tasks for all projects
      interface TaskStatusInfo { id: string; status: string; assigned_to: string | null }
      let allTasks: TaskStatusInfo[] = [];
      if (allProjectIds.length > 0) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, status, assigned_to')
          .in('project_id', allProjectIds);
        allTasks = (tasks as TaskStatusInfo[]) || [];
      }

      // Fetch assigned tasks
      const { data: myTasks } = await supabase
        .from('tasks')
        .select('id, title, status, priority, deadline, project_id')
        .eq('assigned_to', user!.id)
        .neq('status', 'completed')
        .order('deadline', { ascending: true })
        .limit(5);

      const myTasksList = (myTasks as AssignedTask[]) || [];

      // Calculate stats
      const taskStats: TaskStats = {
        total: allTasks.length,
        todo: allTasks.filter((t) => t.status === 'todo').length,
        in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
        completed: allTasks.filter((t) => t.status === 'completed').length,
      };

      setStats({
        totalProjects: allProjectIds.length,
        totalTasks: taskStats,
        ownedProjects: ownedProjects?.length || 0,
        assignedTasks: myTasksList.length,
      });

      setRecentProjects((ownedProjects as RecentProject[]) || []);
      setAssignedTasks(myTasksList);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
        <p className="text-secondary-500 mt-1">Welcome back! Here's your project overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-secondary-500">Total Projects</p>
              <p className="text-3xl font-bold text-secondary-900 mt-1">{stats.totalProjects}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-primary-600" />
            </div>
          </div>
          <Link
            to="/projects"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-4"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-secondary-500">Total Tasks</p>
              <p className="text-3xl font-bold text-secondary-900 mt-1">{stats.totalTasks.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-secondary-600" />
            </div>
          </div>
          <div className="flex gap-4 mt-4 text-sm">
            <span className="text-secondary-600">{stats.totalTasks.todo} To Do</span>
            <span className="text-warning-600">{stats.totalTasks.in_progress} In Progress</span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-secondary-500">Completed</p>
              <p className="text-3xl font-bold text-accent-600 mt-1">{stats.totalTasks.completed}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-accent-600" />
            </div>
          </div>
          <p className="text-sm text-secondary-500 mt-4">
            {stats.totalTasks.total > 0
              ? Math.round((stats.totalTasks.completed / stats.totalTasks.total) * 100)
              : 0}
            % completion rate
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-secondary-500">My Tasks</p>
              <p className="text-3xl font-bold text-warning-600 mt-1">{stats.assignedTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning-600" />
            </div>
          </div>
          <p className="text-sm text-secondary-500 mt-4">Pending assignments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="card">
          <div className="p-6 border-b border-secondary-100">
            <h2 className="font-semibold text-secondary-900">Recent Projects</h2>
          </div>
          <div className="p-4">
            {recentProjects.length === 0 ? (
              <div className="text-center py-8">
                <FolderKanban className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                <p className="text-secondary-500">No projects yet</p>
                <Link to="/projects" className="btn-primary mt-4 inline-flex">
                  Create Project
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block p-4 rounded-lg border border-secondary-100 hover:border-primary-200 hover:bg-primary-50/50 transition-colors"
                  >
                    <h3 className="font-medium text-secondary-900">{project.title}</h3>
                    {project.description && (
                      <p className="text-sm text-secondary-500 mt-1 line-clamp-1">
                        {project.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assigned Tasks */}
        <div className="card">
          <div className="p-6 border-b border-secondary-100">
            <h2 className="font-semibold text-secondary-900">My Tasks</h2>
          </div>
          <div className="p-4">
            {assignedTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-accent-300 mx-auto mb-3" />
                <p className="text-secondary-500">All caught up!</p>
                <p className="text-sm text-secondary-400 mt-1">No pending tasks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedTasks.map((task) => (
                  <Link
                    key={task.id}
                    to={`/projects/${task.project_id}`}
                    className="flex items-center gap-3 p-4 rounded-lg border border-secondary-100 hover:border-primary-200 transition-colors"
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${
                        task.priority === 'high'
                          ? 'bg-danger-500'
                          : task.priority === 'medium'
                          ? 'bg-warning-500'
                          : 'bg-accent-500'
                      }`}
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-secondary-900">{task.title}</h3>
                      {task.deadline && (
                        <p className="text-xs text-secondary-400 mt-0.5">
                          Due: {new Date(task.deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span
                      className={`badge ${
                        task.status === 'todo'
                          ? 'badge-secondary'
                          : task.status === 'in_progress'
                          ? 'badge-warning'
                          : 'badge-success'
                      }`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 card p-6">
        <h2 className="font-semibold text-secondary-900 mb-4">Task Progress</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-secondary-600">To Do</span>
              <span className="text-secondary-900 font-medium">{stats.totalTasks.todo}</span>
            </div>
            <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary-400 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    stats.totalTasks.total > 0
                      ? (stats.totalTasks.todo / stats.totalTasks.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-warning-600">In Progress</span>
              <span className="text-secondary-900 font-medium">{stats.totalTasks.in_progress}</span>
            </div>
            <div className="h-2 bg-warning-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-warning-500 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    stats.totalTasks.total > 0
                      ? (stats.totalTasks.in_progress / stats.totalTasks.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-accent-600">Completed</span>
              <span className="text-secondary-900 font-medium">{stats.totalTasks.completed}</span>
            </div>
            <div className="h-2 bg-accent-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-500 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    stats.totalTasks.total > 0
                      ? (stats.totalTasks.completed / stats.totalTasks.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
