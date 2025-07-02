"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI = {
    // Generic invoke method for flexibility
    invoke: (channel, ...args) => electron_1.ipcRenderer.invoke(channel, ...args),
    // App APIs
    app: {
        getVersion: () => electron_1.ipcRenderer.invoke('app:getVersion'),
        getName: () => electron_1.ipcRenderer.invoke('app:getName'),
        showError: (title, content) => electron_1.ipcRenderer.invoke('app:showError', title, content),
    },
    // Window controls
    window: {
        minimize: () => electron_1.ipcRenderer.invoke('window:minimize'),
        close: () => electron_1.ipcRenderer.invoke('window:close'),
        maximize: () => electron_1.ipcRenderer.invoke('window:maximize'),
    },
    // System info
    system: {
        platform: () => electron_1.ipcRenderer.invoke('system:platform'),
    },
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
//# sourceMappingURL=preload.js.map