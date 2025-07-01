import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Wifi, WifiOff, Zap, Brain } from 'lucide-react';
import aiService, { AIMessage } from '../services/aiService';
import { EnhancedAIResponse } from '../../shared/types';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'engie';
  timestamp: Date;
  metadata?: {
    mode?: 'claude' | 'ollama' | 'fallback';
    complexity?: 'simple' | 'moderate' | 'complex';
    processingTime?: number;
    websocketUsed?: boolean;
    classification?: any;
  };
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm Engie, your AI desktop companion. I'm here to help with tasks, writing, and staying motivated. How can I assist you today?",
      sender: 'engie',
      timestamp: new Date(),
      metadata: {
        mode: 'fallback',
        complexity: 'simple',
        processingTime: 0,
        websocketUsed: false
      }
    }
  ]);
  
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(aiService.getConnectionStatus());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Update connection status periodically
    const interval = setInterval(() => {
      setConnectionStatus(aiService.getConnectionStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsTyping(true);

    try {
      // Convert to AI service format
      const aiMessages: AIMessage[] = [
        ...messages.map(m => ({
          role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
          content: m.text
        })),
        { role: 'user' as const, content: currentInput }
      ];

      // Get enhanced AI response with classification and routing
      const response: EnhancedAIResponse = await aiService.generateResponse(aiMessages, {
        type: 'chat_conversation'
      });

      const engieMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.content,
        sender: 'engie',
        timestamp: new Date(),
        metadata: {
          mode: response.mode,
          complexity: response.classification.complexity,
          processingTime: response.processingTime,
          websocketUsed: response.websocketUsed,
          classification: response.classification
        }
      };

      setMessages(prev => [...prev, engieMessage]);
      
      // Update connection status after successful response
      setConnectionStatus(aiService.getConnectionStatus());
      
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble responding right now. Please check your connection and try again.",
        sender: 'engie',
        timestamp: new Date(),
        metadata: {
          mode: 'fallback',
          complexity: 'simple',
          processingTime: 0,
          websocketUsed: false
        }
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getConnectionIcon = () => {
    if (connectionStatus.websocketConnected) {
      return <div title="WebSocket Connected - Real-time mode"><Zap className="w-4 h-4 text-green-500" /></div>;
    } else if (connectionStatus.hasClaudeAPI) {
      return <div title="Claude API Available"><Brain className="w-4 h-4 text-blue-500" /></div>;
    } else if (connectionStatus.hasOllamaLocal) {
      return <div title="Local Ollama Available"><Bot className="w-4 h-4 text-purple-500" /></div>;
    } else if (connectionStatus.isOnline) {
      return <div title="Online - Limited capabilities"><Wifi className="w-4 h-4 text-orange-500" /></div>;
    } else {
      return <div title="Offline mode"><WifiOff className="w-4 h-4 text-red-500" /></div>;
    }
  };

  const getConnectionText = () => {
    if (connectionStatus.websocketConnected) {
      return 'Real-time Claude';
    } else if (connectionStatus.currentModel === 'claude') {
      return 'Claude API';
    } else if (connectionStatus.currentModel === 'ollama') {
      return 'Local Ollama';
    } else {
      return 'Limited Mode';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status Header */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getConnectionIcon()}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getConnectionText()}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({connectionStatus.connectionQuality})
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Last check: {new Date(connectionStatus.lastConnectionCheck).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-3 max-w-lg ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.sender === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
              }`}>
                {message.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className={`px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}>
                <p className="text-sm">{message.text}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {message.sender === 'engie' && message.metadata && (
                    <div className="flex items-center space-x-2 text-xs opacity-70">
                      {message.metadata.websocketUsed && (
                        <span className="bg-green-500 text-white px-1 rounded text-xs">WS</span>
                      )}
                      <span className={`px-1 rounded text-xs ${
                        message.metadata.mode === 'claude' ? 'bg-blue-500 text-white' :
                        message.metadata.mode === 'ollama' ? 'bg-purple-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {message.metadata.mode?.toUpperCase()}
                      </span>
                      {message.metadata.complexity && (
                        <span className={`px-1 rounded text-xs ${
                          message.metadata.complexity === 'complex' ? 'bg-red-500 text-white' :
                          message.metadata.complexity === 'moderate' ? 'bg-yellow-500 text-white' :
                          'bg-green-500 text-white'
                        }`}>
                          {message.metadata.complexity.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {message.metadata.processingTime && message.metadata.processingTime > 0 && (
                        <span className="text-xs">
                          {Math.round(message.metadata.processingTime)}ms
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3 max-w-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            rows={1}
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg p-2 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};