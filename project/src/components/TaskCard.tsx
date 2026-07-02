import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Profile } from '../lib/supabase';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  members: Profile[];
  onClick: () => void;
}

export function TaskCard({ task, members, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const assignee = members.find((m) => m.id === task.assigned_to);
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`task-card border-l-4 priority-${task.priority} ${
        isDragging ? 'opacity-50 shadow-lg z-50' : ''
      }`}
    >
      <h4 className="font-medium text-secondary-900">{task.title}</h4>

      {task.description && (
        <p className="text-sm text-secondary-500 mt-1 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <span
            className={`badge ${
              task.priority === 'high'
                ? 'badge-danger'
                : task.priority === 'medium'
                ? 'badge-warning'
                : 'badge-success'
            }`}
          >
            {task.priority}
          </span>

          {task.deadline && (
            <span
              className={`text-xs ${isOverdue ? 'text-danger-600' : 'text-secondary-400'}`}
            >
              {format(new Date(task.deadline), 'MMM d')}
            </span>
          )}
        </div>

        {assignee && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700">
              {assignee.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
