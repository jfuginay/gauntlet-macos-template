"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
// ENGIE v2.0 - Simplified Main Process
// Following PRD principles: minimal foundation, no background processing, clear IPC contracts
const isDev = process.env.NODE_ENV === 'development';
class ENGIEv2Main {
    constructor() {
        this.mainWindow = null;
        this.isQuitting = false;
        this.setupApp();
        this.setupIPC();
    }
    setupApp() {
        // Ensure single instance
        const gotTheLock = electron_1.app.requestSingleInstanceLock();
        if (!gotTheLock) {
            electron_1.app.quit();
            return;
        }
        electron_1.app.on('second-instance', () => {
            if (this.mainWindow) {
                if (this.mainWindow.isMinimized())
                    this.mainWindow.restore();
                this.mainWindow.focus();
            }
        });
        // App event handlers
        electron_1.app.whenReady().then(() => this.createWindow());
        electron_1.app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                electron_1.app.quit();
            }
        });
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });
        electron_1.app.on('before-quit', () => {
            this.isQuitting = true;
        });
    }
    async createWindow() {
        // Create the browser window
        this.mainWindow = new electron_1.BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            show: false,
            titleBarStyle: 'hiddenInset',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '../preload/preload.js'),
                webSecurity: true,
            },
            icon: path.join(__dirname, '../../assets/icons/icon.png'),
        });
        // Load the app
        if (isDev) {
            await this.mainWindow.loadURL('http://localhost:5173');
            // this.mainWindow.webContents.openDevTools();
        }
        else {
            await this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
        }
        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
            if (isDev) {
                this.mainWindow?.webContents.openDevTools();
            }
        });
        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
        // macOS specific window behavior
        this.mainWindow.on('close', (event) => {
            if (!this.isQuitting && process.platform === 'darwin') {
                event.preventDefault();
                this.mainWindow?.hide();
            }
        });
    }
    setupIPC() {
        // v2.0 IPC Handlers - Simple, explicit contracts
        // Basic app info
        electron_1.ipcMain.handle('app:getVersion', () => {
            return electron_1.app.getVersion();
        });
        electron_1.ipcMain.handle('app:getName', () => {
            return electron_1.app.getName();
        });
        // Window controls
        electron_1.ipcMain.handle('window:minimize', () => {
            this.mainWindow?.minimize();
        });
        electron_1.ipcMain.handle('window:close', () => {
            if (process.platform === 'darwin') {
                this.mainWindow?.hide();
            }
            else {
                this.mainWindow?.close();
            }
        });
        electron_1.ipcMain.handle('window:maximize', () => {
            if (this.mainWindow?.isMaximized()) {
                this.mainWindow.unmaximize();
            }
            else {
                this.mainWindow?.maximize();
            }
        });
        // Error handler
        electron_1.ipcMain.handle('app:showError', async (_, title, content) => {
            return electron_1.dialog.showErrorBox(title, content);
        });
        // Basic system info
        electron_1.ipcMain.handle('system:platform', () => {
            return process.platform;
        });
        console.log('✅ ENGIE v2.0 Main Process initialized');
        console.log('📋 Following PRD principles: minimal foundation, no background processing');
    }
}
// Initialize ENGIE v2.0
new ENGIEv2Main();
//# sourceMappingURL=main.js.map