import React, { useEffect, useState } from 'react';
import { 
  Eye, 
  Monitor, 
  Activity, 
  GitBranch, 
  Play, 
  Pause, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { contextMonitorService, ScreenContext, ContextAnalysis } from '../services/contextMonitorService';

export const ContextMonitor: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentContext, setCurrentContext] = useState<ScreenContext | null>(null);
  const [contextHistory, setContextHistory] = useState<ScreenContext[]>([]);
  const [analysis, setAnalysis] = useState<ContextAnalysis | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsMonitoring(contextMonitorService.isCurrentlyMonitoring());
    setCurrentContext(contextMonitorService.getCurrentContext());
    setContextHistory(contextMonitorService.getContextHistory());

    // Check permissions on mount
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const granted = await contextMonitorService.requestPermissions();
    setPermissionGranted(granted);
  };

  const handleStartMonitoring = async () => {
    if (!permissionGranted) {
      await checkPermissions();
      if (!permissionGranted) return;
    }

    await contextMonitorService.startMonitoring(15000); // Every 15 seconds
    setIsMonitoring(true);
    
    // Set up periodic updates
    const interval = setInterval(() => {
      setCurrentContext(contextMonitorService.getCurrentContext());
      setContextHistory(contextMonitorService.getContextHistory());
    }, 1000);

    return () => clearInterval(interval);
  };

  const handleStopMonitoring = () => {
    contextMonitorService.stopMonitoring();
    setIsMonitoring(false);
  };

  const handleManualCapture = async () => {
    try {
      const analysis = await contextMonitorService.analyzeCurrentContext();
      setAnalysis(analysis);
      setCurrentContext(contextMonitorService.getCurrentContext());
    } catch (error) {
      console.error('Manual capture failed:', error);
    }
  };

  const getActivityIcon = (workflowState: string) => {
    switch (workflowState) {
      case 'coding':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'researching':
        return <GitBranch className="w-4 h-4 text-green-500" />;
      case 'communicating':
        return <CheckCircle className="w-4 h-4 text-purple-500" />;
      case 'planning':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'ide':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'github':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'terminal':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'email':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Eye className="w-8 h-8 mr-3 text-indigo-600 dark:text-indigo-400" />
            Context Monitor
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Real-time awareness of your development workflow
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleManualCapture}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Capture Now
          </button>
          
          {isMonitoring ? (
            <button
              onClick={handleStopMonitoring}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Pause className="w-4 h-4 mr-2" />
              Stop Monitoring
            </button>
          ) : (
            <button
              onClick={handleStartMonitoring}
              disabled={!permissionGranted}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Monitoring
            </button>
          )}
        </div>
      </div>

      {/* Permission Status */}
      {!permissionGranted && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Screen Capture Permission Required
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Engie needs screen capture permission to monitor your workflow and provide context-aware assistance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Context */}
      {currentContext && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Monitor className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
              Current Context
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {currentContext.timestamp.toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Active Application</h4>
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🖥️</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{currentContext.activeApp}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{currentContext.windowTitle}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Detected Content</h4>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 text-sm rounded-full ${getContentTypeColor(currentContext.detectedContent.type)}`}>
                  {currentContext.detectedContent.type}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {Math.round(currentContext.detectedContent.confidence * 100)}% confidence
                </span>
              </div>
              
              {currentContext.detectedContent.extractedData && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  <pre className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(currentContext.detectedContent.extractedData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Analysis */}
          {analysis && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                {getActivityIcon(analysis.workflowState)}
                <span className="ml-2">Workflow Analysis</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current State</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {analysis.workflowState}
                  </p>
                </div>
                
                {analysis.activeProject && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Project</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {analysis.activeProject}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Suggested Updates</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {analysis.suggestedUpdates.length} task updates
                  </p>
                </div>
              </div>

              {/* Suggested Updates */}
              {analysis.suggestedUpdates.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Suggested Task Updates:
                  </h5>
                  <div className="space-y-2">
                    {analysis.suggestedUpdates.map((update, index) => (
                      <div key={index} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-blue-900 dark:text-blue-100">
                              Task {update.taskId}
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              {update.reason}
                            </p>
                          </div>
                          <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            {update.suggestedStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Context History */}
      {contextHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Context History
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Recent activity captured by Engie
            </p>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto">
            {contextHistory.slice(-10).reverse().map((context, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {context.activeApp}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${getContentTypeColor(context.detectedContent.type)}`}>
                        {context.detectedContent.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {context.windowTitle}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {context.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monitoring Status */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {isMonitoring ? 'Active Monitoring' : 'Monitoring Stopped'}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {contextHistory.length} context captures recorded
          </span>
        </div>
      </div>
    </div>
  );
};