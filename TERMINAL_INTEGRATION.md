# Terminal Integration with Claude CLI

This document explains the new terminal integration feature in the Engie macOS app, which provides direct access to the user's terminal with intelligent Claude CLI integration and API key fallback.

## 🎯 Overview

The terminal integration allows users to:
- Execute terminal commands directly from within the Engie app
- Use Claude CLI for AI-powered assistance
- Automatically fall back to OpenAI API if Claude CLI is unavailable
- Install and configure Claude CLI automatically
- Access all standard macOS terminal functionality

## 🚀 Features

### ✅ Core Terminal Access
- **Full Terminal Integration**: Direct access to the user's macOS terminal
- **Command Execution**: Run any terminal command (ls, git, npm, etc.)
- **Real-time Output**: See command output and errors in real-time
- **Working Directory**: Maintains proper working directory context

### 🤖 AI Integration
- **Claude CLI**: Automatic installation and configuration
- **Smart Fallback**: Falls back to OpenAI API if Claude CLI fails
- **API Key Detection**: Automatically detects available API keys
- **Intelligent Responses**: Context-aware AI assistance

### 🛠️ Setup & Configuration
- **Auto-Installation**: Automatically installs Claude CLI if not present
- **API Key Management**: Uses environment variables or stored keys
- **Status Monitoring**: Real-time status of CLI tools and API availability

## 📱 How to Use

### Opening the Terminal
1. Look for the 🖥️ button in the top-right system status area
2. Click the button to open the terminal overlay
3. The terminal will initialize and check Claude CLI status

### Available Commands

#### AI Commands
```bash
# Chat with Claude AI
claude "Explain this code: console.log('hello')"

# Smart AI response with fallback
ai "Help me debug this error"
```

#### System Commands
```bash
# Show help
help

# Clear terminal
clear

# Show system status
status

# Install/reinstall Claude CLI
install-claude
```

#### Regular Terminal Commands
```bash
# Any standard terminal command works
ls -la
git status
npm install
cd /path/to/project
```

### Example Usage

```bash
# Check system status
$ status
System Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Claude CLI: ✅ v1.0.0
🔑 API Keys: ✅ Anthropic | ❌ OpenAI
💻 Terminal: ✅ Connected to macOS system
🖥️  Working Directory: /Users/username/project

# Ask Claude for help
$ claude "How do I fix a merge conflict in git?"
🤖 Claude (claude-3-haiku):

To fix a merge conflict in git, follow these steps:

1. First, identify the conflicted files:
   git status

2. Open the conflicted files and look for conflict markers:
   <<<<<<< HEAD
   (your changes)
   =======
   (incoming changes)
   >>>>>>> branch-name

3. Edit the file to resolve conflicts by:
   - Choosing one version
   - Combining both versions
   - Writing entirely new content

4. Remove the conflict markers
5. Stage the resolved files:
   git add filename

6. Complete the merge:
   git commit

# Run regular commands
$ git status
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

## 🔧 Technical Implementation

### Architecture
```
┌─────────────────────────────────────────┐
│ Engie App (Renderer Process)            │
│ ┌─────────────────────────────────────┐ │
│ │ Terminal Component                  │ │
│ │ - Command input/output              │ │
│ │ - AI integration                    │ │
│ │ - Status monitoring                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    │ IPC
┌─────────────────────────────────────────┐
│ Electron Main Process                   │
│ ┌─────────────────────────────────────┐ │
│ │ Terminal Handlers                   │ │
│ │ - Command execution                 │ │
│ │ - Claude CLI management             │ │
│ │ - API key handling                  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│ macOS System                            │
│ ┌─────────────┐ ┌─────────────────────┐ │
│ │ Terminal    │ │ Claude CLI          │ │
│ │ Commands    │ │ - Anthropic API     │ │
│ │             │ │ - OpenAI Fallback   │ │
│ └─────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────┘
```

### API Endpoints

#### Main Process IPC Handlers
- `terminal:execute-command` - Execute terminal commands
- `terminal:setup-claude-cli` - Install/check Claude CLI
- `terminal:configure-claude-cli` - Configure API keys
- `terminal:execute-claude-command` - AI command with fallback
- `terminal:get-available-api-keys` - Check API key availability

#### Preload API
```typescript
window.electronAPI.terminal = {
  executeCommand: (command, options) => Promise<TerminalResult>,
  setupClaudeCLI: () => Promise<InstallResult>,
  configureClaudeCLI: (apiKey) => Promise<ConfigResult>,
  executeClaudeCommand: (prompt, options) => Promise<AIResult>,
  getAvailableApiKeys: () => Promise<KeyStatus>
}
```

## 🔑 API Key Configuration

### Environment Variables
Set these in your environment or `.env` file:
```bash
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
```

### Priority Order
1. **Claude CLI** (if available and Anthropic key present)
2. **OpenAI API** (if OpenAI key available)
3. **Fallback message** (with helpful guidance)

## 🚨 Error Handling

### Command Failures
- **Syntax errors**: Display stderr output
- **Permission issues**: Show clear error messages
- **Network failures**: Automatic fallback to alternative APIs

### AI Service Failures
- **Claude CLI unavailable**: Auto-install or fallback to OpenAI
- **API key missing**: Display configuration instructions
- **Rate limits**: Show appropriate error messages

## 🔒 Security Considerations

### API Key Safety
- API keys are passed via environment variables
- No keys stored in renderer process
- Secure IPC communication between processes

### Command Execution
- Commands run with user permissions
- No elevation of privileges
- Timeout protection (30 seconds)

## 🎨 UI/UX Features

### Visual Design
- **iTerm-inspired styling**: Familiar terminal aesthetics
- **Real-time feedback**: Loading indicators and status badges
- **Syntax highlighting**: Different colors for command types
- **Responsive layout**: Adapts to different screen sizes

### Keyboard Shortcuts
- **Enter**: Execute command
- **Ctrl+C**: Cancel execution (if supported)
- **Escape**: Close terminal overlay

## 🧪 Testing

Run the test suite to verify functionality:
```bash
node test-terminal.js
```

This will check:
- Basic terminal command execution
- System integration
- npm availability (for Claude CLI)
- curl availability (for API fallback)
- Environment variable detection

## 📚 Future Enhancements

### Planned Features
- **Command history**: Navigate previous commands with arrow keys
- **Tab completion**: Auto-complete file paths and commands
- **Multiple terminals**: Support for multiple terminal sessions
- **Custom themes**: User-configurable color schemes
- **Session persistence**: Remember terminal state between app launches

### Integration Opportunities
- **TaskMaster integration**: Execute task-related commands
- **Git workflow**: Enhanced git command assistance
- **Project management**: Context-aware project commands
- **Code analysis**: AI-powered code review from terminal

## 🐛 Troubleshooting

### Common Issues

**Terminal won't open**
- Check if the app has necessary permissions
- Verify Node.js and npm are installed

**Claude CLI installation fails**
- Ensure internet connection
- Check npm permissions
- Try manual installation: `npm install -g @anthropic-ai/claude-cli`

**AI commands not working**
- Verify API keys are set correctly
- Check network connectivity
- Ensure API quotas aren't exceeded

**Commands execute but no output**
- Some commands may not produce stdout
- Check for stderr output
- Try with verbose flags

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=engie:terminal
```

## 📝 Contributing

When contributing to terminal functionality:
1. Test on actual macOS systems
2. Verify Claude CLI integration
3. Test API fallback scenarios
4. Update documentation for new features
5. Add appropriate error handling

---

**Built with ❤️ for the Engie macOS app**