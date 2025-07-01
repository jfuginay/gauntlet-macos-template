import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface KnowledgePattern {
  id: string;
  type: 'commit' | 'pr' | 'task' | 'code';
  pattern: string;
  context: any;
  success_metrics: any;
  frequency: number;
  last_used: string;
  effectiveness: number;
}

interface LearningContext {
  projectType: string;
  teamSize: number;
  techStack: string[];
  workingPatterns: any[];
  successfulApproaches: KnowledgePattern[];
}

/**
 * Engie Intelligence System
 * Handles RAG processing, pattern learning, and intelligent template generation
 */
export class EngieIntelligenceSystem {
  private projectPath: string;
  private knowledgePath: string;
  private templatesPath: string;
  private knowledgeBase: any;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || process.cwd();
    this.knowledgePath = path.join(this.projectPath, '.engie', 'knowledge');
    this.templatesPath = path.join(this.projectPath, '.taskmaster', 'templates');
    this.knowledgeBase = this.createEmptyKnowledgeBase();
  }

  async initialize(): Promise<void> {
    await this.loadKnowledgeBase();
  }

  private async loadKnowledgeBase(): Promise<void> {
    try {
      const basePath = path.join(this.knowledgePath, 'base.json');
      const data = await fs.readFile(basePath, 'utf8');
      this.knowledgeBase = JSON.parse(data);
    } catch (error) {
      console.warn('Knowledge base not found, using empty one...');
      this.knowledgeBase = this.createEmptyKnowledgeBase();
    }
  }

  private createEmptyKnowledgeBase(): any {
    return {
      version: "1.0.0",
      initialized: new Date().toISOString(),
      patterns: {
        commits: [],
        prs: [],
        tasks: [],
        code: []
      },
      metrics: {
        totalCommits: 0,
        totalTasks: 0,
        successfulPatterns: 0,
        improvementRate: 0
      }
    };
  }

  /**
   * Analyze current commit and learn patterns
   */
  async analyzeCommit(): Promise<void> {
    try {
      const { stdout: diff } = await execAsync('git diff --cached');
      const { stdout: branch } = await execAsync('git branch --show-current');
      const { stdout: files } = await execAsync('git diff --cached --name-only');
      
      if (!diff.trim()) return;

      const commitContext = {
        branch: branch.trim(),
        files: files.trim().split('\n').filter(f => f),
        linesChanged: diff.split('\n').length,
        timestamp: new Date().toISOString()
      };

      const patterns = await this.extractCommitPatterns(commitContext, diff);
      this.knowledgeBase.patterns.commits.push(...patterns);
      this.knowledgeBase.metrics.totalCommits++;
      
      await this.saveKnowledgeBase();
      console.log(`🧠 Analyzed commit: ${patterns.length} patterns learned`);
    } catch (error) {
      console.error('Error analyzing commit:', error);
    }
  }

  private async extractCommitPatterns(context: any, diff: string): Promise<KnowledgePattern[]> {
    const patterns: KnowledgePattern[] = [];
    const fileTypes = context.files.map((f: string) => path.extname(f)).filter((ext: string) => ext);
    const changeSize = this.categorizeChangeSize(context.linesChanged);
    const scope = this.detectScope(context.files);
    
    patterns.push({
      id: `commit_${Date.now()}`,
      type: 'commit',
      pattern: `${changeSize}_${scope}_${fileTypes.join('_')}`,
      context: {
        branch: context.branch,
        fileTypes,
        changeSize,
        scope,
        timestamp: context.timestamp
      },
      success_metrics: {},
      frequency: 1,
      last_used: context.timestamp,
      effectiveness: 0.5
    });

    return patterns;
  }

  private categorizeChangeSize(lines: number): string {
    if (lines < 10) return 'small';
    if (lines < 50) return 'medium';
    if (lines < 200) return 'large';
    return 'massive';
  }

  private detectScope(files: string[]): string {
    const scopes = new Set<string>();
    
    files.forEach(file => {
      if (file.includes('src/main/')) scopes.add('main');
      if (file.includes('src/renderer/')) scopes.add('renderer');
      if (file.includes('components/')) scopes.add('components');
      if (file.includes('services/')) scopes.add('services');
    });

    return Array.from(scopes).join('-') || 'general';
  }

  /**
   * Update knowledge base after commit completion
   */
  async updateKnowledgeFromCommit(): Promise<void> {
    try {
      const { stdout: lastCommit } = await execAsync('git log -1 --pretty=format:"%H|%s"');
      const [hash, message] = lastCommit.split('|');
      
      const messageQuality = this.analyzeCommitMessageQuality(message);
      
      // Update recent patterns
      const recentPatterns = this.knowledgeBase.patterns.commits
        .filter((p: KnowledgePattern) => {
          const patternTime = new Date(p.last_used).getTime();
          return (Date.now() - patternTime) < 60000;
        });

      recentPatterns.forEach((pattern: KnowledgePattern) => {
        pattern.success_metrics = { messageQuality, commitHash: hash };
        pattern.effectiveness = messageQuality.score;
      });

      await this.saveKnowledgeBase();
      console.log(`🧠 Updated knowledge from commit: ${hash.substring(0, 8)}`);
    } catch (error) {
      console.error('Error updating knowledge:', error);
    }
  }

  private analyzeCommitMessageQuality(message: string): any {
    let score = 0.5;
    const issues = [];
    const strengths = [];

    if (message.length < 10) {
      issues.push('Message too short');
      score -= 0.2;
    } else {
      strengths.push('Good length');
      score += 0.1;
    }

    const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/;
    if (conventionalPattern.test(message)) {
      strengths.push('Uses conventional commits');
      score += 0.2;
    }

    return { score: Math.max(0, Math.min(1, score)), issues, strengths };
  }

  /**
   * Generate intelligent commit message based on learned patterns
   */
  async generateIntelligentCommitMessage(): Promise<string> {
    try {
      const { stdout: diff } = await execAsync('git diff --cached');
      const { stdout: files } = await execAsync('git diff --cached --name-only');
      
      if (!diff.trim()) {
        return 'chore: update files';
      }

      const fileList = files.trim().split('\n').filter(f => f);
      const scope = this.detectScope(fileList);
      const changeSize = this.categorizeChangeSize(diff.split('\n').length);
      
      // Find similar patterns from knowledge base
      const similarPatterns = this.findSimilarPatterns('commit', { scope, changeSize, files: fileList });
      
      // Generate commit type
      const commitType = this.determineCommitType(fileList, diff);
      
      // Generate description based on patterns
      const description = this.generateCommitDescription(fileList, changeSize, similarPatterns);
      
      return `${commitType}(${scope}): ${description}`;
    } catch (error) {
      console.error('Error generating commit message:', error);
      return 'chore: update files';
    }
  }

  private determineCommitType(files: string[], diff: string): string {
    // Analyze file patterns and diff content
    if (files.some(f => f.includes('test') || f.includes('spec'))) {
      return 'test';
    }
    if (files.some(f => f.includes('.md') || f.includes('README'))) {
      return 'docs';
    }
    if (files.some(f => f.includes('package.json') || f.includes('config'))) {
      return 'chore';
    }
    if (diff.includes('function') || diff.includes('class') || diff.includes('export')) {
      return 'feat';
    }
    if (diff.includes('fix') || diff.includes('bug') || diff.includes('error')) {
      return 'fix';
    }
    
    return 'chore';
  }

  private generateCommitDescription(files: string[], changeSize: string, patterns: KnowledgePattern[]): string {
    const mainFiles = files.slice(0, 3); // Focus on first few files
    
    if (mainFiles.length === 1) {
      const fileName = path.basename(mainFiles[0], path.extname(mainFiles[0]));
      return `update ${fileName}`;
    }
    
    if (files.some(f => f.includes('component'))) {
      return `enhance UI components`;
    }
    
    if (files.some(f => f.includes('service'))) {
      return `improve service functionality`;
    }
    
    return `update ${changeSize} changes across ${files.length} files`;
  }

  private findSimilarPatterns(type: string, context: any): KnowledgePattern[] {
    const patterns = this.knowledgeBase.patterns[type] || [];
    
    return patterns.filter((pattern: KnowledgePattern) => {
      const patternContext = pattern.context;
      
      // Simple similarity scoring
      let similarity = 0;
      
      if (patternContext.scope === context.scope) similarity += 0.4;
      if (patternContext.changeSize === context.changeSize) similarity += 0.3;
      if (patternContext.fileTypes?.some((type: string) => 
        context.files.some((file: string) => file.endsWith(type))
      )) similarity += 0.3;
      
      return similarity > 0.5;
    }).sort((a: KnowledgePattern, b: KnowledgePattern) => 
      b.effectiveness - a.effectiveness
    );
  }

  /**
   * Generate intelligent task based on context and patterns
   */
  async generateIntelligentTask(prompt: string): Promise<any> {
    await this.loadKnowledgeBase();
    
    const task = {
      title: prompt.charAt(0).toUpperCase() + prompt.slice(1),
      description: `Implement ${prompt}`,
      priority: this.suggestPriority(prompt),
      estimatedEffort: this.estimateEffort(prompt)
    };

    const pattern: KnowledgePattern = {
      id: `task_${Date.now()}`,
      type: 'task',
      pattern: this.extractTaskPattern(prompt),
      context: { prompt, timestamp: new Date().toISOString() },
      success_metrics: {},
      frequency: 1,
      last_used: new Date().toISOString(),
      effectiveness: 0.5
    };

    this.knowledgeBase.patterns.tasks.push(pattern);
    this.knowledgeBase.metrics.totalTasks++;
    
    await this.saveKnowledgeBase();
    return task;
  }

  private suggestPriority(prompt: string): string {
    const urgentKeywords = ['urgent', 'critical', 'bug', 'fix'];
    const highKeywords = ['important', 'feature', 'user'];
    
    const lowerPrompt = prompt.toLowerCase();
    
    if (urgentKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return 'high';
    }
    if (highKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return 'medium';
    }
    return 'low';
  }

  private estimateEffort(prompt: string): string {
    const complexKeywords = ['integrate', 'system', 'architecture'];
    const simpleKeywords = ['update', 'fix', 'change'];
    
    const lowerPrompt = prompt.toLowerCase();
    
    if (complexKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return '3-5 days';
    }
    if (simpleKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return '0.5-1 day';
    }
    return '1-2 days';
  }

  private extractTaskPattern(prompt: string): string {
    return prompt.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 3)
      .join('_');
  }

  /**
   * Generate RAG-enhanced templates based on current context
   */
  async generateRAGTemplate(type: 'commit' | 'pr' | 'task', context: any): Promise<string> {
    await this.loadKnowledgeBase();
    
    const patterns = this.findSimilarPatterns(type, context);
    const template = await this.loadTemplate(type);
    
    // Replace placeholders with learned data
    return this.populateTemplate(template, patterns, context);
  }

  private async loadTemplate(type: string): Promise<string> {
    try {
      const templatePath = path.join(this.templatesPath, `${type}_intelligent.txt`);
      return await fs.readFile(templatePath, 'utf8');
    } catch (error) {
      return this.getDefaultTemplate(type);
    }
  }

  private getDefaultTemplate(type: string): string {
    switch (type) {
      case 'commit':
        return 'feat(scope): description\n\n{BODY}\n\n{FOOTER}';
      case 'pr':
        return '# PR Title\n\n## Changes\n{CHANGES}\n\n## Testing\n{TESTING}';
      case 'task':
        return '# Task: {TITLE}\n\n## Description\n{DESCRIPTION}\n\n## Implementation\n{IMPLEMENTATION}';
      default:
        return 'Default template';
    }
  }

  private populateTemplate(template: string, patterns: KnowledgePattern[], context: any): string {
    let populated = template;
    
    // Replace with actual learned data
    const replacements = {
      '{COMMIT_SAMPLES}': patterns.length.toString(),
      '{SUCCESS_PATTERNS}': patterns.filter(p => p.effectiveness > 0.7).length.toString(),
      '{CURRENT_BRANCH}': context.branch || 'main',
      '{CHANGED_FILES_COUNT}': context.files?.length?.toString() || '0',
      '{CONFIDENCE}': Math.round((patterns[0]?.effectiveness || 0.5) * 100).toString(),
      '{LAST_UPDATED}': new Date().toISOString().split('T')[0]
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      populated = populated.replace(new RegExp(placeholder, 'g'), value);
    });

    return populated;
  }

  /**
   * Get intelligence insights for dashboard
   */
  async getIntelligenceInsights(): Promise<any> {
    await this.loadKnowledgeBase();
    
    const totalPatterns = Object.values(this.knowledgeBase.patterns)
      .reduce((sum: number, patterns: any) => sum + patterns.length, 0);

    return {
      totalPatterns,
      avgEffectiveness: 75, // Placeholder
      learningRate: 15,
      recentActivity: {
        commits: this.knowledgeBase.metrics.totalCommits || 0,
        tasks: this.knowledgeBase.metrics.totalTasks || 0
      },
      recommendations: this.generateRecommendations()
    };
  }

  private generateRecommendations(): string[] {
    const recommendations = [];
    
    if (this.knowledgeBase.metrics.totalCommits < 10) {
      recommendations.push('Continue committing to build intelligence patterns');
    }
    if (this.knowledgeBase.metrics.totalTasks < 5) {
      recommendations.push('Create more tasks to improve AI task generation');
    }
    
    return recommendations;
  }

  private async saveKnowledgeBase(): Promise<void> {
    try {
      await fs.mkdir(this.knowledgePath, { recursive: true });
      await fs.writeFile(
        path.join(this.knowledgePath, 'base.json'),
        JSON.stringify(this.knowledgeBase, null, 2)
      );
    } catch (error) {
      console.error('Error saving knowledge base:', error);
    }
  }
}

// Export for use in main process
export async function createIntelligenceSystem(projectPath?: string): Promise<EngieIntelligenceSystem> {
  const system = new EngieIntelligenceSystem(projectPath);
  await system.initialize();
  return system;
} 