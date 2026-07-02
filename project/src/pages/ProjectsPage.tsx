import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Project } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus,
  Search,
  FolderKanban,
  Calendar,
  Users,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react';
import { CreateProjectModal } from '../components/CreateProjectModal';

export function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchProjects() {
    setLoading(true);

    try {
      // Fetch owned projects
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select(`
          *,
          owner:profiles!projects_owner_id_fkey(id, name, avatar_url)
        `)
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });

      // Fetch member projects
      const { data: memberProjects } = await supabase
        .from('project_members')
        .select(`
          project:projects(
            *,
            owner:profiles!projects_owner_id_fkey(id, name, avatar_url)
          )
        `)
        .eq('user_id', user!.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const memberProjectsList = ((memberProjects?.map((m: any) => m.project).filter(Boolean) || []) as Project[]);

      // Get task counts for each project
      const allProjects = [...(ownedProjects || []), ...memberProjectsList];
      const projectIds = allProjects.map((p) => p.id);

      if (projectIds.length > 0) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('project_id, status')
          .in('project_id', projectIds);

        const projectTaskCounts: Record<string, { total: number; completed: number }> = {};
        tasks?.forEach((task) => {
          if (!projectTaskCounts[task.project_id]) {
            projectTaskCounts[task.project_id] = { total: 0, completed: 0 };
          }
          projectTaskCounts[task.project_id].total++;
          if (task.status === 'completed') {
            projectTaskCounts[task.project_id].completed++;
          }
        });

        const projectsWithStats = allProjects.map((project) => ({
          ...project,
          task_count: projectTaskCounts[project.id]?.total || 0,
          completed_task_count: projectTaskCounts[project.id]?.completed || 0,
        }));

        // Remove duplicates (in case user is both owner and member)
        const uniqueProjects = projectsWithStats.filter(
          (project, index, self) => index === self.findIndex((p) => p.id === project.id)
        );

        setProjects(uniqueProjects);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }

    setLoading(false);
  }

  async function deleteProject(projectId: string) {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase.from('projects').delete().eq('id', projectId);

    if (!error) {
      setProjects(projects.filter((p) => p.id !== projectId));
    }
    setMenuOpenId(null);
  }

  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Projects</h1>
          <p className="text-secondary-500 mt-1">Manage and organize your projects</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects..."
          className="input-field pl-10"
        />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            {searchQuery ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="text-secondary-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Create your first project to start organizing your tasks'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mt-6 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div key={project.id} className="card-hover group">
              <Link to={`/projects/${project.id}`} className="block p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-primary-600" />
                  </div>
                  <div
                    className="relative"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setMenuOpenId(menuOpenId === project.id ? null : project.id);
                      }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary-100 transition-all"
                    >
                      <MoreVertical className="w-5 h-5 text-secondary-400" />
                    </button>

                    {menuOpenId === project.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpenId(null)}
                        />
                        <div className="dropdown z-20 animate-scale-in">
                          <Link
                            to={`/projects/${project.id}`}
                            className="dropdown-item"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Edit className="w-4 h-4" />
                            <span>View & Edit</span>
                          </Link>
                          {project.owner_id === user?.id && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteProject(project.id);
                              }}
                              className="dropdown-item text-danger-600 hover:bg-danger-50 w-full"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-secondary-900 mb-1">{project.title}</h3>
                <p className="text-sm text-secondary-500 line-clamp-2 mb-4">
                  {project.description || 'No description'}
                </p>

                <div className="flex items-center gap-4 text-sm text-secondary-500">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{project.members?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FolderKanban className="w-4 h-4" />
                    <span>{project.task_count || 0} tasks</span>
                  </div>
                  {project.deadline && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {project.task_count && project.task_count > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-secondary-500">Progress</span>
                      <span className="text-secondary-700 font-medium">
                        {Math.round(((project.completed_task_count || 0) / project.task_count) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${((project.completed_task_count || 0) / project.task_count) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} onCreated={fetchProjects} />
      )}
    </div>
  );
}
