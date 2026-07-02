import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Task, Profile } from '../lib/supabase';
import { TaskCard } from './TaskCard';
import { Circle, Clock, CheckCircle2 } from 'lucide-react';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  members: Profile[];
  onTaskClick: (task: Task) => void;
}

export function KanbanColumn({ id, title, tasks, members, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const getIcon = () => {
    switch (id) {
      case 'todo':
        return <Circle className="w-4 h-4 text-secondary-400" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-warning-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-accent-500" />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (id) {
      case 'todo':
        return 'bg-secondary-50';
      case 'in_progress':
        return 'bg-warning-50/50';
      case 'completed':
        return 'bg-accent-50/50';
      default:
        return 'bg-secondary-50';
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`${getBgColor()} rounded-xl p-4 transition-colors ${isOver ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getIcon()}
          <h3 className="font-semibold text-secondary-700">{title}</h3>
        </div>
        <span className="text-sm text-secondary-400 font-medium">{tasks.length}</span>
      </div>

      <div className="space-y-3 min-h-[200px]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              members={members}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="border-2 border-dashed border-secondary-200 rounded-lg p-8 text-center text-secondary-400 text-sm">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}
