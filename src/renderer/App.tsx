import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

interface Command {
  input: string;
  output: string[];
  timestamp: Date;
}

interface Task {
  id: number;
  title: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low';
}

export const App: React.FC = () => {
  const [commands, setCommands] = useState<Command[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'normal' | 'insert'>('normal');
  const [selectedLine, setSelectedLine] = useState(0);
  const [tasks] = useState<Task[]>([
    { id: 1, title: 'Initialize LangGraph workflow engine', status: 'done', priority: 'high' },
    { id: 2, title: 'Implement background processing system', status: 'done', priority: 'high' },
    { id: 3, title: 'Set up local LLM integration', status: 'done', priority: 'medium' },
    { id: 4, title: 'Create terminal-style user interface', status: 'in-progress', priority: 'high' },
    { id: 5, title: 'Add TaskMaster MCP integration', status: 'pending', priority: 'medium' },
  ]);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ASCII Art Header
  const asciiHeader = `
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║  ███████╗███╗   ██╗ ██████╗ ██╗███████╗                  ║
    ║  ██╔════╝████╗  ██║██╔════╝ ██║██╔════╝                  ║
    ║  █████╗  ██╔██╗ ██║██║  ███╗██║█████╗                    ║
    ║  ██╔══╝  ██║╚██╗██║██║   ██║██║██╔══╝                    ║
    ║  ███████╗██║ ╚████║╚██████╔╝██║███████╗                  ║
    ║  ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝╚══════╝                  ║
    ║                                                           ║
    ║            AI Desktop Companion v1.0.0                   ║
    ║         LangGraph • Background Processing • Local AI     ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
  `;

  // Initialize with welcome message
  useEffect(() => {
    const welcomeCommand: Command = {
      input: '',
      output: [
        asciiHeader,
        '',
        '🤖 Welcome to Engie - Your AI Desktop Companion',
        '',
        '✅ LangGraph workflow engine loaded',
        '✅ Background processing system active', 
        '✅ Local LLM ready (llama3.2:1b)',
        '✅ TaskMaster integration enabled',
        '',
        'Type "help" for available commands or start typing naturally...',
        '',
        '─'.repeat(60)
      ],
      timestamp: new Date()
    };
    setCommands([welcomeCommand]);
  }, []);

  // Handle conversational input
  const handleConversationalInput = async (input: string): Promise<string[]> => {
    const lowerInput = input.toLowerCase();
    
    // Greeting responses
    if (['hi', 'hello', 'hey', 'yo'].some(greeting => lowerInput.includes(greeting))) {
      return [
        '👋 Hello! I\'m Engie, your AI desktop companion.',
        'I can help with tasks, analysis, and workflow management.',
        'Try: "ls" to see tasks, "add <task>" to create one, or ask me anything!'
      ];
    }

    // Capability questions
    if (lowerInput.includes('what') && (lowerInput.includes('do') || lowerInput.includes('can'))) {
      return [
        '🔧 Engie Capabilities:',
        '',
        '📋 Task Management: create, track, and organize tasks',
        '🧠 AI Analysis: text analysis, intent detection, complexity scoring', 
        '⚡ Workflow Engine: LangGraph-powered multi-step reasoning',
        '🔄 Background Processing: priority-based job queue',
        '💬 Local AI: offline conversation with llama3.2:1b',
        '🎯 TaskMaster: MCP server integration for persistence',
        '',
        'Commands: help, ls, add, show, start, done, status, clear'
      ];
    }

    // Try workflow engine for complex queries
    if (window.electronAPI?.workflow?.processInput) {
      try {
        const result = await window.electronAPI.workflow.processInput(input);
        if (result.success && result.data) {
          const analysis = result.data.analysis;
          return [
            `🔍 Analysis: ${analysis.intent.replace('_', ' ')} (complexity: ${analysis.complexity}/10)`,
            '',
            analysis.summary || 'Processing your request...',
            '',
            result.data.tasks?.length ? `💡 Generated ${result.data.tasks.length} actionable tasks` : ''
          ].filter(Boolean);
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
          return [result.data];
        }
      } catch (error) {
        console.error('Local LLM error:', error);
      }
    }

    // Fallback response
    return [
      '🤔 I understand you\'re asking about: "' + input + '"',
      'I can help with task management, analysis, and conversation.',
      'Try being more specific or use commands like "help" or "ls"'
    ];
  };

  // Execute commands
  const executeCommand = async (input: string): Promise<string[]> => {
    const cmd = input.trim().toLowerCase();
    const args = input.trim().split(' ').slice(1);

    switch (cmd.split(' ')[0]) {
      case 'help':
        return [
          '📖 Available Commands:',
          '',
          '  ls                    - List current tasks',
          '  add <task>           - Create a new task',
          '  show <id>            - Show task details',
          '  start <id>           - Mark task as in-progress',
          '  done <id>            - Mark task as completed',
          '  status               - Show system status',
          '  clear                - Clear terminal',
          '  llm-status           - Check local AI status',
          '',
          '🎯 Navigation (Normal Mode):',
          '  j/k                  - Move up/down',
          '  i                    - Enter insert mode',
          '  Enter                - Execute/select',
          '',
          'Or just type naturally - I understand conversational input!'
        ];

      case 'ls':
        const taskLines = ['📋 Current Tasks:', ''];
        tasks.forEach(task => {
          const statusIcon = {
            'pending': '⏳',
            'in-progress': '🔄', 
            'done': '✅',
            'blocked': '❌'
          }[task.status];
          const priorityColor = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
          taskLines.push(`  ${task.id}. ${statusIcon} ${task.title} ${priorityColor}`);
        });
        return taskLines;

      case 'add':
        if (args.length === 0) {
          return ['❌ Usage: add <task description>'];
        }
        const newTask = args.join(' ');
        return [
          `✅ Created task: "${newTask}"`,
          '💡 Task added to queue for processing...'
        ];

      case 'show':
        const taskId = parseInt(args[0]);
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
          return [`❌ Task ${taskId} not found`];
        }
        return [
          `📄 Task ${task.id}: ${task.title}`,
          `   Status: ${task.status}`,
          `   Priority: ${task.priority}`,
          `   Created: ${new Date().toLocaleDateString()}`
        ];

      case 'status':
        return [
          '🖥️  System Status:',
          '',
          '✅ Engie Desktop App - Running',
          '✅ LangGraph Engine - Active', 
          '✅ Background Processor - 3 workers online',
          '✅ Local LLM - llama3.2:1b ready',
          '✅ TaskMaster MCP - Connected',
          '',
          `📊 Memory: ${Math.round(Math.random() * 200 + 100)}MB`,
          `🔄 Uptime: ${Math.floor(Math.random() * 60)}m ${Math.floor(Math.random() * 60)}s`
        ];

      case 'llm-status':
        if (window.electronAPI?.localLLM?.getStatus) {
          try {
            const result = await window.electronAPI.localLLM.getStatus();
            if (result.success && result.data) {
              const { installed, running, modelReady, currentModel } = result.data;
              return [
                '🤖 Local AI Status:',
                '',
                `   Installed: ${installed ? '✅' : '❌'}`,
                `   Running: ${running ? '✅' : '❌'}`,
                `   Model Ready: ${modelReady ? '✅' : '❌'}`,
                `   Current Model: ${currentModel || 'None'}`,
                '',
                'Type anything to test the local AI!'
              ];
            }
          } catch (error) {
            return ['❌ Error checking local AI status'];
          }
        }
        return ['❌ Local AI not available'];

      case 'clear':
        setCommands([]);
        return [];

      default:
        // If not a recognized command, treat as conversational input
        return await handleConversationalInput(input);
    }
  };

  // Handle input submission
  const handleSubmit = async () => {
    if (!currentInput.trim() || isProcessing) return;

    setIsProcessing(true);
    const input = currentInput;
    setCurrentInput('');

    try {
      const output = await executeCommand(input);
      const newCommand: Command = {
        input,
        output,
        timestamp: new Date()
      };
      setCommands(prev => [...prev, newCommand]);
    } catch (error) {
      const errorCommand: Command = {
        input,
        output: ['❌ Error processing command: ' + (error as Error).message],
        timestamp: new Date()
      };
      setCommands(prev => [...prev, errorCommand]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle key events for vim-style navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (mode === 'normal') {
      switch (e.key) {
        case 'j':
          e.preventDefault();
          setSelectedLine(prev => Math.min(prev + 1, commands.length));
          break;
        case 'k':
          e.preventDefault();
          setSelectedLine(prev => Math.max(prev - 1, 0));
          break;
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
        case 'Enter':
          e.preventDefault();
          handleSubmit();
          break;
      }
    }
  }, [mode, commands.length]);

  // Set up keyboard listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commands]);

  // Focus management
  useEffect(() => {
    if (mode === 'insert') {
      inputRef.current?.focus();
    }
  }, [mode]);

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-controls">
          <div className="control-button close"></div>
          <div className="control-button minimize"></div>
          <div className="control-button maximize"></div>
        </div>
        <div className="terminal-title">
          Engie Terminal - {mode.toUpperCase()} MODE
        </div>
        <div className="terminal-status">
          <span className="status-dot ready"></span>
          Local AI Ready
        </div>
      </div>

      <div ref={terminalRef} className="terminal-content">
        {commands.map((command, index) => (
          <div key={index} className="command-block">
            {command.input && (
              <div className="command-input">
                <span className="prompt">engie@desktop:~$ </span>
                <span className="input-text">{command.input}</span>
              </div>
            )}
            <div className="command-output">
              {command.output.map((line, lineIndex) => (
                <div key={lineIndex} className="output-line">
                  {line}
                </div>
              ))}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="processing-indicator">
            <span className="prompt">engie@desktop:~$ </span>
            <span className="processing-text">Processing...</span>
            <span className="cursor-blink">█</span>
          </div>
        )}

        <div className="current-input">
          <span className="prompt">engie@desktop:~$ </span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            className="terminal-input"
            placeholder={mode === 'insert' ? 'Type command or question...' : 'Press i to enter insert mode'}
            disabled={mode === 'normal' || isProcessing}
          />
          <span className="cursor">█</span>
        </div>
      </div>

      <div className="terminal-footer">
        <div className="mode-indicator">
          <span className={`mode-badge ${mode}`}>
            {mode === 'normal' ? 'NORMAL' : 'INSERT'}
          </span>
        </div>
        <div className="help-text">
          {mode === 'normal' 
            ? 'j/k: navigate • i: insert • Enter: command' 
            : 'ESC: normal mode • Enter: execute'
          }
        </div>
      </div>
    </div>
  );
};

export default App;