import Docker from 'dockerode';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn, ChildProcess } from 'child_process';
import fetch from 'node-fetch';

export interface LocalLLMConfig {
  enabled: boolean;
  containerName: string;
  port: number;
  useGPU: boolean;
  fallbackModel: string;
  models: string[];
}

export interface ModelInfo {
  name: string;
  size: string;
  modified: string;
  digest: string;
  details?: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export class LocalLLMService {
  private docker: Docker;
  private config: LocalLLMConfig;
  private containerProcess: ChildProcess | null = null;
  private isRunning = false;

  constructor() {
    this.docker = new Docker();
    this.config = {
      enabled: false,
      containerName: 'engie-ollama',
      port: 11434,
      useGPU: false,
      fallbackModel: 'phi3:3.8b-mini-4k-instruct-q4_K_M',
      models: []
    };
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      const configPath = path.join(app.getPath('userData'), 'local-llm-config.json');
      if (await fs.pathExists(configPath)) {
        const savedConfig = await fs.readJson(configPath);
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      console.error('Failed to load local LLM config:', error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      const configPath = path.join(app.getPath('userData'), 'local-llm-config.json');
      await fs.writeJson(configPath, this.config, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save local LLM config:', error);
    }
  }

  public getConfig(): LocalLLMConfig {
    return { ...this.config };
  }

  public async updateConfig(newConfig: Partial<LocalLLMConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
  }

  public async checkDockerAvailability(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      console.error('Docker not available:', error);
      return false;
    }
  }

  public async checkGPUSupport(): Promise<boolean> {
    try {
      const info = await this.docker.info();
      return info.Runtimes && info.Runtimes.nvidia !== undefined;
    } catch (error) {
      console.error('Failed to check GPU support:', error);
      return false;
    }
  }

  public async setupContainer(): Promise<boolean> {
    try {
      const resourcesPath = path.join(process.resourcesPath || __dirname, '../../resources');
      const dockerPath = path.join(resourcesPath, 'docker');

      // Check if container already exists
      const containers = await this.docker.listContainers({ all: true });
      const existingContainer = containers.find((c: any) => 
        c.Names.some((name: string) => name.includes(this.config.containerName))
      );

      if (existingContainer) {
        console.log('Container already exists, removing old one...');
        const container = this.docker.getContainer(existingContainer.Id);
        await container.remove({ force: true });
      }

      // Determine which profile to use
      const profile = this.config.useGPU ? 'gpu' : 'cpu';
      const containerName = this.config.useGPU ? 'engie-ollama' : 'engie-ollama-cpu';

      // Start container using docker-compose
      return new Promise((resolve, reject) => {
        const compose = spawn('docker-compose', [
          '-f', path.join(dockerPath, 'docker-compose.yml'),
          '--profile', profile,
          'up', '-d', containerName
        ], {
          cwd: dockerPath,
          stdio: 'pipe'
        });

        let output = '';
        compose.stdout?.on('data', (data) => {
          output += data.toString();
        });

        compose.stderr?.on('data', (data) => {
          output += data.toString();
        });

        compose.on('close', (code) => {
          if (code === 0) {
            this.isRunning = true;
            console.log('Container started successfully');
            resolve(true);
          } else {
            console.error('Failed to start container:', output);
            reject(new Error(`Docker compose failed with code ${code}`));
          }
        });
      });
    } catch (error) {
      console.error('Failed to setup container:', error);
      return false;
    }
  }

  public async stopContainer(): Promise<boolean> {
    try {
      const containers = await this.docker.listContainers();
      const runningContainer = containers.find((c: any) => 
        c.Names.some((name: string) => name.includes(this.config.containerName))
      );

      if (runningContainer) {
        const container = this.docker.getContainer(runningContainer.Id);
        await container.stop();
        console.log('Container stopped successfully');
      }

      this.isRunning = false;
      return true;
    } catch (error) {
      console.error('Failed to stop container:', error);
      return false;
    }
  }

  public async isContainerRunning(): Promise<boolean> {
    try {
      const containers = await this.docker.listContainers();
      const runningContainer = containers.find((c: any) => 
        c.Names.some((name: string) => name.includes(this.config.containerName))
      );
      this.isRunning = !!runningContainer;
      return this.isRunning;
    } catch (error) {
      console.error('Failed to check container status:', error);
      return false;
    }
  }

  public async waitForOllamaReady(timeoutMs = 60000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`http://localhost:${this.config.port}/api/tags`);
        if (response.ok) {
          console.log('Ollama is ready!');
          return true;
        }
      } catch (error) {
        // Ollama not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.error('Timeout waiting for Ollama to be ready');
    return false;
  }

  public async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`http://localhost:${this.config.port}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as { models: ModelInfo[] };
      this.config.models = data.models.map(m => m.name);
      await this.saveConfig();
      
      return data.models;
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }

  public async pullModel(modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.config.port}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Stream the response to get progress updates
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const progress = JSON.parse(line);
              console.log('Pull progress:', progress);
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to pull model:', error);
      return false;
    }
  }

  public async removeModel(modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.config.port}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to remove model:', error);
      return false;
    }
  }

  public async generateResponse(model: string, prompt: string): Promise<string> {
    try {
      const response = await fetch(`http://localhost:${this.config.port}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as { response: string };
      return data.response;
    } catch (error) {
      console.error('Failed to generate response:', error);
      throw error;
    }
  }

  public async chatCompletion(model: string, messages: Array<{role: string, content: string}>): Promise<string> {
    try {
      const response = await fetch(`http://localhost:${this.config.port}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as { message: { content: string } };
      return data.message.content;
    } catch (error) {
      console.error('Failed to get chat completion:', error);
      throw error;
    }
  }

  public async ensureFallbackModel(): Promise<boolean> {
    try {
      const models = await this.listModels();
      const hasFallback = models.some(m => m.name.includes(this.config.fallbackModel));
      
      if (!hasFallback) {
        console.log('Fallback model not found, pulling...');
        return await this.pullModel(this.config.fallbackModel);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to ensure fallback model:', error);
      return false;
    }
  }

  public async getRecommendedModels(): Promise<Array<{name: string, description: string, size: string}>> {
    return [
      {
        name: 'phi3:3.8b-mini-4k-instruct-q4_K_M',
        description: 'Microsoft Phi-3 Mini - Fast and efficient for general tasks',
        size: '2.2GB'
      },
      {
        name: 'llama3.2:3b-instruct-q4_K_M',
        description: 'Meta Llama 3.2 3B - Good balance of performance and size',
        size: '2.0GB'
      },
      {
        name: 'qwen2.5:3b-instruct-q4_K_M',
        description: 'Qwen2.5 3B - Excellent for coding and reasoning',
        size: '1.9GB'
      },
      {
        name: 'gemma2:2b-instruct-q4_K_M',
        description: 'Google Gemma 2 2B - Ultra-lightweight but capable',
        size: '1.6GB'
      },
      {
        name: 'tinyllama:latest',
        description: 'TinyLlama - Ultra-small emergency fallback',
        size: '636MB'
      }
    ];
  }
}