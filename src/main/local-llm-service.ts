import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { ModelManager, ModelStatus } from './model-manager';

const execAsync = promisify(exec);

export interface LocalLLMStatus {
  installed: boolean;
  running: boolean;
  modelReady: boolean;
  currentModel?: string;
  modelStatus?: ModelStatus;
  error?: string;
}

export interface LocalLLMResponse {
  success: boolean;
  data?: string;
  error?: string;
}

// Local LLM Service for offline conversational AI
export class LocalLLMService {
  private static instance: LocalLLMService;
  private modelManager: ModelManager;
  private isInitialized = false;
  private isInitializing = false;
  private progressCallback?: (progress: number, status: string) => void;

  private constructor() {
    this.modelManager = new ModelManager();
  }

  static getInstance(): LocalLLMService {
    if (!LocalLLMService.instance) {
      LocalLLMService.instance = new LocalLLMService();
    }
    return LocalLLMService.instance;
  }

  setProgressCallback(callback: (progress: number, status: string) => void) {
    this.progressCallback = callback;
  }

  async initialize(): Promise<LocalLLMStatus> {
    // Prevent multiple simultaneous initializations
    if (this.isInitialized) {
      console.log('Local LLM Service already initialized, returning cached status');
      return this.getStatus();
    }
    
    if (this.isInitializing) {
      console.log('Local LLM Service initialization already in progress...');
      // Wait for current initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.getStatus();
    }

    try {
      this.isInitializing = true;
      console.log('Initializing Local LLM Service...');
      
      // Check if Ollama is installed
      const installed = await this.modelManager.isOllamaInstalled();
      if (!installed) {
        return {
          installed: false,
          running: false,
          modelReady: false,
          error: 'Ollama not installed'
        };
      }

      // Check if Ollama is running
      const running = await this.modelManager.isOllamaRunning();
      if (!running) {
        console.log('Ollama not running, attempting to start...');
        // Try to start Ollama service
        try {
          await execAsync('brew services start ollama');
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for startup
        } catch (error) {
          console.warn('Could not start Ollama service automatically:', error);
        }
      }

      // Ensure a model is available (download if needed)
      console.log('Ensuring model availability...');
      const modelReady = await this.modelManager.ensureModelAvailable((progress, status) => {
        console.log(`Model download progress: ${progress}% - ${status}`);
        this.progressCallback?.(progress, status);
      });

      const modelStatus = await this.modelManager.getStatus();
      const currentModel = await this.modelManager.getOptimalModel();

      this.isInitialized = true;
      this.isInitializing = false;

      return {
        installed,
        running: await this.modelManager.isOllamaRunning(), // Re-check after potential startup
        modelReady,
        currentModel: currentModel || undefined,
        modelStatus
      };
    } catch (error) {
      console.error('Error initializing Local LLM Service:', error);
      this.isInitializing = false; // Reset flag on error
      return {
        installed: false,
        running: false,
        modelReady: false,
        error: error instanceof Error ? error.message : 'Unknown initialization error'
      };
    }
  }

  async getStatus(): Promise<LocalLLMStatus> {
    try {
      const installed = await this.modelManager.isOllamaInstalled();
      const running = await this.modelManager.isOllamaRunning();
      const modelStatus = await this.modelManager.getStatus();
      const currentModel = await this.modelManager.getOptimalModel();

      return {
        installed,
        running,
        modelReady: modelStatus.installed,
        currentModel: currentModel || undefined,
        modelStatus
      };
    } catch (error) {
      console.error('Error getting Local LLM status:', error);
      return {
        installed: false,
        running: false,
        modelReady: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async query(prompt: string): Promise<LocalLLMResponse> {
    try {
      if (!this.isInitialized) {
        console.log('LLM not initialized, initializing now...');
        const status = await this.initialize();
        if (!status.modelReady) {
          return {
            success: false,
            error: 'Local LLM not ready: ' + (status.error || 'Model not available')
          };
        }
      }

      const optimalModel = await this.modelManager.getOptimalModel();
      if (!optimalModel) {
        return {
          success: false,
          error: 'No local models available'
        };
      }

      console.log(`Querying local LLM (${optimalModel}): ${prompt}`);

      // Use the optimal model for the query
      const { stdout, stderr } = await execAsync(`ollama run ${optimalModel} "${prompt.replace(/"/g, '\\"')}"`);
      
      if (stderr) {
        console.warn('Local LLM stderr:', stderr);
      }

      const response = stdout.trim();
      if (!response) {
        return {
          success: false,
          error: 'Empty response from local LLM'
        };
      }

      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error querying local LLM:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Query failed'
      };
    }
  }

  async downloadModel(modelName: string): Promise<boolean> {
    return this.modelManager.downloadModel(modelName);
  }

  getRecommendedModels() {
    return this.modelManager.getRecommendedModels();
  }

  async getModelStatus(): Promise<ModelStatus> {
    return this.modelManager.getStatus();
  }

  // Cleanup
  cleanup(): void {
    // Cleanup logic if needed
  }
}

export const localLLMService = LocalLLMService.getInstance(); 