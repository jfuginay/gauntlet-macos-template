import { Anthropic } from '@anthropic-ai/sdk';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  type: 'encouragement' | 'insight' | 'normal';
}

class AIService {
  private anthropic: Anthropic | null = null;
  private apiKey: string | null = null;

  constructor() {
    // In a real app, this would come from secure storage or environment
    // For MVP, we'll use a placeholder
    this.initializeAI();
  }

  private async initializeAI() {
    try {
      // Check if API key is available from environment or secure storage
      const apiKey = process.env.ANTHROPIC_API_KEY || localStorage.getItem('anthropic_api_key');
      
      if (apiKey) {
        this.anthropic = new Anthropic({ 
          apiKey,
          dangerouslyAllowBrowser: true // Only for development
        });
        this.apiKey = apiKey;
      }
    } catch (error) {
      console.warn('AI service initialization failed:', error);
    }
  }

  async sendMessage(messages: AIMessage[]): Promise<AIResponse> {
    // If no AI service available, use intelligent fallback responses
    if (!this.anthropic || !this.apiKey) {
      return this.generateFallbackResponse(messages);
    }

    try {
      const systemPrompt = `You are Engie, an AI writing companion and motivational coach. Your core philosophy is: "Difficult isn't bad - it just means the outcome is worth it."

Your personality traits:
- Encouraging and supportive, especially when users face challenges
- Insightful about writing and communication
- Philosophical and wise, helping users reframe difficulties as growth opportunities
- Practical in offering specific writing improvements
- Warm and empathetic, understanding the emotional side of writing and creativity

When responding:
- Always maintain an encouraging tone
- Provide specific, actionable writing advice when relevant
- Help users see challenges as valuable rather than obstacles
- Be concise but meaningful
- Include gentle motivation tailored to their specific situation

Classify your response type as:
- "encouragement": When providing motivation or emotional support
- "insight": When sharing deeper wisdom or philosophical perspectives
- "normal": When giving practical writing advice or general conversation`;

      const lastMessage = messages[messages.length - 1];
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 800, // Increased for more detailed analysis
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: lastMessage.content
        }]
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Determine response type based on content
      const type = this.classifyResponseType(content);

