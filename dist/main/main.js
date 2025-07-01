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
const path_1 = require("path");
const child_process_1 = require("child_process");
const util_1 = require("util");
const menu_1 = require("./menu");
const background_processor_1 = require("./background-processor");
const workflow_engine_1 = require("./workflow-engine");
const local_llm_service_1 = require("./local-llm-service");
const log_collector_1 = require("./log-collector");
const api_key_manager_1 = require("./api-key-manager");
const claude_cli_manager_1 = require("./claude-cli-manager");
// Load environment variables from .env file (for development fallback)
require('dotenv').config();
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    electron_1.app.quit();
}
class EngieApp {
    constructor() {
        this.mainWindow = null;
        this.initializeApp();
        this.setupLogForwarding();
    }
    setupLogForwarding() {
        // Forward new logs to renderer processes
        log_collector_1.logCollector.onNewLog((log) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('log-new', log);
            }
        });
    }
    initializeApp() {
        // This method will be called when Electron has finished initialization
        electron_1.app.whenReady().then(async () => {
            await this.createWindow();
            this.setupApplicationMenu();
            await this.setupIpcHandlers();
            this.initializeBackgroundServices().catch(console.error);
            // Initialize local LLM for always-on conversational mode
            await this.initializeLocalLLM();
            electron_1.app.on('activate', async () => {
                // On macOS it's common to re-create a window in the app when the
                // dock icon is clicked and there are no other windows open.
                if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                    await this.createWindow();
                }
            });
        });
        // Quit when all windows are closed, except on macOS
        electron_1.app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                this.cleanupBackgroundServices();
                electron_1.app.quit();
            }
        });
        // Security: Prevent new window creation
        electron_1.app.on('web-contents-created', (_, contents) => {
            contents.setWindowOpenHandler(({ url }) => {
                electron_1.shell.openExternal(url);
                return { action: 'deny' };
            });
        });
        electron_1.app.on('before-quit', () => {
            this.stopBackgroundServices();
        });
        // Handle app lifecycle for background processing
        electron_1.app.on('will-quit', (event) => {
            if (this.workflowEngine.isWorkflowActive() || background_processor_1.backgroundProcessor.getQueueStats().processing > 0) {
                event.preventDefault();
                setTimeout(() => {
                    this.cleanupBackgroundServices();
                    electron_1.app.quit();
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
    async createWindow() {
        log_collector_1.logCollector.logSystem('info', 'Creating main application window...');
        // Create the browser window
        this.mainWindow = new electron_1.BrowserWindow({
            height: 800,
            width: 1200,
            minHeight: 600,
            minWidth: 900,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: (0, path_1.join)(__dirname, '../preload/preload.js'),
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
                log_collector_1.logCollector.logSystem('info', '🔄 Loading Vite dev server...');
                await this.mainWindow.loadURL('http://localhost:5173');
                log_collector_1.logCollector.logSystem('success', '✅ Connected to Vite dev server');
                this.mainWindow.webContents.openDevTools();
            }
            catch (error) {
                log_collector_1.logCollector.logSystem('error', '❌ Failed to connect to Vite dev server', error);
                // Try fallback port
                try {
                    await this.mainWindow.loadURL('http://localhost:5174');
                    log_collector_1.logCollector.logSystem('success', '✅ Connected to Vite dev server on fallback port 5174');
                    this.mainWindow.webContents.openDevTools();
                }
                catch (fallbackError) {
                    log_collector_1.logCollector.logSystem('error', '❌ Fallback port also failed', fallbackError);
                }
            }
        }
        else {
            this.mainWindow.loadFile((0, path_1.join)(__dirname, '../renderer/index.html'));
        }
        // Show window when ready to prevent visual flash
        this.mainWindow.once('ready-to-show', () => {
            log_collector_1.logCollector.logSystem('info', '✅ Main window ready and visible');
            this.mainWindow?.show();
        });
        // Handle window closed
        this.mainWindow.on('closed', () => {
            log_collector_1.logCollector.logSystem('info', 'Main window closed');
            this.mainWindow = null;
        });
    }
    setupApplicationMenu() {
        const menu = (0, menu_1.createMenu)({
            onAbout: () => {
                // Handle about dialog
            },
            onPreferences: () => {
                // Handle preferences
            },
            onQuit: () => {
                electron_1.app.quit();
            },
        });
        electron_1.Menu.setApplicationMenu(menu);
    }
    async setupIpcHandlers() {
        // Handle app version request
        electron_1.ipcMain.handle('get-app-version', () => {
            return electron_1.app.getVersion();
        });
        // Handle system theme
        electron_1.ipcMain.handle('get-system-theme', () => {
            return require('electron').nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
        });
        // Handle opening external links
        electron_1.ipcMain.handle('open-external', (_, url) => {
            electron_1.shell.openExternal(url);
        });
        // Context monitoring handlers
        electron_1.ipcMain.handle('request-screen-capture-permission', async () => {
            try {
                if (process.platform === 'darwin') {
                    // Note: Screen capture permission is handled differently than camera/microphone
                    // For now, we'll assume permission is granted and handle it in the capture function
                    return true;
                }
                return true; // Assume granted on other platforms
            }
            catch (error) {
                console.error('Failed to request screen capture permission:', error);
                return false;
            }
        });
        electron_1.ipcMain.handle('capture-screen', async () => {
            try {
                const sources = await electron_1.desktopCapturer.getSources({
                    types: ['screen'],
                    thumbnailSize: { width: 1920, height: 1080 }
                });
                if (sources.length > 0) {
                    // Return the first screen's thumbnail as base64
                    return sources[0].thumbnail.toDataURL();
                }
                return null;
            }
            catch (error) {
                console.error('Failed to capture screen:', error);
                return null;
            }
        });
        electron_1.ipcMain.handle('get-active-window-info', async () => {
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
                }
                else {
                    // For other platforms, return basic info
                    return {
                        activeApp: 'Unknown',
                        windowTitle: '',
                        platform: process.platform
                    };
                }
            }
            catch (error) {
                console.error('Failed to get active window info:', error);
                return {
                    activeApp: 'Unknown',
                    windowTitle: '',
                    platform: process.platform,
                    error: String(error)
                };
            }
        });
        electron_1.ipcMain.handle('execute-taskmaster-command', async (_, command) => {
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
            }
            catch (error) {
                console.error('TaskMaster command failed:', error);
                return {
                    success: false,
                    error: String(error),
                    output: ''
                };
            }
        });
        electron_1.ipcMain.handle('get-github-activity', async () => {
            try {
                // Check git status for current project
                const { stdout: gitStatus } = await execAsync('git status --porcelain');
                const { stdout: gitLog } = await execAsync('git log --oneline -5');
                return {
                    hasUncommittedChanges: gitStatus.trim().length > 0,
                    recentCommits: gitLog.trim().split('\n').filter(line => line.length > 0),
                    modifiedFiles: gitStatus.trim().split('\n').filter(line => line.length > 0)
                };
            }
            catch (error) {
                console.error('Failed to get git activity:', error);
                return null;
            }
        });
        electron_1.ipcMain.handle('monitor-file-changes', async (_, directory) => {
            // This would implement file system watching
            // Return empty data - implement real context monitoring in future
            return {
                watchingDirectory: directory,
                recentChanges: []
            };
        });
        // Process user input through workflow
        electron_1.ipcMain.handle('workflow:process-input', async (event, message) => {
            try {
                const result = await this.workflowEngine.processUserInput(message);
                return { success: true, data: result };
            }
            catch (error) {
                console.error('Workflow processing error:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        // Real-time text analysis
        electron_1.ipcMain.handle('workflow:analyze-text', async (event, text) => {
            try {
                const result = await this.workflowEngine.processTextAnalysis(text);
                return { success: true, data: result };
            }
            catch (error) {
                console.error('Text analysis error:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        // Background job management
        electron_1.ipcMain.handle('background:add-job', async (event, type, data, priority = 'medium') => {
            try {
                const jobId = background_processor_1.backgroundProcessor.addJob(type, data, priority);
                return { success: true, jobId };
            }
            catch (error) {
                console.error('Background job error:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        // Get background queue stats
        electron_1.ipcMain.handle('background:get-stats', async () => {
            try {
                const stats = background_processor_1.backgroundProcessor.getQueueStats();
                return { success: true, data: stats };
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        // Get job status
        electron_1.ipcMain.handle('background:get-job-status', async (event, jobId) => {
            try {
                const job = background_processor_1.backgroundProcessor.getJobStatus(jobId);
                return { success: true, data: job };
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        // Workflow status check
        electron_1.ipcMain.handle('workflow:is-active', async () => {
            try {
                const isActive = this.workflowEngine.isWorkflowActive();
                return { success: true, data: { isActive } };
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        // Enhanced AI command with workflow integration
        electron_1.ipcMain.handle('ai:enhanced-command', async (event, query) => {
            try {
                // Process through workflow engine first
                const workflowResult = await this.workflowEngine.processUserInput(query);
                // Add to background processing for further enhancement
                const jobId = background_processor_1.backgroundProcessor.addJob('ai_processing', { input: query }, 'high');
                return {
                    success: true,
                    data: {
                        workflowResult,
                        backgroundJobId: jobId,
                        message: 'Query processed through intelligent workflow system'
                    }
                };
            }
            catch (error) {
                console.error('Enhanced AI command error:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        // System status for terminal display
        electron_1.ipcMain.handle('system:get-status', async () => {
            try {
                const queueStats = background_processor_1.backgroundProcessor.getQueueStats();
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
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        // Log collection handlers
        electron_1.ipcMain.handle('logs:get', async (event, filters) => {
            try {
                const logs = log_collector_1.logCollector.getLogs(filters);
                return { success: true, data: logs };
            }
            catch (error) {
                log_collector_1.logCollector.logSystem('error', 'Failed to get logs', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        electron_1.ipcMain.handle('logs:get-stats', async () => {
            try {
                const stats = log_collector_1.logCollector.getStats();
                return { success: true, data: stats };
            }
            catch (error) {
                log_collector_1.logCollector.logSystem('error', 'Failed to get log stats', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        electron_1.ipcMain.handle('logs:clear', async () => {
            try {
                log_collector_1.logCollector.clearLogs();
                return { success: true };
            }
            catch (error) {
                log_collector_1.logCollector.logSystem('error', 'Failed to clear logs', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        // Secure API Key management handlers
        await api_key_manager_1.apiKeyManager.initialize();
        electron_1.ipcMain.handle('get-api-key', async (_, keyName = 'ANTHROPIC_API_KEY') => {
            try {
                const apiKey = await api_key_manager_1.apiKeyManager.getApiKey(keyName);
                return apiKey || null;
            }
            catch (error) {
                console.error('Failed to get API key:', error);
                return null;
            }
        });
        electron_1.ipcMain.handle('get-all-api-keys', async () => {
            try {
                return await api_key_manager_1.apiKeyManager.getAllApiKeys();
            }
            catch (error) {
                console.error('Failed to get all API keys:', error);
                return {};
            }
        });
        electron_1.ipcMain.handle('set-api-key', async (_, keyName, key) => {
            try {
                await api_key_manager_1.apiKeyManager.setApiKey(keyName, key);
                return { success: true };
            }
            catch (error) {
                console.error('Failed to set API key:', error);
                return { success: false, error: String(error) };
            }
        });
        electron_1.ipcMain.handle('remove-api-key', async (_, keyName) => {
            try {
                await api_key_manager_1.apiKeyManager.removeApiKey(keyName);
                return { success: true };
            }
            catch (error) {
                console.error('Failed to remove API key:', error);
                return { success: false, error: String(error) };
            }
        });
        electron_1.ipcMain.handle('validate-api-key', async (_, keyName, value) => {
            try {
                return api_key_manager_1.apiKeyManager.validateApiKey(keyName, value);
            }
            catch (error) {
                console.error('Failed to validate API key:', error);
                return { valid: false, error: 'Validation failed' };
            }
        });
        electron_1.ipcMain.handle('has-required-api-keys', async (_, requiredKeys) => {
            try {
                return await api_key_manager_1.apiKeyManager.hasRequiredKeys(requiredKeys);
            }
            catch (error) {
                console.error('Failed to check required API keys:', error);
                return false;
            }
        });
        electron_1.ipcMain.handle('has-any-api-keys', async () => {
            try {
                return await api_key_manager_1.apiKeyManager.hasAnyKeys();
            }
            catch (error) {
                console.error('Failed to check for any API keys:', error);
                return false;
            }
        });
        electron_1.ipcMain.handle('migrate-api-keys-from-environment', async () => {
            try {
                return await api_key_manager_1.apiKeyManager.migrateFromEnvironment();
            }
            catch (error) {
                console.error('Failed to migrate API keys:', error);
                return { migrated: [], failed: [] };
            }
        });
        electron_1.ipcMain.handle('export-api-key-config', async () => {
            try {
                return await api_key_manager_1.apiKeyManager.exportConfig();
            }
            catch (error) {
                console.error('Failed to export config:', error);
                return null;
            }
        });
        // First run setup handlers
        electron_1.ipcMain.handle('is-first-run', async () => {
            try {
                const hasKeys = await api_key_manager_1.apiKeyManager.hasAnyKeys();
                return !hasKeys;
            }
            catch (error) {
                console.error('Failed to check first run status:', error);
                return true;
            }
        });
        electron_1.ipcMain.handle('set-first-run-complete', async () => {
            try {
                // This could be stored in a config file or just rely on API key presence
                return { success: true };
            }
            catch (error) {
                console.error('Failed to mark first run complete:', error);
                return { success: false, error: String(error) };
            }
        });
        // Claude CLI Terminal handlers
        electron_1.ipcMain.handle('claude-cli:execute-command', async (_, command) => {
            try {
                const result = await claude_cli_manager_1.claudeCliManager.executeCommand(command);
                return result;
            }
            catch (error) {
                console.error('Failed to execute Claude CLI command:', error);
                return {
                    success: false,
                    error: String(error)
                };
            }
        });
        electron_1.ipcMain.handle('claude-cli:get-status', async () => {
            try {
                return claude_cli_manager_1.claudeCliManager.getStatus();
            }
            catch (error) {
                console.error('Failed to get Claude CLI status:', error);
                return {
                    installed: false,
                    mcpConfigured: false,
                    error: String(error)
                };
            }
        });
        electron_1.ipcMain.handle('claude-cli:test-connection', async () => {
            try {
                return await claude_cli_manager_1.claudeCliManager.testConnection();
            }
            catch (error) {
                console.error('Failed to test Claude CLI connection:', error);
                return {
                    success: false,
                    details: String(error)
                };
            }
        });
        electron_1.ipcMain.handle('claude-cli:update-mcp-config', async () => {
            try {
                // Get current API keys and update MCP configuration
                const apiKeys = await api_key_manager_1.apiKeyManager.getAllApiKeys();
                const apiKeyRecord = {};
                // Convert ApiKeyConfig to Record<string, string>
                Object.entries(apiKeys).forEach(([key, value]) => {
                    if (value) {
                        apiKeyRecord[key] = value;
                    }
                });
                await claude_cli_manager_1.claudeCliManager.updateMcpConfig(apiKeyRecord);
                return { success: true };
            }
            catch (error) {
                console.error('Failed to update MCP config:', error);
                return { success: false, error: String(error) };
            }
        });
        electron_1.ipcMain.handle('claude-cli:maintenance-check', async () => {
            try {
                await claude_cli_manager_1.claudeCliManager.performMaintenanceCheck();
                return { success: true };
            }
            catch (error) {
                console.error('Failed to perform maintenance check:', error);
                return { success: false, error: String(error) };
            }
        });
        // Local LLM service handlers
        electron_1.ipcMain.handle('local-llm:query', async (event, prompt) => {
            try {
                const response = await local_llm_service_1.localLLMService.query(prompt);
                return { success: true, data: response };
            }
            catch (error) {
                log_collector_1.logCollector.logLLM('error', 'Local LLM query error', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        electron_1.ipcMain.handle('local-llm:status', async () => {
            try {
                const status = await local_llm_service_1.localLLMService.getStatus();
                return { success: true, data: status };
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        electron_1.ipcMain.handle('local-llm:initialize', async () => {
            try {
                const result = await local_llm_service_1.localLLMService.initialize();
                return { success: true, data: result };
            }
            catch (error) {
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
    setupIntelligenceHandlers() {
        // Project utilities
        electron_1.ipcMain.handle('get-project-root', () => {
            return process.cwd();
        });
        // Intelligence System handlers
        electron_1.ipcMain.handle('intelligence:initialize', async () => {
            try {
                const { createIntelligenceSystem } = await Promise.resolve().then(() => __importStar(require('./engie-intelligence-system.js')));
                const intelligence = await createIntelligenceSystem();
                return { success: true, data: 'Intelligence system initialized' };
            }
            catch (error) {
                console.error('Intelligence initialization error:', error);
                return { success: false, error: String(error) };
            }
        });
        electron_1.ipcMain.handle('intelligence:generate-task', async (_, prompt) => {
            try {
                const { createIntelligenceSystem } = await Promise.resolve().then(() => __importStar(require('./engie-intelligence-system.js')));
                const intelligence = await createIntelligenceSystem();
                const task = await intelligence.generateIntelligentTask(prompt);
                return { success: true, data: task };
            }
            catch (error) {
                console.error('Intelligent task generation error:', error);
                return { success: false, error: String(error) };
            }
        });
        electron_1.ipcMain.handle('intelligence:get-insights', async () => {
            try {
                const { createIntelligenceSystem } = await Promise.resolve().then(() => __importStar(require('./engie-intelligence-system.js')));
                const intelligence = await createIntelligenceSystem();
                const insights = await intelligence.getIntelligenceInsights();
                return { success: true, data: insights };
            }
            catch (error) {
                console.error('Intelligence insights error:', error);
                return { success: false, error: String(error) };
            }
        });
        electron_1.ipcMain.handle('intelligence:generate-commit', async () => {
            try {
                const { createIntelligenceSystem } = await Promise.resolve().then(() => __importStar(require('./engie-intelligence-system.js')));
                const intelligence = await createIntelligenceSystem();
                // For now, return a simple commit message
                return { success: true, data: 'feat: add intelligent features' };
            }
            catch (error) {
                console.error('Intelligent commit generation error:', error);
                return { success: false, error: String(error) };
            }
        });
        electron_1.ipcMain.handle('intelligence:install-taskmaster', async () => {
            try {
                const { installEngieTaskMaster } = await Promise.resolve().then(() => __importStar(require('./engie-taskmaster-installer.js')));
                const result = await installEngieTaskMaster();
                return { success: true, data: result };
            }
            catch (error) {
                console.error('TaskMaster installation error:', error);
                return { success: false, error: String(error) };
            }
        });
        // Enhanced MCP Tool Integration handlers
        electron_1.ipcMain.handle('taskmaster:call-mcp-tool', async (_, toolName, parameters) => {
            try {
                console.log(`🔧 Calling MCP tool: ${toolName}`, parameters);
                // Import the TaskMaster tools dynamically
                let taskMasterPath;
                try {
                    // Try to find global task-master-ai installation
                    const { execSync } = require('child_process');
                    const npmPrefix = execSync('npm prefix -g', { encoding: 'utf8' }).trim();
                    taskMasterPath = require('path').join(npmPrefix, 'lib', 'node_modules', 'task-master-ai');
                }
                catch {
                    // Fallback to local or direct CLI execution
                    console.log('Global task-master-ai not found, using CLI fallback');
                    return await this.executeTaskMasterCLI(toolName, parameters);
                }
                // Map MCP tool names to TaskMaster functions
                const toolMapping = {
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
            }
            catch (error) {
                console.error('MCP tool call error:', error);
                return { success: false, error: String(error) };
            }
        });
        console.log('🧠 Intelligence and enhanced MCP handlers configured');
    }
    async executeTaskMasterCLI(command, parameters) {
        try {
            const { spawn } = require('child_process');
            // Build command arguments
            const args = [command];
            // Convert parameters to CLI arguments with proper TaskMaster flag mapping
            if (parameters) {
                Object.entries(parameters).forEach(([key, value]) => {
                    if (key === 'projectRoot')
                        return; // Skip internal parameter
                    // Special mappings for TaskMaster CLI flags
                    const flagMappings = {
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
                    }
                    else if ((key === 'research' || key === 'force' || key === 'withSubtasks') && value === true) {
                        args.push(flag);
                    }
                    else if (key === 'id' || key === 'status' || key === 'tag' || key === 'file' || key === 'output') {
                        args.push(`${flag}=${value}`);
                    }
                    else if (value !== undefined && value !== null && value !== false && flag) {
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
                child.stdout?.on('data', (data) => {
                    stdout += data.toString();
                });
                child.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });
                child.on('close', (code) => {
                    if (code === 0) {
                        try {
                            // Try to parse JSON response first
                            const data = JSON.parse(stdout);
                            resolve({ success: true, data });
                        }
                        catch {
                            // TaskMaster CLI returns formatted text, not JSON
                            // For list commands, return the raw output for display
                            if (command === 'list' || command === 'show' || command === 'next') {
                                resolve({ success: true, data: stdout.trim(), isFormattedText: true });
                            }
                            else {
                                // For other commands, try to extract meaningful data or return raw output
                                resolve({ success: true, data: stdout.trim() });
                            }
                        }
                    }
                    else {
                        console.error(`TaskMaster CLI error (${code}):`, stderr);
                        resolve({ success: false, error: stderr || `Command failed with code ${code}` });
                    }
                });
                child.on('error', (error) => {
                    console.error('TaskMaster CLI spawn error:', error);
                    // Check if it's a "command not found" error
                    if (error.message.includes('ENOENT') || error.message.includes('command not found')) {
                        resolve({
                            success: false,
                            error: 'TaskMaster CLI not found. Please install with: npm install -g task-master-ai',
                            needsInstallation: true
                        });
                    }
                    else {
                        resolve({ success: false, error: String(error) });
                    }
                });
                // Timeout after 30 seconds for AI operations
                setTimeout(() => {
                    child.kill();
                    resolve({ success: false, error: 'Command timeout after 30 seconds' });
                }, 30000);
            });
        }
        catch (error) {
            console.error('TaskMaster CLI execution error:', error);
            return { success: false, error: String(error) };
        }
    }
    async initializeBackgroundServices() {
        // Initialize workflow engine
        this.workflowEngine = new workflow_engine_1.WorkflowEngine();
        // Start background processor
        background_processor_1.backgroundProcessor.start();
        console.log('🚀 Background services initialized');
        console.log('✅ LangGraph workflow engine ready');
        console.log('✅ Background processor started');
    }
    stopBackgroundServices() {
        background_processor_1.backgroundProcessor.stop();
        console.log('🔄 Background services stopped');
    }
    cleanupBackgroundServices() {
        background_processor_1.backgroundProcessor.cleanup();
        local_llm_service_1.localLLMService.cleanup();
    }
    async initializeLocalLLM() {
        try {
            console.log('🚀 Initializing Local AI with optimized auto-setup for instant responses...');
            // Set up progress callback to send updates to renderer
            local_llm_service_1.localLLMService.setProgressCallback((progress, status) => {
                console.log(`Model Progress: ${progress}% - ${status}`);
                // Send progress updates to all windows
                electron_1.BrowserWindow.getAllWindows().forEach(window => {
                    window.webContents.send('llm-download-progress', { progress, status });
                });
            });
            // Use optimized auto-setup for faster responses
            const status = await local_llm_service_1.localLLMService.autoSetup({
                preferDocker: false, // Use native for simplicity
                fastModel: true, // Use fast models for quick responses  
                autoInstall: true // Auto-install Ollama if needed
            });
            console.log('Local LLM initialization result:', status);
            if (status.modelReady && status.currentModel) {
                console.log(`✅ Local AI ready with ${status.currentModel} (${status.performance} performance)`);
                console.log(`🐳 Setup method: ${status.setupMethod}`);
                console.log(`📊 Available models: ${status.modelStatus?.available.length || 0}`);
                console.log(`🚀 Model preloaded for instant responses!`);
            }
            else if (status.installed && status.running) {
                console.log('⚠️ Ollama running but setting up optimal model...');
            }
            else if (status.installed) {
                console.log('⚠️ Ollama installed but not running - auto-starting...');
            }
            else {
                console.log('❌ Auto-setup failed - manual installation may be required');
                console.log('💡 Install with: brew install ollama');
            }
            // Send final status to renderer
            electron_1.BrowserWindow.getAllWindows().forEach(window => {
                window.webContents.send('llm-status-update', status);
            });
        }
        catch (error) {
            console.error('Local LLM initialization failed:', error);
            // Send error to renderer
            electron_1.BrowserWindow.getAllWindows().forEach(window => {
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
//# sourceMappingURL=main.js.map