import React, { useState } from 'react';
import { Plus, Circle, CheckCircle, Clock } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  created: Date;
}

export const TaskMasterDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Set up development environment',
      description: 'Configure tools and dependencies',
      status: 'completed',
      priority: 'high',
      created: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
    },
    {
      id: '2',
      title: 'Build chat interface',
      description: 'Create a simple, stable chat component',
      status: 'in-progress',
      priority: 'high',
      created: new Date()
    },
    {
      id: '3',
      title: 'Add task management',
      description: 'Implement basic task CRUD operations',
      status: 'pending',
      priority: 'medium',
      created: new Date()
    }
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

  const addTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      description: '',
      status: 'pending',
      priority: 'medium',
      created: new Date()
    };

    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
    setShowAddTask(false);
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        if (task.status === 'pending') return { ...task, status: 'in-progress' as const };
        if (task.status === 'in-progress') return { ...task, status: 'completed' as const };
        if (task.status === 'completed') return { ...task, status: 'pending' as const };
      }
      return task;
    }));
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return <Circle className="w-5 h-5 text-gray-400" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
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
    }
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => t.status === 'pending').length
  };

  return (
    <div className="flex flex-col h-full p-6">
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
              placeholder="Enter task title..."
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
              Add
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
                    task.status === 'completed' 
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
                    <span>{task.created.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>No tasks yet. Click "Add Task" to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};