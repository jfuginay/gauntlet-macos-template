import { app, BrowserWindow, Menu, shell, ipcMain } from 'electron';
import { join } from 'path';
import { createMenu } from './menu';
import { LocalLLMService } from './localLLMService';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

class EngieApp {
  private mainWindow: BrowserWindow | null = null;
  private localLLMService: LocalLLMService;

  constructor() {
    this.localLLMService = new LocalLLMService();
    this.initializeApp();
  }

  private initializeApp(): void {
    // This method will be called when Electron has finished initialization
    app.whenReady().then(() => {
      this.createWindow();
      this.setupApplicationMenu();
      this.setupIpcHandlers();

      app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    // Quit when all windows are closed, except on macOS
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
      });
    });
  }

  private createWindow(): void {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      height: 800,
      width: 1200,
      minHeight: 600,
      minWidth: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload/preload.js'),
      },
      titleBarStyle: 'hiddenInset',
      vibrancy: 'under-window',
      transparent: true,
      show: false, // Don't show until ready-to-show
    });

    // Load the app
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // Show window when ready to prevent visual flash
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupApplicationMenu(): void {
    const menu = createMenu({
      onAbout: () => {
        // Handle about dialog
      },
      onPreferences: () => {
        // Handle preferences
      },
      onQuit: () => {
        app.quit();
      },
    });
    
    Menu.setApplicationMenu(menu);
  }

  private setupIpcHandlers(): void {
    // Handle app version request
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    // Handle system theme
    ipcMain.handle('get-system-theme', () => {
      return require('electron').nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    });

    // Handle opening external links
    ipcMain.handle('open-external', (_, url: string) => {
      shell.openExternal(url);
    });

    // Local LLM handlers
    ipcMain.handle('local-llm-get-config', () => {
      return this.localLLMService.getConfig();
    });

    ipcMain.handle('local-llm-update-config', (_, config) => {
      return this.localLLMService.updateConfig(config);
    });

    ipcMain.handle('local-llm-check-docker', () => {
      return this.localLLMService.checkDockerAvailability();
    });

    ipcMain.handle('local-llm-check-gpu', () => {
      return this.localLLMService.checkGPUSupport();
    });

    ipcMain.handle('local-llm-setup-container', () => {
      return this.localLLMService.setupContainer();
    });

    ipcMain.handle('local-llm-stop-container', () => {
      return this.localLLMService.stopContainer();
    });

    ipcMain.handle('local-llm-is-running', () => {
      return this.localLLMService.isContainerRunning();
    });

    ipcMain.handle('local-llm-wait-ready', () => {
      return this.localLLMService.waitForOllamaReady();
    });

    ipcMain.handle('local-llm-list-models', () => {
      return this.localLLMService.listModels();
    });

    ipcMain.handle('local-llm-pull-model', (_, modelName: string) => {
      return this.localLLMService.pullModel(modelName);
    });

    ipcMain.handle('local-llm-remove-model', (_, modelName: string) => {
      return this.localLLMService.removeModel(modelName);
    });

    ipcMain.handle('local-llm-generate', (_, model: string, prompt: string) => {
      return this.localLLMService.generateResponse(model, prompt);
    });

    ipcMain.handle('local-llm-chat', (_, model: string, messages: Array<{role: string, content: string}>) => {
      return this.localLLMService.chatCompletion(model, messages);
    });

    ipcMain.handle('local-llm-ensure-fallback', () => {
      return this.localLLMService.ensureFallbackModel();
    });

    ipcMain.handle('local-llm-recommended-models', () => {
      return this.localLLMService.getRecommendedModels();
    });
  }
}

// Initialize Engie
new EngieApp();