import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { app } from 'electron';

const execAsync = promisify(exec);

/**
 * Engie AI TaskMaster Integration
 * Installs and configures intelligent TaskMaster automation for users
 */
export class EngieTaskMasterInstaller {
  private projectPath: string;
  private engieConfigPath: string;
  private taskMasterPath: string;

  constructor(userProjectPath?: string) {
    this.projectPath = userProjectPath || process.cwd();
    this.engieConfigPath = path.join(this.projectPath, '.engie');
    this.taskMasterPath = path.join(this.projectPath, '.taskmaster');
  }

  async install(): Promise<any> {
    console.log('🚀 Installing Engie AI TaskMaster Integration...');
    
    try {
      // Step 1: Create Engie configuration directory
      await this.createEngieConfig();
      
      // Step 2: Install TaskMaster if needed
      await this.ensureTaskMasterInstalled();
      
      // Step 3: Set up intelligent automation
      await this.setupIntelligentAutomation();
      
      // Step 4: Create RAG-powered templates
      await this.createIntelligentTemplates();
      
      // Step 5: Install learning git hooks
      await this.installLearningHooks();
      
      // Step 6: Initialize knowledge base
      await this.initializeKnowledgeBase();
      
      console.log('✅ Engie AI TaskMaster Integration installed successfully!');
      console.log('💡 Your development workflow will now learn and improve automatically.');
      
      return this.generateSetupReport();
      
    } catch (error) {
      console.error('❌ Installation failed:', error);
      throw error;
    }
  }

  private async createEngieConfig(): Promise<void> {
    await fs.mkdir(this.engieConfigPath, { recursive: true });
    
    const engieConfig = {
      version: "1.0.0",
      features: {
        intelligentTaskMaster: true,
        ragTemplates: true,
        learningHooks: true,
        workflowAnalytics: true
      },
      automation: {
        autoTaskGeneration: true,
        commitEnhancement: true,
        prTemplating: true,
        complexityAnalysis: true
      },
      learning: {
        collectPatterns: true,
        improveTemplates: true,
        personalizeWorkflow: true,
        teamInsights: true
      },
      installedAt: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(this.engieConfigPath, 'config.json'),
      JSON.stringify(engieConfig, null, 2)
    );
    
    console.log('✅ Engie configuration created');
  }

  private async ensureTaskMasterInstalled(): Promise<void> {
    try {
      await execAsync('npx task-master-ai --version');
      console.log('✅ TaskMaster already available');
    } catch (error) {
      console.log('📦 Installing TaskMaster...');
      await execAsync('npm install -g task-master-ai');
      console.log('✅ TaskMaster installed');
    }
  }

  private async setupIntelligentAutomation(): Promise<void> {
    // Create automation configuration
    const automationConfig = {
      enabled: true,
      learningMode: true,
      ragEnabled: true,
      workflowStates: [
        'analyze_context',
        'retrieve_patterns', 
        'generate_template',
        'execute_action',
        'update_knowledge'
      ],
      triggers: {
        branchSwitch: true,
        commitAnalysis: true,
        prCreation: true,
        taskCompletion: true,
        fileChanges: true,
        textSelection: true
      },
      mcpIntegration: {
        enabled: true,
        autoConnect: true,
        fallbackToCLI: true
      }
    };
    
    await fs.writeFile(
      path.join(this.engieConfigPath, 'automation.json'),
      JSON.stringify(automationConfig, null, 2)
    );
    
    console.log('✅ Intelligent automation configured');
  }

