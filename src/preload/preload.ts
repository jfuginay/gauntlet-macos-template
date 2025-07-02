import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface for TypeScript
interface ElectronAPI {
  // Workflow Engine APIs
  workflow: {
    processInput: (message: string) => Promise<any>;
    analyzeText: (text: string) => Promise<any>;
    isActive: () => Promise<any>;
  };
  
  // Background Processing APIs
  background: {
    addJob: (type: string, data: any, priority?: string) => Promise<any>;
    getStats: () => Promise<any>;
    getJobStatus: (jobId: string) => Promise<any>;
  };
  
  // Enhanced AI APIs
  ai: {
    enhancedCommand: (query: string) => Promise<any>;
  };
  
  // Local LLM APIs with enhanced model management
  localLLM: {
    query: (prompt: string) => Promise<any>;
    getStatus: () => Promise<any>;
    initialize: () => Promise<any>;
    onDownloadProgress: (callback: (data: { progress: number; status: string }) => void) => void;
    onStatusUpdate: (callback: (status: any) => void) => void;
    removeProgressListener: () => void;
    removeStatusListener: () => void;
  };
  
  // System APIs
  system: {
    getStatus: () => Promise<any>;
  };

  // Log APIs
  logs: {
    getLogs: (filters?: any) => Promise<any>;
    getStats: () => Promise<any>;
    clearLogs: () => Promise<any>;
    onNewLog: (callback: (log: any) => void) => void;
    removeLogListener: () => void;
  };

  // TaskMaster MCP Integration APIs
  callMCPTool: (toolName: string, parameters: any) => Promise<any>;
  executeTaskMasterCommand: (command: string) => Promise<any>;
  getProjectRoot: () => Promise<string>;
  readTasksJson: (projectRoot: string) => Promise<any>;
  
  // TaskMaster High-Level APIs
  taskMaster: {
    addTask: (params: { prompt: string; research?: boolean; priority?: string; dependencies?: string }) => Promise<any>;
    getTasks: (params?: { status?: string; withSubtasks?: boolean }) => Promise<any>;
    getTask: (params: { id: string }) => Promise<any>;
    getNextTask: () => Promise<any>;
    setTaskStatus: (params: { id: string; status: string }) => Promise<any>;
    updateTask: (params: { id: string; prompt: string; research?: boolean }) => Promise<any>;
    updateSubtask: (params: { id: string; prompt: string; research?: boolean }) => Promise<any>;
    expandTask: (params: { id: string }) => Promise<any>;
    analyzeComplexity: (params: { id: string }) => Promise<any>;
    research: (params: { id: string }) => Promise<any>;
  };

  // Intelligence System APIs
  initializeEngieIntelligence: () => Promise<any>;
  generateIntelligentTask: (prompt: string) => Promise<any>;
  getIntelligenceInsights: () => Promise<any>;
  generateIntelligentCommit: () => Promise<any>;
  installEngieTaskMaster: () => Promise<any>;
  
  // API Key Management
  getApiKey: (keyName?: string) => Promise<string | null>;
  getAllApiKeys: () => Promise<Record<string, string>>;
  setApiKey: (keyName: string, key: string) => Promise<{ success: boolean; error?: string }>;
  removeApiKey: (keyName: string) => Promise<{ success: boolean; error?: string }>;
  validateApiKey: (keyName: string, value: string) => Promise<{ valid: boolean; error?: string }>;
  hasRequiredApiKeys: (requiredKeys: string[]) => Promise<boolean>;
  hasAnyApiKeys: () => Promise<boolean>;
  migrateApiKeysFromEnvironment: () => Promise<{ migrated: string[]; failed: string[] }>;
  exportApiKeyConfig: () => Promise<{ hasKeys: string[]; configPath: string } | null>;
  
  // First Run Setup
  isFirstRun: () => Promise<boolean>;
  setFirstRunComplete: () => Promise<{ success: boolean; error?: string }>;

  // Claude CLI Terminal Integration
  executeClaudeCommand: (command: string) => Promise<{ success: boolean; output?: string; error?: string; taskUpdated?: boolean }>;
  getClaudeCliStatus: () => Promise<{ installed: boolean; version?: string; mcpConfigured: boolean; error?: string }>;
  testClaudeConnection: () => Promise<{ success: boolean; details: string }>;
  updateMcpConfig: () => Promise<{ success: boolean; error?: string }>;
  performMaintenanceCheck: () => Promise<{ success: boolean; error?: string }>;

  // Legacy APIs (for backward compatibility)
  getSystemInfo: () => Promise<any>;
  sendChatMessage: (message: string) => Promise<any>;
  analyzeText: (text: string) => Promise<any>;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // Workflow Engine APIs
  workflow: {
    processInput: (message: string) => ipcRenderer.invoke('workflow:process-input', message),
    analyzeText: (text: string) => ipcRenderer.invoke('workflow:analyze-text', text),
    isActive: () => ipcRenderer.invoke('workflow:is-active'),
  },
  
  // Background Processing APIs
  background: {
    addJob: (type: string, data: any, priority = 'medium') => 
      ipcRenderer.invoke('background:add-job', type, data, priority),
    getStats: () => ipcRenderer.invoke('background:get-stats'),
    getJobStatus: (jobId: string) => ipcRenderer.invoke('background:get-job-status', jobId),
  },
  
