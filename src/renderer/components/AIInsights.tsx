import React, { useEffect, useState } from 'react';
import { 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  Zap,
  Eye,
  RefreshCw,
  Settings,
  MessageCircle,
  Target,
  Calendar
} from 'lucide-react';
import { aiObserverService, ActivityNarrative, ObservationSettings } from '../services/aiObserverService';

export const AIInsights: React.FC = () => {
  const [isObserving, setIsObserving] = useState(false);
  const [latestNarrative, setLatestNarrative] = useState<ActivityNarrative | null>(null);
  const [narrativeHistory, setNarrativeHistory] = useState<ActivityNarrative[]>([]);
  const [settings, setSettings] = useState<ObservationSettings>(aiObserverService.getSettings());
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsObserving(aiObserverService.isCurrentlyObserving());
    setLatestNarrative(aiObserverService.getLatestNarrative());
    setNarrativeHistory(aiObserverService.getNarrativeHistory());

    // Set up periodic updates
    const interval = setInterval(() => {
      setLatestNarrative(aiObserverService.getLatestNarrative());
      setNarrativeHistory(aiObserverService.getNarrativeHistory());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleStartObserving = async () => {
    await aiObserverService.startObserving(settings);
    setIsObserving(true);
  };

  const handleStopObserving = () => {
    aiObserverService.stopObserving();
    setIsObserving(false);
  };

  const handleGenerateInsight = async () => {
    setIsGenerating(true);
    try {
      const insight = await aiObserverService.generateOnDemandInsight();
      setLatestNarrative(insight);
      setNarrativeHistory(aiObserverService.getNarrativeHistory());
    } catch (error) {
      console.error('Failed to generate insight:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateHourlyReview = async () => {
    setIsGenerating(true);
    try {
      const review = await aiObserverService.generateHourlyReview();
      setLatestNarrative(review);
      setNarrativeHistory(aiObserverService.getNarrativeHistory());
    } catch (error) {
      console.error('Failed to generate hourly review:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateSettings = (newSettings: Partial<ObservationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    aiObserverService.updateSettings(updatedSettings);
  };

  const getMoodIcon = (mood: ActivityNarrative['mood']) => {
    switch (mood) {
      case 'focused': return <Target className="w-4 h-4 text-blue-500" />;
      case 'productive': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'learning': return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case 'communicating': return <MessageCircle className="w-4 h-4 text-purple-500" />;
      case 'distracted': return <RefreshCw className="w-4 h-4 text-red-500" />;
      default: return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMoodColor = (mood: ActivityNarrative['mood']) => {
    switch (mood) {
      case 'focused': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'productive': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'learning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'communicating': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'distracted': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'deep_focus': return <Target className="w-4 h-4 text-blue-500" />;
      case 'coding_session': return <Zap className="w-4 h-4 text-green-500" />;
      case 'research_mode': return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case 'app_switching': return <RefreshCw className="w-4 h-4 text-orange-500" />;
      case 'communication_burst': return <MessageCircle className="w-4 h-4 text-purple-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Brain className="w-8 h-8 mr-3 text-indigo-600 dark:text-indigo-400" />
            AI Insights
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Engie's intelligent observations about your workflow
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleGenerateInsight}
            disabled={isGenerating}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Lightbulb className="w-4 h-4 mr-2" />
            )}
            Quick Insight
          </button>
          
          <button
            onClick={handleGenerateHourlyReview}
            disabled={isGenerating}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Hourly Review
          </button>
          
          {isObserving ? (
            <button
              onClick={handleStopObserving}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Eye className="w-4 h-4 mr-2" />
              Stop Observing
            </button>
          ) : (
            <button
              onClick={handleStartObserving}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Eye className="w-4 h-4 mr-2" />
              Start Observing
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Observation Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Observation Interval
              </label>
              <select
                value={settings.intervalMinutes}
                onChange={(e) => handleUpdateSettings({ intervalMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Observation Depth
              </label>
              <select
                value={settings.observationDepth}
                onChange={(e) => handleUpdateSettings({ observationDepth: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="basic">Basic</option>
                <option value="detailed">Detailed</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 space-y-3">
            {[
              { key: 'enableSmartInsights', label: 'Smart Insights' },
              { key: 'enableMoodDetection', label: 'Mood Detection' },
              { key: 'enablePatternAnalysis', label: 'Pattern Analysis' },
              { key: 'enableProactiveComments', label: 'Proactive Comments' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings[key as keyof ObservationSettings] as boolean}
                  onChange={(e) => handleUpdateSettings({ [key]: e.target.checked })}
                  className="mr-3 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Latest Narrative */}
      {latestNarrative && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Latest Observation
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1 ${getMoodColor(latestNarrative.mood)}`}>
                {getMoodIcon(latestNarrative.mood)}
                <span className="capitalize">{latestNarrative.mood}</span>
              </span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {latestNarrative.timestamp.toLocaleTimeString()} • {latestNarrative.timeframe}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Summary</h4>
              <p className="text-gray-700 dark:text-gray-300">{latestNarrative.summary}</p>
            </div>

            {latestNarrative.insights.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Insights</h4>
                <ul className="space-y-1">
                  {latestNarrative.insights.map((insight, index) => (
                    <li key={index} className="flex items-start">
                      <Lightbulb className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {latestNarrative.patterns.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Detected Patterns</h4>
                <div className="flex flex-wrap gap-2">
                  {latestNarrative.patterns.map((pattern, index) => (
                    <div key={index} className="flex items-center bg-white dark:bg-gray-700 px-3 py-2 rounded-lg">
                      {getPatternIcon(pattern.type)}
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {pattern.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {latestNarrative.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {latestNarrative.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Confidence: {Math.round(latestNarrative.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Observation Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isObserving ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="font-medium text-gray-900 dark:text-white">
              {isObserving ? 'Actively Observing' : 'Observation Paused'}
            </span>
            {isObserving && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Every {settings.intervalMinutes} minutes
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {narrativeHistory.length} observations recorded
          </span>
        </div>
      </div>

      {/* Narrative History */}
      {narrativeHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Observations
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Engie's insights about your workflow patterns
            </p>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {narrativeHistory.slice(-10).reverse().map((narrative) => (
              <div key={narrative.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs flex items-center space-x-1 ${getMoodColor(narrative.mood)}`}>
                      {getMoodIcon(narrative.mood)}
                      <span className="capitalize">{narrative.mood}</span>
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {narrative.timeframe}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {narrative.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {narrative.summary}
                </p>
                
                {narrative.patterns.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {narrative.patterns.map((pattern, patternIndex) => (
                      <span key={patternIndex} className="text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                        {pattern.type.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isObserving && narrativeHistory.length === 0 && (
        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Ready to Start Observing
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Let Engie watch your workflow and provide intelligent insights about your productivity patterns.
          </p>
          <button
            onClick={handleStartObserving}
            className="flex items-center mx-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Eye className="w-4 h-4 mr-2" />
            Begin AI Observation
          </button>
        </div>
      )}
    </div>
  );
};