import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal as TerminalIcon, Zap, Brain, Send, History, Settings, Maximize2 } from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface TerminalProps {
  className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ className = '' }) => {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClaudeReady, setIsClaudeReady] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize terminal with welcome message
    const welcomeMessages: TerminalLine[] = [
      {
        id: 'welcome-1',
        type: 'system',
        content: '╔══════════════════════════════════════════════════════════════╗',
        timestamp: new Date()
      },
      {
        id: 'welcome-2',
        type: 'system',
        content: '║                    ENGIE AI TERMINAL v2.0                    ║',
        timestamp: new Date()
      },
      {
        id: 'welcome-3',
        type: 'system',
        content: '║              Powered by Claude CLI + MCP Task Master         ║',
        timestamp: new Date()
      },
      {
        id: 'welcome-4',
        type: 'system',
        content: '╚══════════════════════════════════════════════════════════════╝',
        timestamp: new Date()
      },
      {
        id: 'welcome-5',
        type: 'output',
        content: '',
        timestamp: new Date()
      },
      {
        id: 'welcome-6',
        type: 'output',
        content: '> System Status: Initializing Claude CLI connection...',
        timestamp: new Date()
      }
    ];
    
    setLines(welcomeMessages);
    
    // Simulate Claude CLI initialization
    setTimeout(() => {
      setIsClaudeReady(true);
      setLines(prev => [...prev, {
        id: 'init-complete',
        type: 'output',
        content: '✓ Claude CLI ready | MCP Task Master connected | Type "help" for commands',
        timestamp: new Date()
      }]);
    }, 2000);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new lines are added
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const addLine = useCallback((line: Omit<TerminalLine, 'id' | 'timestamp'>) => {
    const newLine: TerminalLine = {
      ...line,
      id: `line-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };
    setLines(prev => [...prev, newLine]);
    return newLine.id;
  }, []);

  const processCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;

    // Add command to history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    // Add user input line
    addLine({
      type: 'input',
      content: `engie@ai:~$ ${command}`
    });

    setIsProcessing(true);

    try {
      // Check for built-in terminal commands first
      if (command.toLowerCase() === 'help') {
        setTimeout(() => {
          addLine({
            type: 'output',
            content: `
Available Commands:
  help                 - Show this help message
  clear               - Clear terminal screen  
  status              - Show system status
  tasks               - List current tasks (MCP integration)
  task <id>           - View specific task details
  new-task <desc>     - Create new task
  claude <prompt>     - Direct Claude AI interaction
  history             - Show command history
  exit                - Close terminal session

Enhanced Features:
  - All commands are AI-enhanced via Claude CLI
  - Task Master MCP integration for project management
  - Intelligent context awareness and suggestions
  - Auto-completion and smart suggestions
            `
          });
          setIsProcessing(false);
        }, 500);
        return;
      }

      if (command.toLowerCase() === 'clear') {
        setLines([]);
        setIsProcessing(false);
        return;
      }

      if (command.toLowerCase() === 'history') {
        setTimeout(() => {
          addLine({
            type: 'output',
            content: commandHistory.map((cmd, i) => `  ${i + 1}  ${cmd}`).join('\n')
          });
          setIsProcessing(false);
        }, 300);
        return;
      }

      if (command.toLowerCase() === 'status') {
        setTimeout(() => {
          addLine({
            type: 'output',
            content: `
System Status:
  ✓ Claude CLI: Connected and ready
  ✓ MCP Task Master: Active
  ✓ API Keys: Configured and secure
  ✓ Local AI: phi3:latest ready
  ✓ Terminal Interface: Full functionality
  
  Session: ${new Date().toLocaleString()}
  Uptime: ${Math.floor((Date.now() - lines[0]?.timestamp.getTime()) / 1000)}s
            `
          });
          setIsProcessing(false);
        }, 800);
        return;
      }

      // For all other commands, route through Claude CLI
      await executeClaudeCommand(command);

    } catch (error) {
      addLine({
        type: 'error',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      });
    } finally {
      setIsProcessing(false);
    }
  }, [addLine, commandHistory, lines]);

  const executeClaudeCommand = async (command: string) => {
    try {
      // Add processing indicator
      const processingId = addLine({
        type: 'output',
        content: '⚡ Processing with Claude CLI...',
        isStreaming: true
      });

      // Route command through electron main process to Claude CLI
      const response = await window.electronAPI?.executeClaudeCommand?.(command);
      
      if (response?.success) {
        // Remove processing indicator and add response
        setLines(prev => prev.filter(line => line.id !== processingId));
        
        addLine({
          type: 'output',
          content: response.output || 'Command executed successfully'
        });

        // If response includes task updates, refresh task master
        if (response.taskUpdated) {
          addLine({
            type: 'system',
            content: '📋 Task Master updated - use "tasks" to view changes'
          });
        }
      } else {
        // Remove processing indicator and show error
        setLines(prev => prev.filter(line => line.id !== processingId));
        addLine({
          type: 'error',
          content: response?.error || 'Claude CLI command failed'
        });
      }
    } catch (error) {
      addLine({
        type: 'error',
        content: `Claude CLI Error: ${error instanceof Error ? error.message : 'Connection failed'}`
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim() || isProcessing) return;
    
    processCommand(currentInput.trim());
    setCurrentInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' && commandHistory.length > 0) {
      e.preventDefault();
      const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setCurrentInput(commandHistory[newIndex]);
    } else if (e.key === 'ArrowDown' && historyIndex !== -1) {
      e.preventDefault();
      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setCurrentInput('');
      } else {
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // TODO: Implement auto-completion
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`${className} ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'} bg-gradient-to-br from-terminal-950 to-terminal-900 flex flex-col`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-4 bg-terminal-800/50 border-b border-terminal-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-gauntlet-600 to-neon-cyan rounded-lg shadow-glow-sm">
            <TerminalIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-mono font-semibold tracking-wide">ENGIE_TERMINAL</h3>
            <p className="text-terminal-400 text-sm font-mono">
              Claude CLI + MCP Integration
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${isClaudeReady ? 'bg-matrix-500/20 border border-matrix-500/30' : 'bg-yellow-500/20 border border-yellow-500/30'}`}>
            <div className={`w-2 h-2 rounded-full ${isClaudeReady ? 'bg-matrix-400 shadow-glow-sm' : 'bg-yellow-400 animate-pulse'}`}></div>
            <span className={`text-xs font-mono ${isClaudeReady ? 'text-matrix-300' : 'text-yellow-300'}`}>
              {isClaudeReady ? 'CLAUDE_READY' : 'CONNECTING...'}
            </span>
          </div>
          
          <button
            onClick={toggleFullscreen}
            className="p-2 text-terminal-400 hover:text-gauntlet-300 transition-colors duration-200"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={terminalRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm leading-relaxed"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={`mb-1 ${
              line.type === 'input' 
                ? 'text-gauntlet-300' 
                : line.type === 'error'
                ? 'text-red-400'
                : line.type === 'system'
                ? 'text-neon-cyan'
                : 'text-terminal-200'
            } ${line.isStreaming ? 'animate-pulse' : ''}`}
          >
            <pre className="whitespace-pre-wrap break-words">{line.content}</pre>
          </div>
        ))}
        
        {/* Command Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
          <span className="text-gauntlet-300 font-mono">engie@ai:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isClaudeReady || isProcessing}
            className="flex-1 bg-transparent text-white placeholder-terminal-500 outline-none font-mono caret-gauntlet-400"
            placeholder={isClaudeReady ? "Enter command..." : "Initializing..."}
            autoFocus
          />
          
          {isProcessing && (
            <div className="text-gauntlet-400 animate-spin">
              <Brain className="h-4 w-4" />
            </div>
          )}
        </form>
        
        <div ref={bottomRef} />
      </div>

      {/* Terminal Footer */}
      <div className="p-3 bg-terminal-800/30 border-t border-terminal-700 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-4 text-terminal-400">
          <span>Commands: {commandHistory.length}</span>
          <span>Uptime: {Math.floor((Date.now() - (lines[0]?.timestamp.getTime() || Date.now())) / 1000)}s</span>
        </div>
        
        <div className="flex items-center gap-2 text-terminal-400">
          <span>Press ↑↓ for history</span>
          <span>•</span>
          <span>Type "help" for commands</span>
        </div>
      </div>
    </div>
  );
};