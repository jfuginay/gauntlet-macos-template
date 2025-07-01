// Context monitoring service for Engie

export interface ScreenContext {
  timestamp: Date;
  activeApp: string;
  windowTitle: string;
  screenshot?: string; // base64 encoded
  detectedContent: {
    type: 'github' | 'ide' | 'email' | 'browser' | 'terminal' | 'other';
    confidence: number;
    extractedData: any;
  };
  suggestedActions: string[];
}

export interface ContextAnalysis {
  workflowState: 'coding' | 'researching' | 'communicating' | 'planning' | 'idle';
  activeProject?: string;
  codeProgress?: {
    filesModified: string[];
    linesAdded: number;
    commitsSinceLastCheck: number;
  };
  taskRelevance: {
    currentTaskId?: string;
    progressIndicators: string[];
    blockers: string[];
  };
  suggestedUpdates: {
    taskId: string;
    suggestedStatus: string;
    reason: string;
  }[];
}

class ContextMonitorService {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastContext: ScreenContext | null = null;
  private contextHistory: ScreenContext[] = [];
  private maxHistorySize = 50;

  constructor() {
    // Request screen capture permissions on initialization
    this.requestPermissions();
  }

  async requestPermissions(): Promise<boolean> {
    try {
      console.log('🔐 Requesting screen capture permissions...');
      const granted = await window.electronAPI.requestScreenCapturePermission();
      console.log(granted ? '✅ Permissions granted' : '❌ Permissions denied');
      return granted;
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return false;
    }
  }

