import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { ModelManager, ModelStatus } from './model-manager';
import { logCollector } from './log-collector';

const execAsync = promisify(exec);

// Helper function for fetch with timeout using AbortController
async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number }): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export interface LocalLLMStatus {
  installed: boolean;
  running: boolean;
  modelReady: boolean;
  currentModel?: string;
  modelStatus?: ModelStatus;
  error?: string;
  performance?: 'fast' | 'optimal' | 'slow';
  setupMethod?: 'native' | 'docker' | 'none';
}

export interface LocalLLMResponse {
  success: boolean;
  data?: string;
  error?: string;
  responseTime?: number;
}

export interface SetupOptions {
  preferDocker?: boolean;
  fastModel?: boolean;
  autoInstall?: boolean;
}

// Optimized Local LLM Service for fast offline AI
export class LocalLLMService {
  private static instance: LocalLLMService;
  private modelManager: ModelManager;
  private isInitialized = false;
  private isInitializing = false;
  private progressCallback?: (progress: number, status: string) => void;
  private ollamaApiUrl = 'http://127.0.0.1:11434';
  private currentModel: string | null = null;
  private modelPreloaded = false;

  // Performance-optimized model recommendations
  private readonly FAST_MODELS = [
    'phi3:latest',                      // Fastest, high quality
    'gemma2:2b',                        // Google's fast model
    'llama3.2:1b',                      // Ultra-fast, smaller
    'qwen2.5:1.5b'                      // New, very fast
  ];

  private readonly OPTIMAL_MODELS = [
    'llama3.1:8b',                      // Best quality/speed balance
    'phi3:14b',                         // Microsoft's best model
    'mistral:7b',                       // High quality
    'gemma2:9b'                         // Google's larger model
  ];

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

  // Auto-setup with intelligent detection and Docker option
  async autoSetup(options: SetupOptions = {}): Promise<LocalLLMStatus> {
    logCollector.logLLM('info', '🚀 Starting intelligent auto-setup for Local LLM...');
    this.progressCallback?.(10, 'Analyzing system capabilities...');

    try {
      // Only try Docker if explicitly preferred and available
      if (options.preferDocker) {
        logCollector.logLLM('info', '🐳 Docker preferred, checking availability...');
        if (await this.isDockerAvailable() && await this.isDockerRunning()) {
          logCollector.logLLM('info', '🐳 Docker available and running, attempting Docker setup...');
          try {
            const dockerSetup = await this.setupWithDocker(options);
            if (dockerSetup.running) {
              return dockerSetup;
            }
          } catch (dockerError) {
            logCollector.logLLM('warn', 'Docker setup failed, falling back to native', dockerError);
            this.progressCallback?.(30, 'Docker setup failed, trying native Ollama...');
          }
        } else {
          logCollector.logLLM('info', '🐳 Docker not available or not running, skipping to native setup');
          this.progressCallback?.(20, 'Docker not available, using native Ollama...');
        }
      } else {
        logCollector.logLLM('info', '🔧 Skipping Docker, using native Ollama setup');
        this.progressCallback?.(20, 'Using native Ollama setup...');
      }

      // Use native Ollama setup
      logCollector.logLLM('info', '🔧 Setting up native Ollama...');
      return await this.setupNativeOllama(options);
    } catch (error) {
      logCollector.logLLM('error', 'Auto-setup failed', error);
      return {
        installed: false,
        running: false,
        modelReady: false,
        error: `Auto-setup failed: ${error}`,
        setupMethod: 'none'
      };
    }
  }

