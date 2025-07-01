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

  // Context monitoring APIs
  requestScreenCapturePermission: () => ipcRenderer.invoke('request-screen-capture-permission'),
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  getActiveWindowInfo: () => ipcRenderer.invoke('get-active-window-info'),
  
  // TaskMaster integration
  executeTaskMasterCommand: (command: string) => ipcRenderer.invoke('execute-taskmaster-command', command),
  
  // Development activity monitoring
  getGitHubActivity: () => ipcRenderer.invoke('get-github-activity'),
  monitorFileChanges: (directory: string) => ipcRenderer.invoke('monitor-file-changes', directory),
});

// Type definitions for the exposed API
export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getSystemTheme: () => Promise<'dark' | 'light'>;
  openExternal: (url: string) => Promise<void>;
  onThemeChange: (callback: (theme: 'dark' | 'light') => void) => void;
  getPerformanceMetrics: () => Promise<any>;
  showNotification: (title: string, body: string) => Promise<void>;
  
  // Context monitoring
  requestScreenCapturePermission: () => Promise<boolean>;
  captureScreen: () => Promise<string | null>;
  getActiveWindowInfo: () => Promise<{
    activeApp: string;
    windowTitle: string;
    platform: string;
    error?: string;
  }>;
  
  // TaskMaster integration
  executeTaskMasterCommand: (command: string) => Promise<{
    success: boolean;
    output: string;
    error?: string;
  }>;
  
  // Development monitoring
  getGitHubActivity: () => Promise<{
    hasUncommittedChanges: boolean;
    recentCommits: string[];
    modifiedFiles: string[];
  } | null>;
  monitorFileChanges: (directory: string) => Promise<{
    watchingDirectory: string;
    recentChanges: any[];
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}