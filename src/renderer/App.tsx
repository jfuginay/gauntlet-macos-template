import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import Terminal from './components/Terminal';

interface Message {
  id: number;
  text: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

interface Task {
  id: number;
  title: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low';
}

interface SystemStatus {
  langGraph: boolean;
  backgroundProcessor: boolean;
  localLLM: boolean;
  taskMaster: boolean;
  currentModel: string;
}

export const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'normal' | 'insert'>('insert');
  const [showTerminal, setShowTerminal] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    langGraph: true,
    backgroundProcessor: true,
    localLLM: true,
    taskMaster: true,
    currentModel: 'llama3.2:1b'
  });
  
  const [tasks] = useState<Task[]>([
    { id: 1, title: 'Initialize LangGraph workflow engine', status: 'done', priority: 'high' },
    { id: 2, title: 'Implement background processing system', status: 'done', priority: 'high' },
    { id: 3, title: 'Set up local LLM integration', status: 'done', priority: 'medium' },
    { id: 4, title: 'Create terminal-style user interface', status: 'in-progress', priority: 'high' },
    { id: 5, title: 'Add TaskMaster MCP integration', status: 'pending', priority: 'medium' },
    { id: 6, title: 'Enhance conversational AI capabilities', status: 'pending', priority: 'high' },
    { id: 7, title: 'Implement task management dashboard', status: 'in-progress', priority: 'high' },
  ]);
  
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ASCII Art Header
  const asciiHeader = `$ whoami
engie-ai-companion

$ status
✅ LangGraph Engine: Active
✅ Background Processor: 3 workers online  
✅ Local LLM: llama3.2:1b ready
✅ TaskMaster MCP: Connected

$ echo "Welcome to Engie!"
I'm your AI development companion. 

Type naturally or use commands.
I can help with task management, code development, and more.

What would you like to work on today?`;

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

  // Handle conversational input with enhanced Claude-like responses
  const handleConversationalInput = async (input: string): Promise<string> => {
    const lowerInput = input.toLowerCase();
    
    // Enhanced greeting responses
    if (['hi', 'hello', 'hey', 'yo'].some(greeting => lowerInput.includes(greeting))) {
      return `👋 Hello! Great to see you. I can see you have ${tasks.filter(t => t.status === 'pending').length} pending tasks and ${tasks.filter(t => t.status === 'in-progress').length} tasks in progress.\n\nI'm ready to help with your development work, task management, or any questions you have. What's on your mind?`;
    }

    // Task-related queries
    if (lowerInput.includes('task') || lowerInput.includes('todo') || lowerInput.includes('work')) {
      const pendingTasks = tasks.filter(t => t.status === 'pending');
      const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
      const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'done');
      
      return `📋 Here's your current task overview:\n\n• ${pendingTasks.length} pending tasks\n• ${inProgressTasks.length} in progress\n• ${highPriorityTasks.length} high priority items\n\nNext recommended task: "${highPriorityTasks[0]?.title || 'No high priority tasks'}"\n\nWould you like me to help you prioritize, break down any of these tasks, or start working on something specific?`;
    }

    // System status queries
    if (lowerInput.includes('status') || lowerInput.includes('system') || lowerInput.includes('health')) {
      return `🖥️ System Status Overview:\n\n✅ LangGraph Engine: ${systemStatus.langGraph ? 'Active' : 'Offline'}\n✅ Background Processor: ${systemStatus.backgroundProcessor ? 'Running (3 workers)' : 'Stopped'}\n✅ Local LLM: ${systemStatus.localLLM ? `Ready (${systemStatus.currentModel})` : 'Offline'}\n✅ TaskMaster MCP: ${systemStatus.taskMaster ? 'Connected' : 'Disconnected'}\n\nAll systems are operational and ready for productive work!`;
    }

    // Capability questions
    if (lowerInput.includes('what') && (lowerInput.includes('do') || lowerInput.includes('can') || lowerInput.includes('help'))) {
      return `🔧 I'm your comprehensive AI development companion. Here's what I can help with:\n\n**Task Management:**\n• Track and prioritize your development tasks\n• Break down complex features into manageable steps\n• Suggest optimal work sequences\n\n**Development Support:**\n• Code review and optimization suggestions\n• Architecture guidance and best practices\n• Debugging assistance and problem-solving\n\n**Intelligent Automation:**\n• Background workflow processing\n• Automated analysis and insights\n• Context-aware recommendations\n\n**Communication:**\n• Natural conversation about your projects\n• Technical explanations and documentation\n• Strategic planning and decision support\n\nI'm essentially like having Claude Code right in your desktop environment, with full access to your task management system. What would you like to explore?`;
    }

    // Try workflow engine for complex queries
    if (window.electronAPI?.workflow?.processInput) {
      try {
        const result = await window.electronAPI.workflow.processInput(input);
        if (result.success && result.data) {
          const analysis = result.data.analysis;
          return `🔍 I've analyzed your request (complexity: ${analysis.complexity}/10):\n\n${analysis.summary || 'Processing your request...'}\n\n${result.data.tasks?.length ? `💡 I can help break this down into ${result.data.tasks.length} actionable steps. Would you like me to show the breakdown?` : 'How would you like to proceed with this?'}`;
        }
      } catch (error) {
        console.error('Workflow error:', error);
      }
    }

    // Try local LLM
    if (window.electronAPI?.localLLM?.query) {
      try {
        const result = await window.electronAPI.localLLM.query(input);
        if (result.success && result.data) {
          return `🤖 ${result.data}\n\nIs there anything specific about this you'd like me to elaborate on or help implement?`;
        }
      } catch (error) {
        console.error('Local LLM error:', error);
      }
    }

    // Enhanced fallback response
    return `I understand you're asking about: "${input}"\n\nI'm here to help with development work, task management, and technical guidance. Could you tell me more about what you're trying to accomplish? I can:\n\n• Help analyze and break down the problem\n• Suggest implementation approaches\n• Connect it to your existing tasks\n• Provide code examples or guidance\n\nWhat specific aspect would you like to focus on?`;
  };

  // Handle message submission
  const handleSubmit = async () => {
    if (!currentInput.trim() || isProcessing) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: currentInput,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsProcessing(true);

    try {
      const response = await handleConversationalInput(currentInput);
      
      const assistantMessage: Message = {
        id: messages.length + 2,
        text: response,
        type: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: messages.length + 2,
        text: `I encountered an error processing your request. Let me try a different approach. Could you rephrase or provide more context about what you need help with?`,
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle key events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle global keys if input is focused
    if (inputRef.current === document.activeElement) {
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
  }, [mode]);

  // Handle input key events
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Set up keyboard listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus management
  useEffect(() => {
    if (mode === 'insert') {
      inputRef.current?.focus();
    }
  }, [mode]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const getPriorityTasks = () => {
    return tasks
      .filter(task => task.status !== 'done')
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 5);
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

  return (
    <div className="terminal-container">
      {/* Header with system status */}
      <div className="terminal-header">
        <div className="terminal-controls">
          <div className="control-button close"></div>
          <div className="control-button minimize"></div>
          <div className="control-button maximize"></div>
        </div>
        <div className="terminal-title">
          <div className="engie-ascii">
            <div>███████╗███╗   ██╗ ██████╗ ██╗███████╗</div>
            <div>██╔════╝████╗  ██║██╔════╝ ██║██╔════╝</div>
            <div>█████╗  ██╔██╗ ██║██║  ███╗██║█████╗  </div>
            <div>██╔══╝  ██║╚██╗██║██║   ██║██║██╔══╝  </div>
            <div>███████╗██║ ╚████║╚██████╔╝██║███████╗</div>
          </div>
          <span className="subtitle">AI Desktop Companion - {mode.toUpperCase()} MODE</span>
        </div>
        <div className="system-status">
          <span className={`status-indicator ${systemStatus.langGraph ? 'active' : 'inactive'}`}>LG</span>
          <span className={`status-indicator ${systemStatus.backgroundProcessor ? 'active' : 'inactive'}`}>BP</span>
          <span className={`status-indicator ${systemStatus.localLLM ? 'active' : 'inactive'}`}>AI</span>
          <span className={`status-indicator ${systemStatus.taskMaster ? 'active' : 'inactive'}`}>TM</span>
          <button 
            className="terminal-toggle-btn"
            onClick={() => setShowTerminal(!showTerminal)}
            title="Open Terminal"
          >
            🖥️
          </button>
        </div>
      </div>

      <div className="main-content">
        {/* Chat Area */}
        <div className="chat-section">
          <div ref={messagesRef} className="messages-container">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-header">
                  <span className="message-sender">
                    {message.type === 'user' ? '👤 You' : message.type === 'system' ? '🤖 Engie' : '🤖 Engie'}
                  </span>
                  <span className="message-time">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="message-content">
                  {message.text.split('\n').map((line, index) => (
                    <div key={index} className="message-line">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="message assistant">
                <div className="message-header">
                  <span className="message-sender">🤖 Engie</span>
                  <span className="message-time">Now</span>
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="input-section">
            <div className="input-container">
              <textarea
                ref={inputRef}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="message-input"
                placeholder="Ask me anything about your tasks, code, or development work..."
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
              {mode === 'insert' ? 'ESC: normal mode • Enter: send • Shift+Enter: new line' : 'i: insert mode • Enter: activate'}
            </div>
          </div>
        </div>

        {/* Task Management Sidebar */}
        <div className="task-sidebar">
          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-title">🎯 Priority Tasks</span>
              <span className="task-count">{getPriorityTasks().length}</span>
            </div>
            <div className="task-list">
              {getPriorityTasks().map((task) => (
                <div key={task.id} className={`task-item ${task.status}`}>
                  <div className="task-icons">
                    {getStatusIcon(task.status)}
                    {getPriorityIcon(task.priority)}
                  </div>
                  <div className="task-details">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">#{task.id} • {task.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-title">📊 Progress</span>
            </div>
            <div className="progress-stats">
              <div className="stat-item">
                <span className="stat-label">Done</span>
                <span className="stat-value">{tasks.filter(t => t.status === 'done').length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">In Progress</span>
                <span className="stat-value">{tasks.filter(t => t.status === 'in-progress').length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pending</span>
                <span className="stat-value">{tasks.filter(t => t.status === 'pending').length}</span>
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

      {/* Terminal Overlay */}
      {showTerminal && (
        <div className="terminal-overlay">
          <div className="terminal-modal">
            <Terminal onClose={() => setShowTerminal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;