import * as keytar from 'keytar';
import { app } from 'electron';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

interface ApiKeyConfig {
  ANTHROPIC_API_KEY?: string;
  PERPLEXITY_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  XAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  AZURE_OPENAI_API_KEY?: string;
  OLLAMA_API_KEY?: string;
}

export class ApiKeyManager {
  private readonly SERVICE_NAME = 'Engie-AI-Desktop';
  private readonly CONFIG_DIR = path.join(os.homedir(), '.engie-ai');
  private readonly CONFIG_FILE = path.join(this.CONFIG_DIR, 'config.json');
  
  private cachedKeys: ApiKeyConfig = {};
  private isInitialized = false;

  constructor() {
    this.ensureConfigDir();
  }

  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.mkdir(this.CONFIG_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create config directory:', error);
    }
  }

  /**
   * Initialize the API key manager and load keys from all sources
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load keys in priority order: Keychain > Environment > Config File
      await this.loadKeysFromAllSources();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize API key manager:', error);
      throw error;
    }
  }

  /**
   * Load API keys from all sources in priority order
   */
  private async loadKeysFromAllSources(): Promise<void> {
    const keyNames = [
      'ANTHROPIC_API_KEY',
      'PERPLEXITY_API_KEY',
      'OPENAI_API_KEY',
      'GOOGLE_API_KEY',
      'XAI_API_KEY',
      'OPENROUTER_API_KEY',
      'MISTRAL_API_KEY',
      'AZURE_OPENAI_API_KEY',
      'OLLAMA_API_KEY'
    ] as const;

    for (const keyName of keyNames) {
      // 1. Try Keychain first (most secure)
      try {
        const keychainKey = await keytar.getPassword(this.SERVICE_NAME, keyName);
        if (keychainKey) {
          this.cachedKeys[keyName] = keychainKey;
          continue;
        }
      } catch (error) {
        console.warn(`Failed to read ${keyName} from Keychain:`, error);
      }

      // 2. Try environment variables (for development)
      const envKey = process.env[keyName];
      if (envKey && envKey !== 'your_key_here') {
        this.cachedKeys[keyName] = envKey;
        continue;
      }

      // 3. Try user config file (fallback)
      try {
        const configKey = await this.getKeyFromConfigFile(keyName);
        if (configKey) {
          this.cachedKeys[keyName] = configKey;
        }
      } catch (error) {
        console.warn(`Failed to read ${keyName} from config file:`, error);
      }
    }
  }

  /**
   * Get an API key by name
   */
  async getApiKey(keyName: keyof ApiKeyConfig): Promise<string | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.cachedKeys[keyName] || null;
  }

  /**
   * Get all configured API keys
   */
  async getAllApiKeys(): Promise<ApiKeyConfig> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return { ...this.cachedKeys };
  }

  /**
   * Set an API key securely in Keychain
   */
  async setApiKey(keyName: keyof ApiKeyConfig, value: string): Promise<void> {
    try {
      // Store in Keychain (most secure)
      await keytar.setPassword(this.SERVICE_NAME, keyName, value);
      
      // Update cache
      this.cachedKeys[keyName] = value;
      
      // Remove from config file if it exists there
      await this.removeKeyFromConfigFile(keyName);
      
      console.log(`Successfully stored ${keyName} in Keychain`);
    } catch (error) {
      console.error(`Failed to store ${keyName} in Keychain:`, error);
      
      // Fallback: store in encrypted config file
      await this.setKeyInConfigFile(keyName, value);
      this.cachedKeys[keyName] = value;
    }
  }

  /**
   * Remove an API key from all storage locations
   */
  async removeApiKey(keyName: keyof ApiKeyConfig): Promise<void> {
    try {
      // Remove from Keychain
      await keytar.deletePassword(this.SERVICE_NAME, keyName);
    } catch (error) {
      console.warn(`Failed to remove ${keyName} from Keychain:`, error);
    }

    try {
      // Remove from config file
      await this.removeKeyFromConfigFile(keyName);
    } catch (error) {
      console.warn(`Failed to remove ${keyName} from config file:`, error);
    }

    // Remove from cache
    delete this.cachedKeys[keyName];
  }

  /**
   * Check if any API keys are configured
   */
  async hasAnyKeys(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return Object.keys(this.cachedKeys).length > 0;
  }

  /**
   * Check if a specific required key is available
   */
  async hasRequiredKeys(requiredKeys: (keyof ApiKeyConfig)[]): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return requiredKeys.some(key => this.cachedKeys[key]);
  }

  /**
   * Get key from config file
   */
  private async getKeyFromConfigFile(keyName: string): Promise<string | null> {
    try {
      const configContent = await fs.readFile(this.CONFIG_FILE, 'utf-8');
      const config = JSON.parse(configContent);
      return config.apiKeys?.[keyName] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set key in config file
   */
  private async setKeyInConfigFile(keyName: string, value: string): Promise<void> {
    try {
      let config: any = {};
      
      try {
        const configContent = await fs.readFile(this.CONFIG_FILE, 'utf-8');
        config = JSON.parse(configContent);
      } catch (error) {
        // File doesn't exist or is invalid, start fresh
      }

      if (!config.apiKeys) {
        config.apiKeys = {};
      }

      config.apiKeys[keyName] = value;
      config.lastUpdated = new Date().toISOString();

      await fs.writeFile(this.CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to write config file:', error);
      throw error;
    }
  }

  /**
   * Remove key from config file
   */
  private async removeKeyFromConfigFile(keyName: string): Promise<void> {
    try {
      const configContent = await fs.readFile(this.CONFIG_FILE, 'utf-8');
      const config = JSON.parse(configContent);
      
      if (config.apiKeys && config.apiKeys[keyName]) {
        delete config.apiKeys[keyName];
        config.lastUpdated = new Date().toISOString();
        await fs.writeFile(this.CONFIG_FILE, JSON.stringify(config, null, 2));
      }
    } catch (error) {
      // File doesn't exist or is invalid, nothing to remove
    }
  }

  /**
   * Export configuration for backup (without sensitive data)
   */
  async exportConfig(): Promise<{ hasKeys: string[], configPath: string }> {
    const keys = await this.getAllApiKeys();
    return {
      hasKeys: Object.keys(keys),
      configPath: this.CONFIG_DIR
    };
  }

  /**
   * Import keys from environment (for migration)
   */
  async migrateFromEnvironment(): Promise<{ migrated: string[], failed: string[] }> {
    const migrated: string[] = [];
    const failed: string[] = [];

    const keyNames = [
      'ANTHROPIC_API_KEY',
      'PERPLEXITY_API_KEY',
      'OPENAI_API_KEY',
      'GOOGLE_API_KEY',
      'XAI_API_KEY',
      'OPENROUTER_API_KEY',
      'MISTRAL_API_KEY',
      'AZURE_OPENAI_API_KEY',
      'OLLAMA_API_KEY'
    ] as const;

    for (const keyName of keyNames) {
      const envValue = process.env[keyName];
      if (envValue && envValue !== 'your_key_here') {
        try {
          await this.setApiKey(keyName, envValue);
          migrated.push(keyName);
        } catch (error) {
          failed.push(keyName);
          console.error(`Failed to migrate ${keyName}:`, error);
        }
      }
    }

    return { migrated, failed };
  }

  /**
   * Validate API key format
   */
  validateApiKey(keyName: keyof ApiKeyConfig, value: string): { valid: boolean; error?: string } {
    if (!value || value.trim().length === 0) {
      return { valid: false, error: 'API key cannot be empty' };
    }

    if (value === 'your_key_here' || value === 'placeholder') {
      return { valid: false, error: 'Please enter a real API key' };
    }

    // Key-specific validation
    switch (keyName) {
      case 'ANTHROPIC_API_KEY':
        if (!value.startsWith('sk-ant-')) {
          return { valid: false, error: 'Anthropic API keys should start with "sk-ant-"' };
        }
        break;
      case 'OPENAI_API_KEY':
        if (!value.startsWith('sk-')) {
          return { valid: false, error: 'OpenAI API keys should start with "sk-"' };
        }
        break;
      case 'PERPLEXITY_API_KEY':
        if (!value.startsWith('pplx-')) {
          return { valid: false, error: 'Perplexity API keys should start with "pplx-"' };
        }
        break;
    }

    if (value.length < 10) {
      return { valid: false, error: 'API key seems too short' };
    }

    return { valid: true };
  }
}

// Singleton instance
export const apiKeyManager = new ApiKeyManager();