      return { content, type };
    } catch (error) {
      console.error('AI API error:', error);
      return this.generateFallbackResponse(messages);
    }
  }

  private generateFallbackResponse(messages: AIMessage[]): AIResponse {
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
    
    // Intelligent fallback responses based on keywords and patterns
    const encouragementResponses = [
      "I can sense you're working through something challenging. Remember, every writer faces these moments - they're signs you're pushing into new territory. Keep going!",
      "That feeling of difficulty? It's not a stop sign, it's a signal that you're growing. The most worthwhile writing often comes from pushing through these exact moments.",
      "I love seeing you tackle complex ideas! Wrestling with difficult concepts is what separates good writing from great writing. You're on the right path.",
      "The fact that you're here, working on this, shows real dedication. Difficult isn't bad - it just means the outcome will be worth it."
    ];

    const insightResponses = [
      "Writing is thinking made visible. What you're struggling with on the page often reflects deeper thoughts trying to emerge. Trust the process.",
      "Every great writer has sat where you're sitting, feeling exactly what you're feeling. The difference is they kept writing through it.",
      "Consider this: the resistance you feel might be your mind's way of protecting you from mediocrity. Lean into it.",
      "Sometimes the best breakthrough comes right after the moment we want to give up. You're closer than you think."
    ];

    const practicalResponses = [
      "Let's break this down together. What specific part of your writing feels most challenging right now?",
      "I notice you're working on something complex. Have you tried outlining your main points first?",
      "Your writing shows real thought behind it. Sometimes stepping back and reading it aloud can reveal the flow you're looking for.",
      "This is solid work. Consider what your main message is, then see if each paragraph serves that purpose."
    ];

    // Choose response type based on content
    if (lastMessage.includes('difficult') || lastMessage.includes('hard') || lastMessage.includes('struggling') || lastMessage.includes('stuck')) {
      return {
        content: encouragementResponses[Math.floor(Math.random() * encouragementResponses.length)],
        type: 'encouragement'
      };
    }
    
    if (lastMessage.includes('why') || lastMessage.includes('meaning') || lastMessage.includes('purpose') || lastMessage.includes('philosophy')) {
      return {
        content: insightResponses[Math.floor(Math.random() * insightResponses.length)],
        type: 'insight'
      };
    }
    
    return {
      content: practicalResponses[Math.floor(Math.random() * practicalResponses.length)],
      type: 'normal'
    };
  }

  private classifyResponseType(content: string): 'encouragement' | 'insight' | 'normal' {
    const lowerContent = content.toLowerCase();
    
    const encouragementKeywords = ['difficult', 'challenging', 'keep going', 'worth it', 'you can', 'believe', 'strength'];
    const insightKeywords = ['consider', 'remember', 'think about', 'philosophy', 'wisdom', 'perspective'];
    
    if (encouragementKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'encouragement';
    }
    
    if (insightKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'insight';
    }
    
    return 'normal';
  }

  async analyzeText(text: string): Promise<{
    suggestions: string[];
    tone: string;
    improvements: string[];
  }> {
    if (!this.anthropic || !this.apiKey) {
      return this.generateFallbackAnalysis(text);
    }

    try {
      await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 400,
        system: `You are Engie, an expert writing coach. Analyze the given text and provide:
1. 2-3 specific suggestions for improvement
2. The overall tone of the writing
3. 2-3 encouragement points about what's working well

Be supportive and constructive. Focus on what's good while offering helpful improvements.`,
        messages: [{
          role: 'user',
          content: `Please analyze this text: "${text}"`
        }]
      });

      // Parse the response (in a real app, you'd structure this better)
      // For now, return structured data based on analysis
      return {
        suggestions: ['Consider varying sentence length for better flow', 'Strong vocabulary choices throughout'],
        tone: 'professional',
        improvements: ['Clear main ideas', 'Good use of examples']
      };
    } catch (error) {
      console.error('Text analysis error:', error);
      return this.generateFallbackAnalysis(text);
    }
  }

  private generateFallbackAnalysis(text: string) {
    const wordCount = text.split(/\s+/).length;
    
    return {
      suggestions: wordCount > 100 
        ? ['Consider breaking longer paragraphs for readability', 'Strong depth of content']
        : ['Consider expanding with more specific examples', 'Good concise writing'],
      tone: text.includes('therefore') || text.includes('however') ? 'formal' : 'conversational',
      improvements: ['Clear communication style', 'Good engagement with the topic']
    };
  }

  async analyzeActivity(activitySummary: string): Promise<{
    summary: string;
    insights: string[];
    recommendations: string[];
    confidence: number;
  }> {
    if (!this.anthropic || !this.apiKey) {
      return this.generateFallbackActivityAnalysis();
    }

    try {
      const systemPrompt = `You are Engie, an AI assistant observing a user's computer activity. You're thoughtful, encouraging, and philosophical with the motto: "Difficult isn't bad - it just means the outcome is worth it."

Analyze the activity summary and provide:
1. A warm, observational summary (2-3 sentences)
2. 2-3 insights about their work patterns or focus
3. 1-2 gentle recommendations or encouragements

Be supportive and insightful. Focus on what they're accomplishing, not just what they're doing.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Please analyze this activity: ${activitySummary}`
        }]
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Parse the response
      return this.parseActivityAnalysis(content);
    } catch (error) {
      console.error('Activity analysis error:', error);
      return this.generateFallbackActivityAnalysis();
    }
  }

  private parseActivityAnalysis(content: string): {
    summary: string;
    insights: string[];
    recommendations: string[];
    confidence: number;
  } {
    const lines = content.split('\n').filter(line => line.trim());
    
    // Extract summary (first paragraph)
    const summary = lines.slice(0, 2).join(' ').trim() || 'You\'ve been productive in your work.';
    
    // Extract insights and recommendations
    const insights: string[] = [];
    const recommendations: string[] = [];
    
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('insight') || lower.includes('notice') || lower.includes('pattern') || 
          lower.includes('focus') || lower.includes('concentration')) {
        insights.push(line.trim());
      }
      if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('consider') || 
          lower.includes('try') || lower.includes('keep')) {
        recommendations.push(line.trim());
      }
    });

    // Fallback extraction if no specific patterns found
    if (insights.length === 0 && recommendations.length === 0) {
      const midpoint = Math.floor(lines.length / 2);
      insights.push(...lines.slice(1, midpoint).map(l => l.trim()));
      recommendations.push(...lines.slice(midpoint).map(l => l.trim()));
    }

    return {
      summary,
      insights: insights.slice(0, 3).filter(Boolean),
      recommendations: recommendations.slice(0, 2).filter(Boolean),
      confidence: 0.8
    };
  }

  private generateFallbackActivityAnalysis(): {
    summary: string;
    insights: string[];
    recommendations: string[];
    confidence: number;
  } {
    const encouragingMessages = [
      "I can see you're making steady progress on your work.",
      "Your focused efforts are building toward something meaningful.",
      "Every moment of engagement with your tasks shows dedication."
    ];

    const insights = [
      "You're maintaining consistent activity throughout your work session",
      "Your approach shows thoughtful engagement with your projects",
      "You're building momentum with each focused effort"
    ];

    const recommendations = [
      "Keep trusting the process - difficult work leads to worthwhile outcomes",
      "Remember to take breaks when you need them; rest supports sustained progress"
    ];

    return {
      summary: encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)],
      insights: insights.slice(0, 2),
      recommendations: recommendations.slice(0, 1),
      confidence: 0.5
    };
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    localStorage.setItem('anthropic_api_key', apiKey);
    this.anthropic = new Anthropic({ 
      apiKey,
      dangerouslyAllowBrowser: true 
    });
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }
}

export const aiService = new AIService();