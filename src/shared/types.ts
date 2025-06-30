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