  // Docker setup for optimal performance
  private async setupWithDocker(options: SetupOptions): Promise<LocalLLMStatus> {
    this.progressCallback?.(20, 'Setting up Docker container...');

    try {
      // Check if Ollama container is already running
      const { stdout: runningContainers } = await execAsync('docker ps --filter "name=engie-ollama" --format "{{.Names}}"');
      
      if (runningContainers.includes('engie-ollama')) {
        logCollector.logLLM('success', '✅ Ollama Docker container already running');
        this.progressCallback?.(60, 'Docker container found, checking models...');
      } else {
        // Start Ollama in Docker with GPU support if available
        logCollector.logLLM('info', '🐳 Starting Ollama Docker container...');
        this.progressCallback?.(30, 'Starting Ollama Docker container...');
        
        const hasGpu = await this.hasGpuSupport();
        const dockerCommand = hasGpu 
          ? 'docker run -d --gpus all -v ollama:/root/.ollama -p 11434:11434 --name engie-ollama ollama/ollama'
          : 'docker run -d -v ollama:/root/.ollama -p 11434:11434 --name engie-ollama ollama/ollama';
        
        await execAsync(dockerCommand);
        
        // Wait for container to be ready
        this.progressCallback?.(50, 'Waiting for Docker container to start...');
        await this.waitForOllamaReady();
      }

      // Download optimal model for Docker setup
      this.progressCallback?.(70, 'Setting up AI model...');
      const modelName = await this.selectOptimalModel(options.fastModel);
      const modelReady = await this.downloadAndPreloadModel(modelName);

      return {
        installed: true,
        running: true,
        modelReady,
        currentModel: modelName,
        performance: options.fastModel ? 'fast' : 'optimal',
        setupMethod: 'docker'
      };
    } catch (error) {
      console.error('Docker setup failed:', error);
      throw error;
    }
  }

  // Native Ollama setup
  private async setupNativeOllama(options: SetupOptions): Promise<LocalLLMStatus> {
    this.progressCallback?.(30, 'Checking Ollama installation...');

    try {
      // Check if Ollama is installed
      let installed = await this.modelManager.isOllamaInstalled();
      
      if (!installed && options.autoInstall) {
        logCollector.logLLM('info', '📦 Installing Ollama...');
        this.progressCallback?.(40, 'Installing Ollama...');
        await this.installOllama();
        installed = true;
      }

      if (!installed) {
        throw new Error('Ollama not installed. Please install Ollama or enable autoInstall option.');
      }

      // Start Ollama service
      this.progressCallback?.(60, 'Starting Ollama service...');
      await this.ensureOllamaRunning();

      // Select and download optimal model
      this.progressCallback?.(75, 'Setting up AI model...');
      const modelName = await this.selectOptimalModel(options.fastModel);
      const modelReady = await this.downloadAndPreloadModel(modelName);

      return {
        installed: true,
        running: true,
        modelReady,
        currentModel: modelName,
        performance: options.fastModel ? 'fast' : 'optimal',
        setupMethod: 'native'
      };
    } catch (error) {
      console.error('Native setup failed:', error);
      throw error;
    }
  }