  private async createIntelligentTemplates(): Promise<void> {
    const templatesPath = path.join(this.taskMasterPath, 'templates');
    await fs.mkdir(templatesPath, { recursive: true });
    
    // RAG-Enhanced React Template
    const reactTemplate = `# 🧠 RAG-Enhanced React Feature Development
*This template learns from your team's successful React implementations*

## 📊 Project Context Analysis
<!-- Auto-populated by RAG from similar successful projects -->
- **Project Type**: {PROJECT_TYPE}
- **Complexity Level**: {COMPLEXITY_SCORE}/10
- **Similar Past Features**: {RELATED_FEATURES}
- **Team Velocity**: {TEAM_VELOCITY} story points/sprint
- **Common Patterns Used**: {COMMON_PATTERNS}

## 🎯 Feature Requirements
*Enhanced with insights from {SIMILAR_FEATURES_COUNT} similar implementations*

### 1. Component Architecture & Design
- **Recommended Approach**: {RECOMMENDED_ARCHITECTURE}
- **State Management**: {RECOMMENDED_STATE_MGMT} (based on {SUCCESSFUL_EXAMPLES} successful uses)
- **Component Hierarchy**: Follow {TEAM_PATTERN} pattern (87% team success rate)
- **TypeScript Interfaces**: Generate types following {TYPE_PATTERN} convention

**💡 RAG Insights**: Teams using {SUCCESSFUL_PATTERN} completed similar features {TIME_IMPROVEMENT}% faster

### 2. Implementation Strategy
*Optimized based on {IMPLEMENTATION_SAMPLES} successful implementations*

- **Phase 1: Core Components** 
  - Build {COMPONENT_LIST} (avg completion: {AVG_COMPLETION_TIME})
  - **Anti-pattern Alert**: Avoid {COMMON_PITFALL} (caused delays in {FAILURE_EXAMPLES} cases)
  - **Best Practice**: Implement {SUCCESSFUL_TECHNIQUE} (reduced bugs by {BUG_REDUCTION}%)

- **Phase 2: Integration & State**
  - Connect to {STATE_STORE} using {INTEGRATION_PATTERN}
  - **Learned Optimization**: Use {PERFORMANCE_PATTERN} for {PERF_IMPROVEMENT}% better performance
  - Handle loading/error states with {ERROR_PATTERN} (team standard)

### 3. Testing & Quality Assurance
*Test strategy refined from {TEST_SAMPLES} successful test suites*

- **Unit Testing**: Target {TARGET_COVERAGE}% coverage (team average: {TEAM_COVERAGE}%)
- **Integration Tests**: Focus on {CRITICAL_PATHS} (identified from {FAILURE_ANALYSIS} incidents)
- **E2E Testing**: Cover {USER_JOURNEYS} workflows (prevents {COMMON_ISSUES}% of production issues)
- **Accessibility**: Ensure {A11Y_STANDARDS} compliance (use {A11Y_TOOLS})

**🔍 Quality Metrics**: Aim for {QUALITY_TARGETS} based on top-performing features

### 4. Performance & Optimization
*Insights from {PERF_SAMPLES} high-performance implementations*

- **Bundle Optimization**: Use {BUNDLE_STRATEGY} (reduces size by {SIZE_REDUCTION}%)
- **Lazy Loading**: Apply to {LAZY_COMPONENTS} (improves TTI by {TTI_IMPROVEMENT}ms)
- **Caching Strategy**: Implement {CACHE_PATTERN} for {CACHE_TARGETS}
- **Performance Budget**: Stay under {PERF_BUDGET} based on {PERF_BASELINE}

### 5. Documentation & Knowledge Sharing
*Template enhanced from {DOC_SAMPLES} well-documented features*

- **Component Documentation**: Use {DOC_FORMAT} (preferred by {TEAM_PREFERENCE}% of team)
- **Storybook Stories**: Create {STORY_TYPES} stories
- **API Documentation**: Follow {API_DOC_STANDARD} 
- **Team Knowledge**: Add to {KNOWLEDGE_BASE} with {KNOWLEDGE_TAGS}

## 🚀 Definition of Done
*Checklist refined from {SUCCESSFUL_DEPLOYMENTS} successful deployments*

- [ ] All components meet {DESIGN_STANDARDS}
- [ ] Test coverage above {MIN_COVERAGE}%
- [ ] Performance metrics within {PERF_THRESHOLDS}
- [ ] Accessibility audit passed with {A11Y_SCORE}
- [ ] Code review approved by {REVIEWER_COUNT} reviewers
- [ ] Documentation updated in {DOC_LOCATIONS}
- [ ] {DEPLOYMENT_CHECKLIST}

## 🎯 Success Metrics
*Targets based on {METRICS_BASELINE} from similar features*

- **Development Time**: Complete in {TARGET_DAYS} days (team avg: {TEAM_AVG} days)
- **Bug Rate**: Keep below {BUG_THRESHOLD} bugs/week post-deployment  
- **Performance**: Maintain {PERFORMANCE_TARGETS}
- **User Satisfaction**: Achieve {USER_SATISFACTION_TARGET}% satisfaction

---
*🧠 This template automatically improves based on your team's patterns and outcomes*
*📊 RAG insights updated: {LAST_UPDATED}*`;

    // RAG-Enhanced Commit Template
    const commitTemplate = `# 🧠 Intelligent Commit Message Template
*Auto-generated from {COMMIT_SAMPLES} team commits and {SUCCESS_PATTERNS} successful patterns*

## 📝 Recommended Commit Message
\`\`\`
{COMMIT_TYPE}({SCOPE}): {DESCRIPTION}

{BODY}

{FOOTER}
\`\`\`

## 🎯 Auto-Detected Context
- **Branch**: {CURRENT_BRANCH}
- **Files Changed**: {CHANGED_FILES_COUNT} files
- **Complexity**: {CHANGE_COMPLEXITY}/10
- **Related Tasks**: {LINKED_TASKS}
- **Suggested Type**: {SUGGESTED_TYPE} (confidence: {CONFIDENCE}%)

## 💡 RAG-Enhanced Suggestions

### Commit Type: {SUGGESTED_TYPE}
*Based on {TYPE_EXAMPLES} similar changes*
- **Why this type**: {TYPE_REASONING}
- **Team usage**: {TYPE_FREQUENCY}% of similar changes use this type
- **Alternative**: Consider {ALT_TYPE} if {ALT_CONDITION}

### Scope: {SUGGESTED_SCOPE}
*Learned from {SCOPE_EXAMPLES} team patterns*
- **Detected scope**: {AUTO_SCOPE} (from file changes)
- **Team convention**: {TEAM_SCOPE_PATTERN}
- **Similar commits**: {SIMILAR_SCOPES}

### Description Guidelines
*Optimized from {MESSAGE_SAMPLES} high-quality commit messages*

**✅ Do** (based on team's best practices):
- Start with {TEAM_VERB_PREFERENCE} (used in {VERB_PERCENTAGE}% of successful commits)
- Keep under {MAX_LENGTH} characters (team average: {TEAM_AVG_LENGTH})
- Focus on {FOCUS_AREA} (increases PR approval by {APPROVAL_IMPROVEMENT}%)

**❌ Avoid** (learned from {PROBLEMATIC_COMMITS} problematic commits):
- {ANTI_PATTERNS}
- Generic messages like "{GENERIC_EXAMPLES}"
- Missing {REQUIRED_ELEMENTS}

## 🔗 Task Integration
*Auto-linked from TaskMaster*

**Active Tasks**: {ACTIVE_TASKS}
**Completed**: {COMPLETED_TASKS}  
**Suggested Links**: {SUGGESTED_TASK_LINKS}

**Automatic Actions**:
- Will close: {AUTO_CLOSE_TASKS}
- Will update: {UPDATE_TASKS}
- Will reference: {REFERENCE_TASKS}

## 📊 Impact Prediction
*Based on {IMPACT_SAMPLES} similar commits*

- **Build Impact**: {BUILD_IMPACT} (predicted)
- **Test Impact**: {TEST_IMPACT} files affected
- **Deployment Risk**: {DEPLOYMENT_RISK}/10
- **Review Time**: ~{ESTIMATED_REVIEW_TIME} (based on complexity)

---
*🧠 Suggestions improve as you commit - powered by Engie AI*`;

    // Save templates
    await fs.writeFile(path.join(templatesPath, 'react_feature_intelligent.txt'), reactTemplate);
    await fs.writeFile(path.join(templatesPath, 'commit_intelligent.txt'), commitTemplate);
    
    // Create additional intelligent templates
    await this.createAdditionalIntelligentTemplates(templatesPath);
    
    console.log('✅ RAG-enhanced templates created');
  }

