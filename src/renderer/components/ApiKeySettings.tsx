import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Key, Save, Trash2, Download, Upload, AlertCircle, CheckCircle, Shield, Zap, ExternalLink } from 'lucide-react';

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

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface ApiKeyInfo {
  name: keyof ApiKeyConfig;
  label: string;
  description: string;
  placeholder: string;
  required: boolean;
  docs: string;
}

const API_KEY_INFO: ApiKeyInfo[] = [
  {
    name: 'ANTHROPIC_API_KEY',
    label: 'Anthropic (Claude)',
    description: 'Required for Claude AI features',
    placeholder: 'sk-ant-...',
    required: true,
    docs: 'https://console.anthropic.com/'
  },
  {
    name: 'PERPLEXITY_API_KEY',
    label: 'Perplexity',
    description: 'Required for research features',
    placeholder: 'pplx-...',
    required: true,
    docs: 'https://www.perplexity.ai/settings/api'
  },
  {
    name: 'OPENAI_API_KEY',
    label: 'OpenAI',
    description: 'Optional: For GPT models',
    placeholder: 'sk-...',
    required: false,
    docs: 'https://platform.openai.com/api-keys'
  },
  {
    name: 'GOOGLE_API_KEY',
    label: 'Google (Gemini)',
    description: 'Optional: For Gemini models',
    placeholder: 'AIza...',
    required: false,
    docs: 'https://aistudio.google.com/app/apikey'
  },
  {
    name: 'XAI_API_KEY',
    label: 'xAI (Grok)',
    description: 'Optional: For Grok models',
    placeholder: 'xai-...',
    required: false,
    docs: 'https://console.x.ai/'
  },
  {
    name: 'OPENROUTER_API_KEY',
    label: 'OpenRouter',
    description: 'Optional: Access to multiple models',
    placeholder: 'sk-or-...',
    required: false,
    docs: 'https://openrouter.ai/keys'
  },
  {
    name: 'MISTRAL_API_KEY',
    label: 'Mistral',
    description: 'Optional: For Mistral models',
    placeholder: 'mistral-...',
    required: false,
    docs: 'https://console.mistral.ai/'
  },
  {
    name: 'AZURE_OPENAI_API_KEY',
    label: 'Azure OpenAI',
    description: 'Optional: For Azure-hosted models',
    placeholder: 'azure-...',
    required: false,
    docs: 'https://portal.azure.com/'
  },
  {
    name: 'OLLAMA_API_KEY',
    label: 'Ollama',
    description: 'Optional: For local models',
    placeholder: 'ollama-...',
    required: false,
    docs: 'https://ollama.ai/'
  }
];

