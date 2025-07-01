import WebSocket from 'ws';
// TaskMaster service interfaces

export interface TaskMasterTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled' | 'deferred' | 'review';
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  subtasks: TaskMasterTask[];
}

export interface TaskMasterStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  blocked: number;
  deferred: number;
  cancelled: number;
  review: number;
  completionPercentage: number;
}

export interface TaskMasterResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface IntelligenceInsights {
  totalPatterns: number;
  avgEffectiveness: number;
  learningRate: number;
  recentActivity: {
    commits: number;
    tasks: number;
  };
  recommendations: string[];
}

class TaskMasterService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private intelligenceEnabled = true;
  private isOnline = false;
  private hasClaudeAPI = false;
  private hasOllamaFallback = false;

  constructor() {
    this.connect();
  }

  private async connect() {
    try {
      // Try to connect to MCP server first, fallback to IPC
      console.log('TaskMaster service initializing with MCP integration...');
      this.isConnected = true;
      
      // Check online status for AI services
      this.isOnline = await this.checkOnlineStatus();
      
      // Initialize intelligence system
      if (this.intelligenceEnabled) {
        await this.initializeIntelligence();
      }

      // Check Claude API availability
      // Check for Anthropic API key using secure API key manager
      try {
        const anthropicKey = await window.electronAPI?.getApiKey('ANTHROPIC_API_KEY');
        this.hasClaudeAPI = this.isOnline && !!anthropicKey;
      } catch (error) {
        console.warn('Failed to check Anthropic API key:', error);
        this.hasClaudeAPI = false;
      }
      
      // Check Ollama availability
      try {
        const ollamaResponse = await fetch('http://localhost:11434/api/tags', {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });
        this.hasOllamaFallback = ollamaResponse.ok;
      } catch {
        this.hasOllamaFallback = false;
      }
      
    } catch (error) {
      console.error('Failed to connect to TaskMaster:', error);
      this.isConnected = false;
    }
  }

  private async checkOnlineStatus(): Promise<boolean> {
    try {
      // Quick ping to check connectivity - AI services will handle their own API key validation
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async initializeIntelligence(): Promise<void> {
    try {
      await window.electronAPI.initializeEngieIntelligence();
      console.log('🧠 Intelligence system initialized');
    } catch (error) {
      console.warn('Intelligence system not available:', error);
      this.intelligenceEnabled = false;
    }
  }

  async getTasks(withSubtasks = true): Promise<{ tasks: TaskMasterTask[]; stats: TaskMasterStats }> {
    try {
      console.log('📋 Fetching tasks from TaskMaster MCP...');
      
      const projectRoot = await window.electronAPI.getProjectRoot();
      const response = await window.electronAPI.callMCPTool('mcp_task-master-ai_get_tasks', {
        projectRoot,
        withSubtasks
      });

      if (response.success && response.data) {
        const { tasks, stats } = response.data;
        
        console.log(`✅ Loaded ${tasks.length} tasks from TaskMaster`);
        
        return {
          tasks: tasks || [],
          stats: stats || {
            total: 0,
            completed: 0,
            inProgress: 0,
            pending: 0,
            blocked: 0,
            deferred: 0,
            cancelled: 0,
            review: 0,
            completionPercentage: 0
          }
        };
      } else {
        console.warn('⚠️ No tasks returned from TaskMaster MCP');
        return { tasks: [], stats: this.getEmptyStats() };
      }
    } catch (error) {
      console.error('❌ Error fetching tasks from TaskMaster:', error);
      return { tasks: [], stats: this.getEmptyStats() };
    }
  }

  async getNextTask(): Promise<TaskMasterTask | null> {
    try {
      const projectRoot = await window.electronAPI.getProjectRoot();
      const response = await window.electronAPI.callMCPTool('mcp_task-master-ai_next_task', {
        projectRoot
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting next task:', error);
      return null;
    }
  }

  async getTaskById(id: string): Promise<TaskMasterTask | null> {
    try {
      const projectRoot = await this.getProjectRoot();
      const response = await window.electronAPI.callMCPTool('mcp_task-master-ai_get_task', {
        id,
        projectRoot
      });
      
      if (response.success && response.data) {
        return this.formatTask(response.data);
      }
      
      // Fallback to CLI if MCP fails
      console.warn('MCP get_task failed, falling back to CLI');
      const cliResponse = await this.executeTaskMasterCommand(`show ${id}`);
      const tasks = this.parseTasks(cliResponse);
      return tasks.length > 0 ? tasks[0] : null;
    } catch (error) {
      console.error('Error fetching task:', error);
      return null;
    }
  }

  async createTask(title: string, description: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<boolean> {
    try {
      const projectRoot = await window.electronAPI.getProjectRoot();
      
      // Use intelligent task creation with AI
      const prompt = `Create a task: ${title}\nDescription: ${description}`;
      
      const response = await window.electronAPI.callMCPTool('mcp_task-master-ai_add_task', {
        projectRoot,
        prompt,
        priority,
        research: this.hasClaudeAPI && this.isOnline // Use research mode if online with Claude
      });

      return response.success;
    } catch (error) {
      console.error('Error creating task:', error);
      return false;
    }
  }

  async updateTaskStatus(taskId: string, status: TaskMasterTask['status']): Promise<boolean> {
    try {
      const projectRoot = await window.electronAPI.getProjectRoot();
      const response = await window.electronAPI.callMCPTool('mcp_task-master-ai_set_task_status', {
        projectRoot,
        id: taskId,
        status
      });

      return response.success;
    } catch (error) {
      console.error('Error updating task status:', error);
      return false;
    }
  }

  async analyzeComplexity(): Promise<boolean> {
    try {
      const projectRoot = await window.electronAPI.getProjectRoot();
      const response = await window.electronAPI.callMCPTool('mcp_task-master-ai_analyze_project_complexity', {
        projectRoot,
        research: this.hasClaudeAPI && this.isOnline,
        threshold: 6
      });

      return response.success;
    } catch (error) {
      console.error('Error analyzing task complexity:', error);
      return false;
    }
  }

  async expandTask(taskId: string, force = false): Promise<boolean> {
    try {
      const projectRoot = await window.electronAPI.getProjectRoot();
      const response = await window.electronAPI.callMCPTool('mcp_task-master-ai_expand_task', {
        projectRoot,
        id: taskId,
        force,
        research: this.hasClaudeAPI && this.isOnline
      });

      return response.success;
    } catch (error) {
      console.error('Error expanding task:', error);
      return false;
    }
  }

  async researchTopic(query: string, taskIds?: string[]): Promise<string | null> {
    try {
      if (!this.hasClaudeAPI || !this.isOnline) {
        throw new Error('Research requires online connection with Claude API');
      }
      
      const projectRoot = await window.electronAPI.getProjectRoot();
      const response = await window.electronAPI.callMCPTool('mcp_task-master-ai_research', {
        projectRoot,
        query,
        taskIds: taskIds?.join(','),
        detailLevel: 'medium'
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error conducting research:', error);
      return null;
    }
  }

  async getIntelligenceInsights(): Promise<IntelligenceInsights> {
    try {
      if (!this.intelligenceEnabled) {
        return {
          totalPatterns: 0,
          avgEffectiveness: 0,
          learningRate: 0,
          recentActivity: { commits: 0, tasks: 0 },
          recommendations: ['No intelligence data available. Start creating tasks to build patterns.']
        };
      }

      const insights = await window.electronAPI.getIntelligenceInsights();
      if (insights.success) {
        return insights.data;
      }
      
      return {
        totalPatterns: 0,
        avgEffectiveness: 0,
        learningRate: 0,
        recentActivity: { commits: 0, tasks: 0 },
        recommendations: ['Intelligence system initializing. Create tasks to build learning patterns.']
      };
    } catch (error) {
      console.error('Error getting intelligence insights:', error);
      return {
        totalPatterns: 0,
        avgEffectiveness: 0,
        learningRate: 0,
        recentActivity: { commits: 0, tasks: 0 },
        recommendations: ['Intelligence system unavailable.']
      };
    }
  }

  async generateIntelligentCommit(): Promise<string> {
    try {
      if (!this.intelligenceEnabled || !this.isOnline) {
        return 'chore: update files';
      }

      const result = await window.electronAPI.generateIntelligentCommit();
      if (result.success) {
        return result.data;
      }
      
      return 'chore: update files';
    } catch (error) {
      console.error('Error generating intelligent commit:', error);
      return 'chore: update files';
    }
  }

  async installIntelligentTaskMaster(): Promise<TaskMasterResponse> {
    try {
      const result = await window.electronAPI.installEngieTaskMaster();
      return { success: result.success, data: result };
    } catch (error) {
      console.error('Error installing intelligent TaskMaster:', error);
      return { success: false, error: String(error) };
    }
  }

  async getTaskMetrics(): Promise<TaskMasterStats> {
    try {
      const tasks = await this.getTasks();
      const total = tasks.tasks.length;
      const completed = tasks.tasks.filter(t => t.status === 'done').length;
      const inProgress = tasks.tasks.filter(t => t.status === 'in-progress').length;
      const pending = tasks.tasks.filter(t => t.status === 'pending').length;
      
      return {
        total: total,
        completed: completed,
        inProgress: inProgress,
        pending: pending,
        blocked: tasks.tasks.filter(t => t.status === 'blocked').length,
        deferred: tasks.tasks.filter(t => t.status === 'deferred').length,
        cancelled: tasks.tasks.filter(t => t.status === 'cancelled').length,
        review: tasks.tasks.filter(t => t.status === 'review').length,
        completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return this.getEmptyStats();
    }
  }

  private async getProjectRoot(): Promise<string> {
    try {
      const result = await window.electronAPI.getProjectRoot();
      return result || process.cwd();
    } catch {
      return process.cwd();
    }
  }

  private formatTasks(mcpData: any): TaskMasterTask[] {
    if (Array.isArray(mcpData)) {
      return mcpData.map(task => this.formatTask(task));
    }
    if (mcpData.tasks && Array.isArray(mcpData.tasks)) {
      return mcpData.tasks.map((task: any) => this.formatTask(task));
    }
    return [];
  }

  private formatTask(taskData: any): TaskMasterTask {
    return {
      id: taskData.id || 'unknown',
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      status: taskData.status || 'pending',
      priority: taskData.priority || 'medium',
      dependencies: taskData.dependencies || [],
      subtasks: taskData.subtasks ? taskData.subtasks.map((st: any) => this.formatTask(st)) : []
    };
  }

  private async executeTaskMasterCommand(command: string): Promise<string> {
    try {
      const result = await window.electronAPI.executeTaskMasterCommand(command);
      
      if (result.success) {
        return result.output;
      } else {
        console.error('TaskMaster command failed:', result.error);
        return '{"tasks": []}';
      }
    } catch (error) {
      console.error('Failed to execute TaskMaster command:', error);
      return '{"tasks": []}';
    }
  }

  private parseTasks(response: string): TaskMasterTask[] {
    try {
      const data = JSON.parse(response);
      return data.tasks || [];
    } catch {
      return [];
    }
  }

  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  isIntelligenceEnabled(): boolean {
    return this.intelligenceEnabled;
  }

  isOnlineMode(): boolean {
    return this.isOnline;
  }

  async refreshOnlineStatus(): Promise<void> {
    this.isOnline = await this.checkOnlineStatus();
  }

  // Future: Real-time updates via WebSocket
  onTaskUpdate(_callback: (task: TaskMasterTask) => void) {
    // Will implement WebSocket listeners for real-time updates
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  private getEmptyStats(): TaskMasterStats {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      blocked: 0,
      deferred: 0,
      cancelled: 0,
      review: 0,
      completionPercentage: 0
    };
  }

  // Status getters
  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      hasClaudeAPI: this.hasClaudeAPI,
      hasOllamaFallback: this.hasOllamaFallback,
      mode: this.hasClaudeAPI && this.isOnline ? 'claude' : 
            this.hasOllamaFallback ? 'ollama' : 'offline'
    };
  }

  // Refresh connection status
  async refreshStatus() {
    await this.checkOnlineStatus();
  }
}

export const taskMasterService = new TaskMasterService();
export default taskMasterService;