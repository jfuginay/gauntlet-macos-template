export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getSystemTheme: () => Promise<'light' | 'dark'>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}