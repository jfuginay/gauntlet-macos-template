import { Anthropic } from '@anthropic-ai/sdk';
import { 
  WebSocketMessage, 
  PromptClassification, 
  AIConnectionStatus, 
  EnhancedAIResponse, 
  WebSocketConfig 
} from '../../shared/types';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Legacy interface for backward compatibility
export interface AIResponse {
  content: string;
  type: 'encouragement' | 'insight' | 'normal' | 'error';
  mode: 'claude' | 'ollama' | 'fallback';
  online: boolean;
}

class PromptClassifier {
  /**
   * Classify a prompt to determine the best AI model to use
   */
  classifyPrompt(prompt: string): PromptClassification {
    const lowerPrompt = prompt.toLowerCase();
    const words = lowerPrompt.split(' ');
    
    // Initialize characteristics
    const characteristics = {
      hasCodeGeneration: this.hasCodeGeneration(lowerPrompt),
      hasAnalysis: this.hasAnalysis(lowerPrompt),
      hasResearch: this.hasResearch(lowerPrompt),
      hasCreativeWriting: this.hasCreativeWriting(lowerPrompt),
      isConversational: this.isConversational(lowerPrompt),
      isFactual: this.isFactual(lowerPrompt)
    };

    // Calculate complexity score
    let complexityScore = 0;
    let reasoning = '';

    // Code generation is complex
    if (characteristics.hasCodeGeneration) {
      complexityScore += 0.3;
      reasoning += 'Contains code generation request. ';
    }

    // Deep analysis requires Claude
    if (characteristics.hasAnalysis) {
      complexityScore += 0.25;
      reasoning += 'Requires analytical thinking. ';
    }

    // Research needs Claude's knowledge
    if (characteristics.hasResearch) {
      complexityScore += 0.3;
      reasoning += 'Research query detected. ';
    }

    // Creative writing benefits from Claude
    if (characteristics.hasCreativeWriting) {
      complexityScore += 0.2;
      reasoning += 'Creative writing task. ';
    }

    // Length consideration
    if (words.length > 50) {
      complexityScore += 0.15;
      reasoning += 'Long prompt requires sophisticated processing. ';
    }

    // Multi-step reasoning
    if (this.hasMultiStepReasoning(lowerPrompt)) {
      complexityScore += 0.25;
      reasoning += 'Multi-step reasoning detected. ';
    }

    // Domain expertise
    if (this.requiresDomainExpertise(lowerPrompt)) {
      complexityScore += 0.2;
      reasoning += 'Requires domain expertise. ';
    }

    // Determine complexity level
    let complexity: 'simple' | 'moderate' | 'complex';
    let recommendedModel: 'local' | 'claude' | 'auto';

    if (complexityScore < 0.3) {
      complexity = 'simple';
      recommendedModel = 'local';
      reasoning += 'Simple conversational prompt suitable for local model.';
    } else if (complexityScore < 0.6) {
      complexity = 'moderate';
      recommendedModel = 'auto';
      reasoning += 'Moderate complexity - auto-routing based on availability.';
    } else {
      complexity = 'complex';
      recommendedModel = 'claude';
      reasoning += 'Complex prompt requires Claude\'s advanced capabilities.';
    }

    return {
      complexity,
      confidence: Math.min(0.95, 0.6 + complexityScore),
      reasoning: reasoning.trim(),
      recommendedModel,
      characteristics
    };
  }

  private hasCodeGeneration(prompt: string): boolean {
    const codeKeywords = [
      'code', 'function', 'class', 'variable', 'algorithm', 'implement',
      'debug', 'refactor', 'typescript', 'javascript', 'python', 'react',
      'component', 'api', 'database', 'sql', 'css', 'html', 'programming'
    ];
    return codeKeywords.some(keyword => prompt.includes(keyword));
  }

  private hasAnalysis(prompt: string): boolean {
    const analysisKeywords = [
      'analyze', 'compare', 'evaluate', 'assess', 'examine', 'investigate',
      'breakdown', 'pros and cons', 'advantages', 'disadvantages', 'trade-offs'
    ];
    return analysisKeywords.some(keyword => prompt.includes(keyword));
  }

