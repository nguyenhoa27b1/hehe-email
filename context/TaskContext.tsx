import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { User, Task, Role, Status } from '../types';

// FIX: Removed incorrect import for CredentialResponse, which is a global type defined in google.d.ts.
export interface NotificationType {
  id: string;
  message: string;
  type: 'success' | 'reminder';
}

interface TaskContextType {
  users: User[];
  tasks: Task[];
  currentUser: User | null;
  isAuthenticated: boolean;
  notifications: NotificationType[];
  loginWithGoogle: (response: CredentialResponse) => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  signupWithEmail: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  addTask: (task: Omit<Task, 'id' | 'status' | 'creatorId' | 'submissionFile'>) => void;
  updateTask: (taskId: number, updates: Partial<Task>) => void;
  getUserById: (userId: number) => User | undefined;
  updateUser: (userId: number, updates: Partial<Omit<User, 'id'>>) => void;
  deleteUser: (userId: number) => void;
  removeNotification: (id: string) => void;
  addNotification: (message: string, type: 'success' | 'reminder') => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

/**
 * A JSON reviver function to correctly parse date strings back into Date objects.
 */
const taskDateReviver = (key: string, value: any) => {
    if ((key === 'deadline' || key === 'submittedAt' || key === 'createdAt' || key === 'updatedAt') && value) {
        return new Date(value);
    }
    return value;
};


export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType['type']) => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const rawData = await response.text();
      const { users: fetchedUsers, tasks: fetchedTasks } = JSON.parse(rawData, taskDateReviver);
      
      setUsers(fetchedUsers);
      setTasks(fetchedTasks);
    } catch (error) {
      console.error("Failed to fetch app data:", error);
      addNotification("Could not load app data. Please try again later.", 'reminder');
    }
  }, [addNotification]);
  
  const handleSuccessfulLogin = async (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('loggedInUser', JSON.stringify(user));
    await fetchData();
  };

  const loginWithGoogle = useCallback(async (response: CredentialResponse): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Google Sign-In failed on the server.');
      }
      
      await handleSuccessfulLogin(data);
      return true;
    } catch (error) {
      console.error("Google login error:", error);
      addNotification(error.message, 'reminder');
      return false;
    }
  }, [fetchData, addNotification]);

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed.');
      }
      await handleSuccessfulLogin(data);
      return true;
    } catch (error) {
      console.error("Email login error:", error);
      addNotification(error.message, 'reminder');
      return false;
    }
  }, [fetchData, addNotification]);

  const signupWithEmail = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Sign up failed.');
      }
      await handleSuccessfulLogin(data);
      return true;
    } catch (error) {
      console.error("Email signup error:", error);
      addNotification(error.message, 'reminder');
      return false;
    }
  }, [fetchData, addNotification]);
  
  // Restore session from localStorage
  useEffect(() => {
    const restoreSession = async () => {
        try {
            const savedUserJson = localStorage.getItem('loggedInUser');
            if (savedUserJson) {
                const user = JSON.parse(savedUserJson);
                setCurrentUser(user);
                setIsAuthenticated(true);
                await fetchData();
            }
        } catch (error) {
            console.error("Failed to restore session:", error);
            localStorage.removeItem('loggedInUser');
        }
    };
    restoreSession();
  }, [fetchData]);


  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setTasks([]);
    setUsers([]);
    localStorage.removeItem('loggedInUser');
  }, []);
  
  const getUserById = useCallback((userId: number) => {
    return users.find(u => u.id === userId);
  }, [users]);
  
  const addTask = async (taskData: Omit<Task, 'id' | 'status' | 'creatorId' | 'submissionFile'>) => {
    if (!currentUser) return;
    
    const taskPayload = {
        ...taskData,
        status: Status.ToDo,
        creatorId: currentUser.id,
    };

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskPayload),
        });
        if (!response.ok) throw new Error("Failed to create task on server.");

        const savedTask = JSON.parse(await response.text(), taskDateReviver);
        setTasks(prevTasks => [...prevTasks, savedTask]);
        addNotification(`Task "${savedTask.title}" created.`, 'success');
    } catch (error) {
        addNotification(`Failed to create task. Please try again.`, 'reminder');
    }
  };

  const updateTask = async (taskId: number, updates: Partial<Task>) => {
    if (!currentUser) return;

    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates, editorId: currentUser.id }),
        });
        if (!response.ok) throw new Error("Failed to update task on server.");
        
        const updatedTaskFromServer = JSON.parse(await response.text(), taskDateReviver);

        setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? updatedTaskFromServer : t));
        addNotification(`Task "${updatedTaskFromServer.title}" updated.`, 'success');

    } catch (error) {
        addNotification('Failed to update task. Please try again.', 'reminder');
    }
  };

  const updateUser = async (userId: number, updates: Partial<Omit<User, 'id'>>) => {
     try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update user on server');

      const updatedUser = await response.json();
      setUsers(prev => prev.map(u => (u.id === userId ? updatedUser : u)));
      addNotification(`User "${updatedUser.name}" has been updated.`, 'success');
    } catch (error) {
      addNotification('Failed to update user.', 'reminder');
    }
  };

  const deleteUser = async (userId: number) => {
     if (userId === currentUser?.id) {
      addNotification("You cannot delete your own account.", 'reminder');
      return;
    }
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete user on server');
      
      setUsers(prev => prev.filter(u => u.id !== userId));
      addNotification("User has been deleted.", 'success');
    } catch (error) {
      addNotification("Failed to delete user.", 'reminder');
    }
  };

  const value = {
    users,
    tasks,
    currentUser,
    isAuthenticated,
    notifications,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    logout,
    addTask,
    updateTask,
    getUserById,
    updateUser,
    deleteUser,
    removeNotification,
    addNotification,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export const useTasks = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
