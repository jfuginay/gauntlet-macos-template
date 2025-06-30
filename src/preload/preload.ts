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
});

// Type definitions for the exposed API
export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getSystemTheme: () => Promise<'dark' | 'light'>;
  openExternal: (url: string) => Promise<void>;
  onThemeChange: (callback: (theme: 'dark' | 'light') => void) => void;
  getPerformanceMetrics: () => Promise<any>;
  showNotification: (title: string, body: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}