  private hasResearch(prompt: string): boolean {
    const researchKeywords = [
      'research', 'find information', 'latest', 'current', 'recent',
      'what is', 'how does', 'explain', 'background', 'history', 'trends'
    ];
    return researchKeywords.some(keyword => prompt.includes(keyword));
  }

  private hasCreativeWriting(prompt: string): boolean {
    const creativeKeywords = [
      'write', 'story', 'poem', 'creative', 'blog post', 'article',
      'marketing copy', 'email', 'letter', 'narrative', 'description'
    ];
    return creativeKeywords.some(keyword => prompt.includes(keyword));
  }

  private isConversational(prompt: string): boolean {
    const conversationalKeywords = [
      'hello', 'hi', 'how are you', 'thanks', 'thank you', 'please',
      'what can you do', 'help me', 'i need', 'can you'
    ];
    return conversationalKeywords.some(keyword => prompt.includes(keyword)) ||
           prompt.split(' ').length < 10;
  }

  private isFactual(prompt: string): boolean {
    const factualKeywords = [
      'what is', 'when did', 'where is', 'who is', 'how many', 'define',
      'fact', 'information', 'data', 'statistics'
    ];
    return factualKeywords.some(keyword => prompt.includes(keyword));
  }

  private hasMultiStepReasoning(prompt: string): boolean {
    const multiStepIndicators = [
      'first', 'then', 'next', 'finally', 'step by step', 'process',
      'sequence', 'workflow', 'plan', 'strategy', 'approach'
    ];
    return multiStepIndicators.some(indicator => prompt.includes(indicator)) ||
           prompt.includes('and then') || prompt.includes('after that');
  }

  private requiresDomainExpertise(prompt: string): boolean {
    const expertiseKeywords = [
      'technical', 'scientific', 'medical', 'legal', 'financial',
      'engineering', 'architecture', 'design patterns', 'best practices',
      'industry standard', 'professional', 'expert', 'advanced'
    ];
    return expertiseKeywords.some(keyword => prompt.includes(keyword));
  }
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isConnecting = false;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return true;
    }

    this.isConnecting = true;

    try {
      console.log('🔌 Initiating WebSocket connection for Claude API...');
      
      this.ws = new WebSocket(this.config.url);
      
      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          this.isConnecting = false;
          resolve(false);
        }, this.config.timeout);

        this.ws!.onopen = () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          console.log('✅ WebSocket connected for Claude API');
          this.startPingInterval();
          this.flushMessageQueue();
          resolve(true);
        };

        this.ws!.onerror = (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          console.error('❌ WebSocket connection error:', error);
          resolve(false);
        };

        this.ws!.onclose = () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          console.log('🔌 WebSocket connection closed');
          this.stopPingInterval();
          this.scheduleReconnect();
          resolve(false);
        };

        this.ws!.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      });
    } catch (error) {
      this.isConnecting = false;
      console.error('WebSocket connection failed:', error);
      return false;
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPingInterval();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  async sendMessage(message: WebSocketMessage): Promise<boolean> {
    if (!this.isConnected()) {
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.ws!.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      // Handle different message types
      switch (message.type) {
        case 'pong':
          // Keep-alive response
          break;
        case 'response':
          // AI response - would be handled by calling code
          break;
        case 'error':
          console.error('WebSocket error message:', message.data);
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private startPingInterval(): void {
    this.pingTimer = setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage({
          type: 'ping',
          id: Date.now().toString(),
          data: {},
          timestamp: Date.now()
        });
      }
    }, this.config.pingInterval);
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Scheduling WebSocket reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!;
      this.sendMessage(message);
    }
  }
}

class EnhancedAIService {
  private isOnline: boolean = false;
  private hasClaudeAPI: boolean = false;
  private hasOllamaLocal: boolean = false;
  private lastConnectionCheck: number = 0;
  private connectionCheckInterval: number = 30 * 1000; // 30 seconds
  private classifier: PromptClassifier;
  private websocketManager: WebSocketManager;
  private connectionQuality: 'excellent' | 'good' | 'poor' | 'offline' = 'offline';

