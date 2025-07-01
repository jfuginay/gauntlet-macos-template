import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { app } from 'electron';

const execAsync = promisify(exec);

interface ClaudeCliStatus {
  installed: boolean;
  version?: string;
  path?: string;
  mcpConfigured: boolean;
  lastUpdateCheck?: Date;
}

interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  taskUpdated?: boolean;
}

export class ClaudeCliManager {
  private readonly CLAUDE_CLI_PATH = '/usr/local/bin/claude';
  private readonly UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly ENGIE_CONFIG_DIR = path.join(os.homedir(), '.engie-ai');
  private readonly MCP_CONFIG_PATH = path.join(this.ENGIE_CONFIG_DIR, 'claude-mcp.json');
  
  private status: ClaudeCliStatus = {
    installed: false,
    mcpConfigured: false
  };

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.ensureConfigDir();
      await this.checkInstallation();
      await this.checkForUpdates();
      await this.configureMcp();
    } catch (error) {
      console.error('Failed to initialize Claude CLI manager:', error);
    }
  }

  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.mkdir(this.ENGIE_CONFIG_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create config directory:', error);
    }
  }

  private async checkInstallation(): Promise<void> {
    try {
      const { stdout } = await execAsync('claude --version');
      const version = stdout.trim();
      
      this.status = {
        ...this.status,
        installed: true,
        version,
        path: this.CLAUDE_CLI_PATH
      };
      
      console.log(`✅ Claude CLI found: ${version}`);
    } catch (error) {
      console.log('🔧 Claude CLI not found, initiating installation...');
      await this.installClaudeCli();
    }
  }

  private async installClaudeCli(): Promise<void> {
    try {
      console.log('📦 Installing Claude CLI...');
      
      // Install Claude CLI using the official installer
      const installCommand = 'curl -fsSL https://api.claude.ai/cli/install | sh';
      
      await execAsync(installCommand);
      
      // Verify installation
      const { stdout } = await execAsync('claude --version');
      const version = stdout.trim();
      
      this.status = {
        ...this.status,
        installed: true,
        version,
        path: this.CLAUDE_CLI_PATH
      };
      
      console.log(`✅ Claude CLI installed successfully: ${version}`);
    } catch (error) {
      console.error('❌ Failed to install Claude CLI:', error);
      throw new Error('Claude CLI installation failed');
    }
  }

  private async checkForUpdates(): Promise<void> {
    try {
      const now = new Date();
      
      // Check if we need to update (every 24 hours)
      if (this.status.lastUpdateCheck) {
        const timeSinceLastCheck = now.getTime() - this.status.lastUpdateCheck.getTime();
        if (timeSinceLastCheck < this.UPDATE_CHECK_INTERVAL) {
          return;
        }
      }

      if (!this.status.installed) return;

      console.log('🔍 Checking for Claude CLI updates...');
      
      // Check for updates using Claude CLI's built-in update command
      try {
        await execAsync('claude update --check-only');
        console.log('✅ Claude CLI is up to date');
      } catch (error) {
        // If update check fails, try to update
        console.log('🔄 Updating Claude CLI...');
        await execAsync('claude update');
        
        // Get new version
        const { stdout } = await execAsync('claude --version');
        this.status.version = stdout.trim();
        console.log(`✅ Claude CLI updated to: ${this.status.version}`);
      }
      
      this.status.lastUpdateCheck = now;
    } catch (error) {
      console.warn('⚠️ Failed to check/update Claude CLI:', error);
    }
  }

  private async configureMcp(): Promise<void> {
    try {
      // Create MCP configuration for Task Master integration
      const mcpConfig = {
        mcpServers: {
          "task-master-ai": {
            command: "npx",
            args: ["-y", "--package=task-master-ai", "task-master-ai"],
            env: {
              // Pass through environment variables for API keys
              ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
              PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
              OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
              PROJECT_ROOT: app.getAppPath()
            }
          }
        }
      };

      await fs.writeFile(this.MCP_CONFIG_PATH, JSON.stringify(mcpConfig, null, 2));
      this.status.mcpConfigured = true;
      
      console.log('✅ MCP configuration created for Claude CLI');
    } catch (error) {
      console.error('❌ Failed to configure MCP:', error);
    }
  }

  public async executeCommand(command: string): Promise<CommandResult> {
    if (!this.status.installed) {
      return {
        success: false,
        error: 'Claude CLI is not installed'
      };
    }

    try {
      // Prepare the command with MCP configuration
      const claudeArgs = [
        '--mcp-config',
        this.MCP_CONFIG_PATH,
        command
      ];

      console.log(`🚀 Executing Claude CLI: claude ${claudeArgs.join(' ')}`);

      // Execute Claude CLI command
      const { stdout, stderr } = await execAsync(`claude ${claudeArgs.join(' ')}`);
      
      // Check if the command involved task management
      const taskUpdated = command.toLowerCase().includes('task') || 
                         command.toLowerCase().includes('project') ||
                         stdout.toLowerCase().includes('task');

      return {
        success: true,
        output: stdout || stderr,
        taskUpdated
      };
    } catch (error) {
      console.error('❌ Claude CLI command failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        output: error instanceof Error && 'stdout' in error ? (error as any).stdout : undefined
      };
    }
  }

  public async executeInteractiveCommand(command: string): Promise<{ process: any; success: boolean; error?: string }> {
    if (!this.status.installed) {
      return {
        process: null,
        success: false,
        error: 'Claude CLI is not installed'
      };
    }

    try {
      const claudeProcess = spawn('claude', [
        '--mcp-config',
        this.MCP_CONFIG_PATH,
        command
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          FORCE_COLOR: '1' // Enable colored output
        }
      });

      return {
        process: claudeProcess,
        success: true
      };
    } catch (error) {
      return {
        process: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start interactive command'
      };
    }
  }

  public getStatus(): ClaudeCliStatus {
    return { ...this.status };
  }

  public async updateMcpConfig(apiKeys: Record<string, string>): Promise<void> {
    try {
      const mcpConfig = {
        mcpServers: {
          "task-master-ai": {
            command: "npx",
            args: ["-y", "--package=task-master-ai", "task-master-ai"],
            env: {
              ...apiKeys,
              PROJECT_ROOT: app.getAppPath()
            }
          }
        }
      };

      await fs.writeFile(this.MCP_CONFIG_PATH, JSON.stringify(mcpConfig, null, 2));
      console.log('✅ MCP configuration updated with new API keys');
    } catch (error) {
      console.error('❌ Failed to update MCP configuration:', error);
      throw error;
    }
  }

  public async performMaintenanceCheck(): Promise<void> {
    try {
      await this.checkForUpdates();
      
      // Verify MCP configuration is still valid
      try {
        await fs.access(this.MCP_CONFIG_PATH);
      } catch {
        await this.configureMcp();
      }
    } catch (error) {
      console.error('❌ Maintenance check failed:', error);
    }
  }

  // Test Claude CLI connection and MCP integration
  public async testConnection(): Promise<{ success: boolean; details: string }> {
    try {
      if (!this.status.installed) {
        return {
          success: false,
          details: 'Claude CLI is not installed'
        };
      }

      // Test basic Claude CLI functionality
      const result = await this.executeCommand('--help');
      
      if (!result.success) {
        return {
          success: false,
          details: `Claude CLI test failed: ${result.error}`
        };
      }

      // Test MCP integration
      const mcpTest = await this.executeCommand('list mcp servers');
      
      return {
        success: true,
        details: `Claude CLI v${this.status.version} is working correctly. MCP servers: ${mcpTest.success ? 'Connected' : 'Not connected'}`
      };
    } catch (error) {
      return {
        success: false,
        details: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Singleton instance
export const claudeCliManager = new ClaudeCliManager();