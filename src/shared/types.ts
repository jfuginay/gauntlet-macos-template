// Shared types for Engie application

export interface WebSocketMessage {
  type: 'prompt' | 'response' | 'ping' | 'pong' | 'error' | 'status';
  id: string;
  data: any;
  timestamp: number;
}

export interface PromptClassification {
  complexity: 'simple' | 'moderate' | 'complex';
  confidence: number;
  reasoning: string;
  recommendedModel: 'local' | 'claude' | 'auto';
  characteristics: {
    hasCodeGeneration: boolean;
    hasAnalysis: boolean;
    hasResearch: boolean;
    hasCreativeWriting: boolean;
    isConversational: boolean;
    isFactual: boolean;
  };
}

export interface AIConnectionStatus {
  isOnline: boolean;
  hasClaudeAPI: boolean;
  hasOllamaLocal: boolean;
  websocketConnected: boolean;
  currentModel: 'claude' | 'ollama' | 'fallback';
  lastConnectionCheck: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

export interface EnhancedAIResponse {
  content: string;
  type: 'encouragement' | 'insight' | 'normal' | 'error';
  mode: 'claude' | 'ollama' | 'fallback';
  classification: PromptClassification;
  processingTime: number;
  online: boolean;
  websocketUsed: boolean;
  fallbackReason?: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  pingInterval: number;
  timeout: number;
}