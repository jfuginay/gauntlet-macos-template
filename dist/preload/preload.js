"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    getSystemTheme: () => electron_1.ipcRenderer.invoke('get-system-theme'),
    openExternal: (url) => electron_1.ipcRenderer.invoke('open-external', url),
    // Add more secure API methods as needed
    onThemeChange: (callback) => {
        electron_1.ipcRenderer.on('theme-changed', (_, theme) => callback(theme));
    },
    // Performance monitoring
    getPerformanceMetrics: () => electron_1.ipcRenderer.invoke('get-performance-metrics'),
    // App notifications
    showNotification: (title, body) => electron_1.ipcRenderer.invoke('show-notification', title, body),
});
