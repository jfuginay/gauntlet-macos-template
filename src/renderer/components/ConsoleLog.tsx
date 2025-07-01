import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ConsoleLog.css';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  category: 'system' | 'llm' | 'workflow' | 'taskmaster' | 'general';
  message: string;
  details?: any;
  source?: string;
}

interface LogStats {
  totalLogs: number;
  byLevel: Record<LogEntry['level'], number>;
  byCategory: Record<LogEntry['category'], number>;
  recentActivity: number;
}

interface ConsoleLogProps {
  isVisible: boolean;
  onToggle: () => void;
}

export const ConsoleLog: React.FC<ConsoleLogProps> = ({ isVisible, onToggle }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState({
    level: [] as LogEntry['level'][],
    category: [] as LogEntry['category'][],
    search: '',
  });
  const [autoScroll, setAutoScroll] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const logsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch logs and stats
  const refreshLogs = useCallback(async () => {
    try {
      const [logsResult, statsResult] = await Promise.all([
        window.electronAPI?.logs?.getLogs({ limit: 500 }),
        window.electronAPI?.logs?.getStats()
      ]);

      if (logsResult?.success) {
        const logsData = logsResult.data.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
        setLogs(logsData);
      }

      if (statsResult?.success) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  // Filter logs based on current filters
  useEffect(() => {
    let filtered = [...logs];

    if (filters.level.length > 0) {
      filtered = filtered.filter(log => filters.level.includes(log.level));
    }

    if (filters.category.length > 0) {
      filtered = filtered.filter(log => filters.category.includes(log.category));
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower)) ||
        (log.source && log.source.toLowerCase().includes(searchLower))
      );
    }

    setFilteredLogs(filtered);
  }, [logs, filters]);

  // Initialize and set up real-time updates
  useEffect(() => {
    refreshLogs();

    // Listen for new logs
    const handleNewLog = (log: LogEntry) => {
      setLogs(prev => [{ ...log, timestamp: new Date(log.timestamp) }, ...prev.slice(0, 499)]);
    };

    window.electronAPI?.logs?.onNewLog(handleNewLog);

    // Refresh stats every 5 seconds
    const interval = setInterval(() => {
      window.electronAPI?.logs?.getStats().then(result => {
        if (result?.success) {
          setStats(result.data);
        }
      });
    }, 5000);

    return () => {
      window.electronAPI?.logs?.removeLogListener();
      clearInterval(interval);
    };
  }, [refreshLogs]);

  const handleClearLogs = async () => {
    try {
      await window.electronAPI?.logs?.clearLogs();
      await refreshLogs();
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const getLevelIcon = (level: LogEntry['level']): string => {
    switch (level) {
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      case 'error': return '❌';
      case 'debug': return '🔍';
      default: return '📝';
    }
  };

  const getCategoryIcon = (category: LogEntry['category']): string => {
    switch (category) {
      case 'system': return '🖥️';
      case 'llm': return '🤖';
      case 'workflow': return '⚡';
      case 'taskmaster': return '📋';
      case 'general': return '📝';
      default: return '📝';
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const toggleFilter = (type: 'level' | 'category', value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value as any)
        ? prev[type].filter(item => item !== value)
        : [...prev[type], value]
    }));
  };

  if (!isVisible) {
    return (
      <div className="console-log-toggle" onClick={onToggle}>
        <span className="toggle-icon">📜</span>
        <span className="toggle-text">Console</span>
        {stats && stats.recentActivity > 0 && (
          <span className="activity-badge">{stats.recentActivity}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`console-log-container ${isExpanded ? 'expanded' : ''}`}>
      <div className="console-header">
        <div className="header-left">
          <button className="header-button" onClick={onToggle}>
            <span>✖</span>
          </button>
          <button 
            className="header-button" 
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            <span>{isExpanded ? '⬇' : '⬆'}</span>
          </button>
          <h3 className="console-title">📜 Console Logs</h3>
          {stats && (
            <div className="console-stats">
              <span className="stat-item">Total: {stats.totalLogs}</span>
              <span className="stat-item">Recent: {stats.recentActivity}</span>
              <span className="stat-item">Errors: {stats.byLevel.error || 0}</span>
            </div>
          )}
        </div>
        
        <div className="header-right">
          <button 
            className={`auto-scroll-toggle ${autoScroll ? 'active' : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title="Auto-scroll to bottom"
          >
            📍
          </button>
          <button className="clear-button" onClick={handleClearLogs}>
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="console-filters">
        <div className="filter-group">
          <label>Levels:</label>
          {(['success', 'info', 'warn', 'error', 'debug'] as const).map(level => (
            <button
              key={level}
              className={`filter-chip ${filters.level.includes(level) ? 'active' : ''}`}
              onClick={() => toggleFilter('level', level)}
            >
              {getLevelIcon(level)} {level}
              {stats && stats.byLevel[level] > 0 && (
                <span className="filter-count">({stats.byLevel[level]})</span>
              )}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <label>Categories:</label>
          {(['system', 'llm', 'workflow', 'taskmaster', 'general'] as const).map(category => (
            <button
              key={category}
              className={`filter-chip ${filters.category.includes(category) ? 'active' : ''}`}
              onClick={() => toggleFilter('category', category)}
            >
              {getCategoryIcon(category)} {category}
              {stats && stats.byCategory[category] > 0 && (
                <span className="filter-count">({stats.byCategory[category]})</span>
              )}
            </button>
          ))}
        </div>

        <div className="search-group">
          <input
            type="text"
            placeholder="Search logs..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="search-input"
          />
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="console-logs-scroll"
        onScroll={(e) => {
          const element = e.currentTarget;
          const isNearBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
          setAutoScroll(isNearBottom);
        }}
      >
        <div ref={logsRef} className="console-logs">
          {filteredLogs.length === 0 ? (
            <div className="empty-logs">
              {logs.length === 0 ? 'No logs available' : 'No logs match current filters'}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className={`log-entry level-${log.level} category-${log.category}`}>
                <div className="log-header">
                  <span className="log-time">{formatTimestamp(log.timestamp)}</span>
                  <span className="log-level">
                    {getLevelIcon(log.level)} {log.level.toUpperCase()}
                  </span>
                  <span className="log-category">
                    {getCategoryIcon(log.category)} {log.category}
                  </span>
                  {log.source && (
                    <span className="log-source">[{log.source}]</span>
                  )}
                </div>
                <div className="log-message">{log.message}</div>
                {log.details && (
                  <details className="log-details">
                    <summary>Details</summary>
                    <pre className="log-details-content">
                      {typeof log.details === 'string' 
                        ? log.details 
                        : JSON.stringify(log.details, null, 2)
                      }
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};