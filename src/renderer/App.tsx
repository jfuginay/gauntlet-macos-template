import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import { ConsoleLog } from './components/ConsoleLog';
import TabBar, { Tab } from './components/TabBar';
import TaskViewer from './components/TaskViewer';
import { FirstRunSetup } from './components/FirstRunSetup';
import { ApiKeySettings } from './components/ApiKeySettings';
import { Terminal } from './components/Terminal';
import { engieOrchestrator } from './services/engieOrchestrator';
import { taskMasterService, TaskMasterTask, TaskMasterStats } from './services/taskMasterService';

interface Message {
  id: number;
  text: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
  thought?: string; // Add thought process for AI messages
  toolsUsed?: string[]; // Add tools used for transparency
}

interface SystemStatus {
  langGraph: boolean;
  backgroundProcessor: boolean;
  localLLM: boolean;
  taskMaster: boolean;
  currentModel: string;
}

type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
type Mode = 'normal' | 'insert';

const TAB_STORAGE_KEY = 'engie-tabs';
const MAX_TABS = 8;

export const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('insert');
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConsoleLog, setShowConsoleLog] = useState(false);
  
  // Tab System State
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'chat', type: 'chat', title: 'Chat', closeable: false }
  ]);
  const [activeTabId, setActiveTabId] = useState('chat');
  
  // Real TaskMaster state
  const [realTasks, setRealTasks] = useState<TaskMasterTask[]>([]);
  const [taskMetrics, setTaskMetrics] = useState<TaskMasterStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    blocked: 0,
    deferred: 0,
    cancelled: 0,
    review: 0,
    completionPercentage: 0
  });
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [hasTaskMasterSetup, setHasTaskMasterSetup] = useState(false);
  
  // First-run setup state
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [showFirstRunSetup, setShowFirstRunSetup] = useState(false);
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);
  
  // Intelligence insights state
  const [intelligenceInsights, setIntelligenceInsights] = useState({
    totalPatterns: 0,
    avgEffectiveness: 0,
    learningRate: 0,
    recentActivity: { commits: 0, tasks: 0 },
    recommendations: ['Intelligence system initializing...']
  });
  
  // Text selection and context menu state
  const [selectedText, setSelectedText] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isCreatingTaskFromSelection, setIsCreatingTaskFromSelection] = useState(false);
  
  // Task edit modal state
  const [editingTask, setEditingTask] = useState<TaskMasterTask | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    status: 'pending' as TaskMasterTask['status']
  });
  
  const [systemStatus] = useState<SystemStatus>({
    langGraph: true,
    backgroundProcessor: true,
    localLLM: true,
    taskMaster: true,
    currentModel: 'llama3.2:1b'
  });
  
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ASCII Art Header
  const asciiHeader = `$ whoami
engie-expert-navigator

$ status
✅ Goal Navigation Engine: Active
✅ Desire Processing: 3 workers online  
✅ Local AI Brain: ${systemStatus.currentModel} ready
✅ TaskMaster Intelligence: Connected

        $ echo "ENGIE: Enhanced Neural Gateway for Intelligent Execution"
Your greatest desires... literally.

🎯 Let go, and let Claude:
• "I want to [describe your desire]" - Intelligent goal breakdown
• "What should I focus on now?" - Desire-driven priorities  
• "How close am I to [goal]?" - Progress toward dreams
• "Break this down for me: [complex goal]" - Smart decomposition

💫 I transform your desires into reality through intelligent action.
What's calling to you today?`;

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 1,
      text: asciiHeader,
      type: 'system',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  // Tab Persistence
  const persistTabs = useCallback((tabsToSave: Tab[], activeId: string) => {
    const tabsData = {
      tabs: tabsToSave.map(tab => ({
        id: tab.id,
        type: tab.type,
        title: tab.title,
        closeable: tab.closeable,
        taskId: tab.taskId
      })),
      activeTabId: activeId,
      timestamp: Date.now()
    };
    localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(tabsData));
  }, []);

  const restoreTabs = useCallback(async () => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY);
      if (saved) {
        const { tabs: savedTabs, activeTabId: savedActiveId } = JSON.parse(saved);
        
        // Restore tabs and refetch task data for task tabs
        const restoredTabs = await Promise.all(
          savedTabs.map(async (savedTab: any) => {
            if (savedTab.type === 'task' && savedTab.taskId) {
              try {
                const taskData = await taskMasterService.getTaskById(savedTab.taskId);
                return {
                  ...savedTab,
                  data: taskData,
                  title: taskData?.title || `Task #${savedTab.taskId}`
                };
              } catch (error) {
                console.warn(`Failed to restore task data for tab ${savedTab.id}:`, error);
                return null; // Filter out failed tabs
              }
            }
            return savedTab;
          })
        );

        const validTabs = restoredTabs.filter(Boolean) as Tab[];
        
        // Ensure chat tab exists
        const hasChat = validTabs.some(tab => tab.id === 'chat');
        if (!hasChat) {
          validTabs.unshift({ id: 'chat', type: 'chat', title: 'Chat', closeable: false });
        }

        setTabs(validTabs);
        
        // Ensure active tab exists
        const activeExists = validTabs.some(tab => tab.id === savedActiveId);
        setActiveTabId(activeExists ? savedActiveId : 'chat');
      }
    } catch (error) {
      console.error('Failed to restore tabs:', error);
      // Reset to default if restoration fails
      setTabs([{ id: 'chat', type: 'chat', title: 'Chat', closeable: false }]);
      setActiveTabId('chat');
    }
  }, []);

  // Tab Management Functions
  const openTaskTab = useCallback(async (task: TaskMasterTask) => {
    const tabId = `task-${task.id}`;
    
    // Check if tab already exists
    const existingTab = tabs.find(tab => tab.id === tabId);
    if (existingTab) {
      setActiveTabId(tabId);
      return;
    }

    // Check tab limit
    if (tabs.length >= MAX_TABS) {
      console.warn('Maximum number of tabs reached');
      return;
    }

    // Create new tab
    const newTab: Tab = {
      id: tabId,
      type: 'task',
      title: task.title,
      closeable: true,
      taskId: task.id,
      data: task
    };

    const newTabs = [...tabs, newTab];
    setTabs(newTabs);
    setActiveTabId(tabId);
    persistTabs(newTabs, tabId);
  }, [tabs, persistTabs]);

  const openTerminalTab = useCallback(() => {
    // Check tab limit
    if (tabs.length >= MAX_TABS) {
      console.warn('Maximum number of tabs reached');
      return;
    }

    // Generate unique terminal tab ID
    const terminalCount = tabs.filter(tab => tab.type === 'terminal').length;
    const tabId = `terminal-${Date.now()}`;
    const title = terminalCount === 0 ? 'Terminal' : `Terminal ${terminalCount + 1}`;

    // Create new terminal tab
    const newTab: Tab = {
      id: tabId,
      type: 'terminal',
      title,
      closeable: true
    };

    const newTabs = [...tabs, newTab];
    setTabs(newTabs);
    setActiveTabId(tabId);
    persistTabs(newTabs, tabId);
  }, [tabs, persistTabs]);

  const closeTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !tab.closeable) return;

    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    // Switch to chat if we closed the active tab
    if (activeTabId === tabId) {
      setActiveTabId('chat');
      persistTabs(newTabs, 'chat');
    } else {
      persistTabs(newTabs, activeTabId);
    }
  }, [tabs, activeTabId, persistTabs]);

  const switchToTab = useCallback((tabId: string) => {
    if (tabs.some(tab => tab.id === tabId)) {
      setActiveTabId(tabId);
      persistTabs(tabs, tabId);
    }
  }, [tabs, persistTabs]);

  // Keyboard Shortcuts
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle global keys if input is focused
    if (inputRef.current === document.activeElement) {
      return;
    }

    // Tab switching shortcuts (Ctrl+1-8)
    if ((e.ctrlKey || e.metaKey) && /^[1-8]$/.test(e.key)) {
      e.preventDefault();
      const tabIndex = parseInt(e.key) - 1;
      if (tabs[tabIndex]) {
        switchToTab(tabs[tabIndex].id);
      }
      return;
    }

    // Close tab (Ctrl+W)
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      if (activeTabId !== 'chat') {
        closeTab(activeTabId);
      }
      return;
    }

    // New task tab (Ctrl+T) - placeholder for now
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      // Focus input for task search/creation
      setMode('insert');
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    // Global font size shortcuts (work in any mode)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '+') {
      e.preventDefault();
      increaseFontSize();
      return;
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault();
      decreaseFontSize();
      return;
    }

    // Toggle console log with Ctrl/Cmd + `
    if ((e.ctrlKey || e.metaKey) && e.key === '`') {
      e.preventDefault();
      setShowConsoleLog(!showConsoleLog);
      return;
    }

    if (mode === 'normal') {
      switch (e.key) {
        case 'i':
          e.preventDefault();
          setMode('insert');
          setTimeout(() => inputRef.current?.focus(), 0);
          break;
        case 'Enter':
          e.preventDefault();
          setMode('insert');
          setTimeout(() => inputRef.current?.focus(), 0);
          break;
        case '+':
        case '=':
          e.preventDefault();
          increaseFontSize();
          break;
        case '-':
          e.preventDefault();
          decreaseFontSize();
          break;
      }
    } else if (mode === 'insert') {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setMode('normal');
          inputRef.current?.blur();
          break;
      }
    }
  }, [mode, showConsoleLog, tabs, activeTabId, switchToTab, closeTab]);

  // Task Management Functions
  const handleTaskStatusChange = useCallback(async (taskId: string, status: TaskMasterTask['status']) => {
    try {
      const success = await taskMasterService.updateTaskStatus(taskId, status);
      if (success) {
        // Refresh tasks and update tab data
        await fetchRealTasks();
        
        // Update tab data if this task is open
        const tabId = `task-${taskId}`;
        const tab = tabs.find(t => t.id === tabId);
        if (tab && tab.data) {
          const updatedTabs = tabs.map(t => 
            t.id === tabId 
              ? { ...t, data: { ...t.data, status } }
              : t
          );
          setTabs(updatedTabs);
          persistTabs(updatedTabs, activeTabId);
        }
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  }, [tabs, activeTabId, persistTabs]);

  const handleTaskEdit = useCallback((task: TaskMasterTask) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status
    });
    setShowEditModal(true);
  }, []);

  // Fetch real tasks from TaskMaster with enhanced debugging
  const fetchRealTasks = useCallback(async () => {
    try {
      setIsLoadingTasks(true);
      console.log('🔄 Fetching real tasks from TaskMaster...');
      
      // Skip the TaskMaster service call and go directly to file reading
      console.log('📁 Reading tasks.json directly to avoid MCP complexity...');
      
      const projectRoot = await window.electronAPI.getProjectRoot();
      console.log('📂 Project root:', projectRoot);
      
      // Read the tasks.json file directly for structured data
      const tasksJsonResponse = await window.electronAPI.readTasksJson(projectRoot);
      console.log('📋 Raw tasks.json response:', tasksJsonResponse);
      
      if (tasksJsonResponse.success && tasksJsonResponse.data) {
        const tasksData = tasksJsonResponse.data;
        console.log('📊 Parsed tasks data structure:', Object.keys(tasksData));
        
        // Extract tasks from the current tag (default: master)
        const currentTag = tasksData.currentTag || 'master';
        console.log('🏷️ Using tag:', currentTag);
        
        const tagData = tasksData[currentTag] || tasksData.master || {};
        console.log('📂 Tag data structure:', Object.keys(tagData));
        
        if (tagData.tasks && Array.isArray(tagData.tasks)) {
          const tasks = tagData.tasks;
          console.log(`📋 Found ${tasks.length} tasks in ${currentTag} tag`);
          
          // Calculate stats from the tasks
          const total = tasks.length;
          const completed = tasks.filter((t: any) => t.status === 'done').length;
          const inProgress = tasks.filter((t: any) => t.status === 'in-progress').length;
          const pending = tasks.filter((t: any) => t.status === 'pending').length;
          const blocked = tasks.filter((t: any) => t.status === 'blocked').length;
          const deferred = tasks.filter((t: any) => t.status === 'deferred').length;
          const cancelled = tasks.filter((t: any) => t.status === 'cancelled').length;
          const review = tasks.filter((t: any) => t.status === 'review').length;
          
          const stats = {
            total,
            completed,
            inProgress,
            pending,
            blocked,
            deferred,
            cancelled,
            review,
            completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0
          };
          
          console.log('📊 Calculated stats:', stats);
          console.log('🎯 About to update state with tasks:', tasks.length, 'and stats:', stats);
          
          // Update state
          setRealTasks(tasks);
          setTaskMetrics(stats);
          setHasTaskMasterSetup(true);
          
          console.log('✅ State updated successfully!');
        } else {
          console.warn('⚠️ No tasks array found in tag data');
          setRealTasks([]);
          setTaskMetrics({
            total: 0, completed: 0, inProgress: 0, pending: 0,
            blocked: 0, deferred: 0, cancelled: 0, review: 0,
            completionPercentage: 0
          });
        }
             } else {
         console.error('❌ Failed to read tasks.json:', tasksJsonResponse.error);
         setRealTasks([]);
         setHasTaskMasterSetup(false);
       }
    } catch (error) {
      console.error('❌ Error fetching real tasks:', error);
      setHasTaskMasterSetup(false);
      setRealTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  const handleSaveTaskEdit = useCallback(async () => {
    if (!editingTask) return;
    
    try {
      // Update task status if changed
      if (editForm.status !== editingTask.status) {
        await taskMasterService.updateTaskStatus(editingTask.id, editForm.status);
      }
      
      // Update task details using the update function
      if (editForm.title !== editingTask.title || editForm.description !== editingTask.description) {
        const updatePrompt = `Update task details:
Title: "${editForm.title}"
Description: "${editForm.description}"
Priority: ${editForm.priority}`;
        
        const projectRoot = await window.electronAPI.getProjectRoot();
        await window.electronAPI.callMCPTool('mcp_task-master-ai_update_task', {
          projectRoot,
          id: editingTask.id,
          prompt: updatePrompt
        });
      }
      
      // Refresh tasks and close modal
      await fetchRealTasks();
      setShowEditModal(false);
      setEditingTask(null);
      
      // Show success message
      const successMessage: Message = {
        id: messages.length + 1,
        text: `✅ **Task Updated Successfully!**\n\n**Task #${editingTask.id}:** ${editForm.title}\n\n🎯 Your task has been updated with the new details and status.`,
        type: 'assistant',
        timestamp: new Date(),
        thought: "Updated task details through intelligent task management",
        toolsUsed: ['TaskMaster MCP', 'Task Update AI']
      };
      setMessages(prev => [...prev, successMessage]);
      
    } catch (error) {
      console.error('Error updating task:', error);
      const errorMessage: Message = {
        id: messages.length + 1,
        text: `❌ **Failed to update task**\n\nThere was an error updating the task. Please try again or update it through the chat.`,
        type: 'assistant',
        timestamp: new Date(),
        thought: "Task update failed"
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [editingTask, editForm, fetchRealTasks, messages.length]);

  const handleCancelTaskEdit = useCallback(() => {
    setShowEditModal(false);
    setEditingTask(null);
  }, []);

  // Text selection to task creation
  const handleTextSelection = useCallback((e: MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 10) {
      const selectedContent = selection.toString().trim();
      setSelectedText(selectedContent);
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    } else {
      setShowContextMenu(false);
    }
  }, []);

  const handleCreateTaskFromSelection = useCallback(async () => {
    if (!selectedText.trim()) return;
    
    setIsCreatingTaskFromSelection(true);
    setShowContextMenu(false);
    
    try {
      const taskTitle = selectedText.length > 50 
        ? selectedText.substring(0, 50) + '...' 
        : selectedText;
      
      const success = await taskMasterService.createTask(
        `Process: ${taskTitle}`,
        `Based on selected content:\n\n"${selectedText}"\n\nCreate appropriate action items to address this content.`,
        'medium'
      );
      
      if (success) {
        const successMessage: Message = {
          id: messages.length + 1,
          text: `✅ **Task Created from Selection!**\n\n**Selected Text:** "${taskTitle}"\n\n🎯 I've created an intelligent task based on your selection. The task includes the full context and will help you take action on this content.\n\n💡 *Pro tip: Select any text and right-click to instantly create contextual tasks!*`,
          type: 'assistant',
          timestamp: new Date(),
          thought: "Created task from selected text using AI enhancement",
          toolsUsed: ['TaskMaster AI', 'Context Analysis']
        };
        
        setMessages(prev => [...prev, successMessage]);
        
        // Refresh tasks to show the new one
        await fetchRealTasks();
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: messages.length + 1,
        text: `❌ **Could not create task from selection**\n\nTry describing what you want to do with this content in the chat instead.`,
        type: 'assistant',
        timestamp: new Date(),
        thought: "Task creation from selection failed"
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Error creating task from selection:', error);
    } finally {
      setIsCreatingTaskFromSelection(false);
      setSelectedText('');
    }
  }, [selectedText, messages.length, fetchRealTasks]);

  const handleCloseContextMenu = useCallback(() => {
    setShowContextMenu(false);
    setSelectedText('');
  }, []);

  const handleTaskRefresh = useCallback(async (taskId: string) => {
    try {
      const updatedTask = await taskMasterService.getTaskById(taskId);
      if (updatedTask) {
        const tabId = `task-${taskId}`;
        const updatedTabs = tabs.map(tab => 
          tab.id === tabId 
            ? { ...tab, data: updatedTask, title: updatedTask.title }
            : tab
        );
        setTabs(updatedTabs);
        persistTabs(updatedTabs, activeTabId);
      }
    } catch (error) {
      console.error('Failed to refresh task:', error);
    }
  }, [tabs, activeTabId, persistTabs]);

  // Fetch intelligence insights
  const fetchIntelligenceInsights = useCallback(async () => {
    try {
      const insights = await taskMasterService.getIntelligenceInsights();
      setIntelligenceInsights(insights);
    } catch (error) {
      console.error('Failed to fetch intelligence insights:', error);
    }
  }, []);

  // Initialize everything
  useEffect(() => {
    const initializeApp = async () => {
      // Check for first-run setup
      try {
        const isFirstRunCheck = await window.electronAPI?.isFirstRun();
        setIsFirstRun(isFirstRunCheck || false);
        if (isFirstRunCheck) {
          setShowFirstRunSetup(true);
          return; // Don't initialize until setup is complete
        }
      } catch (error) {
        console.error('Failed to check first-run status:', error);
      }

      // Restore tabs first
      await restoreTabs();
      
      // Initialize Engie orchestrator (non-blocking)
      try {
        await engieOrchestrator.initialize();
        console.log('🧠 Engie AI brain initialized');
      } catch (error) {
        console.warn('⚠️ Engie orchestrator initialization failed, continuing without AI features:', error);
        // Continue app loading even if AI features fail
      }
      
      // Set up callback for task updates
      engieOrchestrator.setTasksUpdatedCallback(() => {
        console.log('🔄 Tasks updated, refreshing sidebar...');
        fetchRealTasks();
        fetchIntelligenceInsights();
      });
      
      // Fetch tasks and intelligence insights on load
      await fetchRealTasks();
      await fetchIntelligenceInsights();
    };

    initializeApp();
    
    // Refresh tasks and insights every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchRealTasks();
      fetchIntelligenceInsights();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [restoreTabs, fetchRealTasks, fetchIntelligenceInsights]);

  // Set up keyboard listeners
  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  // Set up text selection listeners
  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('click', handleCloseContextMenu);
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('click', handleCloseContextMenu);
    };
  }, [handleTextSelection, handleCloseContextMenu]);

  // Font size management
  const increaseFontSize = () => {
    const sizes: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'> = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex < sizes.length - 1) {
      setFontSize(sizes[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    const sizes: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'> = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex > 0) {
      setFontSize(sizes[currentIndex - 1]);
    }
  };

  // Enhanced conversational input with intelligent orchestration
  const handleConversationalInput = useCallback(async (input: string): Promise<{ text: string; thought?: string; toolsUsed?: string[] }> => {
    const lowerInput = input.toLowerCase();
    
    // Check for help/command queries first
    if (lowerInput.includes('help') || lowerInput.includes('what can you do') || lowerInput.includes('commands')) {
      return {
            text: `🧠 **ENGIE: Enhanced Neural Gateway for Intelligent Execution**\n\n**Let go and let Claude.**\n\n**🧠 AI-Powered Second Brain:**\n• Task Management with MCP Server Integration\n• Claude CLI Auto-Installation & Management\n• Intelligent Project Orchestration\n• "What should I focus on now?" - Get desire-driven priorities\n• "How close am I to [goal]?" - Track progress toward your dreams\n• "Break this down: [complex aspiration]" - Smart goal decomposition\n\n**💫 Natural Conversation:**\nJust tell me what's calling to you:\n• "I want to build an app that helps people..."\n• "My biggest goal right now is..."\n• "I'm feeling stuck with..."\n• "I dream of creating..."\n\n**🧠 Let go, and let Claude:**\nI balance your immediate desires with long-term aspirations, using AI to navigate the optimal path forward. I'm not just managing tasks—I'm orchestrating your entire goal achievement system.\n\n**Philosophy:** Trust the intelligence. I handle the complexity while you focus on what truly matters to you.`,
        thought: "Sharing my core philosophy of desire-driven goal achievement"
      };
    }

    // Use Engie orchestrator for intelligent processing
    try {
      console.log('🧠 Engie processing:', input);
      const response = await engieOrchestrator.processUserInput(input);
      
      // Add this interaction to context for future reference
      engieOrchestrator.addContext({
        type: 'user_interaction',
        input,
        response: response.result,
        toolsUsed: response.toolsUsed
      });
      
      return {
        text: response.result,
        thought: response.thought,
        toolsUsed: response.toolsUsed
      };
    } catch (error) {
      console.error('Engie orchestration error:', error);
      
      // Fallback to basic LLM conversation
      if (window.electronAPI?.localLLM?.query) {
        try {
          const fallbackPrompt = `As ENGIE, the Enhanced Neural Gateway for Intelligent Execution, respond to: "${input}"\n\nCore philosophy: "Let go and let Claude" - I help transform desires into reality through intelligent AI-powered task management and second brain capabilities. I balance immediate wants with long-term aspirations. My mantra is "Let go, and let Claude" - trust the AI to handle complexity while you focus on what matters.\n\nBe conversational, desire-focused, and action-oriented.`;
          
          const result = await window.electronAPI.localLLM.query(fallbackPrompt);
          if (result.success && result.data) {
            let responseText = result.data;
            if (typeof responseText === 'object') {
              responseText = responseText.data || responseText.response || String(responseText);
            }
            
            return {
              text: `🎯 ${responseText}\n\n*💫 Let go, and let Claude - I'm here to navigate your path to what you truly want.*`,
              thought: "Using desire-focused conversation mode"
            };
          }
        } catch (llmError) {
          console.error('Fallback LLM error:', llmError);
        }
      }
      
      // Final fallback
      return {
          text: `I hear you asking about: "${input}"\n\nI'm ENGIE - your Enhanced Neural Gateway for Intelligent Execution. 🧠\n\n**Let go and let Claude.**\n\nI'm here to help transform what you want into reality through AI-powered task management:\n• Tell me what you're trying to achieve\n• Share what's calling to you right now\n• Describe your vision, and I'll help you get there\n\n💫 Let go, and let Claude - what's your heart telling you to focus on?`,
        thought: "Encouraging desire-driven conversation"
      };
    }
  }, []);

  // Handle message submission with enhanced response
  const handleSubmit = useCallback(async () => {
    if (!currentInput.trim() || isProcessing) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: currentInput,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const inputText = currentInput;
    setCurrentInput('');
    setIsProcessing(true);

    try {
      const response = await handleConversationalInput(inputText);
      
      const assistantMessage: Message = {
        id: messages.length + 2,
        text: response.text,
        type: 'assistant',
        timestamp: new Date(),
        thought: response.thought,
        toolsUsed: response.toolsUsed
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: messages.length + 2,
        text: `I encountered an error processing your request. Let me know what you'd like to work on and I'll help you with a different approach.`,
        type: 'assistant',
        timestamp: new Date(),
        thought: "Error occurred during processing"
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [currentInput, isProcessing, messages.length, handleConversationalInput]);

  // Handle input key events
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus management
  useEffect(() => {
    if (mode === 'insert' && activeTabId === 'chat') {
      inputRef.current?.focus();
    }
  }, [mode, activeTabId]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const getPriorityTasks = () => {
    console.log('🎯 getPriorityTasks called:', { hasTaskMasterSetup, realTasksLength: realTasks.length });
    
    // Always try to show tasks if we have them, regardless of setup status
    if (realTasks.length === 0) {
      console.log('📭 No real tasks available');
      return [];
    }
    
    const priorityTasks = realTasks
      .filter(task => task.status !== 'done')
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as string] || 1;
        const bPriority = priorityOrder[b.priority as string] || 1;
        return bPriority - aPriority;
      })
      .slice(0, 5);
      
    console.log('🎯 Priority tasks to display:', priorityTasks);
    return priorityTasks;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return '✅';
      case 'in-progress': return '🔄';
      case 'pending': return '⏳';
      case 'blocked': return '❌';
      default: return '⚪';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const handleCreateFirstTasks = async () => {
    const createTaskMessage: Message = {
      id: messages.length + 1,
      text: "I'd love to help you create your first tasks! What would you like to accomplish? \n\nFor example, you could say:\n• \"Create task: Set up development environment\"\n• \"I want to build a web application\"\n• \"Help me plan a mobile app project\"\n\nJust describe what you're working on and I'll create intelligent, well-structured tasks for you!",
      type: 'assistant',
      timestamp: new Date(),
      thought: "Prompting user to create their first tasks"
    };
    
    setMessages(prev => [...prev, createTaskMessage]);
    setMode('insert');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    
    if (!activeTab) {
      return <div>Tab not found</div>;
    }

    if (activeTab.type === 'chat') {
      return (
        <div className="tab-content">
          {/* Enhanced Chat Area */}
          <div className="chat-section">
            <div ref={messagesRef} className="messages-container">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.type}`}>
                  <div className="message-header">
                    <span className="message-sender">
                      {message.type === 'user' ? '👤 You' : '🎯 ENGIE'}
                    </span>
                    <span className="message-time">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.toolsUsed && message.toolsUsed.length > 0 && (
                      <span className="tools-used" title={`Tools used: ${message.toolsUsed.join(', ')}`}>
                        🔧 {message.toolsUsed.length}
                      </span>
                    )}
                  </div>
                  <div className="message-content">
                    {message.thought && message.type === 'assistant' && (
                      <div className="message-thought">
                        💭 <em>{message.thought}</em>
                      </div>
                    )}
                    <div className="message-text">{message.text}</div>
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="message assistant">
                  <div className="message-header">
                    <span className="message-sender">🎯 ENGIE</span>
                    <span className="message-time">Now</span>
                  </div>
                  <div className="message-content">
                    <div className="message-thought">
                      💭 <em>Navigating the path to your desires and finding the optimal approach...</em>
                    </div>
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Input Area */}
            <div className="input-section">
              <div className="input-container">
                <textarea
                  ref={inputRef}
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  className="message-input"
                  placeholder="🧠 Hi! I'm ENGIE - your Enhanced Neural Gateway for Intelligent Execution. Let go and let Claude... (Try: 'help' or 'I want to...')"
                  disabled={isProcessing}
                  rows={1}
                  autoFocus
                />
                <button 
                  onClick={handleSubmit}
                  disabled={!currentInput.trim() || isProcessing}
                  className="send-button"
                >
                  <span>⏎</span>
                </button>
              </div>
              <div className="input-hint">
                {mode === 'insert' ? 'ESC: normal mode • Enter: send • Shift+Enter: new line • Ctrl+1-8: tabs • Ctrl+W: close' : 'i: insert mode • Enter: activate • +/-: font size • Ctrl+1-8: tabs'}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab.type === 'task' && activeTab.data) {
      return (
        <div className="tab-content">
          <TaskViewer
            task={activeTab.data}
            onEdit={handleTaskEdit}
            onStatusChange={handleTaskStatusChange}
            onRefresh={handleTaskRefresh}
          />
        </div>
      );
    }

    if (activeTab.type === 'terminal') {
      return (
        <div className="tab-content h-full">
          <Terminal className="h-full" />
        </div>
      );
    }

    return <div className="tab-content">Loading...</div>;
  };

  // Handle first-run setup completion
  const handleFirstRunComplete = async () => {
    setShowFirstRunSetup(false);
    setIsFirstRun(false);
    
    // Initialize the app after setup is complete
    try {
      await restoreTabs();
      await engieOrchestrator.initialize();
      console.log('🧠 Engie AI brain initialized');
      
      engieOrchestrator.setTasksUpdatedCallback(() => {
        console.log('🔄 Tasks updated, refreshing sidebar...');
        fetchRealTasks();
        fetchIntelligenceInsights();
      });
      
      await fetchRealTasks();
      await fetchIntelligenceInsights();
    } catch (error) {
      console.error('Failed to initialize app after setup:', error);
    }
  };

  // Handle opening API key settings
  const handleOpenApiKeySettings = () => {
    setShowApiKeySettings(true);
  };

  const handleCloseApiKeySettings = () => {
    setShowApiKeySettings(false);
  };

  // Show first-run setup if needed
  if (showFirstRunSetup) {
    return <FirstRunSetup onComplete={handleFirstRunComplete} />;
  }

  // Show API key settings modal if open
  if (showApiKeySettings) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto m-4">
          <ApiKeySettings onClose={handleCloseApiKeySettings} />
        </div>
      </div>
    );
  }

  return (
    <div className={`terminal-container font-${fontSize}`}>
      {/* Header with enhanced status */}
      <div className="terminal-header">

        <div className="terminal-title">
          <div className="engie-logo">
            <svg width="240" height="60" viewBox="0 0 512 120" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="50%" stopColor="#00ffff" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              
              {/* ENGIE text */}
              <text x="256" y="45" fontFamily="monospace" fontSize="32" 
                    textAnchor="middle" fill="url(#logoGradient)" fontWeight="bold">
                ENGIE
              </text>
              
              {/* Subtitle */}
              <text x="256" y="65" fontFamily="monospace" fontSize="10" 
                    textAnchor="middle" fill="#64748b">
                Enhanced Neural Gateway for Intelligent Execution
              </text>
              
              {/* Tagline */}
              <text x="256" y="80" fontFamily="monospace" fontSize="9" 
                    textAnchor="middle" fill="#00ffff" opacity="0.8">
                Let go and let Claude
              </text>
              
              {/* Neural circuit accents */}
              <circle cx="120" cy="40" r="2" fill="#00ffff" opacity="0.6">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx="392" cy="40" r="2" fill="#00ffff" opacity="0.6">
                <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite"/>
              </circle>
              
              {/* Connection lines */}
              <line x1="122" y1="40" x2="150" y2="40" stroke="#00ffff" strokeWidth="1" opacity="0.4"/>
              <line x1="362" y1="40" x2="390" y2="40" stroke="#00ffff" strokeWidth="1" opacity="0.4"/>
            </svg>
          </div>
        </div>
        <div className="system-status">
          <span className={`status-indicator ${systemStatus.langGraph ? 'active' : 'inactive'}`}>LG</span>
          <span className={`status-indicator ${systemStatus.backgroundProcessor ? 'active' : 'inactive'}`}>BP</span>
          <span className={`status-indicator ${systemStatus.localLLM ? 'active' : 'inactive'}`}>AI</span>
          <span className={`status-indicator ${systemStatus.taskMaster ? 'active' : 'inactive'}`}>TM</span>
          <span
            className="status-indicator active"
            title="ENGIE: Enhanced Neural Gateway for Intelligent Execution - Let go and let Claude"
          >
            🎯
          </span>
          <button
            className="settings-button"
            onClick={handleOpenApiKeySettings}
            title="Open API Key Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={switchToTab}
        onTabClose={closeTab}
        onNewTab={openTerminalTab}
        maxTabs={MAX_TABS}
      />

      <div className="main-content">
        {/* Tab Content */}
        {renderTabContent()}

        {/* Enhanced Task Management Sidebar */}
        <div className="task-sidebar">
          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-title">🧠 Engie AI Intelligence</span>
              <span className="task-count">Learning</span>
            </div>
            <div className="system-info">
              <div className="system-item">
                <span className="system-label">Patterns</span>
                <span className="system-value connected">{intelligenceInsights.totalPatterns}</span>
              </div>
              <div className="system-item">
                <span className="system-label">Effectiveness</span>
                <span className="system-value connected">{Math.round(intelligenceInsights.avgEffectiveness * 100)}%</span>
              </div>
              <div className="system-item">
                <span className="system-label">Learning Rate</span>
                <span className="system-value connected">{Math.round(intelligenceInsights.learningRate * 100)}%</span>
              </div>
              <div className="system-item">
                <span className="system-label">Recent Activity</span>
                <span className="system-value connected">
                  {intelligenceInsights.recentActivity.commits}C / {intelligenceInsights.recentActivity.tasks}T
                </span>
              </div>
            </div>
            
            {intelligenceInsights.recommendations.length > 0 && (
              <div className="task-list">
                <div className="task-item">
                  <div className="task-icons">💡</div>
                  <div className="task-details">
                    <div className="task-title">AI Insights</div>
                    <div className="task-meta" style={{ fontSize: '11px', lineHeight: '1.3' }}>
                      {intelligenceInsights.recommendations[0]}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-title">🎯 Priority Tasks</span>
              <span className="task-count">
                {getPriorityTasks().length}
              </span>
              <button
                onClick={fetchRealTasks}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#00ffff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginLeft: '8px',
                  opacity: 0.7
                }}
                title="Refresh tasks from TaskMaster"
              >
                🔄
              </button>
            </div>
            
            {isLoadingTasks ? (
              <div className="task-list">
                <div className="task-item">
                  <div className="task-icons">⏳</div>
                  <div className="task-details">
                    <div className="task-title">Loading your tasks...</div>
                    <div className="task-meta">Fetching from TaskMaster</div>
                  </div>
                </div>
              </div>
            ) : !hasTaskMasterSetup ? (
              <div className="task-list">
                <div className="task-item setup-prompt" onClick={handleCreateFirstTasks}>
                  <div className="task-icons">🚀</div>
                  <div className="task-details">
                    <div className="task-title">Get Started with Tasks</div>
                    <div className="task-meta">Click to create your first task</div>
                  </div>
                </div>
                <div className="task-item">
                  <div className="task-icons">💡</div>
                  <div className="task-details">
                    <div className="task-title">Tell me what you want to accomplish</div>
                    <div className="task-meta">I'll create intelligent tasks for you</div>
                  </div>
                </div>
              </div>
            ) : getPriorityTasks().length === 0 ? (
              <div className="task-list">
                <div className="task-item setup-prompt" onClick={handleCreateFirstTasks}>
                  <div className="task-icons">✨</div>
                  <div className="task-details">
                    <div className="task-title">All Tasks Complete!</div>
                    <div className="task-meta">Tell me what you want to work on next</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="task-list">
                {getPriorityTasks().map((task) => (
                  <div 
                    key={task.id} 
                    className={`task-item ${task.status || 'pending'}`}
                    onClick={() => openTaskTab(task)}
                    style={{ cursor: 'pointer' }}
                    title={`Click to open Task #${task.id} in new tab`}
                  >
                    <div className="task-icons">
                      {getStatusIcon(task.status || 'pending')}
                      {getPriorityIcon(task.priority || 'medium')}
                    </div>
                    <div className="task-details">
                      <div className="task-title">{task.title || `Task ${task.id}`}</div>
                      <div className="task-meta">#{task.id} • {task.status || 'pending'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-title">📊 Progress</span>
            </div>
            <div className="progress-stats">
              <div className="stat-item">
                <span className="stat-label">Done</span>
                <span className="stat-value">{taskMetrics.completed}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">In Progress</span>
                <span className="stat-value">{taskMetrics.inProgress}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pending</span>
                <span className="stat-value">{taskMetrics.pending}</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-title">🧠 AI Commands</span>
            </div>
            <div className="system-info">
              <div className="system-item">
                <span className="system-label">Quick Actions</span>
                <span className="system-value connected">Ready</span>
              </div>
            </div>
            <div className="task-list">
              <div className="task-item" title="Type: create task [description]">
                <div className="task-icons">🎯</div>
                <div className="task-details">
                  <div className="task-title">AI Task Creation</div>
                  <div className="task-meta">create task ...</div>
                </div>
              </div>
              <div className="task-item" title="Type: generate commit">
                <div className="task-icons">💡</div>
                <div className="task-details">
                  <div className="task-title">Smart Commits</div>
                  <div className="task-meta">generate commit</div>
                </div>
              </div>
              <div className="task-item" title="Type: list tasks">
                <div className="task-icons">📋</div>
                <div className="task-details">
                  <div className="task-title">Task Overview</div>
                  <div className="task-meta">list tasks</div>
                </div>
              </div>
              <div className="task-item" title="Type: analyze tasks">
                <div className="task-icons">📊</div>
                <div className="task-details">
                  <div className="task-title">Task Analysis</div>
                  <div className="task-meta">analyze tasks</div>
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-title">⚡ System</span>
            </div>
            <div className="system-info">
              <div className="system-item">
                <span className="system-label">Model</span>
                <span className="system-value">{systemStatus.currentModel}</span>
              </div>
              <div className="system-item">
                <span className="system-label">MCP</span>
                <span className={`system-value ${systemStatus.taskMaster ? 'connected' : 'disconnected'}`}>
                  {systemStatus.taskMaster ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Text Selection Context Menu */}
      {showContextMenu && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenuPosition.x + 'px',
            top: contextMenuPosition.y + 'px',
            zIndex: 10000,
            backgroundColor: 'var(--terminal-bg)',
            border: '1px solid var(--terminal-border)',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            minWidth: '200px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            <span className="context-menu-title">🎯 Selected Text Actions</span>
          </div>
          <div className="context-menu-item">
            <strong>"{selectedText.length > 40 ? selectedText.substring(0, 40) + '...' : selectedText}"</strong>
          </div>
          <div 
            className="context-menu-item clickable"
            onClick={handleCreateTaskFromSelection}
            style={{
              padding: '8px',
              cursor: 'pointer',
              borderTop: '1px solid var(--terminal-border)',
              marginTop: '4px'
            }}
          >
            {isCreatingTaskFromSelection ? (
              <span>🔄 Creating intelligent task...</span>
            ) : (
              <span>🎯 Create Task from Selection</span>
            )}
          </div>
        </div>
      )}

      {/* Task Edit Modal */}
      {showEditModal && editingTask && (
        <div 
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 20000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={handleCancelTaskEdit}
        >
          <div 
            className="edit-modal"
            style={{
              backgroundColor: 'var(--terminal-bg)',
              border: '1px solid var(--terminal-border)',
              borderRadius: '8px',
              padding: '24px',
              minWidth: '500px',
              maxWidth: '80%',
              maxHeight: '80%',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--terminal-text)' }}>
                🎯 Edit Task #{editingTask.id}
              </h3>
            </div>
            
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--terminal-text)' }}>
                  Title:
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: 'var(--terminal-bg)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--terminal-text)' }}>
                  Description:
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: 'var(--terminal-bg)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--terminal-text)' }}>
                    Priority:
                  </label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value as 'high' | 'medium' | 'low' }))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: 'var(--terminal-bg)',
                      border: '1px solid var(--terminal-border)',
                      borderRadius: '4px',
                      color: 'var(--terminal-text)',
                      fontSize: '14px'
                    }}
                  >
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--terminal-text)' }}>
                    Status:
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as TaskMasterTask['status'] }))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: 'var(--terminal-bg)',
                      border: '1px solid var(--terminal-border)',
                      borderRadius: '4px',
                      color: 'var(--terminal-text)',
                      fontSize: '14px'
                    }}
                  >
                    <option value="pending">⏳ Pending</option>
                    <option value="in-progress">🔄 In Progress</option>
                    <option value="done">✅ Done</option>
                    <option value="blocked">❌ Blocked</option>
                    <option value="deferred">⏸️ Deferred</option>
                    <option value="cancelled">🚫 Cancelled</option>
                    <option value="review">👀 Review</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelTaskEdit}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--terminal-border)',
                  borderRadius: '4px',
                  color: 'var(--terminal-text)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTaskEdit}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--terminal-accent)',
                  border: '1px solid var(--terminal-accent)',
                  borderRadius: '4px',
                  color: 'var(--terminal-bg)',
                  cursor: 'pointer'
                }}
              >
                💾 Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Console Log Component */}
      <ConsoleLog 
        isVisible={showConsoleLog} 
        onToggle={() => setShowConsoleLog(!showConsoleLog)} 
      />
    </div>
  );
};

export default App;