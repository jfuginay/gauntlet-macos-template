import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Heart, Lightbulb } from 'lucide-react';
import { aiService, AIMessage } from '../services/aiService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'engie';
  timestamp: Date;
  type?: 'encouragement' | 'insight' | 'normal';
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm Engie, your AI writing companion and motivational coach. I'm here to help you write better, think clearer, and stay motivated through challenging tasks. Remember: difficult isn't bad - it just means the outcome is worth it! How can I assist you today?",
      sender: 'engie',
      timestamp: new Date(),
      type: 'encouragement'
    }
  ]);
  
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Get AI response from Engie
    try {
      const aiMessages: AIMessage[] = [
        { role: 'user', content: inputText }
      ];
      
      const response = await aiService.sendMessage(aiMessages);
      
      const engieMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.content,
        sender: 'engie',
        timestamp: new Date(),
        type: response.type
      };

      setMessages(prev => [...prev, engieMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Fallback message
      const engieMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting to my AI brain right now, but I'm still here to support you! Try again, or if you need to set up an API key, click the settings icon.",
        sender: 'engie',
        timestamp: new Date(),
        type: 'normal'
      };

      setMessages(prev => [...prev, engieMessage]);
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

  const getMessageIcon = (message: Message) => {
    if (message.sender === 'user') return <User className="w-5 h-5" />;
    
    switch (message.type) {
      case 'encouragement':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'insight':
        return <Lightbulb className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bot className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getMessageBgColor = (message: Message) => {
    if (message.sender === 'user') {
      return 'bg-indigo-600 text-white';
    }
    
    switch (message.type) {
      case 'encouragement':
        return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800';
      case 'insight':
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Chat with Engie</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Your AI writing companion and motivational coach</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-3 max-w-2xl ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.sender === 'user' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                {getMessageIcon(message)}
              </div>
              
              <div className={`px-4 py-3 rounded-2xl ${getMessageBgColor(message)} ${
                message.sender === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
              }`}>
                <p className="text-sm leading-relaxed">{message.text}</p>
                <p className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3 max-w-2xl">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Bot className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md border border-gray-200 dark:border-gray-700">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
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
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Share your thoughts, ask for help, or tell me about your writing challenges..."
              className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 transition-colors max-h-32"
              rows={1}
              style={{ minHeight: '44px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl p-3 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Press Shift+Enter for new line</span>
          <span>Engie is here to encourage and guide you</span>
        </div>
      </div>
    </div>
  );
};