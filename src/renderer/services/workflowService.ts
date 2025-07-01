// Service layer for integrating terminal UI with LangGraph workflow engine
export interface WorkflowResult {
  analysis: {
    intent: string;
    complexity: number;
    taskSuggestions: string[];
    sentiment: string;
  };
  tasks: {
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'progress' | 'completed';
    workflow: string;
  }[];
  ui_updates: {
    type: string;
    payload: any;
    timestamp: number;
  }[];
}

export interface SystemStatus {
  workflow: {
    active: boolean;
    engine: string;
    status: string;
  };
  backgroundProcessor: {
    queued: number;
    processing: number;
    total: number;
    status: string;
    maxConcurrent: number;
  };
  ai: {
    status: string;
    providers: string[];
    fallback: string;
  };
  memory: {
    used: string;
    total: string;
  };
}

export class WorkflowService {
  private static instance: WorkflowService;
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {}

  static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  // Process user input through LangGraph workflow
  async processUserInput(message: string): Promise<WorkflowResult> {
    try {
      const result = await window.electronAPI.workflow.processInput(message);
      
      if (result.success) {
        this.emit('workflow:completed', result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Workflow processing failed');
      }
    } catch (error) {
      console.error('Workflow service error:', error);
      throw error;
    }
  }

  // Real-time text analysis
  async analyzeText(text: string): Promise<any> {
    try {
      const result = await window.electronAPI.workflow.analyzeText(text);
      
      if (result.success) {
        this.emit('text:analyzed', result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Text analysis failed');
      }
    } catch (error) {
      console.error('Text analysis error:', error);
      throw error;
    }
  }

  // Enhanced AI command with workflow integration
  async enhancedAICommand(query: string): Promise<any> {
    try {
      const result = await window.electronAPI.ai.enhancedCommand(query);
      
      if (result.success) {
        this.emit('ai:enhanced', result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Enhanced AI command failed');
      }
    } catch (error) {
      console.error('Enhanced AI command error:', error);
      throw error;
    }
  }

  // Add background job
  async addBackgroundJob(type: string, data: any, priority: string = 'medium'): Promise<string> {
    try {
      const result = await window.electronAPI.background.addJob(type, data, priority);
      
      if (result.success) {
        this.emit('job:added', { jobId: result.jobId, type });
        return result.jobId;
      } else {
        throw new Error(result.error || 'Failed to add background job');
      }
    } catch (error) {
      console.error('Background job error:', error);
      throw error;
    }
  }

  // Get background processor stats
  async getBackgroundStats(): Promise<any> {
    try {
      const result = await window.electronAPI.background.getStats();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get background stats');
      }
    } catch (error) {
      console.error('Background stats error:', error);
      return { queued: 0, processing: 0, total: 0 };
    }
  }

  // Get job status
  async getJobStatus(jobId: string): Promise<any> {
    try {
      const result = await window.electronAPI.background.getJobStatus(jobId);
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get job status');
      }
    } catch (error) {
      console.error('Job status error:', error);
      return null;
    }
  }

  // Get system status
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const result = await window.electronAPI.system.getStatus();
      
      if (result.success) {
        this.emit('system:status', result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get system status');
      }
    } catch (error) {
      console.error('System status error:', error);
      return {
        workflow: { active: false, engine: 'unknown', status: 'error' },
        backgroundProcessor: { queued: 0, processing: 0, total: 0, status: 'error', maxConcurrent: 0 },
        ai: { status: 'error', providers: [], fallback: 'disabled' },
        memory: { used: '0MB', total: '0MB' }
      };
    }
  }

  // Check if workflow is active
  async isWorkflowActive(): Promise<boolean> {
    try {
      const result = await window.electronAPI.workflow.isActive();
      
      if (result.success) {
        return result.data.isActive;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Workflow status error:', error);
      return false;
    }
  }

  // Event system for reactive updates
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Utility method for smart command suggestions
  getSmartSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    const lowerInput = input.toLowerCase();

    // Workflow commands
    if (lowerInput.includes('workflow') || lowerInput.includes('process')) {
      suggestions.push('workflow status', 'workflow analyze "your text here"', 'workflow process "task description"');
    }

    // Background job commands
    if (lowerInput.includes('job') || lowerInput.includes('background')) {
      suggestions.push('background stats', 'background add-job', 'background jobs');
    }

    // System commands
    if (lowerInput.includes('system') || lowerInput.includes('status')) {
      suggestions.push('system status', 'system memory', 'system ai-status');
    }

    // AI commands
    if (lowerInput.includes('ai') || lowerInput.includes('analyze')) {
      suggestions.push('ai analyze "text"', 'ai enhance "query"', 'ai help');
    }

    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push('help', 'status', 'workflow analyze', 'ai enhance');
    }

