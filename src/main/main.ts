import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';

// ENGIE v2.0 - Simplified Main Process
// Following PRD principles: minimal foundation, no background processing, clear IPC contracts

const isDev = process.env.NODE_ENV === 'development';

class ENGIEv2Main {
  private mainWindow: BrowserWindow | null = null;
  private isQuitting: boolean = false;

  constructor() {
    this.setupApp();
    this.setupIPC();
  }

  private setupApp(): void {
    // Ensure single instance
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
      return;
    }

    app.on('second-instance', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
        this.mainWindow.focus();
      }
    });

    // App event handlers
    app.whenReady().then(() => this.createWindow());
    
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.on('before-quit', () => {
      this.isQuitting = true;
    });
  }

  private async createWindow(): Promise<void> {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
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
    } else {
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

  private setupIPC(): void {
    // v2.0 IPC Handlers - Simple, explicit contracts
    
    // Basic app info
    ipcMain.handle('app:getVersion', () => {
      return app.getVersion();
    });

    ipcMain.handle('app:getName', () => {
      return app.getName();
    });

    // Window controls
    ipcMain.handle('window:minimize', () => {
      this.mainWindow?.minimize();
    });

    ipcMain.handle('window:close', () => {
      if (process.platform === 'darwin') {
        this.mainWindow?.hide();
      } else {
        this.mainWindow?.close();
      }
    });

    ipcMain.handle('window:maximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    // Error handler
    ipcMain.handle('app:showError', async (_, title: string, content: string) => {
      return dialog.showErrorBox(title, content);
    });

    // Basic system info
    ipcMain.handle('system:platform', () => {
      return process.platform;
    });

    console.log('✅ ENGIE v2.0 Main Process initialized');
    console.log('📋 Following PRD principles: minimal foundation, no background processing');
  }
}

// Initialize ENGIE v2.0
new ENGIEv2Main();