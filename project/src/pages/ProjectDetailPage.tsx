import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Project, Task, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { KanbanColumn } from '../components/KanbanColumn';
import { TaskModal } from '../components/TaskModal';
import {
  ArrowLeft,
  Settings,
  Calendar,
  Users,
  Plus,
} from 'lucide-react';

type ActiveTask = Task & { assignee?: Profile };

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    if (id && user) {
      fetchProject();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  async function fetchProject() {
    setLoading(true);

    try {
      // Fetch project
      const { data: projectData } = await supabase
        .from('projects')
        .select(`
          *,
          owner:profiles!projects_owner_id_fkey(id, name, avatar_url)
        `)
        .eq('id', id)
        .maybeSingle();

      if (!projectData) {
        navigate('/projects');
        return;
      }

      // Fetch tasks with assignee and creator info
      const { data: taskData } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(id, name, avatar_url),
          creator:profiles!tasks_created_by_fkey(id, name, avatar_url)
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      // Fetch members
      const { data: memberData } = await supabase
        .from('project_members')
        .select(`
          profile:profiles(id, name, avatar_url)
        `)
        .eq('project_id', id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const memberProfiles: Profile[] = (memberData?.map((m: any) => m.profile).filter(Boolean) || []) as Profile[];
      if (projectData.owner) {
        memberProfiles.push(projectData.owner as Profile);
      }

      setProject(projectData);
      setTasks(taskData || []);
      setMembers(memberProfiles);
    } catch (error) {
      console.error('Error fetching project:', error);
    }

    setLoading(false);
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask({
        ...task,
        assignee: members.find((m) => m.id === task.assigned_to),
      });
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as 'todo' | 'in_progress' | 'completed';

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      // Optimistic update
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

      // Update in database
      await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
    }
  }

  function handleTaskClick(task: Task) {
    setEditingTask(task);
    setShowTaskModal(true);
  }

  function handleTaskSaved() {
    setShowTaskModal(false);
    setEditingTask(null);
    fetchProject();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 text-secondary-500 hover:text-secondary-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">{project.title}</h1>
            {project.description && (
              <p className="text-secondary-500 mt-1">{project.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-secondary-500">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{members.length} members</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>
                  Created {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
              {project.deadline && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Due {new Date(project.deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowTaskModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Task</span>
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn-secondary p-2.5"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KanbanColumn
            id="todo"
            title="To Do"
            tasks={todoTasks}
            members={members}
            onTaskClick={handleTaskClick}
          />
          <KanbanColumn
            id="in_progress"
            title="In Progress"
            tasks={inProgressTasks}
            members={members}
            onTaskClick={handleTaskClick}
          />
          <KanbanColumn
            id="completed"
            title="Completed"
            tasks={completedTasks}
            members={members}
            onTaskClick={handleTaskClick}
          />
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="task-card border-2 border-primary-500 shadow-lg">
              <h4 className="font-medium text-secondary-900">{activeTask.title}</h4>
              {activeTask.description && (
                <p className="text-sm text-secondary-500 mt-1 line-clamp-2">
                  {activeTask.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <span
                  className={`badge ${
                    activeTask.priority === 'high'
                      ? 'badge-danger'
                      : activeTask.priority === 'medium'
                      ? 'badge-warning'
                      : 'badge-success'
                  }`}
                >
                  {activeTask.priority}
                </span>
                {activeTask.assignee && (
                  <span className="text-xs text-secondary-400">{activeTask.assignee.name}</span>
                )}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          projectId={id!}
          task={editingTask}
          members={members}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
          onSaved={handleTaskSaved}
        />
      )}
    </div>
  );
}