  private async createAdditionalIntelligentTemplates(templatesPath: string): Promise<void> {
    // Intelligent PR Template
    const prTemplate = `# 🧠 Intelligent PR Template
*Auto-generated from {PR_SAMPLES} successful PRs*

## 📋 PR Summary
**Title**: {SUGGESTED_TITLE}
**Type**: {PR_TYPE} 
**Complexity**: {PR_COMPLEXITY}/10
**Estimated Review Time**: {REVIEW_TIME_ESTIMATE}

## 🎯 Changes Overview
*Analysis based on {CHANGE_ANALYSIS} patterns*

{AUTO_GENERATED_SUMMARY}

## ✅ Checklist
*Customized from {CHECKLIST_SAMPLES} successful deployments*

### Code Quality
- [ ] {CODE_QUALITY_CHECKS}
- [ ] Test coverage above {COVERAGE_THRESHOLD}%
- [ ] {LINTING_CHECKS} passed
- [ ] No {SECURITY_VULNERABILITIES} found

### Performance
- [ ] Bundle size within {BUNDLE_LIMIT}
- [ ] Performance metrics meet {PERF_STANDARDS}
- [ ] {ACCESSIBILITY_CHECKS} completed

### Documentation
- [ ] {DOC_REQUIREMENTS} updated
- [ ] {CHANGELOG_ENTRY} added
- [ ] {TEAM_KNOWLEDGE} shared

---
*🧠 This template learns from your team's successful PRs*`;

    // Intelligent Task Generation Template
    const taskTemplate = `# 🧠 AI-Generated Task Template
*Created using insights from {SIMILAR_TASKS} similar implementations*

## 📋 Task Details
**ID**: {TASK_ID}
**Title**: {TASK_TITLE}
**Priority**: {SUGGESTED_PRIORITY} (based on {PRIORITY_REASONING})
**Estimated Effort**: {EFFORT_ESTIMATE} (learned from {EFFORT_SAMPLES} similar tasks)

## 🎯 Context Analysis
*Auto-detected from current work and patterns*

- **Related Features**: {RELATED_FEATURES}
- **Dependencies**: {AUTO_DEPENDENCIES}
- **Blocking Issues**: {POTENTIAL_BLOCKERS}
- **Success Patterns**: {APPLICABLE_PATTERNS}

## 📝 Description
{AI_GENERATED_DESCRIPTION}

## 🔧 Implementation Strategy
*Optimized approach based on {STRATEGY_SAMPLES} successful implementations*

{IMPLEMENTATION_STEPS}

## 🧪 Testing Strategy
*Test plan derived from {TEST_PATTERNS} proven approaches*

{TEST_STRATEGY}

## 📊 Success Criteria
*Metrics based on {SUCCESS_SAMPLES} comparable features*

{SUCCESS_METRICS}

---
*🧠 Task quality improves with each completion - powered by Engie AI*`;

    // Save additional templates
    await fs.writeFile(path.join(templatesPath, 'pr_intelligent.txt'), prTemplate);
    await fs.writeFile(path.join(templatesPath, 'task_intelligent.txt'), taskTemplate);
  }

