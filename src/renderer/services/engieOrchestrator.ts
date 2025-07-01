interface UserIntent {
  type: 'task_management' | 'task_creation' | 'task_analysis' | 'general_chat' | 'system_query' | 'research';
  confidence: number;
  action?: string;
  parameters?: any;
  reasoning?: string;
}

interface EngieResponse {
  thought: string;
  action?: string;
  result: string;
  toolsUsed: string[];
}

class EngieOrchestrator {
  private isInitialized = false;
  private currentContext: any[] = [];
  private onTasksUpdatedCallback?: () => void;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Initialize all required systems
      await this.ensureSystemsReady();
      this.isInitialized = true;
      console.log('🧠 Engie Orchestrator initialized - AI brain is online');
    } catch (error) {
      console.error('Failed to initialize Engie Orchestrator:', error);
    }
  }

  // Set callback for when tasks are updated
  setTasksUpdatedCallback(callback: () => void): void {
    this.onTasksUpdatedCallback = callback;
  }

  async processUserInput(input: string): Promise<EngieResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Step 1: Use local LLM to understand intent and plan actions
      const intentAnalysis = await this.analyzeUserIntent(input);
      
      // Step 2: Execute appropriate tools based on intent
      const toolResults = await this.executeTools(intentAnalysis);
      
      // Step 3: Use LLM to synthesize final response
      const finalResponse = await this.synthesizeResponse(input, intentAnalysis, toolResults);
      
      return finalResponse;
    } catch (error) {
      console.error('Error in Engie orchestration:', error);
      return {
        thought: "I encountered an issue processing your request",
        result: `I'm having trouble with that request. Let me help you with basic commands instead.\n\nTry: "list tasks", "create task [description]", or "what can you do?"`,
        toolsUsed: []
      };
    }
  }

  private async analyzeUserIntent(input: string): Promise<UserIntent> {
    const intentPrompt = `As Engie, an intelligent AI assistant, analyze this user input and determine the best action:

User Input: "${input}"

Available capabilities:
- TaskMaster MCP tools: get_tasks, add_task, next_task, get_task, set_task_status, expand_task, update_task, update_subtask, analyze_project_complexity, research
- General conversation and assistance
- System status and information
- Code and development help

Respond with a JSON object:
{
  "type": "task_management|task_creation|task_analysis|general_chat|system_query|research",
  "confidence": 0.8,
  "action": "specific_action_to_take",
  "parameters": {"key": "value"},
  "reasoning": "why this action is appropriate"
}

Be intelligent and proactive. If the user wants task help, suggest specific MCP tools. For general questions, engage conversationally.`;

    try {
      const llmResponse = await window.electronAPI.localLLM.query(intentPrompt);
      
      if (llmResponse.success && llmResponse.data) {
        let responseText = llmResponse.data;
        if (typeof responseText === 'object') {
          responseText = responseText.data || responseText.response || JSON.stringify(responseText);
        }
        
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const intentData = JSON.parse(jsonMatch[0]);
          return {
            type: intentData.type || 'general_chat',
            confidence: intentData.confidence || 0.5,
            action: intentData.action,
            parameters: intentData.parameters || {},
            reasoning: intentData.reasoning
          };
        }
      }
    } catch (error) {
      console.error('Intent analysis failed:', error);
    }

    // Fallback intent analysis
    return this.fallbackIntentAnalysis(input);
  }

  private fallbackIntentAnalysis(input: string): UserIntent {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('create task') || lowerInput.includes('add task') || lowerInput.includes('new task')) {
      return {
        type: 'task_creation',
        confidence: 0.9,
        action: 'create_task',
        parameters: { prompt: input },
        reasoning: 'User wants to create a new task'
      };
    }
    
    if (lowerInput.includes('list tasks') || lowerInput.includes('show tasks') || lowerInput.includes('my tasks')) {
      return {
        type: 'task_management',
        confidence: 0.9,
        action: 'list_tasks',
        parameters: {},
        reasoning: 'User wants to see their tasks'
      };
    }
    
    if (lowerInput.includes('next task') || lowerInput.includes('what should i work on')) {
      return {
        type: 'task_management',
        confidence: 0.9,
        action: 'next_task',
        parameters: {},
        reasoning: 'User wants to know what to work on next'
      };
    }
    
    if (lowerInput.includes('analyze') || lowerInput.includes('insights') || lowerInput.includes('complexity')) {
      return {
        type: 'task_analysis',
        confidence: 0.8,
        action: 'analyze_complexity',
        parameters: {},
        reasoning: 'User wants task analysis or insights'
      };
    }
    
    return {
      type: 'general_chat',
      confidence: 0.6,
      reasoning: 'General conversation or assistance needed'
    };
  }

  private async executeTools(intent: UserIntent): Promise<any[]> {
    const results: any[] = [];
    
    try {
      switch (intent.action) {
        case 'create_task':
          if (intent.parameters?.prompt) {
            const taskResult = await window.electronAPI.callMCPTool('mcp_task-master-ai_add_task', {
              prompt: intent.parameters.prompt,
              research: true,
              projectRoot: await this.getProjectRoot()
            });
            results.push({ tool: 'add_task', result: taskResult });
            
            // Notify UI to refresh tasks
            if (taskResult.success && this.onTasksUpdatedCallback) {
              setTimeout(() => this.onTasksUpdatedCallback?.(), 500);
            }
          }
          break;
          
        case 'list_tasks':
          const tasksResult = await window.electronAPI.callMCPTool('mcp_task-master-ai_get_tasks', {
            projectRoot: await this.getProjectRoot(),
            withSubtasks: true
          });
          results.push({ tool: 'get_tasks', result: tasksResult });
          break;
          
        case 'next_task':
          const nextTaskResult = await window.electronAPI.callMCPTool('mcp_task-master-ai_next_task', {
            projectRoot: await this.getProjectRoot()
          });
          results.push({ tool: 'next_task', result: nextTaskResult });
          break;
          
        case 'analyze_complexity':
          const complexityResult = await window.electronAPI.callMCPTool('mcp_task-master-ai_analyze_project_complexity', {
            research: true,
            projectRoot: await this.getProjectRoot()
          });
          results.push({ tool: 'analyze_complexity', result: complexityResult });
          break;
          
        case 'get_task_details':
          if (intent.parameters?.id) {
            const taskDetailsResult = await window.electronAPI.callMCPTool('mcp_task-master-ai_get_task', {
              id: intent.parameters.id,
              projectRoot: await this.getProjectRoot()
            });
            results.push({ tool: 'get_task', result: taskDetailsResult });
          }
          break;
      }
    } catch (error) {
      console.error('Tool execution error:', error);
      results.push({ tool: 'error', result: { success: false, error: String(error) } });
    }
    
    return results;
  }

  private async synthesizeResponse(input: string, intent: UserIntent, toolResults: any[]): Promise<EngieResponse> {
    // Build context from tool results
    let toolContext = '';
    const toolsUsed: string[] = [];
    
    for (const result of toolResults) {
      toolsUsed.push(result.tool);
      if (result.result?.success) {
        toolContext += `${result.tool}: ${JSON.stringify(result.result.data || 'Success')}\n`;
      } else {
        toolContext += `${result.tool}: Error - ${result.result?.error || 'Unknown error'}\n`;
      }
    }

    const synthesisPrompt = `As Engie, the intelligent AI assistant, provide a helpful response to the user.

User Input: "${input}"
Intent Analysis: ${intent.reasoning}
Tools Used: ${toolsUsed.join(', ')}
Tool Results: ${toolContext}

Provide a natural, helpful response that:
1. Shows understanding of what the user wanted
2. Explains what actions I took (if any)
3. Presents the results in a user-friendly way
4. Offers next steps or related suggestions

Be conversational, intelligent, and proactive. Show that I'm an AI that understands context and can help with development work.`;

    try {
      const llmResponse = await window.electronAPI.localLLM.query(synthesisPrompt);
      
      if (llmResponse.success && llmResponse.data) {
        let responseText = llmResponse.data;
        if (typeof responseText === 'object') {
          responseText = responseText.data || responseText.response || String(responseText);
        }
        
        return {
          thought: intent.reasoning || "Processing your request...",
          action: intent.action,
          result: String(responseText),
          toolsUsed
        };
      }
    } catch (error) {
      console.error('Response synthesis failed:', error);
    }

    // Fallback response synthesis
    return this.fallbackResponseSynthesis(input, intent, toolResults);
  }

  private fallbackResponseSynthesis(input: string, intent: UserIntent, toolResults: any[]): EngieResponse {
    const toolsUsed = toolResults.map(r => r.tool);
    let result = '';

    // Check for TaskMaster installation issues
    const hasInstallationError = toolResults.some(r => r.result?.needsInstallation);
    if (hasInstallationError) {
      return {
        thought: "TaskMaster CLI needs to be installed for full functionality",
        action: intent.action,
        result: `🔧 **TaskMaster Setup Required**

I can see you want to work with tasks, but TaskMaster CLI isn't installed yet.

**Quick Setup:**
1. Install TaskMaster globally: \`npm install -g task-master-ai\`
2. Initialize in your project: \`task-master init\`
3. Come back and I'll have full task management powers!

**What I can do meanwhile:**
• General development assistance and code help
• Answer questions about programming concepts
• Help plan and discuss your project architecture
• Provide coding guidance and best practices

Once TaskMaster is installed, I'll be able to:
• Create AI-enhanced tasks with research
• Analyze project complexity intelligently
• Provide smart task recommendations
• Generate context-aware commit messages

Would you like help with the installation process or shall we work on something else for now?`,
        toolsUsed
      };
    }

    // Generate appropriate fallback response based on intent
    switch (intent.type) {
      case 'task_creation':
        result = toolResults.length > 0 && toolResults[0].result?.success
          ? '✅ I\'ve created a new task for you using AI-enhanced analysis and research. The task has been added to your project with intelligent priority and complexity scoring.'
          : '🎯 I understand you want to create a task. I can help with AI-enhanced task creation that includes research, priority analysis, and intelligent breakdown.';
        break;
        
      case 'task_management':
        if (toolResults.length > 0 && toolResults[0].result?.success) {
          const toolResult = toolResults[0].result;
          if (toolResult.isFormattedText) {
            // TaskMaster returned formatted text output
            return {
              thought: intent.reasoning || "Retrieved your tasks from TaskMaster",
              action: intent.action,
              result: `📋 **Here are your current tasks:**\n\n${toolResult.data}\n\n💡 I can help you with any of these tasks - just ask about a specific task ID or what you should work on next!`,
              toolsUsed
            };
          } else if (Array.isArray(toolResult.data)) {
            result = `📋 I found ${toolResult.data.length} tasks in your project. Here's your current workload overview with intelligent prioritization.`;
          } else if (toolResult.data?.id) {
            result = `🎯 Here's your next recommended task based on dependencies and priority analysis: ${toolResult.data.title || 'Task details available'}.`;
          }
        } else {
          result = '📋 I can help you manage your tasks with intelligent analysis, priority scoring, and dependency tracking.';
        }
        break;
        
      case 'task_analysis':
        result = toolResults.length > 0 && toolResults[0].result?.success
          ? '📊 I\'ve analyzed your project complexity and generated intelligent insights about task breakdown, priorities, and optimization opportunities.'
          : '📊 I can provide AI-powered analysis of your tasks including complexity scoring, workload distribution, and intelligent recommendations.';
        break;
        
      default:
        result = `I understand you're asking about: "${input}". I'm here to help with intelligent task management, AI-enhanced development work, and smart productivity assistance.`;
    }

    return {
      thought: intent.reasoning || "Analyzing your request and determining the best approach",
      action: intent.action,
      result,
      toolsUsed
    };
  }

  private async ensureSystemsReady(): Promise<void> {
    // Check if local LLM is available
    if (!window.electronAPI?.localLLM?.query) {
      throw new Error('Local LLM not available');
    }
    
    // Check if MCP tools are available
    if (!window.electronAPI?.callMCPTool) {
      throw new Error('MCP tools not available');
    }
  }

  private async getProjectRoot(): Promise<string> {
    try {
      return await window.electronAPI.getProjectRoot() || process.cwd();
    } catch {
      return process.cwd();
    }
  }

  // Add context for smarter responses
  addContext(context: any): void {
    this.currentContext.push({
      ...context,
      timestamp: new Date()
    });
    
    // Keep only recent context (last 10 items)
    if (this.currentContext.length > 10) {
      this.currentContext = this.currentContext.slice(-10);
    }
  }

  // Get current context for LLM
  getContext(): string {
    if (this.currentContext.length === 0) return '';
    
    return this.currentContext
      .map(ctx => `${ctx.timestamp.toISOString()}: ${JSON.stringify(ctx)}`)
      .join('\n');
  }
}

export const engieOrchestrator = new EngieOrchestrator(); 