import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, AlertCircle, Lightbulb, TrendingUp, Target } from 'lucide-react';

interface AnalysisResult {
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  readabilityScore: number;
  tone: 'formal' | 'casual' | 'professional' | 'friendly' | 'academic';
  issues: Array<{
    type: 'grammar' | 'style' | 'clarity' | 'tone';
    message: string;
    severity: 'low' | 'medium' | 'high';
    position?: { start: number; end: number };
  }>;
  suggestions: string[];
  encouragement: string;
}

export const TextAnalyzer: React.FC = () => {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeText = useMemo(() => {
    return (inputText: string): AnalysisResult => {
      const words = inputText.trim().split(/\s+/).filter(word => word.length > 0);
      const sentences = inputText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      // Simple readability calculation (Flesch-like)
      const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
      const avgSyllablesPerWord = words.reduce((acc, word) => {
        // Simple syllable count approximation
        const syllables = word.toLowerCase().replace(/[^aeiou]/g, '').length || 1;
        return acc + syllables;
      }, 0) / Math.max(words.length, 1);
      
      const readabilityScore = Math.max(0, Math.min(100, 
        206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
      ));

      // Tone analysis (simplified)
      const formalWords = ['therefore', 'however', 'furthermore', 'consequently', 'moreover'];
      const casualWords = ['yeah', 'cool', 'awesome', 'great', 'nice'];
      const professionalWords = ['strategic', 'optimize', 'implement', 'leverage', 'facilitate'];
      
      let tone: AnalysisResult['tone'] = 'friendly';
      const lowerText = inputText.toLowerCase();
      
      if (formalWords.some(word => lowerText.includes(word))) tone = 'formal';
      else if (casualWords.some(word => lowerText.includes(word))) tone = 'casual';
      else if (professionalWords.some(word => lowerText.includes(word))) tone = 'professional';
      else if (lowerText.includes('research') || lowerText.includes('study')) tone = 'academic';

      // Generate issues and suggestions
      const issues = [];
      const suggestions = [];

      if (avgWordsPerSentence > 25) {
        issues.push({
          type: 'clarity' as const,
          message: 'Some sentences are quite long. Consider breaking them up for better readability.',
          severity: 'medium' as const
        });
        suggestions.push('Break long sentences into shorter, clearer ones');
      }

      if (readabilityScore < 30) {
        issues.push({
          type: 'style' as const,
          message: 'The text might be difficult to read. Consider using simpler language.',
          severity: 'medium' as const
        });
        suggestions.push('Use simpler words and shorter sentences');
      }

      if (words.length > 0 && words.length < 10) {
        suggestions.push('Consider expanding your thoughts with more detail');
      }

      // Generate encouragement based on analysis
      let encouragement = "You're doing great work! ";
      
      if (readabilityScore > 60) {
        encouragement += "Your writing is clear and accessible. ";
      }
      
      if (issues.length === 0) {
        encouragement += "Your writing flows well with good structure. ";
      }
      
      if (words.length > 100) {
        encouragement += "I can see you're tackling a substantial piece of writing - that takes dedication! ";
      }
      
      encouragement += "Remember, every challenging paragraph you work through makes you a stronger writer. Keep pushing forward!";

      return {
        wordCount: words.length,
        charCount: inputText.length,
        sentenceCount: sentences.length,
        readabilityScore: Math.round(readabilityScore),
        tone,
        issues,
        suggestions,
        encouragement
      };
    };
  }, []);

  useEffect(() => {
    if (!text.trim()) {
      setAnalysis(null);
      return;
    }

    setIsAnalyzing(true);
    const timeoutId = setTimeout(() => {
      setAnalysis(analyzeText(text));
      setIsAnalyzing(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [text, analyzeText]);

  const getReadabilityColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getReadabilityLabel = (score: number) => {
    if (score >= 80) return 'Very Easy';
    if (score >= 70) return 'Easy';
    if (score >= 60) return 'Fairly Easy';
    if (score >= 50) return 'Standard';
    if (score >= 30) return 'Fairly Difficult';
    return 'Difficult';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Text Analyzer</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Real-time writing analysis and improvement suggestions</p>
      </div>

      <div className="flex-1 flex">
        {/* Text Input Area */}
        <div className="flex-1 p-4">
          <div className="h-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start typing here, and I'll analyze your writing in real-time..."
              className="w-full h-full resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 transition-colors"
            />
          </div>
        </div>

        {/* Analysis Panel */}
        <div className="w-96 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          {isAnalyzing && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Analyzing...</span>
            </div>
          )}

          {analysis && !isAnalyzing && (
            <div className="space-y-6">
              {/* Statistics */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Statistics
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Words:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{analysis.wordCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Characters:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{analysis.charCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Sentences:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{analysis.sentenceCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Tone:</span>
                    <span className="ml-2 font-medium text-indigo-600 dark:text-indigo-400 capitalize">{analysis.tone}</span>
                  </div>
                </div>
              </div>

              {/* Readability */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Readability
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Score:</span>
                  <div className="text-right">
                    <span className={`font-bold text-lg ${getReadabilityColor(analysis.readabilityScore)}`}>
                      {analysis.readabilityScore}
                    </span>
                    <div className={`text-xs ${getReadabilityColor(analysis.readabilityScore)}`}>
                      {getReadabilityLabel(analysis.readabilityScore)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${analysis.readabilityScore}%` }}
                  />
                </div>
              </div>

              {/* Issues */}
              {analysis.issues.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Areas for Improvement
                  </h3>
                  <div className="space-y-2">
                    {analysis.issues.map((issue, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          issue.severity === 'high' ? 'bg-red-500' :
                          issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{issue.message}</p>
                          <p className={`text-xs capitalize ${getSeverityColor(issue.severity)}`}>
                            {issue.severity} priority
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {analysis.suggestions.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Suggestions
                  </h3>
                  <ul className="space-y-2">
                    {analysis.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-900 dark:text-white">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Encouragement */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Engie's Encouragement
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                  {analysis.encouragement}
                </p>
              </div>
            </div>
          )}

          {!text.trim() && !isAnalyzing && (
            <div className="text-center py-12">
              <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Ready to Analyze
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Start typing in the text area to get real-time writing analysis and encouragement.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};