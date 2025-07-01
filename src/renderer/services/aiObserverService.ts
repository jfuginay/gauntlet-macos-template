import { contextMonitorService } from './contextMonitorService';
import { aiService } from './aiService';

export interface ActivityNarrative {
  id: string;
  timestamp: Date;
  timeframe: string; // "last 5 minutes", "last hour", etc.
  summary: string;
  insights: string[];
  patterns: ActivityPattern[];
  recommendations: string[];
  mood: 'productive' | 'exploratory' | 'distracted' | 'focused' | 'learning' | 'communicating';
  confidence: number;
}

export interface ActivityPattern {
  type: 'app_switching' | 'deep_focus' | 'research_mode' | 'coding_session' | 'communication_burst' | 'break_time';
  description: string;
  duration: number; // in minutes
  frequency: number;
  significance: 'high' | 'medium' | 'low';
}

export interface ObservationSettings {
  intervalMinutes: number;
  enableSmartInsights: boolean;
  enableMoodDetection: boolean;
  enablePatternAnalysis: boolean;
  enableProactiveComments: boolean;
  observationDepth: 'basic' | 'detailed' | 'comprehensive';
}

class AIObserverService {
  private isObserving = false;
  private observationInterval: NodeJS.Timeout | null = null;
  private narrativeHistory: ActivityNarrative[] = [];
  private maxHistorySize = 100;
  private settings: ObservationSettings = {
    intervalMinutes: 15,
    enableSmartInsights: true,
    enableMoodDetection: true,
    enablePatternAnalysis: true,
    enableProactiveComments: true,
    observationDepth: 'detailed'
  };

  constructor() {
    console.log('🤖 AI Observer Service initialized');
  }

  async startObserving(customSettings?: Partial<ObservationSettings>): Promise<void> {
    if (this.isObserving) {
      console.log('AI Observer already active');
      return;
    }

    if (customSettings) {
      this.settings = { ...this.settings, ...customSettings };
    }

    console.log('🔍 Starting AI-powered activity observation...');
    this.isObserving = true;

    // Take initial observation
    await this.generateActivityNarrative();

    // Set up periodic observations
    this.observationInterval = setInterval(async () => {
      try {
        await this.generateActivityNarrative();
      } catch (error) {
        console.error('AI observation error:', error);
      }
    }, this.settings.intervalMinutes * 60 * 1000);
  }

  stopObserving(): void {
    if (this.observationInterval) {
      clearInterval(this.observationInterval);
      this.observationInterval = null;
    }
    this.isObserving = false;
    console.log('🛑 AI observation stopped');
  }

  async generateActivityNarrative(timeframeMins: number = 15): Promise<ActivityNarrative> {
    try {
      console.log(`🧠 Analyzing last ${timeframeMins} minutes of activity...`);

      // Get recent context history
      const contextHistory = contextMonitorService.getContextHistory();
      const recentContexts = this.filterRecentContexts(contextHistory, timeframeMins);
      
      // Analyze patterns
      const patterns = this.analyzeActivityPatterns(recentContexts);
      
      // Generate AI-powered narrative
      const narrative = await this.generateAINarrative(recentContexts, patterns, timeframeMins);
      
      // Store in history
      this.narrativeHistory.push(narrative);
      if (this.narrativeHistory.length > this.maxHistorySize) {
        this.narrativeHistory.shift();
      }

      console.log('📝 Generated activity narrative:', narrative.summary);
      return narrative;
    } catch (error) {
      console.error('Failed to generate activity narrative:', error);
      return this.createFallbackNarrative(timeframeMins);
    }
  }