  private async installLearningHooks(): Promise<void> {
    const hooksPath = path.join(this.projectPath, '.git', 'hooks');
    
    try {
      await fs.mkdir(hooksPath, { recursive: true });
      
      // Pre-commit hook for learning from commits
      const preCommitHook = `#!/bin/sh
# Engie AI Learning Pre-commit Hook
node -e "
const { EngieIntelligenceSystem } = require('./src/main/engie-intelligence-system.js');
const intelligence = new EngieIntelligenceSystem();
intelligence.analyzeCommit().catch(console.error);
"`;

      // Post-commit hook for updating knowledge base
      const postCommitHook = `#!/bin/sh
# Engie AI Learning Post-commit Hook
node -e "
const { EngieIntelligenceSystem } = require('./src/main/engie-intelligence-system.js');
const intelligence = new EngieIntelligenceSystem();
intelligence.updateKnowledgeFromCommit().catch(console.error);
"`;

      await fs.writeFile(path.join(hooksPath, 'pre-commit'), preCommitHook);
      await fs.writeFile(path.join(hooksPath, 'post-commit'), postCommitHook);
      
      // Make hooks executable
      await execAsync(`chmod +x ${path.join(hooksPath, 'pre-commit')}`);
      await execAsync(`chmod +x ${path.join(hooksPath, 'post-commit')}`);
      
      console.log('✅ Learning git hooks installed');
    } catch (error) {
      console.warn('⚠️ Could not install git hooks (not in git repo):', error);
    }
  }

  private async initializeKnowledgeBase(): Promise<void> {
    const knowledgePath = path.join(this.engieConfigPath, 'knowledge');
    await fs.mkdir(knowledgePath, { recursive: true });
    
    const knowledgeBase = {
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
      },
      personalizations: {
        preferredPatterns: [],
        workingHours: [],
        productivityTrends: []
      }
    };
    
    await fs.writeFile(
      path.join(knowledgePath, 'base.json'),
      JSON.stringify(knowledgeBase, null, 2)
    );
    
    console.log('✅ Knowledge base initialized');
  }

  private async generateSetupReport(): Promise<any> {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      installedFeatures: [
        'Intelligent TaskMaster Integration',
        'RAG-Enhanced Templates',
        'Learning Git Hooks',
        'Knowledge Base System',
        'MCP Direct Integration'
      ],
      nextSteps: [
        'Run initial project analysis',
        'Generate first intelligent templates',
        'Configure team patterns',
        'Set up continuous learning'
      ],
      configuration: {
        projectPath: this.projectPath,
        engieConfigPath: this.engieConfigPath,
        taskMasterPath: this.taskMasterPath
      }
    };
  }
}

// Export for use in main process
export async function installEngieTaskMaster(projectPath?: string): Promise<any> {
  const installer = new EngieTaskMasterInstaller(projectPath);
  return await installer.install();
} 