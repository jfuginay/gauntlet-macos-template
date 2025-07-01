import React, { useEffect, useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { TextAnalyzer } from './components/TextAnalyzer';
import { TaskMasterDashboard } from './components/TaskMasterDashboard';
import { ContextMonitor } from './components/ContextMonitor';
import { AIInsights } from './components/AIInsights';
import { SettingsModal } from './components/SettingsModal';
import { useSystemTheme } from './hooks/useSystemTheme';
import { Settings } from 'lucide-react';
import './App.css';

interface AppProps {}

export const App: React.FC<AppProps> = () => {
  const [currentView, setCurrentView] = useState<'chat' | 'analyzer' | 'tasks' | 'context' | 'insights'>('insights');
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const theme = useSystemTheme();

  useEffect(() => {
    // Initialize Engie
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 dark:border-indigo-700"></div>
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-indigo-600 absolute top-0 left-0"></div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Engie is awakening...
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Your AI writing companion & motivational coach
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 ${theme}`}>
      <div className="flex h-screen">
        {/* Engie Sidebar */}
        <div className="w-64 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Engie</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Your AI Writing Companion</p>
          </div>
          
          <nav className="flex-1 p-4">
            <button
              onClick={() => setCurrentView('insights')}
              className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
                currentView === 'insights'
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              🧠 AI Insights
            </button>
            <button
              onClick={() => setCurrentView('tasks')}
              className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
                currentView === 'tasks'
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              🎯 TaskMaster
            </button>
            <button
              onClick={() => setCurrentView('chat')}
              className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
                currentView === 'chat'
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              💬 Chat with Engie
            </button>
            <button
              onClick={() => setCurrentView('analyzer')}
              className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
                currentView === 'analyzer'
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              ✨ Text Analyzer
            </button>
            <button
              onClick={() => setCurrentView('context')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                currentView === 'context'
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              👁️ Context Monitor
            </button>
          </nav>
          
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowSettings(true)}
              className="w-full mb-3 flex items-center justify-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center">
              "Difficult isn't bad - it just means the outcome is worth it."
            </p>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentView === 'insights' && <AIInsights />}
          {currentView === 'tasks' && <TaskMasterDashboard />}
          {currentView === 'chat' && <ChatInterface />}
          {currentView === 'analyzer' && <TextAnalyzer />}
          {currentView === 'context' && <ContextMonitor />}
        </div>
      </div>
      
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default App;