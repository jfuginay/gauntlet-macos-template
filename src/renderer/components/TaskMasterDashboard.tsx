import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  Plus, 
  ArrowRight,
  BarChart3,
  Target,
  TrendingUp,
  Zap
} from 'lucide-react';
import { taskMasterService, Task, TaskMetrics } from '../services/taskMasterService';
import { MetricCard } from './MetricCard';

export const TaskMasterDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [nextTask, setNextTask] = useState<Task | null>(null);
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskPrompt, setNewTaskPrompt] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [tasksData, nextTaskData, metricsData] = await Promise.all([
        taskMasterService.getTasks(),
        taskMasterService.getNextTask(),
        taskMasterService.getTaskMetrics()
      ]);

      setTasks(tasksData);
      setNextTask(nextTaskData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await taskMasterService.updateTaskStatus(taskId, newStatus);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskPrompt.trim()) return;

    try {
      await taskMasterService.createTask(newTaskPrompt, true); // Use research mode
      setNewTaskPrompt('');
      setShowCreateTask(false);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'blocked':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 dark:border-indigo-700 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading TaskMaster data...</p>
        </div>
      </div>
    );
  }

  const metricCards = metrics ? [
    {
      title: 'Total Tasks',
      value: metrics.totalTasks.toString(),
      change: `${metrics.pendingTasks} pending`,
      icon: Target,
    },
    {
      title: 'Completion Rate',
      value: `${metrics.completionRate}%`,
      change: `${metrics.completedTasks}/${metrics.totalTasks} done`,
      icon: TrendingUp,
    },
    {
      title: 'In Progress',
      value: metrics.inProgressTasks.toString(),
      change: 'active tasks',
      icon: Zap,
    },
    {
      title: 'TaskMaster Status',
      value: taskMasterService.isConnectedToServer() ? 'Connected' : 'Offline',
      change: taskMasterService.isConnectedToServer() ? 'MCP server active' : 'using mock data',
      icon: BarChart3,
    },
  ] : [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            TaskMaster Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Your AI-powered task management system
          </p>
        </div>
        <button
          onClick={() => setShowCreateTask(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </button>
      </div>

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricCards.map((metric, index) => (
            <MetricCard 
              key={index} 
              title={metric.title}
              value={metric.value}
              change={metric.change}
              icon={<metric.icon className="w-6 h-6" />}
            />
          ))}
        </div>
      )}

      {/* Next Task Highlight */}
      {nextTask && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">🎯 Next Task to Tackle</h3>
              <h4 className="text-xl font-bold mb-1">{nextTask.title}</h4>
              <p className="text-indigo-100">{nextTask.description}</p>
              {nextTask.details && (
                <p className="text-sm text-indigo-200 mt-2">{nextTask.details}</p>
              )}
            </div>
            <button
              onClick={() => handleStatusChange(nextTask.id, 'in-progress')}
              className="flex items-center px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Start Task
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Active Tasks
          </h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className={`p-6 border-l-4 ${getPriorityColor(task.priority)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => {
                      const newStatus = task.status === 'done' ? 'pending' : 
                                     task.status === 'pending' ? 'in-progress' : 'done';
                      handleStatusChange(task.id, newStatus);
                    }}
                  >
                    {getStatusIcon(task.status)}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {task.title}
                      </h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.status === 'done' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        task.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        task.status === 'blocked' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {task.description}
                    </p>
                    {task.details && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {task.details}
                      </p>
                    )}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="mt-3 ml-6 space-y-2">
                        {task.subtasks.map((subtask) => (
                          <div key={subtask.id} className="flex items-center space-x-2">
                            {getStatusIcon(subtask.status)}
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {subtask.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ID: {task.id}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Task
            </h3>
            <textarea
              value={newTaskPrompt}
              onChange={(e) => setNewTaskPrompt(e.target.value)}
              placeholder="Describe the task you want to create. AI will help structure it..."
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowCreateTask(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};