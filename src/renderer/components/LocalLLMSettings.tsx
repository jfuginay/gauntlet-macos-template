import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, Play, Square, Settings, HardDrive, Cpu, Zap, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';

interface LocalLLMSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LLMConfig {
  enabled: boolean;
  containerName: string;
  port: number;
  useGPU: boolean;
  fallbackModel: string;
  models: string[];
}

interface ModelInfo {
  name: string;
  size: string;
  modified: string;
  digest: string;
}

interface RecommendedModel {
  name: string;
  description: string;
  size: string;
}

export const LocalLLMSettings: React.FC<LocalLLMSettingsProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [dockerAvailable, setDockerAvailable] = useState(false);
  const [gpuSupport, setGpuSupport] = useState(false);
  const [containerRunning, setContainerRunning] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [recommendedModels, setRecommendedModels] = useState<RecommendedModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'setup' | 'models' | 'config'>('setup');

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      const [configData, dockerCheck, gpuCheck, runningCheck, modelsData, recommendedData] = await Promise.all([
        window.electronAPI.localLLM.getConfig(),
        window.electronAPI.localLLM.checkDocker(),
        window.electronAPI.localLLM.checkGPU(),
        window.electronAPI.localLLM.isRunning(),
        window.electronAPI.localLLM.listModels(),
        window.electronAPI.localLLM.getRecommendedModels()
      ]);

      setConfig(configData);
      setDockerAvailable(dockerCheck);
      setGpuSupport(gpuCheck);
      setContainerRunning(runningCheck);
      setModels(modelsData);
      setRecommendedModels(recommendedData);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const handleSetupContainer = async () => {
    setLoading(true);
    setSetupStatus('Setting up container...');
    
    try {
      const success = await window.electronAPI.localLLM.setupContainer();
      if (success) {
        setSetupStatus('Container setup successful! Waiting for Ollama to be ready...');
        const ready = await window.electronAPI.localLLM.waitReady();
        if (ready) {
          setSetupStatus('Ensuring fallback model is available...');
          await window.electronAPI.localLLM.ensureFallback();
          setSetupStatus('Setup complete!');
          setContainerRunning(true);
          await loadModels();
        } else {
          setSetupStatus('Container started but Ollama is not responding');
        }
      } else {
        setSetupStatus('Failed to setup container');
      }
    } catch (error) {
      setSetupStatus(`Setup failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopContainer = async () => {
    setLoading(true);
    setSetupStatus('Stopping container...');
    
    try {
      const success = await window.electronAPI.localLLM.stopContainer();
      if (success) {
        setSetupStatus('Container stopped');
        setContainerRunning(false);
      } else {
        setSetupStatus('Failed to stop container');
      }
    } catch (error) {
      setSetupStatus(`Stop failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePullModel = async (modelName: string) => {
    setLoading(true);
    setSetupStatus(`Downloading ${modelName}...`);
    
    try {
      const success = await window.electronAPI.localLLM.pullModel(modelName);
      if (success) {
        setSetupStatus(`${modelName} downloaded successfully!`);
        await loadModels();
      } else {
        setSetupStatus(`Failed to download ${modelName}`);
      }
    } catch (error) {
      setSetupStatus(`Download failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveModel = async (modelName: string) => {
    setLoading(true);
    setSetupStatus(`Removing ${modelName}...`);
    
    try {
      const success = await window.electronAPI.localLLM.removeModel(modelName);
      if (success) {
        setSetupStatus(`${modelName} removed successfully!`);
        await loadModels();
      } else {
        setSetupStatus(`Failed to remove ${modelName}`);
      }
    } catch (error) {
      setSetupStatus(`Remove failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const modelsData = await window.electronAPI.localLLM.listModels();
      setModels(modelsData);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const handleConfigUpdate = async (updates: Partial<LLMConfig>) => {
    if (!config) return;
    
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    
    try {
      await window.electronAPI.localLLM.updateConfig(updates);
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  const formatSize = (sizeStr: string): string => {
    const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*([KMGT]?B)/i);
    if (match) {
      const [, size, unit] = match;
      return `${parseFloat(size).toFixed(1)} ${unit.toUpperCase()}`;
    }
    return sizeStr;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-[800px] max-w-[90vw] h-[600px] max-h-[90vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <HardDrive className="w-5 h-5 mr-2" />
            Local LLM Setup
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'setup', label: 'Setup', icon: Settings },
            { id: 'models', label: 'Models', icon: Download },
            { id: 'config', label: 'Config', icon: Cpu }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'setup' && (
            <div className="space-y-6">
              {/* System Requirements */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Requirements</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Docker Available</span>
                    <div className="flex items-center">
                      {dockerAvailable ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                      )}
                      <span className={`text-sm ${dockerAvailable ? 'text-green-600' : 'text-red-600'}`}>
                        {dockerAvailable ? 'Available' : 'Not Available'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">GPU Support</span>
                    <div className="flex items-center">
                      {gpuSupport ? (
                        <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                      ) : (
                        <Cpu className="w-5 h-5 text-gray-500 mr-2" />
                      )}
                      <span className={`text-sm ${gpuSupport ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {gpuSupport ? 'GPU Available' : 'CPU Only'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Container Status</span>
                    <div className="flex items-center">
                      {containerRunning ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-500 mr-2" />
                      )}
                      <span className={`text-sm ${containerRunning ? 'text-green-600' : 'text-gray-600'}`}>
                        {containerRunning ? 'Running' : 'Stopped'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Setup */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Quick Setup</h3>
                
                {!dockerAvailable && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex">
                      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Docker Required</h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          Please install Docker Desktop to use local LLMs. 
                          <button 
                            onClick={() => window.electronAPI.openExternal('https://www.docker.com/products/docker-desktop/')}
                            className="ml-1 text-yellow-800 dark:text-yellow-200 underline hover:no-underline inline-flex items-center"
                          >
                            Download Docker <ExternalLink className="w-3 h-3 ml-1" />
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  {!containerRunning ? (
                    <button
                      onClick={handleSetupContainer}
                      disabled={!dockerAvailable || loading}
                      className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Setup & Start Local LLM
                    </button>
                  ) : (
                    <button
                      onClick={handleStopContainer}
                      disabled={loading}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      ) : (
                        <Square className="w-4 h-4 mr-2" />
                      )}
                      Stop Container
                    </button>
                  )}
                </div>

                {setupStatus && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-800 dark:text-blue-200">{setupStatus}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-6">
              {/* Installed Models */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Installed Models</h3>
                {models.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Download className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No models installed yet</p>
                    <p className="text-sm">Download a model from the recommended list below</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {models.map((model) => (
                      <div key={model.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{model.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Size: {formatSize(model.size)} • Modified: {new Date(model.modified).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveModel(model.name)}
                          disabled={loading}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommended Models */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recommended Models</h3>
                <div className="space-y-2">
                  {recommendedModels.map((model) => {
                    const isInstalled = models.some(m => m.name.includes(model.name));
                    return (
                      <div key={model.name} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{model.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{model.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">Size: {model.size}</p>
                        </div>
                        <button
                          onClick={() => handlePullModel(model.name)}
                          disabled={loading || !containerRunning || isInstalled}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            isInstalled
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {isInstalled ? 'Installed' : 'Download'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'config' && config && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Local LLM
                  </label>
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => handleConfigUpdate({ enabled: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Use GPU Acceleration (if available)
                  </label>
                  <input
                    type="checkbox"
                    checked={config.useGPU}
                    onChange={(e) => handleConfigUpdate({ useGPU: e.target.checked })}
                    disabled={!gpuSupport}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fallback Model
                  </label>
                  <select
                    value={config.fallbackModel}
                    onChange={(e) => handleConfigUpdate({ fallbackModel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {recommendedModels.map((model) => (
                      <option key={model.name} value={model.name}>
                        {model.name} ({model.size})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This model will be automatically downloaded if no other models are available
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Port
                  </label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => handleConfigUpdate({ port: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1024"
                    max="65535"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};