  // HTTP API query for much faster responses
  async query(prompt: string): Promise<LocalLLMResponse> {
    const startTime = Date.now();
    
    try {
      // Ensure we have a model available
      if (!this.currentModel) {
        logCollector.logLLM('debug', '🔍 No current model, trying to get optimal model...');
        this.currentModel = await this.modelManager.getOptimalModel();
      }

      if (!this.currentModel) {
        logCollector.logLLM('warn', '❌ No models available, falling back to CLI method...');
        // Fallback to CLI method if no HTTP API model available
        return this.queryViaCLI(prompt, startTime);
      }

      // Ensure model is preloaded for instant responses (only if HTTP method)
      if (!this.modelPreloaded) {
        await this.preloadCurrentModel();
      }

      logCollector.logLLM('debug', `🤖 Querying ${this.currentModel} via HTTP API: ${prompt.substring(0, 50)}...`);

             // Use HTTP API for much faster responses
       const response = await fetchWithTimeout(`${this.ollamaApiUrl}/api/generate`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           model: this.currentModel,
           prompt,
           stream: false, // Get full response at once
           options: {
             temperature: 0.7,
             top_p: 0.9,
             max_tokens: 500,
             stop: ['Human:', 'Assistant:', '\n\n']
           }
         }),
         timeout: 30000 // 30 second timeout
       });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const responseText = data.response?.trim();
      
      if (!responseText) {
        return {
          success: false,
          error: 'Empty response from model',
          responseTime: Date.now() - startTime
        };
      }

      return {
        success: true,
        data: responseText,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      logCollector.logLLM('error', 'HTTP API query failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Query failed',
        responseTime: Date.now() - startTime
      };
    }
  }

  // CLI fallback method for when HTTP API isn't available
  private async queryViaCLI(prompt: string, startTime: number): Promise<LocalLLMResponse> {
    try {
      const optimalModel = await this.modelManager.getOptimalModel();
      if (!optimalModel) {
        return {
          success: false,
          error: 'No local models available',
          responseTime: Date.now() - startTime
        };
      }

      logCollector.logLLM('debug', `🐌 Querying ${optimalModel} via CLI (slower method): ${prompt.substring(0, 50)}...`);
      
      // Use the CLI method as fallback
      const { stdout, stderr } = await execAsync(`ollama run ${optimalModel} "${prompt.replace(/"/g, '\\"')}"`);
      
      if (stderr) {
        logCollector.logLLM('warn', 'Local LLM stderr', stderr);
      }

      const response = stdout.trim();
      if (!response) {
        return {
          success: false,
          error: 'Empty response from local LLM',
          responseTime: Date.now() - startTime
        };
      }

      return {
        success: true,
        data: response,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      logCollector.logLLM('error', 'CLI query failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CLI query failed',
        responseTime: Date.now() - startTime
      };
    }
  }

  // Preload model for instant responses
  private async preloadCurrentModel(): Promise<boolean> {
    if (!this.currentModel) return false;

    try {
      logCollector.logLLM('info', `🔥 Preloading model ${this.currentModel} for instant responses...`);
      
             // Send a small query to load the model into memory
       await fetchWithTimeout(`${this.ollamaApiUrl}/api/generate`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           model: this.currentModel,
           prompt: 'Hi',
           stream: false
         }),
         timeout: 10000
       });

      this.modelPreloaded = true;
      logCollector.logLLM('success', '✅ Model preloaded successfully');
      return true;
    } catch (error) {
      logCollector.logLLM('warn', 'Model preload failed', error);
      return false;
    }
  }

  // Select optimal model based on system capabilities
  private async selectOptimalModel(preferFast = false): Promise<string> {
    const models = preferFast ? this.FAST_MODELS : this.OPTIMAL_MODELS;
    
    // Check system RAM to determine best model
    const systemRam = await this.getSystemRAM();
    logCollector.logLLM('info', `💾 System RAM: ${systemRam}GB`);

    if (systemRam >= 16) {
      return models[0]; // Best model for high-RAM systems
    } else if (systemRam >= 8) {
      return models[1] || models[0]; // Good balance
    } else {
      return this.FAST_MODELS[2]; // Fast, lightweight model
    }
  }

  // Helper functions
  private async isDockerAvailable(): Promise<boolean> {
    try {
      await execAsync('docker --version');
      return true;
    } catch {
      return false;
    }
  }

  private async isDockerRunning(): Promise<boolean> {
    try {
      await execAsync('docker ps');
      return true;
    } catch {
      return false;
    }
  }

  private async hasGpuSupport(): Promise<boolean> {
    try {
      await execAsync('nvidia-smi');
      return true;
    } catch {
      return false;
    }
  }

  private async installOllama(): Promise<void> {
    try {
      await execAsync('curl -fsSL https://ollama.ai/install.sh | sh');
    } catch (error) {
      throw new Error(`Failed to install Ollama: ${error}`);
    }
  }

  private async ensureOllamaRunning(): Promise<void> {
    const running = await this.modelManager.isOllamaRunning();
    if (!running) {
      try {
        await execAsync('brew services start ollama');
        await this.waitForOllamaReady();
      } catch (error) {
        // Try starting manually
        spawn('ollama', ['serve'], { detached: true, stdio: 'ignore' });
        await this.waitForOllamaReady();
      }
    }
  }

  private async waitForOllamaReady(maxWait = 30000): Promise<void> {
    const startTime = Date.now();
         while (Date.now() - startTime < maxWait) {
       try {
         const response = await fetchWithTimeout(`${this.ollamaApiUrl}/api/tags`, { timeout: 5000 });
         if (response.ok) return;
       } catch {
         // Continue waiting
       }
       await new Promise(resolve => setTimeout(resolve, 1000));
     }
    throw new Error('Ollama failed to start within timeout');
  }

  private async downloadAndPreloadModel(modelName: string): Promise<boolean> {
    try {
      this.progressCallback?.(80, `Downloading ${modelName}...`);
      const success = await this.modelManager.downloadModel(modelName);
      
      if (success) {
        this.currentModel = modelName;
        this.progressCallback?.(95, 'Preloading model for instant responses...');
        await this.preloadCurrentModel();
        this.progressCallback?.(100, `🚀 ${modelName} ready for instant AI responses!`);
      }
      
      return success;
    } catch (error) {
      logCollector.logLLM('error', 'Model download/preload failed', error);
      return false;
    }
  }

  private async getSystemRAM(): Promise<number> {
    try {
      const { stdout } = await execAsync('sysctl -n hw.memsize');
      return Math.round(parseInt(stdout) / (1024 * 1024 * 1024));
    } catch {
      return 8; // Default assumption
    }
  }

  // Legacy compatibility methods
  async initialize(): Promise<LocalLLMStatus> {
    if (this.isInitialized) return this.getStatus();
    
    try {
      // Try optimized auto-setup first
      const result = await this.autoSetup({ 
        preferDocker: false, 
        fastModel: true, 
        autoInstall: true 
      });
      
      this.isInitialized = result.running && result.modelReady;
      return result;
    } catch (error) {
      logCollector.logLLM('warn', 'Auto-setup failed, trying manual setup', error);
      
      // Fallback to basic manual setup
      try {
        const installed = await this.modelManager.isOllamaInstalled();
        const running = await this.modelManager.isOllamaRunning();
        const modelStatus = await this.modelManager.getStatus();
        
        if (installed && running && modelStatus.installed) {
          // Basic setup worked, try to use best available model
          this.currentModel = await this.modelManager.getOptimalModel();
          this.isInitialized = true;
          
          return {
            installed: true,
            running: true,
            modelReady: modelStatus.installed,
            currentModel: this.currentModel || undefined,
            modelStatus,
            performance: 'slow',
            setupMethod: 'native'
          };
        }
        
        return {
          installed,
          running,
          modelReady: false,
          error: 'Basic setup completed but no models available',
          setupMethod: 'none'
        };
      } catch (fallbackError) {
        logCollector.logLLM('error', 'Manual setup also failed', fallbackError);
        return {
          installed: false,
          running: false,
          modelReady: false,
          error: `All setup methods failed: ${fallbackError}`,
          setupMethod: 'none'
        };
      }
    }
  }

  async getStatus(): Promise<LocalLLMStatus> {
    try {
      const installed = await this.modelManager.isOllamaInstalled();
      const running = await this.modelManager.isOllamaRunning();
      const modelStatus = await this.modelManager.getStatus();

      return {
        installed,
        running,
        modelReady: modelStatus.installed && this.modelPreloaded,
        currentModel: this.currentModel || undefined,
        modelStatus,
        performance: this.currentModel ? 'fast' : undefined,
        setupMethod: 'native'
      };
    } catch (error) {
      return {
        installed: false,
        running: false,
        modelReady: false,
        error: error instanceof Error ? error.message : 'Status check failed'
      };
    }
  }

  // Cleanup
  cleanup(): void {
    this.modelPreloaded = false;
    this.currentModel = null;
  }
}

export const localLLMService = LocalLLMService.getInstance(); 