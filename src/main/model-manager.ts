import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ModelInfo {
  name: string;
  size: string;
  description: string;
  downloadUrl?: string;
}

export interface ModelStatus {
  installed: boolean;
  downloading: boolean;
  available: ModelInfo[];
  current?: string;
  downloadProgress?: number;
}

export class ModelManager {
  private downloadInProgress = false;
  private progressCallback?: (progress: number, status: string) => void;

  // Recommended models for Engie (ordered by preference)
  private readonly RECOMMENDED_MODELS: ModelInfo[] = [
    {
      name: 'llama3.2:1b',
      size: '1.3GB',
      description: 'Fast, efficient model perfect for desktop AI assistant'
    },
    {
      name: 'phi3:latest',
      size: '2.2GB', 
      description: 'High-quality Microsoft model for conversational AI'
    },
    {
      name: 'gemma2:2b',
      size: '1.6GB',
      description: 'Google model optimized for chat applications'
    }
  ];

  async getStatus(): Promise<ModelStatus> {
    try {
      const { stdout } = await execAsync('ollama list');
      const lines = stdout.trim().split('\n').slice(1); // Skip header
      
      const available: ModelInfo[] = [];
      let current: string | undefined;

      for (const line of lines) {
        if (line.trim()) {
          const parts = line.split(/\s+/);
          const name = parts[0];
          const size = parts[2] || 'Unknown';
          
          available.push({
            name,
            size,
            description: `Local model: ${name}`
          });

          // Use the first available model as current
          if (!current) {
            current = name;
          }
        }
      }

      return {
        installed: available.length > 0,
        downloading: this.downloadInProgress,
        available,
        current
      };
    } catch (error) {
      console.error('Error getting model status:', error);
      return {
        installed: false,
        downloading: this.downloadInProgress,
        available: []
      };
    }
  }

  async ensureModelAvailable(progressCallback?: (progress: number, status: string) => void): Promise<boolean> {
    this.progressCallback = progressCallback;
    
    const status = await this.getStatus();
    if (status.installed) {
      this.progressCallback?.(100, `Model ready: ${status.current}`);
      return true;
    }

    // Prevent multiple simultaneous downloads
    if (this.downloadInProgress) {
      console.log('Model download already in progress, waiting...');
      // Wait for current download to complete
      while (this.downloadInProgress) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      // Re-check status after download completes
      const newStatus = await this.getStatus();
      return newStatus.installed;
    }

    // No models available, download the best recommended one
    const modelToDownload = this.RECOMMENDED_MODELS[0]; // llama3.2:1b
    this.progressCallback?.(0, `Downloading ${modelToDownload.name} (${modelToDownload.size})...`);
    
    return this.downloadModel(modelToDownload.name);
  }

  async downloadModel(modelName: string): Promise<boolean> {
    if (this.downloadInProgress) {
      console.log('Download already in progress');
      return false;
    }

    try {
      this.downloadInProgress = true;
      this.progressCallback?.(10, `Starting download of ${modelName}...`);

      // Use spawn for better progress tracking
      const { spawn } = require('child_process');
      const process = spawn('ollama', ['pull', modelName]);
      
      let progressPercent = 10;
      
      process.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log('Ollama output:', output);
        
        // Parse progress from ollama output
        if (output.includes('pulling')) {
          progressPercent = Math.min(progressPercent + 5, 90);
          this.progressCallback?.(progressPercent, `Downloading ${modelName}...`);
        }
      });

      process.stderr.on('data', (data: Buffer) => {
        console.error('Ollama error:', data.toString());
      });

      return new Promise<boolean>((resolve) => {
        process.on('close', (code: number) => {
          this.downloadInProgress = false;
          
          if (code === 0) {
            this.progressCallback?.(100, `Successfully downloaded ${modelName}!`);
            console.log(`Successfully downloaded model: ${modelName}`);
            resolve(true);
          } else {
            this.progressCallback?.(0, `Failed to download ${modelName}`);
            console.error(`Failed to download model: ${modelName}, exit code: ${code}`);
            resolve(false);
          }
        });
      });
    } catch (error) {
      this.downloadInProgress = false;
      console.error('Error downloading model:', error);
      this.progressCallback?.(0, `Error downloading model: ${error}`);
      return false;
    }
  }

  async getOptimalModel(): Promise<string | null> {
    const status = await this.getStatus();
    
    if (!status.installed) {
      return null;
    }

    // Return the best available model based on our preferences
    for (const recommended of this.RECOMMENDED_MODELS) {
      const found = status.available.find(model => model.name.includes(recommended.name.split(':')[0]));
      if (found) {
        return found.name;
      }
    }

    // Fallback to first available model
    return status.available[0]?.name || null;
  }

  async isOllamaInstalled(): Promise<boolean> {
    try {
      await execAsync('which ollama');
      return true;
    } catch {
      return false;
    }
  }

  async isOllamaRunning(): Promise<boolean> {
    try {
      await execAsync('ollama list');
      return true;
    } catch {
      return false;
    }
  }

  getRecommendedModels(): ModelInfo[] {
    return this.RECOMMENDED_MODELS;
  }
} 