    return suggestions;
  }

  // Enhanced command processing with workflow integration
  async processEnhancedCommand(command: string): Promise<string> {
    const [cmd, ...args] = command.split(' ');
    const arg = args.join(' ').replace(/['"]/g, ''); // Remove quotes

    try {
      switch (cmd.toLowerCase()) {
        case 'workflow':
          return await this.handleWorkflowCommand(args);

        case 'background':
          return await this.handleBackgroundCommand(args);

        case 'system':
          return await this.handleSystemCommand(args);

        case 'ai':
          return await this.handleAICommand(args);

        default:
          // Process through enhanced AI if not a system command
          const result = await this.enhancedAICommand(command);
          return result.message || 'Command processed through intelligent workflow system';
      }
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleWorkflowCommand(args: string[]): Promise<string> {
    const [subCmd, ...rest] = args;
    const text = rest.join(' ').replace(/['"]/g, '');

    switch (subCmd) {
      case 'status':
        const isActive = await this.isWorkflowActive();
        return `Workflow engine: ${isActive ? 'Active' : 'Idle'}`;

      case 'analyze':
        if (!text) return 'Usage: workflow analyze "text to analyze"';
        const analysis = await this.analyzeText(text);
        return `Analysis: Intent: ${analysis.intent}, Complexity: ${analysis.complexity}/10, Sentiment: ${analysis.sentiment}`;

      case 'process':
        if (!text) return 'Usage: workflow process "task description"';
        const result = await this.processUserInput(text);
        return `Generated ${result.tasks.length} tasks with ${result.ui_updates.length} workflow updates`;

      default:
        return 'Workflow commands: status, analyze, process';
    }
  }

  private async handleBackgroundCommand(args: string[]): Promise<string> {
    const [subCmd] = args;

    switch (subCmd) {
      case 'stats':
        const stats = await this.getBackgroundStats();
        return `Background: ${stats.queued} queued, ${stats.processing} processing, ${stats.total} total`;

      case 'jobs':
        const jobStats = await this.getBackgroundStats();
        return `Active jobs: ${jobStats.processing}, Queue: ${jobStats.queued}`;

      default:
        return 'Background commands: stats, jobs';
    }
  }

  private async handleSystemCommand(args: string[]): Promise<string> {
    const [subCmd] = args;

    switch (subCmd) {
      case 'status':
        const status = await this.getSystemStatus();
        return `System: Workflow ${status.workflow.status}, AI ${status.ai.status}, Memory ${status.memory.used}/${status.memory.total}`;

      case 'memory':
        const memStatus = await this.getSystemStatus();
        return `Memory usage: ${memStatus.memory.used} / ${memStatus.memory.total}`;

      case 'ai-status':
        const aiStatus = await this.getSystemStatus();
        return `AI: ${aiStatus.ai.status}, Providers: ${aiStatus.ai.providers.join(', ')}`;

      default:
        return 'System commands: status, memory, ai-status';
    }
  }

  private async handleAICommand(args: string[]): Promise<string> {
    const [subCmd, ...rest] = args;
    const text = rest.join(' ').replace(/['"]/g, '');

    switch (subCmd) {
      case 'analyze':
        if (!text) return 'Usage: ai analyze "text to analyze"';
        const analysis = await this.analyzeText(text);
        return `AI Analysis: ${analysis.intent} (${analysis.complexity}/10 complexity)`;

      case 'enhance':
        if (!text) return 'Usage: ai enhance "query to enhance"';
        const result = await this.enhancedAICommand(text);
        return result.message || 'Query enhanced through AI workflow';

      case 'help':
        return 'AI commands: analyze, enhance, help';

      default:
        // Process as enhanced AI command
        return await this.enhancedAICommand(args.join(' '));
    }
  }
}

export const workflowService = WorkflowService.getInstance(); 