interface ApiKeySettingsProps {
  onClose?: () => void;
  isFirstRun?: boolean;
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ onClose, isFirstRun = false }) => {
  const [keys, setKeys] = useState<ApiKeyConfig>({});
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const apiKeys = await window.electronAPI?.getAllApiKeys();
      if (apiKeys) {
        setKeys(apiKeys);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
      setErrors({ general: 'Failed to load API keys' });
    } finally {
      setLoading(false);
    }
  };

  const validateApiKey = async (keyName: keyof ApiKeyConfig, value: string): Promise<ValidationResult> => {
    try {
      return await window.electronAPI?.validateApiKey(keyName, value) || { valid: false, error: 'Validation failed' };
    } catch (error) {
      return { valid: false, error: 'Validation error' };
    }
  };

  const toggleKeyVisibility = (keyName: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyName)) {
      newVisible.delete(keyName);
    } else {
      newVisible.add(keyName);
    }
    setVisibleKeys(newVisible);
  };

  const handleKeyChange = (keyName: keyof ApiKeyConfig, value: string) => {
    setKeys(prev => ({ ...prev, [keyName]: value }));
    
    // Clear previous errors
    if (errors[keyName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[keyName];
        return newErrors;
      });
    }
  };

  const saveApiKey = async (keyName: keyof ApiKeyConfig) => {
    const value = keys[keyName];
    if (!value) return;

    setSaving(prev => new Set(prev).add(keyName));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[keyName];
      return newErrors;
    });

    try {
      // Validate key
      const validation = await validateApiKey(keyName, value);
      if (!validation.valid) {
        setErrors(prev => ({ ...prev, [keyName]: validation.error || 'Invalid API key' }));
        return;
      }

      // Save key
      await window.electronAPI?.setApiKey(keyName, value);
      setSuccessMessage(`${API_KEY_INFO.find(k => k.name === keyName)?.label} key saved successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save API key:', error);
      setErrors(prev => ({ ...prev, [keyName]: 'Failed to save API key' }));
    } finally {
      setSaving(prev => {
        const newSaving = new Set(prev);
        newSaving.delete(keyName);
        return newSaving;
      });
    }
  };

  const removeApiKey = async (keyName: keyof ApiKeyConfig) => {
    if (!confirm(`Are you sure you want to remove the ${API_KEY_INFO.find(k => k.name === keyName)?.label} API key?`)) {
      return;
    }

    try {
      await window.electronAPI?.removeApiKey(keyName);
      setKeys(prev => {
        const newKeys = { ...prev };
        delete newKeys[keyName];
        return newKeys;
      });
      setSuccessMessage('API key removed successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to remove API key:', error);
      setErrors(prev => ({ ...prev, [keyName]: 'Failed to remove API key' }));
    }
  };

  const migrateFromEnvironment = async () => {
    try {
      const result = await window.electronAPI?.migrateApiKeysFromEnvironment();
      if (result) {
        setSuccessMessage(`Migrated ${result.migrated.length} keys successfully`);
        if (result.failed.length > 0) {
          setErrors(prev => ({ ...prev, general: `Failed to migrate: ${result.failed.join(', ')}` }));
        }
        await loadApiKeys();
      }
    } catch (error) {
      console.error('Failed to migrate keys:', error);
      setErrors(prev => ({ ...prev, general: 'Failed to migrate keys from environment' }));
    }
  };

  const hasRequiredKeys = () => {
    const required = API_KEY_INFO.filter(k => k.required);
    return required.some(keyInfo => keys[keyInfo.name]);
  };

  const canProceed = () => {
    return hasRequiredKeys();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-terminal-950 via-terminal-900 to-gauntlet-950 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-retro-grid bg-[size:40px_40px] opacity-20 animate-pulse"></div>
      
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gauntlet-500/10 rounded-full blur-3xl animate-glow-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-neon-cyan/10 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10 max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-4 mb-6 p-4 bg-terminal-800/50 backdrop-blur-sm rounded-2xl border border-gauntlet-500/30 shadow-neon">
            <div className="p-3 bg-gradient-to-r from-gauntlet-500 to-neon-cyan rounded-xl shadow-glow">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-white font-mono tracking-wide">
                {isFirstRun ? 'INIT_SECURITY_KEYS' : 'MANAGE_API_KEYS'}
              </h1>
              <p className="text-gauntlet-300 text-sm font-mono">
                {'>'} Secure Keychain Integration Active
              </p>
            </div>
          </div>
          
          {isFirstRun && (
            <div className="bg-gradient-to-r from-gauntlet-900/80 to-terminal-800/80 backdrop-blur-sm border border-gauntlet-400/30 rounded-2xl p-6 mb-8 shadow-glow-lg">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gauntlet-500/20 rounded-lg">
                  <Zap className="h-6 w-6 text-gauntlet-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gauntlet-200 mb-2 font-mono">SYSTEM INITIALIZATION</h3>
                  <p className="text-gauntlet-300 text-sm leading-relaxed">
                    Configure your AI service credentials to unlock the full potential of Engie. 
                    The Anthropic (Claude) key is highly recommended for optimal performance.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-gauntlet-400 text-sm font-mono">
            <Shield className="h-4 w-4" />
            <span>macOS Keychain • End-to-End Encryption • Zero Trust</span>
          </div>
        </div>

        {/* Status Messages */}
        {successMessage && (
          <div className="mb-8 p-4 bg-gradient-to-r from-matrix-900/80 to-matrix-800/80 backdrop-blur-sm border border-matrix-500/50 rounded-xl shadow-glow animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-matrix-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-matrix-400" />
              </div>
              <span className="text-matrix-200 font-mono">{successMessage}</span>
            </div>
          </div>
        )}

        {errors.general && (
          <div className="mb-8 p-4 bg-gradient-to-r from-red-900/80 to-red-800/80 backdrop-blur-sm border border-red-500/50 rounded-xl shadow-glow animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-red-500/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <span className="text-red-200 font-mono">{errors.general}</span>
            </div>
          </div>
        )}

        {/* API Key Cards */}
        <div className="grid gap-6">
          {API_KEY_INFO.map((keyInfo) => {
            const hasValue = !!keys[keyInfo.name];
            const isVisible = visibleKeys.has(keyInfo.name);
            const isSaving = saving.has(keyInfo.name);
            const error = errors[keyInfo.name];

            return (
              <div 
                key={keyInfo.name} 
                className={`group relative bg-gradient-to-r from-terminal-800/50 to-terminal-700/30 backdrop-blur-sm border rounded-2xl p-6 transition-all duration-300 hover:shadow-glow-lg ${
                  hasValue 
                    ? 'border-matrix-500/50 shadow-glow-sm' 
                    : keyInfo.required 
                    ? 'border-gauntlet-500/50' 
                    : 'border-terminal-600/50'
                } hover:border-gauntlet-400/70`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${hasValue ? 'bg-matrix-500/20' : keyInfo.required ? 'bg-gauntlet-500/20' : 'bg-terminal-600/20'}`}>
                        <Key className={`h-5 w-5 ${hasValue ? 'text-matrix-400' : keyInfo.required ? 'text-gauntlet-400' : 'text-terminal-400'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white font-mono tracking-wide">{keyInfo.label}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {keyInfo.required && (
                            <span className="text-xs bg-gauntlet-500/20 text-gauntlet-300 px-2 py-1 rounded-md font-mono border border-gauntlet-500/30">
                              REQUIRED
                            </span>
                          )}
                          {hasValue && (
                            <span className="text-xs bg-matrix-500/20 text-matrix-300 px-2 py-1 rounded-md font-mono border border-matrix-500/30 shadow-glow-sm">
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-terminal-300 text-sm font-mono leading-relaxed">{keyInfo.description}</p>
                  </div>
                  
                  <a
                    href={keyInfo.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-gauntlet-500/20 hover:bg-gauntlet-500/30 border border-gauntlet-500/30 hover:border-gauntlet-400/50 text-gauntlet-300 hover:text-gauntlet-200 rounded-lg transition-all duration-200 font-mono text-sm group-hover:shadow-glow-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    GET_KEY
                  </a>
                </div>

                {/* Input Section */}
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={keys[keyInfo.name] || ''}
                      onChange={(e) => handleKeyChange(keyInfo.name, e.target.value)}
                      placeholder={keyInfo.placeholder}
                      className={`w-full px-4 py-3 bg-terminal-900/50 backdrop-blur-sm border rounded-xl text-white placeholder-terminal-400 font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gauntlet-500/50 focus:border-gauntlet-400/50 pr-12 ${
                        error 
                          ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-400/50' 
                          : hasValue
                          ? 'border-matrix-500/50'
                          : 'border-terminal-600/50'
                      }`}
                    />
                    <button
                      onClick={() => toggleKeyVisibility(keyInfo.name)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-terminal-400 hover:text-gauntlet-300 transition-colors duration-200"
                    >
                      {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <button
                    onClick={() => saveApiKey(keyInfo.name)}
                    disabled={!keys[keyInfo.name] || isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-gauntlet-600 to-gauntlet-500 hover:from-gauntlet-500 hover:to-gauntlet-400 disabled:from-terminal-700 disabled:to-terminal-600 text-white rounded-xl flex items-center gap-2 disabled:cursor-not-allowed transition-all duration-200 font-mono text-sm shadow-glow-sm hover:shadow-glow group-hover:shadow-glow-lg"
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    SAVE
                  </button>

                  {hasValue && (
                    <button
                      onClick={() => removeApiKey(keyInfo.name)}
                      className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl flex items-center gap-2 transition-all duration-200 font-mono text-sm shadow-glow-sm hover:shadow-glow"
                    >
                      <Trash2 className="h-4 w-4" />
                      DEL
                    </button>
                  )}
                </div>

                {error && (
                  <div className="mt-3 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
                    <p className="text-red-300 text-sm font-mono">{error}</p>
                  </div>
                )}
            </div>
          );
        })}
      </div>

        {/* Control Panel */}
        <div className="mt-12 pt-8 border-t border-terminal-600/30">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <button
                onClick={migrateFromEnvironment}
                className="px-6 py-3 bg-gradient-to-r from-neon-orange/20 to-yellow-500/20 hover:from-neon-orange/30 hover:to-yellow-500/30 border border-neon-orange/30 hover:border-yellow-400/50 text-yellow-300 hover:text-yellow-200 rounded-xl flex items-center gap-2 transition-all duration-200 font-mono text-sm shadow-glow-sm hover:shadow-glow"
              >
                <Upload className="h-4 w-4" />
                IMPORT_ENV
              </button>
              
              <button
                onClick={() => window.electronAPI?.exportApiKeyConfig?.()}
                className="px-6 py-3 bg-gradient-to-r from-terminal-700/50 to-terminal-600/50 hover:from-terminal-600/50 hover:to-terminal-500/50 border border-terminal-500/30 hover:border-terminal-400/50 text-terminal-300 hover:text-terminal-200 rounded-xl flex items-center gap-2 transition-all duration-200 font-mono text-sm shadow-glow-sm hover:shadow-glow"
              >
                <Download className="h-4 w-4" />
                EXPORT_CONFIG
              </button>
            </div>

            {(onClose || isFirstRun) && (
              <div className="flex items-center gap-4">
                {isFirstRun && !canProceed() && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gauntlet-900/50 border border-gauntlet-500/30 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-gauntlet-400" />
                    <span className="text-gauntlet-300 font-mono text-sm">
                      REQUIRED_KEYS_MISSING
                    </span>
                  </div>
                )}
                
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-terminal-800/50 hover:bg-terminal-700/50 border border-terminal-600/50 hover:border-terminal-500/50 text-terminal-300 hover:text-terminal-200 rounded-xl transition-all duration-200 font-mono text-sm"
                  >
                    CANCEL
                  </button>
                )}
                
                {isFirstRun && (
                  <button
                    onClick={onClose}
                    disabled={!canProceed()}
                    className="px-8 py-3 bg-gradient-to-r from-gauntlet-600 to-gauntlet-500 hover:from-gauntlet-500 hover:to-gauntlet-400 disabled:from-terminal-700 disabled:to-terminal-600 text-white rounded-xl disabled:cursor-not-allowed transition-all duration-200 font-mono text-sm shadow-glow hover:shadow-glow-lg"
                  >
                    {canProceed() ? 'INITIALIZE_SYSTEM' : 'SETUP_REQUIRED'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};