  async startMonitoring(intervalMs: number = 30000): Promise<void> {
    if (this.isMonitoring) {
      console.log('Context monitoring already active');
      return;
    }

    console.log('🔍 Starting context monitoring...');
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      try {
        const context = await this.captureCurrentContext();
        await this.analyzeAndUpdateTasks(context);
      } catch (error) {
        console.error('Context monitoring error:', error);
      }
    }, intervalMs);

    // Take initial snapshot
    const initialContext = await this.captureCurrentContext();
    await this.analyzeAndUpdateTasks(initialContext);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Context monitoring stopped');
  }

  private async captureCurrentContext(): Promise<ScreenContext> {
    try {
      // This will use Electron's main process to capture screen and get active window info
      const contextData = await this.getSystemContext();
      
      const context: ScreenContext = {
        timestamp: new Date(),
        activeApp: contextData.activeApp || 'Unknown',
        windowTitle: contextData.windowTitle || '',
        screenshot: contextData.screenshot,
        detectedContent: await this.analyzeContent(contextData),
        suggestedActions: []
      };

      // Add to history
      this.contextHistory.push(context);
      if (this.contextHistory.length > this.maxHistorySize) {
        this.contextHistory.shift();
      }

      this.lastContext = context;
      return context;
    } catch (error) {
      console.error('Failed to capture context:', error);
      throw error;
    }
  }

  private async getSystemContext(): Promise<any> {
    try {
      // Get real system context from Electron main process
      const [windowInfo, screenshot, gitActivity] = await Promise.all([
        window.electronAPI.getActiveWindowInfo(),
        window.electronAPI.captureScreen(),
        window.electronAPI.getGitHubActivity()
      ]);

      return {
        activeApp: windowInfo.activeApp,
        windowTitle: windowInfo.windowTitle,
        screenshot: screenshot,
        gitActivity: gitActivity,
        platform: windowInfo.platform,
        error: windowInfo.error
      };
    } catch (error) {
      console.error('Failed to get system context:', error);
      
      // Return minimal context when system APIs fail
      return {
        activeApp: 'Unknown',
        windowTitle: 'Context monitoring unavailable',
        screenshot: null,
        type: 'other'
      };
    }
  }

  private async analyzeContent(contextData: any): Promise<ScreenContext['detectedContent']> {
    const { activeApp, windowTitle } = contextData;

    // IDE Detection
    if (['Cursor', 'VS Code', 'WebStorm', 'Xcode'].includes(activeApp)) {
      return {
        type: 'ide',
        confidence: 0.95,
        extractedData: {
          currentFile: this.extractFilenameFromTitle(windowTitle),
          project: this.extractProjectFromTitle(windowTitle),
          language: this.detectLanguageFromFilename(windowTitle)
        }
      };
    }

    // GitHub Detection
    if (activeApp === 'Google Chrome' && windowTitle.includes('GitHub')) {
      return {
        type: 'github',
        confidence: 0.9,
        extractedData: {
          repository: this.extractRepoFromGitHubTitle(windowTitle),
          page: this.detectGitHubPageType(windowTitle)
        }
      };
    }

    // Terminal Detection
    if (['Terminal', 'iTerm', 'Warp'].includes(activeApp)) {
      return {
        type: 'terminal',
        confidence: 0.85,
        extractedData: {
          currentDirectory: this.extractDirectoryFromTerminal(windowTitle),
          possibleCommand: this.detectTerminalActivity(windowTitle)
        }
      };
    }

    // Email Detection
    if (['Mail', 'Outlook', 'Gmail'].includes(activeApp) || 
        (activeApp === 'Google Chrome' && windowTitle.includes('Gmail'))) {
      return {
        type: 'email',
        confidence: 0.8,
        extractedData: {
          emailContext: this.analyzeEmailContext(windowTitle)
        }
      };
    }

    return {
      type: 'other',
      confidence: 0.1,
      extractedData: { app: activeApp, title: windowTitle }
    };
  }

  private async analyzeAndUpdateTasks(context: ScreenContext): Promise<void> {
    try {
      const analysis = await this.performContextAnalysis(context);
      
      // Log interesting findings
      if (analysis.suggestedUpdates.length > 0) {
        console.log('🎯 Context analysis suggests task updates:', analysis.suggestedUpdates);
      }

      // Here we would integrate with TaskMaster to actually update tasks
      // For now, just log the insights
      console.log('📊 Current workflow state:', analysis.workflowState);
      
    } catch (error) {
      console.error('Failed to analyze context:', error);
    }
  }

  private async performContextAnalysis(context: ScreenContext): Promise<ContextAnalysis> {
    const workflowState = this.determineWorkflowState(context);
    const taskRelevance = await this.analyzeTaskRelevance(context);
    
    const analysis: ContextAnalysis = {
      workflowState,
      taskRelevance,
      suggestedUpdates: []
    };

    // Detect active project
    if (context.detectedContent.type === 'ide') {
      analysis.activeProject = context.detectedContent.extractedData.project;
    }

    // Generate suggested updates
    analysis.suggestedUpdates = await this.generateTaskUpdates(context, analysis);

    return analysis;
  }

  private determineWorkflowState(context: ScreenContext): ContextAnalysis['workflowState'] {
    switch (context.detectedContent.type) {
      case 'ide':
        return 'coding';
      case 'github':
        return 'researching';
      case 'email':
        return 'communicating';
      case 'terminal':
        return 'coding'; // Often coding-related
      default:
        return 'idle';
    }
  }

  private async analyzeTaskRelevance(context: ScreenContext): Promise<ContextAnalysis['taskRelevance']> {
    // This would integrate with TaskMaster to find relevant tasks
    // For now, return mock analysis
    return {
      progressIndicators: [
        `Working in ${context.activeApp}`,
        `Active on: ${context.windowTitle}`
      ],
      blockers: []
    };
  }

  private async generateTaskUpdates(
    context: ScreenContext, 
    _analysis: ContextAnalysis
  ): Promise<ContextAnalysis['suggestedUpdates']> {
    const updates: ContextAnalysis['suggestedUpdates'] = [];

    // Example: If we detect GitHub activity, suggest updating related tasks
    if (context.detectedContent.type === 'github') {
      updates.push({
        taskId: 'auto-detected',
        suggestedStatus: 'in-progress',
        reason: `Detected GitHub activity: ${context.windowTitle}`
      });
    }

    // Example: If we detect IDE activity on TaskMaster files
    if (context.detectedContent.type === 'ide' && 
        context.windowTitle.includes('TaskMaster')) {
      updates.push({
        taskId: 'engie-taskmaster-3',
        suggestedStatus: 'in-progress',
        reason: 'Working on TaskMaster integration files'
      });
    }

    return updates;
  }

  // Utility methods for extracting information from window titles
  private extractFilenameFromTitle(title: string): string {
    const match = title.match(/([^\/\\]+\.[a-zA-Z]+)/);
    return match ? match[1] : '';
  }

  private extractProjectFromTitle(title: string): string {
    const match = title.match(/([^\/\\]+)$/);
    return match ? match[1] : '';
  }

  private detectLanguageFromFilename(title: string): string {
    if (title.includes('.ts') || title.includes('.tsx')) return 'TypeScript';
    if (title.includes('.js') || title.includes('.jsx')) return 'JavaScript';
    if (title.includes('.py')) return 'Python';
    if (title.includes('.swift')) return 'Swift';
    return 'Unknown';
  }

  private extractRepoFromGitHubTitle(title: string): string {
    const match = title.match(/GitHub - ([^\/]+\/[^\/]+)/);
    return match ? match[1] : '';
  }

  private detectGitHubPageType(title: string): string {
    if (title.includes('Issues')) return 'issues';
    if (title.includes('Pull requests')) return 'pulls';
    if (title.includes('commits')) return 'commits';
    return 'repository';
  }

  private extractDirectoryFromTerminal(title: string): string {
    // Extract directory from terminal title
    const match = title.match(/([^\/]+)$/);
    return match ? match[1] : '';
  }

  private detectTerminalActivity(title: string): string {
    // Try to detect what might be happening in terminal
    if (title.includes('npm')) return 'npm command';
    if (title.includes('git')) return 'git operation';
    if (title.includes('build')) return 'build process';
    return 'terminal session';
  }

  private analyzeEmailContext(title: string): any {
    return {
      hasUnread: title.includes('(') && title.includes(')'),
      isComposing: title.includes('Compose') || title.includes('Draft')
    };
  }

  // Public methods for getting current state
  getCurrentContext(): ScreenContext | null {
    return this.lastContext;
  }

  getContextHistory(): ScreenContext[] {
    return [...this.contextHistory];
  }

  isCurrentlyMonitoring(): boolean {
    return this.isMonitoring;
  }

  // Method to manually trigger context analysis
  async analyzeCurrentContext(): Promise<ContextAnalysis | null> {
    if (!this.lastContext) {
      const context = await this.captureCurrentContext();
      return this.performContextAnalysis(context);
    }
    return this.performContextAnalysis(this.lastContext);
  }
}

export const contextMonitorService = new ContextMonitorService();