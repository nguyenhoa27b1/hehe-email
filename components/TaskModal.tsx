import React, { useState, useMemo } from 'react';
import { useTasks } from '../context/TaskContext';
import { Task, Role, Status, User, Priority } from '../types';
import UserAvatar from './UserAvatar';

interface TaskModalProps {
  onClose: () => void;
  taskToEdit?: Task;
}

const TaskModal: React.FC<TaskModalProps> = ({ onClose, taskToEdit }) => {
  const { users, currentUser, addTask, updateTask, getUserById, addNotification } = useTasks();

  if (!currentUser) return null;

  const [title, setTitle] = useState(taskToEdit?.title || '');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [assigneeId, setAssigneeId] = useState(taskToEdit?.assigneeId || currentUser.id);
  const [priority, setPriority] = useState<Priority>(taskToEdit?.priority || Priority.Medium);
  
  const today = new Date().toISOString().split('T')[0];
  const [deadline, setDeadline] = useState(taskToEdit?.deadline.toISOString().split('T')[0] || today);
  
  const [score, setScore] = useState(taskToEdit?.score?.toString() || '');
  const [status, setStatus] = useState(taskToEdit?.status || Status.ToDo);

  // State for file submission
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isCreating = !taskToEdit;
  const isViewer = currentUser.role === Role.Viewer;
  const isAdmin = currentUser.role === Role.Admin;
  const isCreator = taskToEdit?.creatorId === currentUser.id;
  const isAssignee = taskToEdit?.assigneeId === currentUser.id;

  const canEditDetails = (isAdmin || isCreating || isCreator) && !isViewer;
  const canChangeAssignee = (isAdmin || (!!taskToEdit && isAssignee)) && !isViewer;
  
  const assigneeOptions = useMemo(() => {
    if (isAdmin || canChangeAssignee) {
      return users;
    }
    return [currentUser];
  }, [isAdmin, canChangeAssignee, users, currentUser]);
  
  const currentAssignee = useMemo(() => getUserById(assigneeId), [assigneeId, getUserById]);

  // Form validation: Checks if required fields are filled.
  const isFormValid = useMemo(() => {
    return title.trim() !== '' && description.trim() !== '' && deadline;
  }, [title, description, deadline]);

  // Form dirty check: Checks if any fields have changed from their initial state.
  const isFormDirty = useMemo(() => {
    if (!taskToEdit) {
      return false; // Not considered "dirty" on create, only invalid/valid.
    }
    
    const deadlineDateString = taskToEdit.deadline.toISOString().split('T')[0];
    const initialScoreString = taskToEdit.score?.toString() || '';

    if (title !== taskToEdit.title) return true;
    if (description !== taskToEdit.description) return true;
    if (assigneeId !== taskToEdit.assigneeId) return true;
    if (deadline !== deadlineDateString) return true;
    if (priority !== taskToEdit.priority) return true;
    
    if (isAdmin) {
      if (status !== taskToEdit.status) return true;
      if (score !== initialScoreString) return true;
    }

    return false;
  }, [title, description, assigneeId, deadline, priority, score, status, taskToEdit, isAdmin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isViewer) return;

    const taskData = {
      title,
      description,
      assigneeId,
      deadline: new Date(`${deadline}T00:00:00`),
      priority,
    };

    if (taskToEdit) {
        const updates: Partial<Task> = { ...taskData };
        
        if(isAdmin) {
            updates.score = score ? Number(score) : undefined;
            updates.status = status;
        }
        updateTask(taskToEdit.id, updates);
    } else {
        addTask(taskData);
    }
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setSelectedFile(e.target.files[0]);
    } else {
        setSelectedFile(null);
    }
  };

  const handleSubmitTask = async () => {
    if (!selectedFile || !taskToEdit || !currentUser) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('submissionFile', selectedFile);

    try {
        const response = await fetch(`/api/tasks/${taskToEdit.id}/submit`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-User-ID': String(currentUser.id), // Include the uploader's ID
            },
        });

        if (!response.ok) {
            let errorMessage = `Upload failed with status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // Error response wasn't JSON.
            }
            throw new Error(errorMessage);
        }
        
        addNotification(`Task "${taskToEdit.title}" submitted successfully.`, 'success');
        onClose();

    } catch (error) {
        console.error('Submission error:', error);
        addNotification(`Submission failed: ${error.message}`, 'reminder');
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-lg p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">{taskToEdit ? (isViewer ? 'View Task' : 'Edit Task') : 'Create New Task'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={!canEditDetails}
              required
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary ${!canEditDetails ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-gray-50 dark:bg-gray-700'}`}
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              readOnly={!canEditDetails}
              required
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary ${!canEditDetails ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-gray-50 dark:bg-gray-700'}`}
            />
          </div>

          {taskToEdit?.submissionFile && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Submitted File</label>
              <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                <a
                  href={`/api/files/${taskToEdit.submissionFile.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-brand-primary hover:text-indigo-400 font-medium transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  <span>{taskToEdit.submissionFile.originalName}</span>
                </a>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label>
            {(isCreating && !isAdmin) || !canChangeAssignee ? (
              <div className="mt-1 flex items-center space-x-3 bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
                {currentAssignee && <UserAvatar name={currentAssignee.name} avatarUrl={currentAssignee.avatarUrl} userId={currentAssignee.id} size="md" />}
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{currentAssignee?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{currentAssignee?.role}</p>
                </div>
              </div>
            ) : (
               <select
                id="assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(Number(e.target.value))}
                required
                disabled={!canChangeAssignee}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary ${!canChangeAssignee ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-gray-50 dark:bg-gray-700'}`}
              >
                {assigneeOptions.map(user => (
                  <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deadline</label>
              <input
                type="date"
                id="deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={isAdmin || isCreating ? today : undefined}
                readOnly={!canEditDetails}
                required
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary ${!canEditDetails ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-gray-50 dark:bg-gray-700'}`}
              />
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                disabled={!canEditDetails}
                required
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary ${!canEditDetails ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-gray-50 dark:bg-gray-700'}`}
              >
                {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {taskToEdit && isAssignee && taskToEdit.status !== Status.Done && !isViewer && (
            <>
                <hr className="my-6 border-gray-200 dark:border-gray-700" />
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Submit Task</h3>
                    <div>
                        <label htmlFor="submissionFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Upload File
                        </label>
                        <input
                            type="file"
                            id="submissionFile"
                            onChange={handleFileSelect}
                            accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.txt,.zip"
                            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 cursor-pointer"
                        />
                        {selectedFile && <p className="text-xs text-gray-500 mt-1">Selected: {selectedFile.name}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={handleSubmitTask}
                        disabled={!selectedFile || isSubmitting}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-secondary hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit & Mark as Done'}
                    </button>
                </div>
            </>
          )}

          {taskToEdit && isAdmin && (
            <>
              <hr className="my-6 border-gray-200 dark:border-gray-700" />
              <h3 className="text-lg font-semibold">Admin Controls</h3>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value as Status)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary bg-gray-50 dark:bg-gray-700">
                    {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="score" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Score (0-100)</label>
                <input
                  type="number"
                  id="score"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  min="0"
                  max="100"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary bg-gray-50 dark:bg-gray-700"
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
              {isViewer ? 'Close' : 'Cancel'}
            </button>
            {!isViewer && (
                <button
                  type="submit"
                  disabled={!isFormValid || (!isCreating && !isFormDirty)}
                  className="bg-brand-primary hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
                >
                  {taskToEdit ? 'Save Changes' : 'Create Task'}
                </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;