import React, { useState, useEffect } from 'react';
import { Edit3, Clock, CheckCircle, Circle, AlertCircle, ArrowRight } from 'lucide-react';
import { TaskMasterTask } from '../services/taskMasterService';

interface TaskViewerProps {
  task: TaskMasterTask;
  onEdit?: (task: TaskMasterTask) => void;
  onStatusChange?: (taskId: string, status: TaskMasterTask['status']) => void;
  onRefresh?: (taskId: string) => void;
}

export const TaskViewer: React.FC<TaskViewerProps> = ({
  task,
  onEdit,
  onStatusChange,
  onRefresh
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="text-green-400" size={16} />;
      case 'in-progress': return <Clock className="text-blue-400" size={16} />;
      case 'blocked': return <AlertCircle className="text-red-400" size={16} />;
      case 'review': return <Circle className="text-yellow-400" size={16} />;
      default: return <Circle className="text-gray-400" size={16} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'text-green-400';
      case 'in-progress': return 'text-blue-400';
      case 'blocked': return 'text-red-400';
      case 'review': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const handleStatusChange = async (newStatus: TaskMasterTask['status']) => {
    if (onStatusChange) {
      setIsLoading(true);
      try {
        await onStatusChange(task.id, newStatus);
        if (onRefresh) {
          await onRefresh(task.id);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatDependencies = () => {
    if (!task.dependencies || task.dependencies.length === 0) {
      return 'None';
    }
    return task.dependencies.map(dep => `#${dep}`).join(', ');
  };

  return (
    <div className="task-viewer">
      <div className="task-header">
        <div className="task-title-section">
          <h1 className="task-title">
            <span className="task-id">#{task.id}</span>
            {task.title}
          </h1>
          <div className="task-meta">
            <div className="task-status">
              {getStatusIcon(task.status)}
              <span className={`status-text ${getStatusColor(task.status)}`}>
                {task.status}
              </span>
            </div>
            <div className="task-priority">
              <span className={`priority-text ${getPriorityColor(task.priority)}`}>
                {task.priority} priority
              </span>
            </div>
          </div>
        </div>
        
        <div className="task-actions">
          <button
            className="action-btn edit-btn"
            onClick={() => onEdit?.(task)}
            disabled={isLoading}
            title="Edit task (E)"
          >
            <Edit3 size={16} />
            Edit
          </button>
          
          <select
            className="status-select"
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value as TaskMasterTask['status'])}
            disabled={isLoading}
            title="Change status (S)"
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
            <option value="deferred">Deferred</option>
          </select>
        </div>
      </div>

      <div className="task-content">
        <div className="task-section">
          <h3 className="section-title">📝 Description</h3>
          <div className="section-content description">
            {task.description || 'No description provided.'}
          </div>
        </div>

        <div className="task-section">
          <h3 className="section-title">🔧 Dependencies</h3>
          <div className="section-content dependencies">
            {formatDependencies()}
          </div>
        </div>

        {task.subtasks && task.subtasks.length > 0 && (
          <div className="task-section">
            <h3 className="section-title">📋 Subtasks ({task.subtasks.length})</h3>
            <div className="section-content subtasks">
              {task.subtasks.map((subtask, index) => (
                <div key={`${task.id}.${index + 1}`} className="subtask-item">
                  <div className="subtask-header">
                    {getStatusIcon(subtask.status)}
                    <span className="subtask-id">#{task.id}.{index + 1}</span>
                    <span className="subtask-title">{subtask.title}</span>
                    <span className={`subtask-status ${getStatusColor(subtask.status)}`}>
                      {subtask.status}
                    </span>
                  </div>
                  {subtask.description && (
                    <div className="subtask-description">
                      {subtask.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="task-section">
          <h3 className="section-title">ℹ️ Task Information</h3>
          <div className="section-content task-info">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Task ID:</span>
                <span className="info-value">#{task.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Priority:</span>
                <span className={`info-value ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className={`info-value ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Subtasks:</span>
                <span className="info-value">
                  {task.subtasks?.length || 0} total
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="task-footer">
        <div className="command-line">
          <span className="prompt">task#{task.id}$</span>
          <span className="command-hint">
            [E]dit • [S]tatus • [R]efresh • [B]ack
          </span>
        </div>
      </div>
    </div>
  );
};

export default TaskViewer; 