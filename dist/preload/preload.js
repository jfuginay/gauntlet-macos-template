"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI = {
    // Workflow Engine APIs
    workflow: {
        processInput: (message) => electron_1.ipcRenderer.invoke('workflow:process-input', message),
        analyzeText: (text) => electron_1.ipcRenderer.invoke('workflow:analyze-text', text),
        isActive: () => electron_1.ipcRenderer.invoke('workflow:is-active'),
    },
    // Background Processing APIs
    background: {
        addJob: (type, data, priority = 'medium') => electron_1.ipcRenderer.invoke('background:add-job', type, data, priority),
        getStats: () => electron_1.ipcRenderer.invoke('background:get-stats'),
        getJobStatus: (jobId) => electron_1.ipcRenderer.invoke('background:get-job-status', jobId),
    },
    // Enhanced AI APIs
    ai: {
        enhancedCommand: (query) => electron_1.ipcRenderer.invoke('ai:enhanced-command', query),
    },
    // Local LLM APIs with enhanced model management
    localLLM: {
        query: (prompt) => electron_1.ipcRenderer.invoke('local-llm:query', prompt),
        getStatus: () => electron_1.ipcRenderer.invoke('local-llm:status'),
        initialize: () => electron_1.ipcRenderer.invoke('local-llm:initialize'),
        onDownloadProgress: (callback) => {
            electron_1.ipcRenderer.on('llm-download-progress', (_, data) => callback(data));
        },
        onStatusUpdate: (callback) => {
            electron_1.ipcRenderer.on('llm-status-update', (_, status) => callback(status));
        },
        removeProgressListener: () => {
            electron_1.ipcRenderer.removeAllListeners('llm-download-progress');
        },
        removeStatusListener: () => {
            electron_1.ipcRenderer.removeAllListeners('llm-status-update');
        },
    },
    // System APIs
    system: {
        getStatus: () => electron_1.ipcRenderer.invoke('system:get-status'),
    },
    // Log APIs
    logs: {
        getLogs: (filters) => electron_1.ipcRenderer.invoke('logs:get', filters),
        getStats: () => electron_1.ipcRenderer.invoke('logs:get-stats'),
        clearLogs: () => electron_1.ipcRenderer.invoke('logs:clear'),
        onNewLog: (callback) => {
            electron_1.ipcRenderer.on('log-new', (_, log) => callback(log));
        },
        removeLogListener: () => {
            electron_1.ipcRenderer.removeAllListeners('log-new');
        },
    },
    // TaskMaster MCP Integration APIs
    callMCPTool: (toolName, parameters) => electron_1.ipcRenderer.invoke('taskmaster:call-mcp-tool', toolName, parameters),
    executeTaskMasterCommand: (command) => electron_1.ipcRenderer.invoke('execute-taskmaster-command', command),
    getProjectRoot: () => electron_1.ipcRenderer.invoke('get-project-root'),
    readTasksJson: (projectRoot) => electron_1.ipcRenderer.invoke('read-tasks-json', projectRoot),
    // TaskMaster High-Level APIs
    taskMaster: {
        addTask: (params) => electron_1.ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_add_task', params),
        getTasks: (params = {}) => electron_1.ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_get_tasks', params),
        getTask: (params) => electron_1.ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_get_task', params),
        getNextTask: (params = {}) => electron_1.ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_next_task', params),
        setTaskStatus: (params) => electron_1.ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_set_task_status', params),
        updateTask: (params) => electron_1.ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_update_task', params),
        updateSubtask: (params) => electron_1.ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_update_subtask', params),
        expandTask: (params) => electron_1.ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_expand_task', params),
        analyzeComplexity: (params) => electron_1.ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_analyze_project_complexity', params),
        research: (params) => electron_1.ipcRenderer.invoke('taskmaster:call-mcp-tool', 'mcp_task-master-ai_research', params)
    },
    // Intelligence System APIs
    initializeEngieIntelligence: () => electron_1.ipcRenderer.invoke('intelligence:initialize'),
    generateIntelligentTask: (prompt) => electron_1.ipcRenderer.invoke('intelligence:generate-task', prompt),
    getIntelligenceInsights: () => electron_1.ipcRenderer.invoke('intelligence:get-insights'),
    generateIntelligentCommit: () => electron_1.ipcRenderer.invoke('intelligence:generate-commit'),
    installEngieTaskMaster: () => electron_1.ipcRenderer.invoke('intelligence:install-taskmaster'),
    // API Key Management
    getApiKey: (keyName) => electron_1.ipcRenderer.invoke('get-api-key', keyName),
    getAllApiKeys: () => electron_1.ipcRenderer.invoke('get-all-api-keys'),
    setApiKey: (keyName, key) => electron_1.ipcRenderer.invoke('set-api-key', keyName, key),
    removeApiKey: (keyName) => electron_1.ipcRenderer.invoke('remove-api-key', keyName),
    validateApiKey: (keyName, value) => electron_1.ipcRenderer.invoke('validate-api-key', keyName, value),
    hasRequiredApiKeys: (requiredKeys) => electron_1.ipcRenderer.invoke('has-required-api-keys', requiredKeys),
    hasAnyApiKeys: () => electron_1.ipcRenderer.invoke('has-any-api-keys'),
    migrateApiKeysFromEnvironment: () => electron_1.ipcRenderer.invoke('migrate-api-keys-from-environment'),
    exportApiKeyConfig: () => electron_1.ipcRenderer.invoke('export-api-key-config'),
    // First Run Setup
    isFirstRun: () => electron_1.ipcRenderer.invoke('is-first-run'),
    setFirstRunComplete: () => electron_1.ipcRenderer.invoke('set-first-run-complete'),
    // Claude CLI Terminal Integration
    executeClaudeCommand: (command) => electron_1.ipcRenderer.invoke('claude-cli:execute-command', command),
    getClaudeCliStatus: () => electron_1.ipcRenderer.invoke('claude-cli:get-status'),
    testClaudeConnection: () => electron_1.ipcRenderer.invoke('claude-cli:test-connection'),
    updateMcpConfig: () => electron_1.ipcRenderer.invoke('claude-cli:update-mcp-config'),
    performMaintenanceCheck: () => electron_1.ipcRenderer.invoke('claude-cli:maintenance-check'),
    // Legacy APIs for backward compatibility
    getSystemInfo: () => electron_1.ipcRenderer.invoke('get-system-info'),
    sendChatMessage: (message) => electron_1.ipcRenderer.invoke('send-chat-message', message),
    analyzeText: (text) => electron_1.ipcRenderer.invoke('analyze-text', text),
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
//# sourceMappingURL=preload.js.map