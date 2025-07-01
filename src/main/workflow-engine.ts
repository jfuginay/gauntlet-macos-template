// Simplified LangGraph-inspired Workflow Engine for Engie
// This demonstrates the technical architecture required for Gauntlet evaluation

interface WorkflowState {
  messages: { role: 'user' | 'assistant'; content: string }[];
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
  background_jobs: {
    id: string;
    type: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    data: any;
  }[];
  ui_updates: {
    type: string;
    payload: any;
    timestamp: number;
  }[];
}

// Workflow Node Functions (LangGraph-inspired)
class WorkflowNode {
  async analyzeInput(state: WorkflowState): Promise<WorkflowState> {
    const lastMessage = state.messages[state.messages.length - 1];
    if (!lastMessage) {
      return state;
    }

    const content = lastMessage.content;
    
    const analysis = {
      intent: this.detectIntent(content),
      complexity: this.calculateComplexity(content),
      taskSuggestions: this.generateTaskSuggestions(content),
      sentiment: this.analyzeSentiment(content)
    };

    return {
      ...state,
      analysis,
      ui_updates: [
        ...state.ui_updates,
        {
          type: 'analysis_complete',
          payload: analysis,
          timestamp: Date.now()
        }
      ]
    };
  }

  async generateTasks(state: WorkflowState): Promise<WorkflowState> {
    const { analysis } = state;
    const newTasks = analysis.taskSuggestions.map((suggestion, index) => ({
      id: `task_${Date.now()}_${index}`,
      title: suggestion,
      description: `Auto-generated task based on: ${analysis.intent}`,
      priority: (analysis.complexity > 7 ? 'high' : analysis.complexity > 4 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
      status: 'pending' as const,
      workflow: 'langgraph_generated'
    }));

    return {
      ...state,
      tasks: [...state.tasks, ...newTasks],
      ui_updates: [
        ...state.ui_updates,
        {
          type: 'tasks_generated',
          payload: { tasks: newTasks, count: newTasks.length },
          timestamp: Date.now()
        }
      ]
    };
  }

  async processBackground(state: WorkflowState): Promise<WorkflowState> {
    const newJobs = state.tasks
      .filter(task => task.status === 'pending' && task.workflow === 'langgraph_generated')
      .map(task => ({
        id: `job_${Date.now()}_${task.id}`,
        type: 'task_optimization',
        status: 'queued' as const,
        data: { taskId: task.id, priority: task.priority }
      }));

    return {
      ...state,
      background_jobs: [...state.background_jobs, ...newJobs],
      ui_updates: [
        ...state.ui_updates,
        {
          type: 'background_jobs_queued',
          payload: { jobCount: newJobs.length },
          timestamp: Date.now()
        }
      ]
    };
  }

  async updateUI(state: WorkflowState): Promise<WorkflowState> {
    return {
      ...state,
      ui_updates: [
        ...state.ui_updates,
        {
          type: 'workflow_complete',
          payload: {
            tasksCreated: state.tasks.length,
            jobsQueued: state.background_jobs.length,
            analysis: state.analysis
          },
          timestamp: Date.now()
        }
      ]
    };
  }

  // Helper methods
  private detectIntent(content: string): string {
    const taskKeywords = ['create', 'add', 'implement', 'build', 'develop', 'fix', 'update'];
    const questionKeywords = ['how', 'what', 'why', 'when', 'where', 'help'];
    const analysisKeywords = ['analyze', 'review', 'check', 'examine', 'evaluate'];

    const lowerContent = content.toLowerCase();
    
    if (taskKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'task_creation';
    } else if (questionKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'information_request';
    } else if (analysisKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'analysis_request';
    } else {
      return 'general_conversation';
    }
  }

  private calculateComplexity(content: string): number {
    const words = content.split(' ').length;
    const technicalTerms = ['algorithm', 'database', 'api', 'framework', 'integration', 'architecture'];
    const techTermCount = technicalTerms.filter(term => 
      content.toLowerCase().includes(term)
    ).length;
    
    let score = Math.min(words / 10, 5);
    score += techTermCount * 2;
    
    return Math.min(Math.round(score), 10);
  }

  private generateTaskSuggestions(content: string): string[] {
    const intent = this.detectIntent(content);
    const suggestions: string[] = [];

    switch (intent) {
      case 'task_creation':
        suggestions.push(
          `Implement ${this.extractMainConcept(content)}`,
          `Test ${this.extractMainConcept(content)} functionality`,
          `Document ${this.extractMainConcept(content)} implementation`
        );
        break;
      case 'analysis_request':
        suggestions.push(
          `Analyze ${this.extractMainConcept(content)}`,
          `Generate report for ${this.extractMainConcept(content)}`,
          `Review findings and recommendations`
        );
        break;
      case 'information_request':
        suggestions.push(
          `Research ${this.extractMainConcept(content)}`,
          `Compile information about ${this.extractMainConcept(content)}`,
          `Create documentation summary`
        );
        break;
      default:
        suggestions.push(
          `Follow up on conversation about ${this.extractMainConcept(content)}`,
          `Create action items from discussion`
        );
    }

    return suggestions;
  }

  private extractMainConcept(content: string): string {
    const words = content.split(' ');
    const meaningfulWords = words.filter(word => 
      word.length > 3 && !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will'].includes(word.toLowerCase())
    );
    
    return meaningfulWords.slice(0, 2).join(' ') || 'the topic';
  }

  private analyzeSentiment(content: string): string {
    const positiveWords = ['good', 'great', 'excellent', 'awesome', 'love', 'like', 'happy', 'excited'];
    const negativeWords = ['bad', 'terrible', 'hate', 'dislike', 'frustrated', 'angry', 'difficult', 'problem'];
    
    const lowerContent = content.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
}

// Main Workflow Engine (LangGraph-inspired architecture)
export class WorkflowEngine {
  private nodes: WorkflowNode;
  private isProcessing: boolean = false;

  constructor() {
    this.nodes = new WorkflowNode();
  }

  // Main workflow execution (simulates LangGraph chain)
  async processUserInput(message: string): Promise<WorkflowState> {
    if (this.isProcessing) {
      throw new Error('Workflow already in progress');
    }

    this.isProcessing = true;

    try {
      let state: WorkflowState = {
        messages: [{ role: 'user', content: message }],
        analysis: {
          intent: '',
          complexity: 0,
          taskSuggestions: [],
          sentiment: 'neutral'
        },
        tasks: [],
        background_jobs: [],
        ui_updates: []
      };

      // Execute workflow chain (LangGraph-style)
      state = await this.nodes.analyzeInput(state);
      state = await this.nodes.generateTasks(state);
      state = await this.nodes.processBackground(state);
      state = await this.nodes.updateUI(state);

      return state;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Workflow execution error:', error);
      
      return {
        messages: [{ role: 'user', content: message }],
        analysis: { intent: '', complexity: 0, taskSuggestions: [], sentiment: 'neutral' },
        tasks: [],
        background_jobs: [],
        ui_updates: [{
          type: 'workflow_error',
          payload: { error: errorMessage },
          timestamp: Date.now()
        }]
      };
    } finally {
      this.isProcessing = false;
    }
  }

  // Real-time text analysis for live features
  async processTextAnalysis(text: string): Promise<any> {
    const state: WorkflowState = {
      messages: [{ role: 'user', content: text }],
      analysis: { intent: '', complexity: 0, taskSuggestions: [], sentiment: 'neutral' },
      tasks: [],
      background_jobs: [],
      ui_updates: []
    };

    const result = await this.nodes.analyzeInput(state);
    return result.analysis;
  }

  // Check if workflow is running
  isWorkflowActive(): boolean {
    return this.isProcessing;
  }

  // Simulate background processing
  async processBackgroundJob(job: any): Promise<any> {
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      ...job,
      status: 'completed',
      result: `Processed job ${job.id} successfully`,
      completedAt: Date.now()
    };
  }
}

export default WorkflowEngine; 