  // Enhanced AI APIs
  ai: {
    enhancedCommand: (query: string) => ipcRenderer.invoke('ai:enhanced-command', query),
  },
  
  // Local LLM APIs with enhanced model management
  localLLM: {
    query: (prompt: string) => ipcRenderer.invoke('local-llm:query', prompt),
    getStatus: () => ipcRenderer.invoke('local-llm:status'),
    initialize: () => ipcRenderer.invoke('local-llm:initialize'),
    onDownloadProgress: (callback: (data: { progress: number; status: string }) => void) => {
      ipcRenderer.on('llm-download-progress', (_, data) => callback(data));
    },
    onStatusUpdate: (callback: (status: any) => void) => {
      ipcRenderer.on('llm-status-update', (_, status) => callback(status));
    },
    removeProgressListener: () => {
      ipcRenderer.removeAllListeners('llm-download-progress');
    },
    removeStatusListener: () => {
      ipcRenderer.removeAllListeners('llm-status-update');
    },
  },
  
  // System APIs
  system: {
    getStatus: () => ipcRenderer.invoke('system:get-status'),
  },

  // Log APIs
  logs: {
    getLogs: (filters?: any) => ipcRenderer.invoke('logs:get', filters),
    getStats: () => ipcRenderer.invoke('logs:get-stats'),
    clearLogs: () => ipcRenderer.invoke('logs:clear'),
    onNewLog: (callback: (log: any) => void) => {
      ipcRenderer.on('log-new', (_, log) => callback(log));
    },
    removeLogListener: () => {
      ipcRenderer.removeAllListeners('log-new');
    },
  },

  // TaskMaster MCP Integration APIs
  callMCPTool: (toolName: string, parameters: any) => 
    ipcRenderer.invoke('taskmaster:call-mcp-tool', toolName, parameters),
  executeTaskMasterCommand: (command: string) => 
    ipcRenderer.invoke('execute-taskmaster-command', command),
  getProjectRoot: () => ipcRenderer.invoke('get-project-root'),
  readTasksJson: (projectRoot: string) => ipcRenderer.invoke('read-tasks-json', projectRoot),
  
  // TaskMaster High-Level APIs
  taskMaster: {
    addTask: (params) => 
      ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_add_task', params),
    getTasks: (params = {}) => 
      ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_get_tasks', params),
    getTask: (params) => 
      ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_get_task', params),
    getNextTask: (params = {}) => 
      ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_next_task', params),
    setTaskStatus: (params) => 
      ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_set_task_status', params),
    updateTask: (params) => 
      ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_update_task', params),
    updateSubtask: (params) => 
      ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_update_subtask', params),
    expandTask: (params) => 
      ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_expand_task', params),
    analyzeComplexity: (params) => 
      ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_analyze_project_complexity', params),
    research: (params) => 
      ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_research', params)
  },

  // Intelligence System APIs
  initializeEngieIntelligence: () => 
    ipcRenderer.invoke('intelligence:initialize'),
  generateIntelligentTask: (prompt: string) => 
    ipcRenderer.invoke('intelligence:generate-task', prompt),
  getIntelligenceInsights: () => 
    ipcRenderer.invoke('intelligence:get-insights'),
  generateIntelligentCommit: () => 
    ipcRenderer.invoke('intelligence:generate-commit'),
  installEngieTaskMaster: () => 
    ipcRenderer.invoke('intelligence:install-taskmaster'),
  
  // API Key Management
  getApiKey: (keyName?: string) => ipcRenderer.invoke('get-api-key', keyName),
  getAllApiKeys: () => ipcRenderer.invoke('get-all-api-keys'),
  setApiKey: (keyName: string, key: string) => ipcRenderer.invoke('set-api-key', keyName, key),
  removeApiKey: (keyName: string) => ipcRenderer.invoke('remove-api-key', keyName),
  validateApiKey: (keyName: string, value: string) => ipcRenderer.invoke('validate-api-key', keyName, value),
  hasRequiredApiKeys: (requiredKeys: string[]) => ipcRenderer.invoke('has-required-api-keys', requiredKeys),
  hasAnyApiKeys: () => ipcRenderer.invoke('has-any-api-keys'),
  migrateApiKeysFromEnvironment: () => ipcRenderer.invoke('migrate-api-keys-from-environment'),
  exportApiKeyConfig: () => ipcRenderer.invoke('export-api-key-config'),
  
  // First Run Setup
  isFirstRun: () => ipcRenderer.invoke('is-first-run'),
  setFirstRunComplete: () => ipcRenderer.invoke('set-first-run-complete'),

  // Claude CLI Terminal Integration
  executeClaudeCommand: (command: string) => ipcRenderer.invoke('claude-cli:execute-command', command),
  getClaudeCliStatus: () => ipcRenderer.invoke('claude-cli:get-status'),
  testClaudeConnection: () => ipcRenderer.invoke('claude-cli:test-connection'),
  updateMcpConfig: () => ipcRenderer.invoke('claude-cli:update-mcp-config'),
  performMaintenanceCheck: () => ipcRenderer.invoke('claude-cli:maintenance-check'),

  // Legacy APIs for backward compatibility
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  sendChatMessage: (message: string) => ipcRenderer.invoke('send-chat-message', message),
  analyzeText: (text: string) => ipcRenderer.invoke('analyze-text', text),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for global usage
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export type { ElectronAPI };