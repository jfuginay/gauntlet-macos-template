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
        this.intelligenceSystem = null;
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
        // Create the main window
        electron_1.app.whenReady().then(() => {
            this.createWindow();
            this.setupIpcHandlers();
            this.initializeBackgroundServices();
            // Initialize Local LLM asynchronously to prevent blocking startup
            this.initializeLocalLLMAsync();
        });
        // Handle app quit events
        electron_1.app.on('window-all-closed', () => {
            // Cleanup all services before quitting
            this.cleanupAllServices();
            if (process.platform !== 'darwin') {
                electron_1.app.quit();
            }
        });
        electron_1.app.on('before-quit', () => {
            console.log('🔄 App shutting down, cleaning up services...');
            this.cleanupAllServices();
        });
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });
        // Handle uncaught exceptions to prevent crashes
        process.on('uncaughtException', (error) => {
            console.error('🚨 Uncaught Exception:', error);
            this.cleanupAllServices();
            // Don't exit immediately, try to continue
        });
        process.on('unhandledRejection', (reason, promise) => {
            console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
            // Don't exit on unhandled rejections, just log them
        });
        // Additional crash protection
        electron_1.app.on('child-process-gone', (event, details) => {
            console.error('🚨 Child process gone:', details);
        });
        electron_1.app.on('render-process-gone', (event, webContents, details) => {
            console.error('🚨 Render process gone:', details);
            // Try to reload the window
            if (!webContents.isDestroyed()) {
                webContents.reload();
            }
        });
        // Security: Prevent new window creation
        electron_1.app.on('web-contents-created', (_, contents) => {
            contents.setWindowOpenHandler(({ url }) => {
                electron_1.shell.openExternal(url);
                return { action: 'deny' };
            });
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
        // Force show window after timeout if ready-to-show doesn't fire
        setTimeout(() => {
            if (this.mainWindow && !this.mainWindow.isVisible()) {
                console.log('🚨 Window not visible after 5 seconds, forcing show...');
                this.mainWindow.show();
            }
        }, 5000);
        // Handle renderer process crashes
        this.mainWindow.webContents.on('crashed', (event, killed) => {
            console.error('🚨 Renderer process crashed:', { killed });
            log_collector_1.logCollector.logSystem('error', 'Renderer process crashed', { killed });
        });
        // Handle unresponsive renderer
        this.mainWindow.webContents.on('unresponsive', () => {
            console.error('🚨 Renderer process became unresponsive');
            log_collector_1.logCollector.logSystem('error', 'Renderer process unresponsive');
        });
        // Handle renderer errors
        this.mainWindow.webContents.on('render-process-gone', (event, details) => {
            console.error('🚨 Render process gone:', details);
            log_collector_1.logCollector.logSystem('error', 'Render process gone', details);
        });
        // Handle navigation errors
        this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            console.error('🚨 Failed to load:', { errorCode, errorDescription, validatedURL });
            log_collector_1.logCollector.logSystem('error', 'Failed to load page', { errorCode, errorDescription, validatedURL });
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
                // The localLLMService.query() already returns a structured response
                // with { success, data?, error?, responseTime? }
                // So we return it directly instead of double-wrapping it
                return response;
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
    async getIntelligenceSystem() {
        if (!this.intelligenceSystem) {
            try {
                console.log('🧠 Initializing intelligence system...');
                const { createIntelligenceSystem } = await Promise.resolve().then(() => __importStar(require('./engie-intelligence-system')));
                // Add timeout to prevent hanging
                const initPromise = createIntelligenceSystem();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Intelligence system initialization timeout')), 10000);
                });
                this.intelligenceSystem = await Promise.race([initPromise, timeoutPromise]);
                console.log('🧠 Intelligence system initialized successfully');
            }
            catch (error) {
                console.error('🚨 Intelligence system initialization failed:', error);
                console.log('⚠️ Continuing without intelligence features...');
                // Return a mock system that won't crash
                this.intelligenceSystem = this.createMockIntelligenceSystem();
            }
        }
        return this.intelligenceSystem;
    }
    createMockIntelligenceSystem() {
        return {
            generateIntelligentTask: async (prompt) => ({
                title: prompt.charAt(0).toUpperCase() + prompt.slice(1),
                description: `Implement ${prompt}`,
                priority: 'medium',
                estimatedEffort: '1-2 days'
            }),
            getIntelligenceInsights: async () => ({
                totalPatterns: 0,
                avgEffectiveness: 0,
                learningRate: 0,
                recentActivity: { commits: 0, tasks: 0 },
                recommendations: ['Intelligence system temporarily unavailable']
            }),
            generateIntelligentCommitMessage: async () => 'feat: add improvements',
            analyzeCommit: async () => Promise.resolve(),
            updateKnowledgeFromCommit: async () => Promise.resolve()
        };
    }
    setupIntelligenceHandlers() {
        // Project utilities
        electron_1.ipcMain.handle('get-project-root', () => {
            return process.cwd();
        });
        // Read tasks.json file directly for structured data
        electron_1.ipcMain.handle('read-tasks-json', async (_, projectRoot) => {
            try {
                const fs = require('fs').promises;
                const path = require('path');
                const tasksJsonPath = path.join(projectRoot, '.taskmaster/tasks/tasks.json');
                const tasksJsonContent = await fs.readFile(tasksJsonPath, 'utf8');
                const tasksData = JSON.parse(tasksJsonContent);
                return { success: true, data: tasksData };
            }
            catch (error) {
                console.error('Failed to read tasks.json:', error);
                return { success: false, error: String(error) };
            }
        });
        // Intelligence System handlers with singleton pattern
        electron_1.ipcMain.handle('intelligence:initialize', async () => {
            try {
                await this.getIntelligenceSystem();
                return { success: true, data: 'Intelligence system initialized' };
            }
            catch (error) {
                console.error('Intelligence initialization error:', error);
                return { success: false, error: String(error) };
            }
        });
        electron_1.ipcMain.handle('intelligence:generate-task', async (_, prompt) => {
            try {
                const intelligence = await this.getIntelligenceSystem();
                if (!intelligence) {
                    return { success: false, error: 'Intelligence system not available' };
                }
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
                const intelligence = await this.getIntelligenceSystem();
                if (!intelligence) {
                    return { success: true, data: { totalPatterns: 0, avgEffectiveness: 0, learningRate: 0, recentActivity: { commits: 0, tasks: 0 }, recommendations: ['Intelligence system initializing...'] } };
                }
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
                const intelligence = await this.getIntelligenceSystem();
                if (!intelligence) {
                    return { success: true, data: 'feat: add intelligent features' };
                }
                const commitMessage = await intelligence.generateIntelligentCommitMessage();
                return { success: true, data: commitMessage };
            }
            catch (error) {
                console.error('Intelligent commit generation error:', error);
                return { success: true, data: 'feat: add intelligent features' };
            }
        });
        electron_1.ipcMain.handle('intelligence:install-taskmaster', async () => {
            try {
                const { installEngieTaskMaster } = await Promise.resolve().then(() => __importStar(require('./engie-taskmaster-installer')));
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
                            // For list commands, parse the task data from the output
                            if (command === 'list') {
                                // Parse tasks from the formatted output
                                const tasks = this.parseTasksFromOutput(stdout);
                                const stats = this.parseStatsFromOutput(stdout);
                                resolve({ success: true, data: { tasks, stats } });
                            }
                            else if (command === 'show' || command === 'next') {
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
                // Timeout after 60 seconds for AI operations (increased for large outputs)
                const timeout = setTimeout(() => {
                    child.kill('SIGTERM');
                    resolve({ success: false, error: 'Command timeout after 60 seconds' });
                }, 60000);
                // Clear timeout on successful completion
                child.on('exit', () => {
                    clearTimeout(timeout);
                });
            });
        }
        catch (error) {
            console.error('TaskMaster CLI execution error:', error);
            return { success: false, error: String(error) };
        }
    }
    parseTasksFromOutput(output) {
        const tasks = [];
        const lines = output.split('\n');
        // Look for the task table header
        let inTaskTable = false;
        for (const line of lines) {
            // Look for the header row with ID, Title, Status, etc.
            if (line.includes('│ ID') && line.includes('│ Title') && line.includes('│ Status')) {
                inTaskTable = true;
                continue;
            }
            // Skip separator lines
            if (line.includes('├───') || line.includes('┼───')) {
                continue;
            }
            // Parse task data rows
            if (inTaskTable && line.startsWith('│') && !line.includes('───')) {
                const parts = line.split('│').map(p => p.trim()).filter(p => p);
                // Task data row should have: ID, Title, Status, Priority, Dependencies, Complexity
                if (parts.length >= 4 && parts[0] && !parts[0].includes('ID') && parts[0].match(/^\d+$/)) {
                    const task = {
                        id: parts[0],
                        title: parts[1].replace('...', ''), // Remove truncation marks
                        status: this.parseStatus(parts[2]),
                        priority: parts[3],
                        dependencies: this.parseDependencies(parts[4] || 'None'),
                        subtasks: [],
                        description: this.getTaskDescription(parts[0])
                    };
                    tasks.push(task);
                }
            }
            // End of table
            if (inTaskTable && line.startsWith('└')) {
                break;
            }
        }
        return tasks;
    }
    parseStatus(statusText) {
        if (statusText.includes('done') || statusText.includes('✓'))
            return 'done';
        if (statusText.includes('in-prog') || statusText.includes('►'))
            return 'in-progress';
        if (statusText.includes('pending') || statusText.includes('○'))
            return 'pending';
        if (statusText.includes('blocked'))
            return 'blocked';
        if (statusText.includes('cancelled'))
            return 'cancelled';
        if (statusText.includes('deferred'))
            return 'deferred';
        return 'pending';
    }
    parseDependencies(depText) {
        if (depText === 'None' || !depText)
            return [];
        // Extract numbers from dependency text like "1 (Not found), 2 (Not found)"
        const matches = depText.match(/\d+/g);
        return matches || [];
    }
    getTaskDescription(taskId) {
        // For now, return a placeholder - in a real implementation, 
        // we might cache the full task data or make another call
        return `Task ${taskId} description`;
    }
    parseStatsFromOutput(output) {
        const stats = {
            total: 0,
            completed: 0,
            inProgress: 0,
            pending: 0,
            blocked: 0,
            deferred: 0,
            cancelled: 0,
            review: 0,
            completionPercentage: 0
        };
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes('Done:')) {
                const match = line.match(/Done:\s*(\d+)/);
                if (match)
                    stats.completed = parseInt(match[1]);
            }
            if (line.includes('In Progress:')) {
                const match = line.match(/In Progress:\s*(\d+)/);
                if (match)
                    stats.inProgress = parseInt(match[1]);
            }
            if (line.includes('Pending:')) {
                const match = line.match(/Pending:\s*(\d+)/);
                if (match)
                    stats.pending = parseInt(match[1]);
            }
            if (line.includes('Blocked:')) {
                const match = line.match(/Blocked:\s*(\d+)/);
                if (match)
                    stats.blocked = parseInt(match[1]);
            }
            if (line.includes('Tasks Progress:')) {
                const match = line.match(/(\d+)%/);
                if (match)
                    stats.completionPercentage = parseInt(match[1]);
            }
        }
        stats.total = stats.completed + stats.inProgress + stats.pending + stats.blocked + stats.deferred + stats.cancelled;
        return stats;
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
    cleanupAllServices() {
        try {
            console.log('🧹 Cleaning up all services...');
            // Stop and cleanup background services
            this.stopBackgroundServices();
            this.cleanupBackgroundServices();
            // Clean up intelligence system if it exists
            if (this.intelligenceSystem && typeof this.intelligenceSystem.cleanup === 'function') {
                this.intelligenceSystem.cleanup();
            }
            console.log('✅ All services cleaned up successfully');
        }
        catch (error) {
            console.error('❌ Error during service cleanup:', error);
        }
    }
    async initializeLocalLLMAsync() {
        // Run initialization in background without blocking startup
        setTimeout(async () => {
            await this.initializeLocalLLM();
        }, 1000); // Small delay to ensure window is ready
    }
    async initializeLocalLLM() {
        try {
            console.log('🚀 Initializing Local AI with optimized auto-setup for instant responses...');
            // Skip AI initialization in development if environment variable is set
            if (process.env.SKIP_AI_INIT === 'true') {
                console.log('⏭️ Skipping AI initialization (SKIP_AI_INIT=true)');
                return;
            }
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