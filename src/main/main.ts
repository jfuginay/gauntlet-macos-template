import { app, BrowserWindow, Menu, shell, ipcMain, desktopCapturer } from 'electron';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createMenu } from './menu';
import { backgroundProcessor } from './background-processor';
import { WorkflowEngine } from './workflow-engine';
import { localLLMService } from './local-llm-service';
import { logCollector } from './log-collector';
import { apiKeyManager } from './api-key-manager';
import { claudeCliManager } from './claude-cli-manager';

// Load environment variables from .env file (for development fallback)
require('dotenv').config();

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
    this.setupLogForwarding();
  }

  private setupLogForwarding(): void {
    // Forward new logs to renderer processes
    logCollector.onNewLog((log) => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('log-new', log);
      }
    });
  }

  private initializeApp(): void {
    // This method will be called when Electron has finished initialization
    app.whenReady().then(async () => {
      await this.createWindow();
      this.setupApplicationMenu();
      await this.setupIpcHandlers();
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
    logCollector.logSystem('info', 'Creating main application window...');
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
        logCollector.logSystem('info', '🔄 Loading Vite dev server...');
        await this.mainWindow.loadURL('http://localhost:5173');
        logCollector.logSystem('success', '✅ Connected to Vite dev server');
        this.mainWindow.webContents.openDevTools();
      } catch (error) {
        logCollector.logSystem('error', '❌ Failed to connect to Vite dev server', error);
        // Try fallback port
        try {
          await this.mainWindow.loadURL('http://localhost:5174');
          logCollector.logSystem('success', '✅ Connected to Vite dev server on fallback port 5174');
          this.mainWindow.webContents.openDevTools();
        } catch (fallbackError) {
          logCollector.logSystem('error', '❌ Fallback port also failed', fallbackError);
        }
      }
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // Show window when ready to prevent visual flash
    this.mainWindow.once('ready-to-show', () => {
      logCollector.logSystem('info', '✅ Main window ready and visible');
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      logCollector.logSystem('info', 'Main window closed');
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

  private async setupIpcHandlers(): Promise<void> {
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
      // Return empty data - implement real context monitoring in future
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

    // Log collection handlers
    ipcMain.handle('logs:get', async (event, filters) => {
      try {
        const logs = logCollector.getLogs(filters);
        return { success: true, data: logs };
      } catch (error) {
        logCollector.logSystem('error', 'Failed to get logs', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('logs:get-stats', async () => {
      try {
        const stats = logCollector.getStats();
        return { success: true, data: stats };
      } catch (error) {
        logCollector.logSystem('error', 'Failed to get log stats', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('logs:clear', async () => {
      try {
        logCollector.clearLogs();
        return { success: true };
      } catch (error) {
        logCollector.logSystem('error', 'Failed to clear logs', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Secure API Key management handlers
    await apiKeyManager.initialize();

    ipcMain.handle('get-api-key', async (_, keyName: string = 'ANTHROPIC_API_KEY') => {
      try {
        const apiKey = await apiKeyManager.getApiKey(keyName as any);
        return apiKey || null;
      } catch (error) {
        console.error('Failed to get API key:', error);
        return null;
      }
    });

    ipcMain.handle('get-all-api-keys', async () => {
      try {
        return await apiKeyManager.getAllApiKeys();
      } catch (error) {
        console.error('Failed to get all API keys:', error);
        return {};
      }
    });

    ipcMain.handle('set-api-key', async (_, keyName: string, key: string) => {
      try {
        await apiKeyManager.setApiKey(keyName as any, key);
        return { success: true };
      } catch (error) {
        console.error('Failed to set API key:', error);
        return { success: false, error: String(error) };
      }
    });

    ipcMain.handle('remove-api-key', async (_, keyName: string) => {
      try {
        await apiKeyManager.removeApiKey(keyName as any);
        return { success: true };
      } catch (error) {
        console.error('Failed to remove API key:', error);
        return { success: false, error: String(error) };
      }
    });

    ipcMain.handle('validate-api-key', async (_, keyName: string, value: string) => {
      try {
        return apiKeyManager.validateApiKey(keyName as any, value);
      } catch (error) {
        console.error('Failed to validate API key:', error);
        return { valid: false, error: 'Validation failed' };
      }
    });

    ipcMain.handle('has-required-api-keys', async (_, requiredKeys: string[]) => {
      try {
        return await apiKeyManager.hasRequiredKeys(requiredKeys as any);
      } catch (error) {
        console.error('Failed to check required API keys:', error);
        return false;
      }
    });

    ipcMain.handle('has-any-api-keys', async () => {
      try {
        return await apiKeyManager.hasAnyKeys();
      } catch (error) {
        console.error('Failed to check for any API keys:', error);
        return false;
      }
    });

    ipcMain.handle('migrate-api-keys-from-environment', async () => {
      try {
        return await apiKeyManager.migrateFromEnvironment();
      } catch (error) {
        console.error('Failed to migrate API keys:', error);
        return { migrated: [], failed: [] };
      }
    });

    ipcMain.handle('export-api-key-config', async () => {
      try {
        return await apiKeyManager.exportConfig();
      } catch (error) {
        console.error('Failed to export config:', error);
        return null;
      }
    });

    // First run setup handlers
    ipcMain.handle('is-first-run', async () => {
      try {
        const hasKeys = await apiKeyManager.hasAnyKeys();
        return !hasKeys;
      } catch (error) {
        console.error('Failed to check first run status:', error);
        return true;
      }
    });

    ipcMain.handle('set-first-run-complete', async () => {
      try {
        // This could be stored in a config file or just rely on API key presence
        return { success: true };
      } catch (error) {
        console.error('Failed to mark first run complete:', error);
        return { success: false, error: String(error) };
      }
    });

    // Claude CLI Terminal handlers
    ipcMain.handle('claude-cli:execute-command', async (_, command: string) => {
      try {
        const result = await claudeCliManager.executeCommand(command);
        return result;
      } catch (error) {
        console.error('Failed to execute Claude CLI command:', error);
        return {
          success: false,
          error: String(error)
        };
      }
    });

    ipcMain.handle('claude-cli:get-status', async () => {
      try {
        return claudeCliManager.getStatus();
      } catch (error) {
        console.error('Failed to get Claude CLI status:', error);
        return {
          installed: false,
          mcpConfigured: false,
          error: String(error)
        };
      }
    });

    ipcMain.handle('claude-cli:test-connection', async () => {
      try {
        return await claudeCliManager.testConnection();
      } catch (error) {
        console.error('Failed to test Claude CLI connection:', error);
        return {
          success: false,
          details: String(error)
        };
      }
    });

    ipcMain.handle('claude-cli:update-mcp-config', async () => {
      try {
        // Get current API keys and update MCP configuration
        const apiKeys = await apiKeyManager.getAllApiKeys();
        const apiKeyRecord: Record<string, string> = {};
        
        // Convert ApiKeyConfig to Record<string, string>
        Object.entries(apiKeys).forEach(([key, value]) => {
          if (value) {
            apiKeyRecord[key] = value;
          }
        });
        
        await claudeCliManager.updateMcpConfig(apiKeyRecord);
        return { success: true };
      } catch (error) {
        console.error('Failed to update MCP config:', error);
        return { success: false, error: String(error) };
      }
    });

    ipcMain.handle('claude-cli:maintenance-check', async () => {
      try {
        await claudeCliManager.performMaintenanceCheck();
        return { success: true };
      } catch (error) {
        console.error('Failed to perform maintenance check:', error);
        return { success: false, error: String(error) };
      }
    });

    // Local LLM service handlers
    ipcMain.handle('local-llm:query', async (event, prompt: string) => {
      try {
        const response = await localLLMService.query(prompt);
        return { success: true, data: response };
      } catch (error) {
        logCollector.logLLM('error', 'Local LLM query error', error);
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

    // Intelligence System and TaskMaster MCP Integration handlers
    this.setupIntelligenceHandlers();
  }

  private intelligenceSystem: any = null;

  private async getIntelligenceSystem() {
    if (!this.intelligenceSystem) {
      try {
        const { createIntelligenceSystem } = await import('./engie-intelligence-system.js');
        this.intelligenceSystem = await createIntelligenceSystem();
        console.log('🧠 Intelligence system initialized once');
      } catch (error) {
        console.error('Intelligence system initialization failed:', error);
        return null;
      }
    }
    return this.intelligenceSystem;
  }

  private setupIntelligenceHandlers(): void {
    // Project utilities
    ipcMain.handle('get-project-root', () => {
      return process.cwd();
    });

    // Intelligence System handlers with singleton pattern
    ipcMain.handle('intelligence:initialize', async () => {
      try {
        await this.getIntelligenceSystem();
        return { success: true, data: 'Intelligence system initialized' };
      } catch (error) {
        console.error('Intelligence initialization error:', error);
        return { success: false, error: String(error) };
      }
    });

    ipcMain.handle('intelligence:generate-task', async (_, prompt: string) => {
      try {
        const intelligence = await this.getIntelligenceSystem();
        if (!intelligence) {
          return { success: false, error: 'Intelligence system not available' };
        }
        const task = await intelligence.generateIntelligentTask(prompt);
        return { success: true, data: task };
      } catch (error) {
        console.error('Intelligent task generation error:', error);
        return { success: false, error: String(error) };
      }
    });

    ipcMain.handle('intelligence:get-insights', async () => {
      try {
        const intelligence = await this.getIntelligenceSystem();
        if (!intelligence) {
          return { success: true, data: { totalPatterns: 0, avgEffectiveness: 0, learningRate: 0, recentActivity: { commits: 0, tasks: 0 }, recommendations: ['Intelligence system initializing...'] } };
        }
        const insights = await intelligence.getIntelligenceInsights();
        return { success: true, data: insights };
      } catch (error) {
        console.error('Intelligence insights error:', error);
        return { success: false, error: String(error) };
      }
    });

    ipcMain.handle('intelligence:generate-commit', async () => {
      try {
        const intelligence = await this.getIntelligenceSystem();
        if (!intelligence) {
          return { success: true, data: 'feat: add intelligent features' };
        }
        const commitMessage = await intelligence.generateIntelligentCommitMessage();
        return { success: true, data: commitMessage };
      } catch (error) {
        console.error('Intelligent commit generation error:', error);
        return { success: true, data: 'feat: add intelligent features' };
      }
    });

    ipcMain.handle('intelligence:install-taskmaster', async () => {
      try {
        const { installEngieTaskMaster } = await import('./engie-taskmaster-installer.js');
        const result = await installEngieTaskMaster();
        return { success: true, data: result };
      } catch (error) {
        console.error('TaskMaster installation error:', error);
        return { success: false, error: String(error) };
      }
    });

    // Enhanced MCP Tool Integration handlers
    ipcMain.handle('taskmaster:call-mcp-tool', async (_, toolName: string, parameters: any) => {
      try {
        console.log(`🔧 Calling MCP tool: ${toolName}`, parameters);
        
        // Import the TaskMaster tools dynamically
        let taskMasterPath: string;
        try {
          // Try to find global task-master-ai installation
          const { execSync } = require('child_process');
          const npmPrefix = execSync('npm prefix -g', { encoding: 'utf8' }).trim();
          taskMasterPath = require('path').join(npmPrefix, 'lib', 'node_modules', 'task-master-ai');
        } catch {
          // Fallback to local or direct CLI execution
          console.log('Global task-master-ai not found, using CLI fallback');
          return await this.executeTaskMasterCLI(toolName, parameters);
        }

        // Map MCP tool names to TaskMaster functions
        const toolMapping: Record<string, string> = {
          'mcp_task-master-ai_get_tasks': 'list',
          'mcp_task-master-ai_add_task': 'add-task',
          'mcp_task-master-ai_next_task': 'next',
          'mcp_task-master-ai_get_task': 'show',
          'mcp_task-master-ai_set_task_status': 'set-status',
          'mcp_task-master-ai_expand_task': 'expand',
          'mcp_task-master-ai_update_task': 'update-task',
          'mcp_task-master-ai_update_subtask': 'update-subtask',
          'mcp_task-master-ai_analyze_project_complexity': 'analyze-complexity',
          'mcp_task-master-ai_research': 'research'
        };

        const cliCommand = toolMapping[toolName];
        if (cliCommand) {
          return await this.executeTaskMasterCLI(cliCommand, parameters);
        }

        // Fallback for unmapped tools
        console.warn(`Unknown MCP tool: ${toolName}, using CLI fallback`);
        return await this.executeTaskMasterCLI(toolName.replace('mcp_task-master-ai_', ''), parameters);

      } catch (error) {
        console.error('MCP tool call error:', error);
        return { success: false, error: String(error) };
      }
    });

    console.log('🧠 Intelligence and enhanced MCP handlers configured');
  }

  private async executeTaskMasterCLI(command: string, parameters: any): Promise<any> {
    try {
      const { spawn } = require('child_process');
      
      // Build command arguments
      const args = [command];
      
      // Convert parameters to CLI arguments with proper TaskMaster flag mapping
      if (parameters) {
        Object.entries(parameters).forEach(([key, value]) => {
          if (key === 'projectRoot') return; // Skip internal parameter
          
          // Special mappings for TaskMaster CLI flags
          const flagMappings: Record<string, string> = {
            'withSubtasks': '--with-subtasks',
            'projectRoot': '', // Skip
            'research': '--research',
            'force': '--force',
            'prompt': '--prompt',
            'query': '--query',
            'id': '--id',
            'status': '--status',
            'tag': '--tag',
            'file': '--file',
            'output': '--output',
            'threshold': '--threshold',
            'num': '--num',
            'dependencies': '--dependencies',
            'priority': '--priority'
          };
          
          // Get the correct CLI flag
          const flag = flagMappings[key] || `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          
          if (key === 'prompt' || key === 'query') {
            args.push(`${flag}="${value}"`);
          } else if ((key === 'research' || key === 'force' || key === 'withSubtasks') && value === true) {
            args.push(flag);
          } else if (key === 'id' || key === 'status' || key === 'tag' || key === 'file' || key === 'output') {
            args.push(`${flag}=${value}`);
          } else if (value !== undefined && value !== null && value !== false && flag) {
            args.push(`${flag}=${value}`);
          }
        });
      }

      // Set project root if provided
      const projectRoot = parameters?.projectRoot || process.cwd();
      
      console.log(`🚀 Executing: task-master ${args.join(' ')} in ${projectRoot}`);

      return new Promise((resolve) => {
        const child = spawn('task-master', args, {
          cwd: projectRoot,
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        child.on('close', (code: number | null) => {
          if (code === 0) {
            try {
              // Try to parse JSON response first
              const data = JSON.parse(stdout);
              resolve({ success: true, data });
            } catch {
              // TaskMaster CLI returns formatted text, not JSON
              // For list commands, return the raw output for display
              if (command === 'list' || command === 'show' || command === 'next') {
                resolve({ success: true, data: stdout.trim(), isFormattedText: true });
              } else {
                // For other commands, try to extract meaningful data or return raw output
                resolve({ success: true, data: stdout.trim() });
              }
            }
          } else {
            console.error(`TaskMaster CLI error (${code}):`, stderr);
            resolve({ success: false, error: stderr || `Command failed with code ${code}` });
          }
        });

        child.on('error', (error: Error) => {
          console.error('TaskMaster CLI spawn error:', error);
          
          // Check if it's a "command not found" error
          if (error.message.includes('ENOENT') || error.message.includes('command not found')) {
            resolve({ 
              success: false, 
              error: 'TaskMaster CLI not found. Please install with: npm install -g task-master-ai',
              needsInstallation: true
            });
          } else {
            resolve({ success: false, error: String(error) });
          }
        });

        // Timeout after 30 seconds for AI operations
        setTimeout(() => {
          child.kill();
          resolve({ success: false, error: 'Command timeout after 30 seconds' });
        }, 30000);
      });

    } catch (error) {
      console.error('TaskMaster CLI execution error:', error);
      return { success: false, error: String(error) };
    }
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
      console.log('🚀 Initializing Local AI with optimized auto-setup for instant responses...');
      
      // Set up progress callback to send updates to renderer
      localLLMService.setProgressCallback((progress, status) => {
        console.log(`Model Progress: ${progress}% - ${status}`);
        // Send progress updates to all windows
        BrowserWindow.getAllWindows().forEach(window => {
          window.webContents.send('llm-download-progress', { progress, status });
        });
      });
      
      // Use optimized auto-setup for faster responses
      const status = await localLLMService.autoSetup({ 
        preferDocker: false,     // Use native for simplicity
        fastModel: true,         // Use fast models for quick responses  
        autoInstall: true        // Auto-install Ollama if needed
      });
      console.log('Local LLM initialization result:', status);
      
      if (status.modelReady && status.currentModel) {
        console.log(`✅ Local AI ready with ${status.currentModel} (${status.performance} performance)`);
        console.log(`🐳 Setup method: ${status.setupMethod}`);
        console.log(`📊 Available models: ${status.modelStatus?.available.length || 0}`);
        console.log(`🚀 Model preloaded for instant responses!`);
      } else if (status.installed && status.running) {
        console.log('⚠️ Ollama running but setting up optimal model...');
      } else if (status.installed) {
        console.log('⚠️ Ollama installed but not running - auto-starting...');
      } else {
        console.log('❌ Auto-setup failed - manual installation may be required');
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