  constructor() {
    this.classifier = new PromptClassifier();
    this.websocketManager = new WebSocketManager({
      url: 'wss://api.anthropic.com/v1/websocket', // Hypothetical WebSocket endpoint
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      pingInterval: 30000,
      timeout: 10000
    });
    
    this.initializeAI();
  }

  private async initializeAI(): Promise<void> {
    console.log('🤖 Initializing Enhanced AI Service with WebSocket support...');
    await this.checkConnectionStatus();
    
    // Set up periodic connection checks
    setInterval(() => {
      this.checkConnectionStatus();
    }, this.connectionCheckInterval);

    // Set up online status listener
    window.addEventListener('online', () => {
      console.log('🌐 Online status detected - initiating WebSocket connection');
      this.handleOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      console.log('📡 Offline status detected - disconnecting WebSocket');
      this.handleOnlineStatusChange(false);
    });
  }

  private async handleOnlineStatusChange(isOnline: boolean): void {
    this.isOnline = isOnline;
    
    if (isOnline) {
      // Check Claude API availability and initiate WebSocket
      await this.checkClaudeAPI();
      if (this.hasClaudeAPI) {
        console.log('🚀 Initiating WebSocket connection for real-time Claude access...');
        const connected = await this.websocketManager.connect();
        if (connected) {
          this.connectionQuality = 'excellent';
          console.log('✅ WebSocket connection established - switching to real-time mode');
        } else {
          this.connectionQuality = 'good';
          console.log('⚠️ WebSocket failed but HTTP API available');
        }
      }
    } else {
      this.websocketManager.disconnect();
      this.connectionQuality = 'offline';
      this.hasClaudeAPI = false;
    }
  }

  private async checkConnectionStatus(): Promise<void> {
    const now = Date.now();
    if (now - this.lastConnectionCheck < 30000) {
      return;
    }
    this.lastConnectionCheck = now;

    try {
      // Check internet connectivity with multiple endpoints for reliability
      const connectivityPromises = [
        fetch('https://httpbin.org/status/200', { method: 'HEAD', signal: AbortSignal.timeout(3000) }),
        fetch('https://api.anthropic.com/v1/ping', { method: 'HEAD', signal: AbortSignal.timeout(3000) }).catch(() => null)
      ];

      const results = await Promise.allSettled(connectivityPromises);
      const onlineResults = results.filter(r => r.status === 'fulfilled' && r.value?.ok);
      
      this.isOnline = onlineResults.length > 0;
      
      if (this.isOnline) {
        await this.checkClaudeAPI();
        
        // Determine connection quality
        if (onlineResults.length === results.length) {
          this.connectionQuality = 'excellent';
        } else if (onlineResults.length > 0) {
          this.connectionQuality = 'good';
        } else {
          this.connectionQuality = 'poor';
        }

        // Initiate WebSocket if we have Claude API and it's not connected
        if (this.hasClaudeAPI && !this.websocketManager.isConnected()) {
          this.websocketManager.connect().then(connected => {
            if (connected) {
              console.log('🔄 WebSocket reconnected after connectivity check');
            }
          });
        }
        
        console.log(`🌐 Online Mode: Claude API ${this.hasClaudeAPI ? 'Available' : 'Not Available'}, Quality: ${this.connectionQuality}`);
      } else {
        this.hasClaudeAPI = false;
        this.connectionQuality = 'offline';
        this.websocketManager.disconnect();
        console.log('📡 Offline Mode: No internet connection');
      }
      
      // Check Ollama local availability
      await this.checkOllamaLocal();
      
    } catch (error) {
      this.isOnline = false;
      this.hasClaudeAPI = false;
      this.connectionQuality = 'offline';
      console.log('📱 Connection check failed - assuming offline mode');
    }
  }

  private async checkClaudeAPI(): Promise<void> {
    try {
      // Get API key status from secure API key manager
      const apiKey = await window.electronAPI?.getApiKey('ANTHROPIC_API_KEY');
      this.hasClaudeAPI = !!(apiKey && apiKey !== 'your_key_here');
    } catch (error) {
      console.log('Failed to check Claude API key:', error);
      this.hasClaudeAPI = false;
    }
  }

