import { useState, useEffect } from 'react';
import { supabase, Task, Profile, Comment } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Send, Trash2, Calendar, User } from 'lucide-react';

interface TaskModalProps {
  projectId: string;
  task: Task | null;
  members: Profile[];
  onClose: () => void;
  onSaved: () => void;
}

export function TaskModal({ projectId, task, members, onClose, onSaved }: TaskModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setAssignedTo(task.assigned_to || '');
      setDeadline(task.deadline ? task.deadline.split('T')[0] : '');
      fetchComments(task.id);
    }
  }, [task]);

  async function fetchComments(taskId: string) {
    const { data } = await supabase
      .from('comments')
      .select(`
        *,
        profile:profiles(id, name, avatar_url)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    setComments(data || []);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setLoading(true);

    const taskData = {
      project_id: projectId,
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      assigned_to: assignedTo || null,
      deadline: deadline || null,
    };

    let error;
    if (isEditing) {
      const result = await supabase.from('tasks').update(taskData).eq('id', task.id);
      error = result.error;
    } else {
      const result = await supabase.from('tasks').insert({
        ...taskData,
        created_by: user!.id,
      });
      error = result.error;
    }

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onSaved();
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;

    setCommentLoading(true);

    const { data } = await supabase
      .from('comments')
      .insert({
        task_id: task.id,
        user_id: user!.id,
        message: newComment.trim(),
      })
      .select(`
        *,
        profile:profiles(id, name, avatar_url)
      `)
      .maybeSingle();

    if (data) {
      setComments([...comments, data]);
      setNewComment('');
    }

    setCommentLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId);
    setComments(comments.filter((c) => c.id !== commentId));
  };

  const handleDeleteTask = async () => {
    if (!task) return;

    if (!confirm('Are you sure you want to delete this task?')) return;

    await supabase.from('tasks').delete().eq('id', task.id);
    onSaved();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-100">
          <h2 className="text-xl font-semibold text-secondary-900">
            {isEditing ? 'Edit Task' : 'Create Task'}
          </h2>
          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                onClick={handleDeleteTask}
                className="p-2 hover:bg-danger-50 rounded-lg transition-colors text-danger-600"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-secondary-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-secondary-700 mb-1.5">
                Task Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="What needs to be done?"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1.5">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field min-h-[100px] resize-none"
                placeholder="Add more details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-secondary-700 mb-1.5">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Task['status'])}
                  className="input-field"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-secondary-700 mb-1.5">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task['priority'])}
                  className="input-field"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="assignedTo" className="block text-sm font-medium text-secondary-700 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    Assignee
                  </div>
                </label>
                <select
                  id="assignedTo"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="input-field"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-secondary-700 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Deadline
                  </div>
                </label>
                <input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>

          {/* Comments Section */}
          {isEditing && (
            <div className="mt-8 pt-6 border-t border-secondary-100">
              <h3 className="font-semibold text-secondary-900 mb-4">Comments</h3>

              <div className="space-y-4 mb-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-secondary-400 text-center py-4">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        {comment.profile?.avatar_url ? (
                          <img
                            src={comment.profile.avatar_url}
                            alt={comment.profile.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-primary-700">
                            {comment.profile?.name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 bg-secondary-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-secondary-900 text-sm">
                            {comment.profile?.name || 'Unknown'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-secondary-400">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                            {comment.user_id === user?.id && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-secondary-400 hover:text-danger-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-secondary-700 text-sm mt-1">{comment.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Add a comment..."
                  className="input-field flex-1"
                />
                <button
                  onClick={handleAddComment}
                  disabled={commentLoading || !newComment.trim()}
                  className="btn-primary"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
