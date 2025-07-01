import { app, BrowserWindow, Menu, shell, ipcMain, desktopCapturer } from 'electron';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createMenu } from './menu';
import { backgroundProcessor } from './background-processor';
import { WorkflowEngine } from './workflow-engine';
import { localLLMService } from './local-llm-service';

const execAsync = promisify(exec);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

class EngieApp {
  private mainWindow: BrowserWindow | null = null;
  private workflowEngine!: WorkflowEngine;

  constructor() {
    this.initializeApp();
  }

  private initializeApp(): void {
    // This method will be called when Electron has finished initialization
    app.whenReady().then(async () => {
      await this.createWindow();
      this.setupApplicationMenu();
      this.setupIpcHandlers();
      this.initializeBackgroundServices().catch(console.error);

      // Initialize local LLM for always-on conversational mode
      await this.initializeLocalLLM();

      app.on('activate', async () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
          await this.createWindow();
        }
      });
    });

    // Quit when all windows are closed, except on macOS
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanupBackgroundServices();
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

    app.on('before-quit', () => {
      this.stopBackgroundServices();
    });

    // Handle app lifecycle for background processing
    app.on('will-quit', (event) => {
      if (this.workflowEngine.isWorkflowActive() || backgroundProcessor.getQueueStats().processing > 0) {
        event.preventDefault();
        
        setTimeout(() => {
          this.cleanupBackgroundServices();
          app.quit();
        }, 2000); // Wait 2 seconds for cleanup
      }
    });

    // Unhandled error handling
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.cleanupBackgroundServices();
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  private async createWindow(): Promise<void> {
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
      // Simple direct connection to Vite dev server
      try {
        console.log('🔄 Loading Vite dev server...');
        await this.mainWindow.loadURL('http://localhost:5173');
        console.log('✅ Connected to Vite dev server');
        this.mainWindow.webContents.openDevTools();
      } catch (error) {
        console.error('❌ Failed to connect to Vite dev server:', error);
        // Try fallback port
        try {
          await this.mainWindow.loadURL('http://localhost:5174');
          console.log('✅ Connected to Vite dev server on fallback port 5174');
          this.mainWindow.webContents.openDevTools();
        } catch (fallbackError) {
          console.error('❌ Fallback port also failed:', fallbackError);
        }
      }
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

    // Process user input through workflow
    ipcMain.handle('workflow:process-input', async (event, message: string) => {
      try {
        const result = await this.workflowEngine.processUserInput(message);
        return { success: true, data: result };
      } catch (error) {
        console.error('Workflow processing error:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Real-time text analysis
    ipcMain.handle('workflow:analyze-text', async (event, text: string) => {
      try {
        const result = await this.workflowEngine.processTextAnalysis(text);
        return { success: true, data: result };
      } catch (error) {
        console.error('Text analysis error:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Background job management
    ipcMain.handle('background:add-job', async (event, type: string, data: any, priority: string = 'medium') => {
      try {
        const jobId = backgroundProcessor.addJob(type as any, data, priority as any);
        return { success: true, jobId };
      } catch (error) {
        console.error('Background job error:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Get background queue stats
    ipcMain.handle('background:get-stats', async () => {
      try {
        const stats = backgroundProcessor.getQueueStats();
        return { success: true, data: stats };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Get job status
    ipcMain.handle('background:get-job-status', async (event, jobId: string) => {
      try {
        const job = backgroundProcessor.getJobStatus(jobId);
        return { success: true, data: job };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Workflow status check
    ipcMain.handle('workflow:is-active', async () => {
      try {
        const isActive = this.workflowEngine.isWorkflowActive();
        return { success: true, data: { isActive } };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Enhanced AI command with workflow integration
    ipcMain.handle('ai:enhanced-command', async (event, query: string) => {
      try {
        // Process through workflow engine first
        const workflowResult = await this.workflowEngine.processUserInput(query);
        
        // Add to background processing for further enhancement
        const jobId = backgroundProcessor.addJob('ai_processing', { input: query }, 'high');
        
        return { 
          success: true, 
          data: { 
            workflowResult, 
            backgroundJobId: jobId,
            message: 'Query processed through intelligent workflow system'
          } 
        };
      } catch (error) {
        console.error('Enhanced AI command error:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // System status for terminal display
    ipcMain.handle('system:get-status', async () => {
      try {
        const queueStats = backgroundProcessor.getQueueStats();
        const isWorkflowActive = this.workflowEngine.isWorkflowActive();
        
        return {
          success: true,
          data: {
            workflow: {
              active: isWorkflowActive,
              engine: 'LangGraph-inspired',
              status: 'operational'
            },
            backgroundProcessor: {
              ...queueStats,
              status: 'running',
              maxConcurrent: 3
            },
            ai: {
              status: 'connected',
              providers: ['local', 'anthropic', 'openai'],
              fallback: 'enabled'
            },
            memory: {
              used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
              total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
            }
          }
        };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Local LLM service handlers
    ipcMain.handle('local-llm:query', async (event, prompt: string) => {
      try {
        const response = await localLLMService.query(prompt);
        return { success: true, data: response };
      } catch (error) {
        console.error('Local LLM query error:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('local-llm:status', async () => {
      try {
        const status = await localLLMService.getStatus();
        return { success: true, data: status };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('local-llm:initialize', async () => {
      try {
        const result = await localLLMService.initialize();
        return { success: true, data: result };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    console.log('📡 IPC handlers configured for workflow integration');
  }

  private async initializeBackgroundServices(): Promise<void> {
    // Initialize workflow engine
    this.workflowEngine = new WorkflowEngine();
    
    // Start background processor
    backgroundProcessor.start();
    
    console.log('🚀 Background services initialized');
    console.log('✅ LangGraph workflow engine ready');
    console.log('✅ Background processor started');
  }

  private stopBackgroundServices(): void {
    backgroundProcessor.stop();
    console.log('🔄 Background services stopped');
  }

  private cleanupBackgroundServices(): void {
    backgroundProcessor.cleanup();
    localLLMService.cleanup();
  }

  private async initializeLocalLLM(): Promise<void> {
    try {
      console.log('🤖 Initializing Local AI with automatic model management...');
      
      // Set up progress callback to send updates to renderer
      localLLMService.setProgressCallback((progress, status) => {
        console.log(`Model Progress: ${progress}% - ${status}`);
        // Send progress updates to all windows
        BrowserWindow.getAllWindows().forEach(window => {
          window.webContents.send('llm-download-progress', { progress, status });
        });
      });
      
      const status = await localLLMService.initialize();
      console.log('Local LLM initialization result:', status);
      
      if (status.modelReady && status.currentModel) {
        console.log(`✅ Local AI ready with model: ${status.currentModel}`);
        console.log(`📊 Available models: ${status.modelStatus?.available.length || 0}`);
      } else if (status.installed && status.running) {
        console.log('⚠️ Ollama running but downloading model...');
      } else if (status.installed) {
        console.log('⚠️ Ollama installed but not running - trying to start...');
      } else {
        console.log('❌ Ollama not installed - local AI features disabled');
        console.log('💡 Install with: brew install ollama');
      }
      
      // Send final status to renderer
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('llm-status-update', status);
      });
      
    } catch (error) {
      console.error('Local LLM initialization failed:', error);
      
      // Send error to renderer
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('llm-status-update', {
          installed: false,
          running: false,
          modelReady: false,
          error: error instanceof Error ? error.message : 'Initialization failed'
        });
      });
    }
  }
}

// Initialize Engie
new EngieApp();