import { contextBridge, ipcRenderer } from 'electron';

// ENGIE v2.0 - Simplified Preload
// Following PRD principles: minimal foundation, explicit IPC contracts

interface ElectronAPI {
  // Basic app info
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  
  // App APIs
  app: {
    getVersion: () => Promise<string>;
    getName: () => Promise<string>;
    showError: (title: string, content: string) => Promise<void>;
  };
  
  // Window controls
  window: {
    minimize: () => Promise<void>;
    close: () => Promise<void>;
    maximize: () => Promise<void>;
  };
  
  // System info
  system: {
    platform: () => Promise<string>;
  };
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // Generic invoke method for flexibility
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  
  // App APIs
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getName: () => ipcRenderer.invoke('app:getName'),
    showError: (title: string, content: string) => ipcRenderer.invoke('app:showError', title, content),
  },
  
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
  },
  
  // System info
  system: {
    platform: () => ipcRenderer.invoke('system:platform'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for global usage
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export type { ElectronAPI };