  private filterRecentContexts(contexts: any[], minutes: number): any[] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return contexts.filter(context => 
      context.timestamp && new Date(context.timestamp) > cutoffTime
    );
  }

  private analyzeActivityPatterns(contexts: any[]): ActivityPattern[] {
    const patterns: ActivityPattern[] = [];

    if (contexts.length === 0) {
      return patterns;
    }

    // Detect app switching patterns
    const appSwitches = this.countAppSwitches(contexts);
    if (appSwitches > 5) {
      patterns.push({
        type: 'app_switching',
        description: `Frequent app switching detected (${appSwitches} switches)`,
        duration: contexts.length,
        frequency: appSwitches,
        significance: appSwitches > 10 ? 'high' : 'medium'
      });
    }

    // Detect deep focus sessions
    const focusSession = this.detectFocusSession(contexts);
    if (focusSession) {
      patterns.push(focusSession);
    }

    // Detect research patterns
    const researchPattern = this.detectResearchPattern(contexts);
    if (researchPattern) {
      patterns.push(researchPattern);
    }

    // Detect coding sessions
    const codingSession = this.detectCodingSession(contexts);
    if (codingSession) {
      patterns.push(codingSession);
    }

    return patterns;
  }

  private countAppSwitches(contexts: any[]): number {
    let switches = 0;
    for (let i = 1; i < contexts.length; i++) {
      if (contexts[i].activeApp !== contexts[i-1].activeApp) {
        switches++;
      }
    }
    return switches;
  }

  private detectFocusSession(contexts: any[]): ActivityPattern | null {
    // Look for extended time in the same app
    const appDurations = new Map<string, number>();
    
    contexts.forEach(context => {
      const app = context.activeApp;
      appDurations.set(app, (appDurations.get(app) || 0) + 1);
    });

    const maxApp = Array.from(appDurations.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (maxApp && maxApp[1] > contexts.length * 0.7) {
      return {
        type: 'deep_focus',
        description: `Deep focus session in ${maxApp[0]}`,
        duration: maxApp[1],
        frequency: 1,
        significance: 'high'
      };
    }

    return null;
  }

  private detectResearchPattern(contexts: any[]): ActivityPattern | null {
    const browserContexts = contexts.filter(c => 
      c.activeApp === 'Google Chrome' || c.activeApp === 'Safari' || c.activeApp === 'Firefox'
    );

    if (browserContexts.length > contexts.length * 0.6) {
      return {
        type: 'research_mode',
        description: 'Extended browser research session',
        duration: browserContexts.length,
        frequency: browserContexts.length,
        significance: 'medium'
      };
    }

    return null;
  }

  private detectCodingSession(contexts: any[]): ActivityPattern | null {
    const codeContexts = contexts.filter(c => 
      ['Cursor', 'VS Code', 'WebStorm', 'Xcode', 'Terminal', 'iTerm'].includes(c.activeApp)
    );

    if (codeContexts.length > contexts.length * 0.5) {
      return {
        type: 'coding_session',
        description: 'Active coding/development session',
        duration: codeContexts.length,
        frequency: codeContexts.length,
        significance: 'high'
      };
    }

    return null;
  }

  private async generateAINarrative(
    contexts: any[], 
    patterns: ActivityPattern[], 
    timeframeMins: number
  ): Promise<ActivityNarrative> {
    try {
      // Create a comprehensive activity summary for AI analysis
      const activitySummary = this.createActivitySummary(contexts, patterns);
      
      // Generate AI analysis
      const aiResponse = await this.getAIAnalysis(activitySummary, timeframeMins);
      
      // Determine mood
      const mood = this.determineMood(patterns, contexts);
      
      return {
        id: this.generateId(),
        timestamp: new Date(),
        timeframe: `last ${timeframeMins} minutes`,
        summary: aiResponse.summary || this.generateBasicSummary(contexts, patterns),
        insights: aiResponse.insights || this.generateBasicInsights(patterns),
        patterns: patterns,
        recommendations: aiResponse.recommendations || this.generateBasicRecommendations(patterns),
        mood: mood,
        confidence: aiResponse.confidence || 0.7
      };
    } catch (error) {
      console.error('AI narrative generation failed:', error);
      return this.createFallbackNarrative(timeframeMins);
    }
  }

  private createActivitySummary(contexts: any[], patterns: ActivityPattern[]): string {
    const apps = [...new Set(contexts.map(c => c.activeApp))];
    const primaryApp = this.getMostUsedApp(contexts);
    const windowTitles = contexts.map(c => c.windowTitle).filter(Boolean);
    
    return `
Activity Summary:
- Time period: ${contexts.length} context snapshots
- Applications used: ${apps.join(', ')}
- Primary application: ${primaryApp}
- Detected patterns: ${patterns.map(p => p.type).join(', ')}
- Sample window titles: ${windowTitles.slice(0, 3).join(' | ')}
- Pattern significance: ${patterns.filter(p => p.significance === 'high').length} high-impact patterns
`;
  }

  private async getAIAnalysis(activitySummary: string, _timeframeMins: number): Promise<{
    summary: string;
    insights: string[];
    recommendations: string[];
    confidence: number;
  }> {
    try {
      // Use the enhanced AI service method
      return await aiService.analyzeActivity(activitySummary);
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw error;
    }
  }

  // This method is kept for potential future use but currently unused
  // private parseAITextResponse(text: string): {
  //   summary: string;
  //   insights: string[];
  //   recommendations: string[];
  //   confidence: number;
  // } {
  //   // Extract summary (first paragraph)
  //   const lines = text.split('\n').filter(line => line.trim());
  //   const summary = lines[0] || '';
    
  //   // Extract insights and recommendations from the text
  //   const insights: string[] = [];
  //   const recommendations: string[] = [];
    
  //   lines.forEach(line => {
  //     if (line.includes('insight') || line.includes('pattern') || line.includes('notice')) {
  //       insights.push(line.trim());
  //     }
  //     if (line.includes('recommend') || line.includes('suggest') || line.includes('try')) {
  //       recommendations.push(line.trim());
  //     }
  //   });

  //   return {
  //     summary,
  //     insights: insights.slice(0, 3),
  //     recommendations: recommendations.slice(0, 2),
  //     confidence: 0.6
  //   };
  // }

  private getMostUsedApp(contexts: any[]): string {
    const appCounts = new Map<string, number>();
    contexts.forEach(context => {
      const app = context.activeApp;
      appCounts.set(app, (appCounts.get(app) || 0) + 1);
    });
    
    return Array.from(appCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
  }

  private determineMood(patterns: ActivityPattern[], contexts: any[]): ActivityNarrative['mood'] {
    // Analyze patterns to determine mood
    if (patterns.some(p => p.type === 'deep_focus')) return 'focused';
    if (patterns.some(p => p.type === 'coding_session')) return 'productive';
    if (patterns.some(p => p.type === 'research_mode')) return 'learning';
    if (patterns.some(p => p.type === 'app_switching' && p.significance === 'high')) return 'distracted';
    
    // Check for communication apps
    const commApps = ['Mail', 'Slack', 'Discord', 'Teams', 'Messages'];
    if (contexts.some(c => commApps.includes(c.activeApp))) return 'communicating';
    
    return 'exploratory';
  }

  private generateBasicSummary(contexts: any[], patterns: ActivityPattern[]): string {
    const primaryApp = this.getMostUsedApp(contexts);
    const patternDescriptions = patterns.map(p => p.description).join(', ');
    
    return `I observed you working primarily in ${primaryApp}. ${patternDescriptions || 'You maintained a steady workflow.'}`;
  }

  private generateBasicInsights(patterns: ActivityPattern[]): string[] {
    const insights: string[] = [];
    
    if (patterns.some(p => p.type === 'deep_focus')) {
      insights.push('You showed excellent focus and concentration');
    }
    if (patterns.some(p => p.type === 'app_switching')) {
      insights.push('You juggled multiple applications efficiently');
    }
    if (patterns.some(p => p.type === 'coding_session')) {
      insights.push('You were in a productive development flow');
    }
    
    return insights.length > 0 ? insights : ['You maintained consistent activity'];
  }

  private generateBasicRecommendations(patterns: ActivityPattern[]): string[] {
    const recommendations: string[] = [];
    
    if (patterns.some(p => p.type === 'app_switching' && p.significance === 'high')) {
      recommendations.push('Consider taking a brief break to refocus');
    } else {
      recommendations.push('Keep up the great momentum!');
    }
    
    return recommendations;
  }

  private createFallbackNarrative(timeframeMins: number): ActivityNarrative {
    return {
      id: this.generateId(),
      timestamp: new Date(),
      timeframe: `last ${timeframeMins} minutes`,
      summary: `I observed your activity over the past ${timeframeMins} minutes. You're making progress, and that's what matters.`,
      insights: ['Every moment of effort counts toward your goals'],
      patterns: [],
      recommendations: ['Remember: difficult isn\'t bad - it just means the outcome is worth it'],
      mood: 'productive',
      confidence: 0.5
    };
  }

  private generateId(): string {
    return `narrative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  getLatestNarrative(): ActivityNarrative | null {
    return this.narrativeHistory[this.narrativeHistory.length - 1] || null;
  }

  getNarrativeHistory(): ActivityNarrative[] {
    return [...this.narrativeHistory];
  }

  async generateOnDemandInsight(): Promise<ActivityNarrative> {
    console.log('🎯 Generating on-demand insight...');
    return await this.generateActivityNarrative(5); // Last 5 minutes
  }

  async generateHourlyReview(): Promise<ActivityNarrative> {
    console.log('📊 Generating hourly review...');
    return await this.generateActivityNarrative(60); // Last hour
  }

  updateSettings(newSettings: Partial<ObservationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    console.log('⚙️ Observer settings updated:', this.settings);
  }

  getSettings(): ObservationSettings {
    return { ...this.settings };
  }

  isCurrentlyObserving(): boolean {
    return this.isObserving;
  }

  // Get insights about specific patterns
  async getPatternAnalysis(patternType: ActivityPattern['type']): Promise<string[]> {
    const relevantNarratives = this.narrativeHistory.filter(n => 
      n.patterns.some(p => p.type === patternType)
    );
    
    if (relevantNarratives.length === 0) {
      return [`No recent ${patternType} patterns detected`];
    }

    const insights = relevantNarratives
      .flatMap(n => n.insights)
      .filter((insight, index, array) => array.indexOf(insight) === index); // Remove duplicates

    return insights.slice(0, 5); // Top 5 insights
  }
}

export const aiObserverService = new AIObserverService();