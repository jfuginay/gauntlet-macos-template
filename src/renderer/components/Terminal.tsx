import React, { useState, useRef, useEffect } from 'react';

interface TerminalCommand {
  id: number;
  command: string;
  output: string;
  error?: string;
  timestamp: Date;
  type: 'command' | 'claude' | 'system';
}

interface TerminalProps {
  onClose?: (() => void) | undefined;
  className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ onClose, className = '' }) => {
  const [commands, setCommands] = useState<TerminalCommand[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [claudeCliStatus, setClaudeCliStatus] = useState<{
    installed: boolean;
    configured: boolean;
    version?: string;
  }>({ installed: false, configured: false });
  const [apiKeys, setApiKeys] = useState<{
    anthropic: boolean;
    openai: boolean;
    hasAny: boolean;
  }>({ anthropic: false, openai: false, hasAny: false });
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize terminal and check Claude CLI status
    initializeTerminal();
    checkApiKeys();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new commands are added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commands]);

  const initializeTerminal = async () => {
    // Add welcome message
    const welcomeCommand: TerminalCommand = {
      id: Date.now(),
      command: 'system:init',
      output: `🖥️  Engie Terminal - macOS Integration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Connected to system terminal
🔍 Checking Claude CLI status...

Type 'help' for available commands
Type 'claude <message>' to use AI assistant
Type regular terminal commands to execute directly

`,
      timestamp: new Date(),
      type: 'system'
    };
    
    setCommands([welcomeCommand]);

    // Check Claude CLI status
    try {
      const result = await window.electronAPI.terminal.setupClaudeCLI();
      if (result.success && result.installed) {
        setClaudeCliStatus({
          installed: true,
          configured: true,
          version: result.version
        });
        
        addSystemMessage(`✅ Claude CLI v${result.version} ready`);
      } else {
        setClaudeCliStatus({ installed: false, configured: false });
        addSystemMessage(`⚠️  Claude CLI not installed. Installing...`);
        
        // Auto-install Claude CLI
        await installClaudeCLI();
      }
    } catch (error) {
      addSystemMessage(`❌ Error checking Claude CLI: ${error}`);
    }
  };

  const checkApiKeys = async () => {
    try {
      const keys = await window.electronAPI.terminal.getAvailableApiKeys();
      setApiKeys(keys);
      
      if (keys.hasAny) {
        addSystemMessage(`🔑 API keys detected: ${keys.anthropic ? 'Anthropic' : ''}${keys.anthropic && keys.openai ? ', ' : ''}${keys.openai ? 'OpenAI' : ''}`);
      } else {
        addSystemMessage(`⚠️  No API keys found. Configure in Settings for AI features.`);
      }
    } catch (error) {
      console.error('Error checking API keys:', error);
    }
  };

  const installClaudeCLI = async () => {
    try {
      const result = await window.electronAPI.terminal.setupClaudeCLI();
      if (result.success) {
        setClaudeCliStatus({
          installed: true,
          configured: true,
          version: result.version
        });
        addSystemMessage(`✅ Claude CLI v${result.version} installed successfully`);
      } else {
        addSystemMessage(`❌ Failed to install Claude CLI: ${result.error}`);
      }
    } catch (error) {
      addSystemMessage(`❌ Installation error: ${error}`);
    }
  };

  const addSystemMessage = (message: string) => {
    const systemCommand: TerminalCommand = {
      id: Date.now(),
      command: 'system:message',
      output: message,
      timestamp: new Date(),
      type: 'system'
    };
    setCommands((prev: TerminalCommand[]) => [...prev, systemCommand]);
  };

  const executeCommand = async (input: string) => {
    if (!input.trim()) return;

    const command: TerminalCommand = {
      id: Date.now(),
      command: input,
      output: '',
      timestamp: new Date(),
      type: 'command'
    };

    setCommands((prev: TerminalCommand[]) => [...prev, command]);
    setCurrentInput('');
    setIsExecuting(true);

    try {
      // Handle special commands
      if (input.toLowerCase() === 'help') {
        command.output = `Available Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 AI Commands:
  claude <message>     - Chat with Claude AI
  ai <message>         - Smart AI response with fallback

🛠️  System Commands:
  help                 - Show this help
  clear               - Clear terminal
  status              - Show system status
  install-claude      - Install/reinstall Claude CLI

💻 Terminal Commands:
  Any standard terminal command (ls, pwd, git, npm, etc.)

Examples:
  claude "Explain this code: console.log('hello')"
  git status
  npm install
  ls -la
`;
        command.type = 'system';
      } else if (input.toLowerCase() === 'clear') {
        setCommands([]);
        setIsExecuting(false);
        return;
      } else if (input.toLowerCase() === 'status') {
        command.output = `System Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Claude CLI: ${claudeCliStatus.installed ? `✅ v${claudeCliStatus.version}` : '❌ Not installed'}
🔑 API Keys: ${apiKeys.anthropic ? '✅ Anthropic' : '❌ Anthropic'} | ${apiKeys.openai ? '✅ OpenAI' : '❌ OpenAI'}
💻 Terminal: ✅ Connected to macOS system
 🖥️  Working Directory: ${typeof process !== 'undefined' && process.cwd ? process.cwd() : '/'}
`;
        command.type = 'system';
      } else if (input.toLowerCase() === 'install-claude') {
        await installClaudeCLI();
        setIsExecuting(false);
        return;
      } else if (input.toLowerCase().startsWith('claude ')) {
        // Handle Claude AI command
        const prompt = input.substring(7); // Remove 'claude ' prefix
        command.type = 'claude';
        
        try {
                     const result = await window.electronAPI.terminal.executeClaudeCommand(prompt, {
             anthropicApiKey: typeof process !== 'undefined' ? process.env.ANTHROPIC_API_KEY : undefined,
             openaiApiKey: typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined
           });

          if (result.success) {
            command.output = `🤖 ${result.provider === 'claude-cli' ? 'Claude' : 'AI Assistant'} (${result.model}):

${result.response}`;
          } else {
            command.output = result.fallbackResponse || `❌ Error: ${result.error}`;
          }
        } catch (error) {
          command.output = `❌ AI command failed: ${error}`;
        }
      } else if (input.toLowerCase().startsWith('ai ')) {
        // Handle generic AI command with fallback
        const prompt = input.substring(3); // Remove 'ai ' prefix
        command.type = 'claude';
        
        try {
                     const result = await window.electronAPI.terminal.executeClaudeCommand(prompt, {
             anthropicApiKey: typeof process !== 'undefined' ? process.env.ANTHROPIC_API_KEY : undefined,
             openaiApiKey: typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined,
             model: 'gpt-3.5-turbo'
           });

          if (result.success) {
            command.output = `🤖 AI Response (${result.provider}):

${result.response}`;
          } else {
            command.output = result.fallbackResponse || `❌ Error: ${result.error}`;
          }
        } catch (error) {
          command.output = `❌ AI command failed: ${error}`;
        }
      } else {
        // Execute regular terminal command
        try {
                     const result = await window.electronAPI.terminal.executeCommand(input, {
             cwd: typeof process !== 'undefined' && process.cwd ? process.cwd() : undefined,
             shell: true
           });

          if (result.success) {
            command.output = result.stdout || '✅ Command completed successfully';
            if (result.stderr) {
              command.error = result.stderr;
            }
          } else {
            command.output = `❌ Command failed: ${result.error}`;
            command.error = result.stderr;
          }
        } catch (error) {
          command.output = `❌ Execution error: ${error}`;
        }
      }

      // Update the command with output
      setCommands(prev => 
        prev.map(cmd => 
          cmd.id === command.id 
            ? { ...cmd, output: command.output, error: command.error, type: command.type }
            : cmd
        )
      );
    } catch (error) {
      console.error('Command execution error:', error);
      command.output = `❌ Unexpected error: ${error}`;
      setCommands(prev => 
        prev.map(cmd => 
          cmd.id === command.id 
            ? { ...cmd, output: command.output }
            : cmd
        )
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isExecuting) {
      executeCommand(currentInput);
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getCommandIcon = (type: string) => {
    switch (type) {
      case 'claude': return '🤖';
      case 'system': return '⚙️';
      default: return '💻';
    }
  };

  return (
    <div className={`terminal-window ${className}`}>
      <div className="terminal-header">
        <div className="terminal-controls">
          <div className="control-button close" onClick={onClose}></div>
          <div className="control-button minimize"></div>
          <div className="control-button maximize"></div>
        </div>
        <div className="terminal-title">
          <span>🖥️ Engie Terminal</span>
          <span className="terminal-status">
            {claudeCliStatus.installed && (
              <span className="status-badge claude">Claude CLI</span>
            )}
            {apiKeys.hasAny && (
              <span className="status-badge api">API Ready</span>
            )}
          </span>
        </div>
      </div>

      <div className="terminal-content" ref={terminalRef}>
        {commands.map((cmd) => (
          <div key={cmd.id} className={`terminal-command ${cmd.type}`}>
            <div className="command-header">
              <span className="command-icon">{getCommandIcon(cmd.type)}</span>
              <span className="command-text">
                {cmd.type === 'system' ? '[SYSTEM]' : `$ ${cmd.command}`}
              </span>
              <span className="command-time">{formatTimestamp(cmd.timestamp)}</span>
            </div>
            {cmd.output && (
              <div className="command-output">
                {cmd.output.split('\n').map((line, index) => (
                  <div key={index} className="output-line">
                    {line}
                  </div>
                ))}
              </div>
            )}
            {cmd.error && (
              <div className="command-error">
                <span className="error-label">stderr:</span>
                {cmd.error.split('\n').map((line, index) => (
                  <div key={index} className="error-line">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {isExecuting && (
          <div className="terminal-command executing">
            <div className="command-header">
              <span className="command-icon">⏳</span>
              <span className="command-text">Executing...</span>
            </div>
            <div className="command-output">
              <div className="loading-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="terminal-input">
        <span className="prompt">$ </span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecuting}
          placeholder="Type a command or 'help' for assistance..."
          autoFocus
        />
      </div>
    </div>
  );
};

export default Terminal;