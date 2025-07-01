import { app, BrowserWindow, Menu, shell, ipcMain, desktopCapturer } from 'electron';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createMenu } from './menu';

const execAsync = promisify(exec);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

class EngieApp {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
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

    // Context monitoring handlers
    ipcMain.handle('request-screen-capture-permission', async () => {
      try {
        if (process.platform === 'darwin') {
          // Note: Screen capture permission is handled differently than camera/microphone
          // For now, we'll assume permission is granted and handle it in the capture function
          return true;
        }
        return true; // Assume granted on other platforms
      } catch (error) {
        console.error('Failed to request screen capture permission:', error);
        return false;
      }
    });

    ipcMain.handle('capture-screen', async () => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 1920, height: 1080 }
        });

        if (sources.length > 0) {
          // Return the first screen's thumbnail as base64
          return sources[0].thumbnail.toDataURL();
        }
        return null;
      } catch (error) {
        console.error('Failed to capture screen:', error);
        return null;
      }
    });

    ipcMain.handle('get-active-window-info', async () => {
      try {
        if (process.platform === 'darwin') {
          // Use AppleScript to get active window info
          const { stdout } = await execAsync(`osascript -e '
            tell application "System Events"
              set frontApp to first application process whose frontmost is true
              set appName to name of frontApp
              try
                set windowTitle to name of first window of frontApp
              on error
                set windowTitle to ""
              end try
              return appName & "|" & windowTitle
            end tell'`);
          
          const [appName, windowTitle] = stdout.trim().split('|');
          return {
            activeApp: appName || 'Unknown',
            windowTitle: windowTitle || '',
            platform: 'darwin'
          };
        } else {
          // For other platforms, return basic info
          return {
            activeApp: 'Unknown',
            windowTitle: '',
            platform: process.platform
          };
        }
      } catch (error) {
        console.error('Failed to get active window info:', error);
        return {
          activeApp: 'Unknown',
          windowTitle: '',
          platform: process.platform,
          error: String(error)
        };
      }
    });

    ipcMain.handle('execute-taskmaster-command', async (_, command: string) => {
      try {
        const { stdout, stderr } = await execAsync(`task-master ${command}`, {
          cwd: this.mainWindow?.webContents.getURL().includes('localhost') 
            ? process.cwd() 
            : process.resourcesPath
        });
        
        if (stderr) {
          console.warn('TaskMaster stderr:', stderr);
        }
        
        return { success: true, output: stdout };
      } catch (error) {
        console.error('TaskMaster command failed:', error);
        return { 
          success: false, 
          error: String(error),
          output: '' 
        };
      }
    });

    ipcMain.handle('get-github-activity', async () => {
      try {
        // Check git status for current project
        const { stdout: gitStatus } = await execAsync('git status --porcelain');
        const { stdout: gitLog } = await execAsync('git log --oneline -5');
        
        return {
          hasUncommittedChanges: gitStatus.trim().length > 0,
          recentCommits: gitLog.trim().split('\n').filter(line => line.length > 0),
          modifiedFiles: gitStatus.trim().split('\n').filter(line => line.length > 0)
        };
      } catch (error) {
        console.error('Failed to get git activity:', error);
        return null;
      }
    });

    ipcMain.handle('monitor-file-changes', async (_, directory: string) => {
      // This would implement file system watching
      // For now, return mock data
      return {
        watchingDirectory: directory,
        recentChanges: []
      };
    });
  }
}

// Initialize Engie
new EngieApp();