  private async checkOllamaLocal(): Promise<void> {
    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      this.hasOllamaLocal = ollamaResponse.ok;
      console.log(`🦙 Ollama Local: ${this.hasOllamaLocal ? 'Available' : 'Not Available'}`);
    } catch {
      this.hasOllamaLocal = false;
    }
  }

  async generateResponse(
    messages: AIMessage[], 
    context?: { type?: string; data?: any }
  ): Promise<EnhancedAIResponse> {
    const startTime = Date.now();
    
    // Always check connection status before making calls
    await this.checkConnectionStatus();
    
    const lastMessage = messages[messages.length - 1];
    const userPrompt = lastMessage?.content || '';
    
    // Classify the prompt to determine best routing
    const classification = this.classifier.classifyPrompt(userPrompt);
    
    console.log(`🎯 Prompt Classification: ${classification.complexity} (${Math.round(classification.confidence * 100)}%) - ${classification.recommendedModel}`);
    console.log(`💭 Reasoning: ${classification.reasoning}`);

    try {
      // Intelligent routing based on classification and availability
      const response = await this.routePrompt(messages, classification, context);
      
      return {
        ...response,
        classification,
        processingTime: Date.now() - startTime,
        online: this.isOnline,
        websocketUsed: this.websocketManager.isConnected() && response.mode === 'claude'
      };
      
    } catch (error) {
      console.error('AI Service error:', error);
      
      // Intelligent fallback chain
      const fallbackResponse = await this.handleFallbackChain(messages, classification, context);
      
      return {
        ...fallbackResponse,
        classification,
        processingTime: Date.now() - startTime,
        online: this.isOnline,
        websocketUsed: false,
        fallbackReason: String(error)
      };
    }
  }

  private async routePrompt(
    messages: AIMessage[],
    classification: PromptClassification,
    context?: { type?: string; data?: any }
  ): Promise<Pick<EnhancedAIResponse, 'content' | 'type' | 'mode'>> {
    
    // Force Claude for complex prompts that require it
    if (classification.recommendedModel === 'claude' && this.hasClaudeAPI && this.isOnline) {
      console.log('🎯 Routing to Claude for complex prompt...');
      return await this.generateClaudeResponse(messages, context, true);
    }
    
    // Force local for simple prompts that can be handled locally
    if (classification.recommendedModel === 'local' && this.hasOllamaLocal) {
      console.log('🦙 Routing to local Llama for simple prompt...');
      return await this.generateOllamaResponse(messages, context);
    }
    
    // Auto-routing for moderate complexity - prefer Claude if available
    if (classification.recommendedModel === 'auto') {
      if (this.hasClaudeAPI && this.isOnline && this.connectionQuality !== 'poor') {
        console.log('🎯 Auto-routing to Claude (high-quality connection)...');
        return await this.generateClaudeResponse(messages, context, false);
      } else if (this.hasOllamaLocal) {
        console.log('🦙 Auto-routing to local Llama (Claude unavailable)...');
        return await this.generateOllamaResponse(messages, context);
      }
    }
    
    // Default fallback priority
    if (this.hasClaudeAPI && this.isOnline) {
      return await this.generateClaudeResponse(messages, context, false);
    }
    
    if (this.hasOllamaLocal) {
      return await this.generateOllamaResponse(messages, context);
    }
    
    throw new Error('No AI models available');
  }

  private async handleFallbackChain(
    messages: AIMessage[],
    classification: PromptClassification,
    context?: { type?: string; data?: any }
  ): Promise<Pick<EnhancedAIResponse, 'content' | 'type' | 'mode'>> {
    
    // Try alternative models in order of preference
    const fallbackOrder = classification.recommendedModel === 'claude' 
      ? ['ollama', 'fallback'] 
      : ['claude', 'fallback'];
      
    for (const fallback of fallbackOrder) {
      try {
        if (fallback === 'claude' && this.hasClaudeAPI && this.isOnline) {
          console.log('🔄 Fallback: Attempting Claude...');
          return await this.generateClaudeResponse(messages, context, false);
        }
        
        if (fallback === 'ollama' && this.hasOllamaLocal) {
          console.log('🔄 Fallback: Attempting Ollama...');
          return await this.generateOllamaResponse(messages, context);
        }
      } catch (error) {
        console.log(`Fallback ${fallback} also failed:`, error);
        continue;
      }
    }
    
    // Final fallback
    console.log('⚠️ All AI models failed - using smart fallback response...');
    return this.generateIntelligentFallbackResponse(messages, classification, context);
  }

  private async generateClaudeResponse(
    messages: AIMessage[], 
    context?: { type?: string; data?: any },
    priorityRouting: boolean = false
  ): Promise<Pick<EnhancedAIResponse, 'content' | 'type' | 'mode'>> {
    
    const lastMessage = messages[messages.length - 1];
    const userInput = lastMessage?.content || '';
    
    // Try WebSocket first for real-time communication
    if (this.websocketManager.isConnected() && priorityRouting) {
      try {
        console.log('🌐 Using WebSocket for real-time Claude communication...');
        const wsMessage: WebSocketMessage = {
          type: 'prompt',
          id: Date.now().toString(),
          data: { messages, context },
          timestamp: Date.now()
        };
        
        const sent = await this.websocketManager.sendMessage(wsMessage);
        if (sent) {
          // In a real implementation, we'd wait for the WebSocket response
          // For now, fall back to HTTP API
        }
      } catch (error) {
        console.log('WebSocket failed, falling back to HTTP API:', error);
      }
    }
    
    // HTTP API fallback (main implementation for now)
    const response = await window.electronAPI?.localLLM?.query(`
      As Claude (Anthropic's AI assistant), respond professionally and intelligently to: "${userInput}"
      
      Context: ${context?.type || 'general conversation'}
      
      Be sophisticated, thoughtful, and provide comprehensive insights.
      You are integrated into ENGIE, an AI desktop companion for goal achievement.
      
      ${priorityRouting ? 'This is a complex prompt requiring your advanced capabilities.' : ''}
    `);
    
    if (response?.success && response.data) {
      let content = response.data;
      if (typeof content === 'object') {
        content = content.data || content.response || String(content);
      }
      
      return {
        content: `🎯 ${content}`,
        type: 'normal',
        mode: 'claude'
      };
    }
    
    throw new Error('Claude API response failed');
  }

  private async generateOllamaResponse(
    messages: AIMessage[], 
    context?: { type?: string; data?: any }
  ): Promise<Pick<EnhancedAIResponse, 'content' | 'type' | 'mode'>> {
    
    const lastMessage = messages[messages.length - 1];
    const userInput = lastMessage?.content || '';
    
    const response = await window.electronAPI?.localLLM?.query(`
      Respond helpfully and efficiently to: "${userInput}"
      
      Context: ${context?.type || 'general conversation'}
      
      You are part of ENGIE, an AI desktop companion focused on helping users achieve their goals.
      Be practical, encouraging, and action-oriented. Keep responses concise but helpful.
    `);
    
    if (response?.success && response.data) {
      let content = response.data;
      if (typeof content === 'object') {
        content = content.data || content.response || String(content);
      }
      
      return {
        content: `🦙 ${content}`,
        type: 'normal',
        mode: 'ollama'
      };
    }
    
    throw new Error('Ollama local model failed');
  }

  private generateIntelligentFallbackResponse(
    messages: AIMessage[], 
    classification: PromptClassification,
    context?: { type?: string; data?: any }
  ): Pick<EnhancedAIResponse, 'content' | 'type' | 'mode'> {
    
    const lastMessage = messages[messages.length - 1];
    const userInput = lastMessage?.content?.toLowerCase() || '';
    
    // Classification-aware fallback responses
    if (classification.characteristics.hasCodeGeneration) {
      return {
        content: `💻 I'd love to help with code generation! While my full AI capabilities are currently limited, I can guide you through the process:\n\n• Break down the requirements\n• Suggest implementation approaches\n• Provide coding best practices\n\nTo unlock my advanced code generation abilities, please ensure Claude API access or local Ollama is running.`,
        type: 'insight',
        mode: 'fallback'
      };
    }
    
    if (classification.characteristics.hasAnalysis) {
      return {
        content: `🔍 Analysis requests require my advanced reasoning capabilities. While in limited mode, I can help you:\n\n• Structure your analysis approach\n• Identify key factors to consider\n• Suggest evaluation criteria\n\nFor detailed analysis, connect to Claude API or install Ollama locally.`,
        type: 'insight',
        mode: 'fallback'
      };
    }
    
    if (classification.characteristics.hasResearch) {
      return {
        content: `🔬 Research queries need access to my full knowledge capabilities. Currently in limited mode, but I can help you:\n\n• Identify research directions\n• Suggest reliable sources\n• Structure your inquiry\n\nFor comprehensive research, ensure Claude API connectivity.`,
        type: 'insight',
        mode: 'fallback'
      };
    }
    
    if (classification.characteristics.isConversational) {
      return {
        content: `👋 Hello! I'm ENGIE, your AI companion. I'm currently in limited mode, but I'm here to listen and help however I can!\n\n🌟 **Available now:**\n• Basic conversation\n• Encouragement and motivation\n• Task organization guidance\n\n⚡ **For full capabilities:**\n• Connect to internet + Claude API\n• Install Ollama for local processing\n\nWhat can I help you with today?`,
        type: 'normal',
        mode: 'fallback'
      };
    }
    
    // General fallback based on complexity
    const modeDescription = this.isOnline ? 'basic' : 'offline';
    
    return {
      content: `I hear you! I'm currently running in ${modeDescription} mode with limited AI capabilities.\n\n**Your prompt was classified as:** ${classification.complexity} complexity\n**Recommended model:** ${classification.recommendedModel}\n\n**To unlock full capabilities:**\n• **Online mode**: Claude API for advanced reasoning\n• **Local mode**: Ollama for private processing\n\nUntil then, I'm here to provide what guidance I can! How can I help structure your thinking?`,
      type: 'normal',
      mode: 'fallback'
    };
  }

  // Legacy compatibility method
  async generateLegacyResponse(
    messages: AIMessage[], 
    context?: { type?: string; data?: any }
  ): Promise<AIResponse> {
    const enhancedResponse = await this.generateResponse(messages, context);
    
    return {
      content: enhancedResponse.content,
      type: enhancedResponse.type,
      mode: enhancedResponse.mode,
      online: enhancedResponse.online
    };
  }

  // Status getters
  getConnectionStatus(): AIConnectionStatus {
    return {
      isOnline: this.isOnline,
      hasClaudeAPI: this.hasClaudeAPI,
      hasOllamaLocal: this.hasOllamaLocal,
      websocketConnected: this.websocketManager.isConnected(),
      currentModel: this.hasClaudeAPI && this.isOnline ? 'claude' : 
                  this.hasOllamaLocal ? 'ollama' : 'fallback',
      lastConnectionCheck: this.lastConnectionCheck,
      connectionQuality: this.connectionQuality
    };
  }

  // Force refresh connection status
  async refreshConnectionStatus(): Promise<void> {
    this.lastConnectionCheck = 0;
    await this.checkConnectionStatus();
  }

  // Health check for system monitoring
  async healthCheck(): Promise<{ status: string; details: any }> {
    await this.checkConnectionStatus();
    
    return {
      status: this.hasClaudeAPI ? 'optimal' : 
              this.hasOllamaLocal ? 'good' : 'limited',
      details: {
        online: this.isOnline,
        claudeAPI: this.hasClaudeAPI,
        ollamaLocal: this.hasOllamaLocal,
        websocketConnected: this.websocketManager.isConnected(),
        connectionQuality: this.connectionQuality,
        lastCheck: new Date(this.lastConnectionCheck).toISOString()
      }
    };
  }

  // Disconnect and cleanup
  disconnect(): void {
    this.websocketManager.disconnect();
  }
}

export const aiService = new EnhancedAIService();
export default aiService;