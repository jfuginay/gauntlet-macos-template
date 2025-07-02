import React, { useState, useEffect } from 'react';
import { Plus, Circle, CheckCircle, Clock, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { taskMasterService, TaskMasterTask } from '../services/taskMasterService';

export const TaskMasterDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<TaskMasterTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadTasks();
    checkConnectionStatus();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await taskMasterService.getTasks();
      setTasks(response.tasks);
    } catch (err) {
      setError('Failed to load tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    setIsConnected(taskMasterService.isConnectedToServer());
    setIsOnline(taskMasterService.isOnlineMode());
    
    // Refresh online status
    await taskMasterService.refreshOnlineStatus();
    setIsOnline(taskMasterService.isOnlineMode());
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const success = await taskMasterService.createTask(newTaskTitle, '', 'medium');
      if (success) {
        setNewTaskTitle('');
        setShowAddTask(false);
        await loadTasks(); // Refresh the task list
      } else {
        setError('Failed to create task');
      }
    } catch (err) {
      setError('Failed to create task');
      console.error('Error creating task:', err);
    }
  };

  const toggleTaskStatus = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let newStatus: TaskMasterTask['status'];
    if (task.status === 'pending') newStatus = 'in-progress';
    else if (task.status === 'in-progress') newStatus = 'done';
    else newStatus = 'pending';

    try {
      const success = await taskMasterService.updateTaskStatus(taskId, newStatus);
      if (success) {
        await loadTasks(); // Refresh the task list
      } else {
        setError('Failed to update task');
      }
    } catch (err) {
      setError('Failed to update task');
      console.error('Error updating task:', err);
    }
  };

  const getStatusIcon = (status: TaskMasterTask['status']) => {
    switch (status) {
      case 'pending':
        return <Circle className="w-5 h-5 text-gray-400" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'done':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'blocked':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'deferred':
        return <Circle className="w-5 h-5 text-yellow-500" />;
      case 'cancelled':
        return <Circle className="w-5 h-5 text-gray-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low':
        return 'border-l-gray-300';
      case 'medium':
        return 'border-l-yellow-400';
      case 'high':
        return 'border-l-red-400';
      default:
        return 'border-l-gray-300';
    }
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => t.status === 'pending').length
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={loadTasks}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            ) : (
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              TaskMaster {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-orange-500" />
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              AI Mode: {isOnline ? 'Online (Claude)' : 'Local (Ollama)'}
            </span>
          </div>
        </div>
        <button
          onClick={checkConnectionStatus}
          className="text-blue-500 hover:text-blue-600 text-sm"
        >
          Refresh Status
        </button>
      </div>

      {tasks.length > 0 ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-gray-500">{stats.pending}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
            </div>
          </div>

          {/* Add Task */}
          <div className="mb-4">
            {!showAddTask ? (
              <button
                onClick={() => setShowAddTask(true)}
                className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Add Task</span>
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Describe your task..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') addTask();
                    if (e.key === 'Escape') setShowAddTask(false);
                  }}
                  autoFocus
                />
                <button
                  onClick={addTask}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 ${getPriorityColor(task.priority)} border-r border-t border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => toggleTaskStatus(task.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getStatusIcon(task.status)}
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        task.status === 'done' 
                          ? 'line-through text-gray-500 dark:text-gray-400' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className={`px-2 py-1 rounded ${
                          task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                          task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {task.priority}
                        </span>
                        <span>ID: {task.id}</span>
                        <span className={`px-2 py-1 rounded ${
                          task.status === 'done' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                          task.status === 'in-progress' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <Circle className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No tasks found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            Start building your project by creating your first task. 
            Describe what you want to accomplish and let AI help you break it down.
          </p>
          
          <div className="space-y-4 w-full max-w-md">
            {!showAddTask ? (
              <button
                onClick={() => setShowAddTask(true)}
                className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors text-lg"
              >
                <Plus className="w-6 h-6" />
                <span>Create Your First Task</span>
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Set up user authentication system"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') addTask();
                    if (e.key === 'Escape') setShowAddTask(false);
                  }}
                  autoFocus
                />
                <div className="flex space-x-3">
                  <button
                    onClick={addTask}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Create Task
                  </button>
                  <button
                    onClick={() => setShowAddTask(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            <div className="text-sm text-gray-500 dark:text-gray-400 pt-4">
              <p className="mb-2">💡 <strong>Pro tip:</strong> Try natural language like:</p>
              <ul className="space-y-1 pl-4">
                <li>• "Build a login page with email validation"</li>
                <li>• "Set up API routes for user management"</li>
                <li>• "Add dark mode toggle to settings"</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};