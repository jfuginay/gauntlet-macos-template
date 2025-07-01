import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  // Add more secure API methods as needed
  onThemeChange: (callback: (theme: 'dark' | 'light') => void) => {
    ipcRenderer.on('theme-changed', (_, theme) => callback(theme));
  },
  
  // Performance monitoring
  getPerformanceMetrics: () => ipcRenderer.invoke('get-performance-metrics'),
  
  // App notifications
  showNotification: (title: string, body: string) => 
    ipcRenderer.invoke('show-notification', title, body),

  // Local LLM API
  localLLM: {
    getConfig: () => ipcRenderer.invoke('local-llm-get-config'),
    updateConfig: (config: any) => ipcRenderer.invoke('local-llm-update-config', config),
    checkDocker: () => ipcRenderer.invoke('local-llm-check-docker'),
    checkGPU: () => ipcRenderer.invoke('local-llm-check-gpu'),
    setupContainer: () => ipcRenderer.invoke('local-llm-setup-container'),
    stopContainer: () => ipcRenderer.invoke('local-llm-stop-container'),
    isRunning: () => ipcRenderer.invoke('local-llm-is-running'),
    waitReady: () => ipcRenderer.invoke('local-llm-wait-ready'),
    listModels: () => ipcRenderer.invoke('local-llm-list-models'),
    pullModel: (modelName: string) => ipcRenderer.invoke('local-llm-pull-model', modelName),
    removeModel: (modelName: string) => ipcRenderer.invoke('local-llm-remove-model', modelName),
    generate: (model: string, prompt: string) => ipcRenderer.invoke('local-llm-generate', model, prompt),
    chat: (model: string, messages: Array<{role: string, content: string}>) => 
      ipcRenderer.invoke('local-llm-chat', model, messages),
    ensureFallback: () => ipcRenderer.invoke('local-llm-ensure-fallback'),
    getRecommendedModels: () => ipcRenderer.invoke('local-llm-recommended-models'),
  },
});

// Type definitions for the exposed API
export interface LocalLLMAPI {
  getConfig: () => Promise<any>;
  updateConfig: (config: any) => Promise<void>;
  checkDocker: () => Promise<boolean>;
  checkGPU: () => Promise<boolean>;
  setupContainer: () => Promise<boolean>;
  stopContainer: () => Promise<boolean>;
  isRunning: () => Promise<boolean>;
  waitReady: () => Promise<boolean>;
  listModels: () => Promise<any[]>;
  pullModel: (modelName: string) => Promise<boolean>;
  removeModel: (modelName: string) => Promise<boolean>;
  generate: (model: string, prompt: string) => Promise<string>;
  chat: (model: string, messages: Array<{role: string, content: string}>) => Promise<string>;
  ensureFallback: () => Promise<boolean>;
  getRecommendedModels: () => Promise<Array<{name: string, description: string, size: string}>>;
}

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getSystemTheme: () => Promise<'dark' | 'light'>;
  openExternal: (url: string) => Promise<void>;
  onThemeChange: (callback: (theme: 'dark' | 'light') => void) => void;
  getPerformanceMetrics: () => Promise<any>;
  showNotification: (title: string, body: string) => Promise<void>;
  localLLM: LocalLLMAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}