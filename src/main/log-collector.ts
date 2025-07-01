export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  category: 'system' | 'llm' | 'workflow' | 'taskmaster' | 'general';
  message: string;
  details?: any;
  source?: string;
}

export class LogCollector {
  private static instance: LogCollector;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private logListeners: ((log: LogEntry) => void)[] = [];

  private constructor() {
    this.interceptConsole();
  }

  static getInstance(): LogCollector {
    if (!LogCollector.instance) {
      LogCollector.instance = new LogCollector();
    }
    return LogCollector.instance;
  }

  private interceptConsole(): void {
    const originalConsole = { ...console };

    console.log = (...args) => {
      this.addLog('info', 'general', this.formatMessage(args));
      originalConsole.log(...args);
    };

    console.warn = (...args) => {
      this.addLog('warn', 'general', this.formatMessage(args));
      originalConsole.warn(...args);
    };

    console.error = (...args) => {
      this.addLog('error', 'general', this.formatMessage(args));
      originalConsole.error(...args);
    };

    console.debug = (...args) => {
      this.addLog('debug', 'general', this.formatMessage(args));
      originalConsole.debug(...args);
    };
  }

  private formatMessage(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  addLog(level: LogEntry['level'], category: LogEntry['category'], message: string, details?: any, source?: string): void {
    const log: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      level,
      category,
      message,
      details,
      source
    };

    this.logs.unshift(log);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Notify listeners
    this.logListeners.forEach(listener => listener(log));
  }

  // Specialized logging methods for different components
  logSystem(level: LogEntry['level'], message: string, details?: any): void {
    this.addLog(level, 'system', message, details, 'EngieApp');
  }

  logLLM(level: LogEntry['level'], message: string, details?: any): void {
    this.addLog(level, 'llm', message, details, 'LocalLLMService');
  }

  logWorkflow(level: LogEntry['level'], message: string, details?: any): void {
    this.addLog(level, 'workflow', message, details, 'WorkflowEngine');
  }

  logTaskMaster(level: LogEntry['level'], message: string, details?: any): void {
    this.addLog(level, 'taskmaster', message, details, 'TaskMaster');
  }

  // Get logs with optional filtering
  getLogs(filters?: {
    level?: LogEntry['level'][];
    category?: LogEntry['category'][];
    since?: Date;
    search?: string;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters) {
      if (filters.level && filters.level.length > 0) {
        filteredLogs = filteredLogs.filter(log => filters.level!.includes(log.level));
      }

      if (filters.category && filters.category.length > 0) {
        filteredLogs = filteredLogs.filter(log => filters.category!.includes(log.category));
      }

      if (filters.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.since!);
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(searchLower) ||
          (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
        );
      }

      if (filters.limit) {
        filteredLogs = filteredLogs.slice(0, filters.limit);
      }
    }

    return filteredLogs;
  }

  // Subscribe to new logs
  onNewLog(callback: (log: LogEntry) => void): () => void {
    this.logListeners.push(callback);
    return () => {
      const index = this.logListeners.indexOf(callback);
      if (index > -1) {
        this.logListeners.splice(index, 1);
      }
    };
  }

  // Get system statistics
  getStats(): {
    totalLogs: number;
    byLevel: Record<LogEntry['level'], number>;
    byCategory: Record<LogEntry['category'], number>;
    recentActivity: number; // logs in last 5 minutes
  } {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const stats = {
      totalLogs: this.logs.length,
      byLevel: {
        info: 0,
        warn: 0,
        error: 0,
        debug: 0,
        success: 0
      } as Record<LogEntry['level'], number>,
      byCategory: {
        system: 0,
        llm: 0,
        workflow: 0,
        taskmaster: 0,
        general: 0
      } as Record<LogEntry['category'], number>,
      recentActivity: 0
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level]++;
      stats.byCategory[log.category]++;
      if (log.timestamp >= fiveMinutesAgo) {
        stats.recentActivity++;
      }
    });

    return stats;
  }

  // Clear all logs
  clearLogs(): void {
    this.logs = [];
    this.addLog('info', 'system', 'Log history cleared', undefined, 'LogCollector');
  }
}

export const logCollector = LogCollector.getInstance();