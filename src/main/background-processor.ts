import { WorkflowEngine } from './workflow-engine';
import { v4 as uuidv4 } from 'uuid';

// Background job interface
interface BackgroundJob {
  id: string;
  type: 'workflow_analysis' | 'task_generation' | 'text_analysis' | 'ai_processing';
  priority: 'low' | 'medium' | 'high';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  data: any;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: any;
  error?: string;
}

// Background job queue for local execution
export class BackgroundProcessor {
  private queue: BackgroundJob[] = [];
  private processing: Map<string, BackgroundJob> = new Map();
  private workflowEngine: WorkflowEngine;
  private isRunning: boolean = false;
  private maxConcurrent: number = 3;
  private callbacks: Map<string, (result: any) => void> = new Map();
  private processTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.workflowEngine = new WorkflowEngine();
  }

  // Start the background processor
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleProcessing();
    console.log('Background processor started');
  }

  // Stop the background processor
  stop(): void {
    this.isRunning = false;
    
    // Clear the processing timer
    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = null;
    }
    
    console.log('Background processor stopped');
  }

  // Add job to queue
  addJob(type: BackgroundJob['type'], data: any, priority: BackgroundJob['priority'] = 'medium'): string {
    const job: BackgroundJob = {
      id: uuidv4(),
      type,
      priority,
      status: 'queued',
      data,
      createdAt: Date.now()
    };

    // Insert job based on priority
    this.insertJobByPriority(job);
    
    // Trigger processing if not already running
    if (this.isRunning) {
      this.processQueue();
    }

    return job.id;
  }

  // Add job with callback
  addJobWithCallback(
    type: BackgroundJob['type'], 
    data: any, 
    callback: (result: any) => void, 
    priority: BackgroundJob['priority'] = 'medium'
  ): string {
    const jobId = this.addJob(type, data, priority);
    this.callbacks.set(jobId, callback);
    return jobId;
  }

  // Get job status
  getJobStatus(jobId: string): BackgroundJob | null {
    // Check processing jobs first
    if (this.processing.has(jobId)) {
      return this.processing.get(jobId)!;
    }

    // Check queued jobs
    return this.queue.find(job => job.id === jobId) || null;
  }

  // Get queue stats
  getQueueStats(): { queued: number; processing: number; total: number } {
    return {
      queued: this.queue.length,
      processing: this.processing.size,
      total: this.queue.length + this.processing.size
    };
  }

  // Process workflow with user input
  async processUserWorkflow(message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const jobId = this.addJobWithCallback(
        'workflow_analysis',
        { message },
        (result) => {
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(jobId);
          }
        },
        'high'
      );
    });
  }

  // Process text analysis
  async processTextAnalysis(text: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const jobId = this.addJobWithCallback(
        'text_analysis',
        { text },
        (result) => {
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(jobId);
          }
        },
        'medium'
      );
    });
  }

  // Private methods
  private insertJobByPriority(job: BackgroundJob): void {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const jobPriority = priorityOrder[job.priority];

    let insertIndex = 0;
    for (let i = 0; i < this.queue.length; i++) {
      const queuedJobPriority = priorityOrder[this.queue[i].priority];
      if (jobPriority <= queuedJobPriority) {
        insertIndex = i + 1;
      } else {
        break;
      }
    }

    this.queue.splice(insertIndex, 0, job);
  }

  private scheduleProcessing(): void {
    if (!this.isRunning) return;

    // Clear any existing timer
    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = null;
    }

    // Schedule next processing cycle
    this.processTimer = setTimeout(() => {
      this.processQueue().then(() => {
        this.scheduleProcessing(); // Schedule next cycle
      }).catch(error => {
        console.error('Error in processQueue:', error);
        this.scheduleProcessing(); // Continue despite error
      });
    }, 100);
  }

  private async processQueue(): Promise<void> {
    while (this.isRunning && this.queue.length > 0 && this.processing.size < this.maxConcurrent) {
      const job = this.queue.shift();
      if (!job) continue;

      // Move to processing
      job.status = 'processing';
      job.startedAt = Date.now();
      this.processing.set(job.id, job);

      // Process job asynchronously
      this.processJob(job).catch(error => {
        console.error(`Error processing job ${job.id}:`, error);
        job.status = 'failed';
        job.error = error.message;
        this.completeJob(job);
      });
    }
  }

  private async processJob(job: BackgroundJob): Promise<void> {
    try {
      let result: any;

      switch (job.type) {
        case 'workflow_analysis':
          result = await this.workflowEngine.processUserInput(job.data.message);
          break;

        case 'text_analysis':
          result = await this.workflowEngine.processTextAnalysis(job.data.text);
          break;

        case 'task_generation':
          // Task generation handled by workflow engine
          result = await this.workflowEngine.processUserInput(job.data.message || job.data.input);
          break;

        case 'ai_processing':
          // Simulate AI processing
          await this.simulateDelay(1000, 3000);
          result = {
            analysis: `AI analysis completed for: ${job.data.input}`,
            confidence: Math.random() * 0.3 + 0.7, // 70-100%
            timestamp: Date.now()
          };
          break;

        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.result = result;
      job.status = 'completed';
      this.completeJob(job);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.completeJob(job);
    }
  }

  private completeJob(job: BackgroundJob): void {
    job.completedAt = Date.now();
    this.processing.delete(job.id);

    // Execute callback if exists
    const callback = this.callbacks.get(job.id);
    if (callback) {
      callback(job.status === 'completed' ? job.result : { error: job.error });
      this.callbacks.delete(job.id);
    }

    // Emit completion event (could be used by renderer)
    this.emitJobComplete(job);
  }

  private emitJobComplete(job: BackgroundJob): void {
    // This would integrate with Electron's IPC to notify renderer
    console.log(`Job ${job.id} completed:`, {
      type: job.type,
      status: job.status,
      duration: job.completedAt! - job.startedAt!,
      hasResult: !!job.result
    });
  }

  private async simulateDelay(min: number, max: number): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // Cleanup method
  cleanup(): void {
    this.stop();
    this.queue = [];
    this.processing.clear();
    this.callbacks.clear();
  }

  // Get all jobs (for monitoring)
  getAllJobs(): { queued: BackgroundJob[]; processing: BackgroundJob[] } {
    return {
      queued: [...this.queue],
      processing: Array.from(this.processing.values())
    };
  }
}

// Singleton instance for the main process
export const backgroundProcessor = new BackgroundProcessor(); 