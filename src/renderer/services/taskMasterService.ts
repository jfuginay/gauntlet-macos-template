import WebSocket from 'ws';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done' | 'deferred' | 'cancelled' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
  details?: string;
  testStrategy?: string;
  subtasks?: Task[];
}

export interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRate: number;
}

export interface TaskMasterResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class TaskMasterService {
  private ws: WebSocket | null = null;
  private isConnected = false;

  constructor() {
    this.connect();
  }

  private async connect() {
    try {
      // For now, we'll implement a REST-like interface using IPC
      // In a full implementation, this would connect to the MCP server via WebSocket
      console.log('TaskMaster service initializing...');
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to TaskMaster:', error);
      this.isConnected = false;
    }
  }

  async getTasks(): Promise<Task[]> {
    if (!this.isConnected) {
      return this.getMockTasks(); // Fallback to mock data
    }

    try {
      // In real implementation, this would call the MCP server
      // For now, we'll use IPC to call task-master CLI commands
      const response = await this.executeTaskMasterCommand('list');
      return this.parseTasks(response);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return this.getMockTasks();
    }
  }

  async getNextTask(): Promise<Task | null> {
    try {
      const response = await this.executeTaskMasterCommand('next');
      const tasks = this.parseTasks(response);
      return tasks.length > 0 ? tasks[0] : null;
    } catch (error) {
      console.error('Error fetching next task:', error);
      return null;
    }
  }

  async getTaskById(id: string): Promise<Task | null> {
    try {
      const response = await this.executeTaskMasterCommand(`show ${id}`);
      const tasks = this.parseTasks(response);
      return tasks.length > 0 ? tasks[0] : null;
    } catch (error) {
      console.error('Error fetching task:', error);
      return null;
    }
  }

  async createTask(prompt: string, useResearch = false): Promise<TaskMasterResponse> {
    try {
      const command = useResearch 
        ? `add-task --prompt="${prompt}" --research`
        : `add-task --prompt="${prompt}"`;
      
      await this.executeTaskMasterCommand(command);
      return { success: true };
    } catch (error) {
      console.error('Error creating task:', error);
      return { success: false, error: String(error) };
    }
  }

  async updateTaskStatus(id: string, status: Task['status']): Promise<TaskMasterResponse> {
    try {
      await this.executeTaskMasterCommand(`set-status --id=${id} --status=${status}`);
      return { success: true };
    } catch (error) {
      console.error('Error updating task status:', error);
      return { success: false, error: String(error) };
    }
  }

  async expandTask(id: string, useResearch = false): Promise<TaskMasterResponse> {
    try {
      const command = useResearch
        ? `expand --id=${id} --research --force`
        : `expand --id=${id}`;
      
      await this.executeTaskMasterCommand(command);
      return { success: true };
    } catch (error) {
      console.error('Error expanding task:', error);
      return { success: false, error: String(error) };
    }
  }

  async getTaskMetrics(): Promise<TaskMetrics> {
    try {
      const tasks = await this.getTasks();
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'done').length;
      const inProgress = tasks.filter(t => t.status === 'in-progress').length;
      const pending = tasks.filter(t => t.status === 'pending').length;
      
      return {
        totalTasks: total,
        completedTasks: completed,
        inProgressTasks: inProgress,
        pendingTasks: pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return this.getMockMetrics();
    }
  }

  private async executeTaskMasterCommand(command: string): Promise<string> {
    try {
      const result = await window.electronAPI.executeTaskMasterCommand(command);
      
      if (result.success) {
        return result.output;
      } else {
        console.error('TaskMaster command failed:', result.error);
        // Return empty tasks array as fallback
        return '{"tasks": []}';
      }
    } catch (error) {
      console.error('Failed to execute TaskMaster command:', error);
      return '{"tasks": []}';
    }
  }

  private parseTasks(response: string): Task[] {
    try {
      const data = JSON.parse(response);
      return data.tasks || [];
    } catch {
      return [];
    }
  }

  private getMockTasks(): Task[] {
    return [
      {
        id: '1',
        title: 'Complete Engie TaskMaster Integration',
        description: 'Integrate TaskMaster MCP server with Engie desktop app',
        status: 'in-progress',
        priority: 'high',
        details: 'Building the connection between CLI TaskMaster and desktop UI',
        subtasks: [
          {
            id: '1.1',
            title: 'Create TaskMaster service',
            description: 'Build service to communicate with MCP server',
            status: 'done',
            priority: 'high'
          },
          {
            id: '1.2',
            title: 'Build task dashboard UI',
            description: 'Create React components for task management',
            status: 'in-progress',
            priority: 'high'
          }
        ]
      },
      {
        id: '2',
        title: 'Add real-time chat task creation',
        description: 'Allow creating tasks from chat conversations',
        status: 'pending',
        priority: 'medium',
        details: 'Parse user messages and suggest task creation opportunities'
      },
      {
        id: '3',
        title: 'Implement background AI assistant',
        description: 'Periodic check-ins and motivational messages',
        status: 'pending',
        priority: 'low',
        details: 'System to provide encouragement and track progress'
      }
    ];
  }

  private getMockMetrics(): TaskMetrics {
    return {
      totalTasks: 12,
      completedTasks: 7,
      inProgressTasks: 3,
      pendingTasks: 2,
      completionRate: 58
    };
  }

  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  // Future: Real-time updates via WebSocket
  onTaskUpdate(_callback: (task: Task) => void) {
    // Will implement WebSocket listeners for real-time updates
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const taskMasterService = new TaskMasterService();