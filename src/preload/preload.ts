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
  
  // Terminal APIs
  terminal: {
    executeCommand: (command: string, options?: { 
      cwd?: string; 
      env?: Record<string, string>; 
      shell?: boolean 
    }) => Promise<any>;
    setupClaudeCLI: () => Promise<any>;
    configureClaudeCLI: (apiKey: string) => Promise<any>;
    executeClaudeCommand: (prompt: string, options?: {
      anthropicApiKey?: string;
      openaiApiKey?: string;
      model?: string;
    }) => Promise<any>;
    getAvailableApiKeys: () => Promise<any>;
  };
  
  // System APIs
  system: {
    getStatus: () => Promise<any>;
  };
  
  // Legacy APIs (for backward compatibility)
  getSystemInfo: () => Promise<any>;
  sendChatMessage: (message: string) => Promise<any>;
  analyzeText: (text: string) => Promise<any>;
  setApiKey: (key: string) => Promise<void>;
  getApiKey: () => Promise<string | null>;
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
  
  // Terminal APIs
  terminal: {
    executeCommand: (command: string, options?: { 
      cwd?: string; 
      env?: Record<string, string>; 
      shell?: boolean 
    }) => ipcRenderer.invoke('terminal:execute-command', command, options),
    setupClaudeCLI: () => ipcRenderer.invoke('terminal:setup-claude-cli'),
    configureClaudeCLI: (apiKey: string) => ipcRenderer.invoke('terminal:configure-claude-cli', apiKey),
    executeClaudeCommand: (prompt: string, options?: {
      anthropicApiKey?: string;
      openaiApiKey?: string;
      model?: string;
    }) => ipcRenderer.invoke('terminal:execute-claude-command', prompt, options),
    getAvailableApiKeys: () => ipcRenderer.invoke('terminal:get-available-api-keys'),
  },
  
  // System APIs
  system: {
    getStatus: () => ipcRenderer.invoke('system:get-status'),
  },
  
  // Legacy APIs for backward compatibility
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  sendChatMessage: (message: string) => ipcRenderer.invoke('send-chat-message', message),
  analyzeText: (text: string) => ipcRenderer.invoke('analyze-text', text),
  setApiKey: (key: string) => ipcRenderer.invoke('set-api-key', key),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for global usage
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export type { ElectronAPI };