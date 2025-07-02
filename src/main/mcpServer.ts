import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ChildProcess } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deferred';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  created: Date;
  updated: Date;
  dueDate?: Date;
  notes: string[];
  subtasks: Task[];
  parentId?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created: Date;
  updated: Date;
  linkedNotes: string[];
  linkedTasks: string[];
}

export interface SecondBrainData {
  tasks: Task[];
  notes: Note[];
  tags: string[];
  settings: {
    dataPath: string;
    autoSave: boolean;
    syncInterval: number;
  };
}

export class EngieMCPServer {
  private server: Server;
  private mcpProcess: ChildProcess | null = null;
  private dataPath: string;
  private data: SecondBrainData;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'engie-second-brain',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Set up data directory
    this.dataPath = path.join(os.homedir(), '.engie', 'second-brain');
    this.data = {
      tasks: [],
      notes: [],
      tags: [],
      settings: {
        dataPath: this.dataPath,
        autoSave: true,
        syncInterval: 30000, // 30 seconds
      },
    };

    this.setupTools();
    this.setupEventHandlers();
  }

  private setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Task Management Tools
          {
            name: 'create_task',
            description: 'Create a new task in the second brain',
            inputSchema: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Task title' },
                description: { type: 'string', description: 'Task description' },
                priority: { 
                  type: 'string', 
                  enum: ['low', 'medium', 'high'],
                  description: 'Task priority'
                },
                tags: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Task tags'
                },
                dueDate: { type: 'string', description: 'Due date (ISO string)' },
                parentId: { type: 'string', description: 'Parent task ID for subtasks' }
              },
              required: ['title', 'description']
            }
          },
          {
            name: 'list_tasks',
            description: 'List all tasks or filter by status/priority',
            inputSchema: {
              type: 'object',
              properties: {
                status: { 
                  type: 'string', 
                  enum: ['pending', 'in_progress', 'completed', 'deferred'],
                  description: 'Filter by status'
                },
                priority: { 
                  type: 'string', 
                  enum: ['low', 'medium', 'high'],
                  description: 'Filter by priority'
                },
                tags: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Filter by tags'
                }
              }
            }
          },
          {
            name: 'update_task',
            description: 'Update an existing task',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Task ID' },
                title: { type: 'string', description: 'New title' },
                description: { type: 'string', description: 'New description' },
                status: { 
                  type: 'string', 
                  enum: ['pending', 'in_progress', 'completed', 'deferred'],
                  description: 'New status'
                },
                priority: { 
                  type: 'string', 
                  enum: ['low', 'medium', 'high'],
                  description: 'New priority'
                },
                tags: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'New tags'
                },
                dueDate: { type: 'string', description: 'New due date (ISO string)' },
                notes: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Add notes to task'
                }
              },
              required: ['id']
            }
          },
          {
            name: 'delete_task',
            description: 'Delete a task',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Task ID' }
              },
              required: ['id']
            }
          },
          // Note Management Tools
          {
            name: 'create_note',
            description: 'Create a new note in the second brain',
            inputSchema: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Note title' },
                content: { type: 'string', description: 'Note content (markdown supported)' },
                tags: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Note tags'
                },
                linkedNotes: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'IDs of linked notes'
                },
                linkedTasks: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'IDs of linked tasks'
                }
              },
              required: ['title', 'content']
            }
          },
          {
            name: 'list_notes',
            description: 'List all notes or search by title/content/tags',
            inputSchema: {
              type: 'object',
              properties: {
                search: { type: 'string', description: 'Search term for title/content' },
                tags: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Filter by tags'
                },
                linkedTo: { type: 'string', description: 'Show notes linked to this note/task ID' }
              }
            }
          },
          {
            name: 'update_note',
            description: 'Update an existing note',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Note ID' },
                title: { type: 'string', description: 'New title' },
                content: { type: 'string', description: 'New content' },
                tags: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'New tags'
                },
                linkedNotes: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'New linked notes'
                },
                linkedTasks: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'New linked tasks'
                }
              },
              required: ['id']
            }
          },
          {
            name: 'delete_note',
            description: 'Delete a note',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Note ID' }
              },
              required: ['id']
            }
          },
          // Knowledge Graph Tools
          {
            name: 'get_connections',
            description: 'Get connections between notes and tasks',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Note or task ID' },
                depth: { type: 'number', description: 'Connection depth (default 1)' }
              },
              required: ['id']
            }
          },
          {
            name: 'search_knowledge',
            description: 'Search across all notes and tasks',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                type: { 
                  type: 'string', 
                  enum: ['all', 'notes', 'tasks'],
                  description: 'Search type'
                },
                limit: { type: 'number', description: 'Result limit (default 10)' }
              },
              required: ['query']
            }
          },
          // Analytics Tools
          {
            name: 'get_analytics',
            description: 'Get analytics about tasks and notes',
            inputSchema: {
              type: 'object',
              properties: {
                period: { 
                  type: 'string', 
                  enum: ['day', 'week', 'month', 'year'],
                  description: 'Analytics period'
                }
              }
            }
          },
          // Export/Import Tools
          {
            name: 'export_data',
            description: 'Export second brain data',
            inputSchema: {
              type: 'object',
              properties: {
                format: { 
                  type: 'string', 
                  enum: ['json', 'markdown', 'csv'],
                  description: 'Export format'
                },
                includeCompleted: { 
                  type: 'boolean', 
                  description: 'Include completed tasks'
                }
              }
            }
          }
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_task':
            return await this.createTask(args);
          case 'list_tasks':
            return await this.listTasks(args);
          case 'update_task':
            return await this.updateTask(args);
          case 'delete_task':
            return await this.deleteTask(args);
          case 'create_note':
            return await this.createNote(args);
          case 'list_notes':
            return await this.listNotes(args);
          case 'update_note':
            return await this.updateNote(args);
          case 'delete_note':
            return await this.deleteNote(args);
          case 'get_connections':
            return await this.getConnections(args);
          case 'search_knowledge':
            return await this.searchKnowledge(args);
          case 'get_analytics':
            return await this.getAnalytics(args);
          case 'export_data':
            return await this.exportData(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        console.error(`Error in ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private setupEventHandlers() {
    // Clear any existing interval before setting a new one
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    // Auto-save data periodically
    this.autoSaveInterval = setInterval(() => {
      if (this.data.settings.autoSave) {
        this.saveData().catch(console.error);
      }
    }, this.data.settings.syncInterval);

    // Save on app quit
    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveData(): Promise<void> {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await fs.writeFile(
        path.join(this.dataPath, 'data.json'),
        JSON.stringify(this.data, null, 2)
      );
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  private async loadData(): Promise<void> {
    try {
      const dataFile = path.join(this.dataPath, 'data.json');
      const data = await fs.readFile(dataFile, 'utf-8');
      this.data = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, use default data
      console.log('No existing data found, using defaults');
      await this.saveData();
    }
  }

  // Task Management Methods
  private async createTask(args: any) {
    const task: Task = {
      id: this.generateId(),
      title: args.title,
      description: args.description,
      status: 'pending',
      priority: args.priority || 'medium',
      tags: args.tags || [],
      created: new Date(),
      updated: new Date(),
      dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
      notes: [],
      subtasks: [],
      parentId: args.parentId
    };

    if (args.parentId) {
      const parent = this.findTaskById(args.parentId);
      if (parent) {
        parent.subtasks.push(task);
      } else {
        throw new Error(`Parent task ${args.parentId} not found`);
      }
    } else {
      this.data.tasks.push(task);
    }

    // Update tags
    args.tags?.forEach((tag: string) => {
      if (!this.data.tags.includes(tag)) {
        this.data.tags.push(tag);
      }
    });

    await this.saveData();
    return { content: [{ type: 'text', text: `Task created: ${task.title} (ID: ${task.id})` }] };
  }

  private async listTasks(args: any) {
    let tasks = this.getAllTasks();

    // Apply filters
    if (args.status) {
      tasks = tasks.filter(task => task.status === args.status);
    }
    if (args.priority) {
      tasks = tasks.filter(task => task.priority === args.priority);
    }
    if (args.tags) {
      tasks = tasks.filter(task => 
        args.tags.some((tag: string) => task.tags.includes(tag))
      );
    }

    const taskList = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      tags: task.tags,
      created: task.created,
      dueDate: task.dueDate,
      subtaskCount: task.subtasks.length,
      noteCount: task.notes.length
    }));

    return { 
      content: [{ 
        type: 'text', 
        text: `Found ${taskList.length} tasks:\n\n${JSON.stringify(taskList, null, 2)}` 
      }] 
    };
  }

  private async updateTask(args: any) {
    const task = this.findTaskById(args.id);
    if (!task) {
      throw new Error(`Task ${args.id} not found`);
    }

    // Update fields
    if (args.title !== undefined) task.title = args.title;
    if (args.description !== undefined) task.description = args.description;
    if (args.status !== undefined) task.status = args.status;
    if (args.priority !== undefined) task.priority = args.priority;
    if (args.tags !== undefined) task.tags = args.tags;
    if (args.dueDate !== undefined) task.dueDate = new Date(args.dueDate);
    if (args.notes !== undefined) task.notes.push(...args.notes);

    task.updated = new Date();

    await this.saveData();
    return { content: [{ type: 'text', text: `Task updated: ${task.title}` }] };
  }

  private async deleteTask(args: any) {
    const taskIndex = this.data.tasks.findIndex(task => task.id === args.id);
    if (taskIndex === -1) {
      // Check subtasks
      const parent = this.findParentTask(args.id);
      if (parent) {
        const subtaskIndex = parent.subtasks.findIndex(task => task.id === args.id);
        if (subtaskIndex !== -1) {
          const deletedTask = parent.subtasks.splice(subtaskIndex, 1)[0];
          await this.saveData();
          return { content: [{ type: 'text', text: `Subtask deleted: ${deletedTask.title}` }] };
        }
      }
      throw new Error(`Task ${args.id} not found`);
    }

    const deletedTask = this.data.tasks.splice(taskIndex, 1)[0];
    await this.saveData();
    return { content: [{ type: 'text', text: `Task deleted: ${deletedTask.title}` }] };
  }

  // Note Management Methods
  private async createNote(args: any) {
    const note: Note = {
      id: this.generateId(),
      title: args.title,
      content: args.content,
      tags: args.tags || [],
      created: new Date(),
      updated: new Date(),
      linkedNotes: args.linkedNotes || [],
      linkedTasks: args.linkedTasks || []
    };

    this.data.notes.push(note);

    // Update tags
    args.tags?.forEach((tag: string) => {
      if (!this.data.tags.includes(tag)) {
        this.data.tags.push(tag);
      }
    });

    await this.saveData();
    return { content: [{ type: 'text', text: `Note created: ${note.title} (ID: ${note.id})` }] };
  }

  private async listNotes(args: any) {
    let notes = this.data.notes;

    // Apply filters
    if (args.search) {
      const searchTerm = args.search.toLowerCase();
      notes = notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm) ||
        note.content.toLowerCase().includes(searchTerm)
      );
    }
    if (args.tags) {
      notes = notes.filter(note => 
        args.tags.some((tag: string) => note.tags.includes(tag))
      );
    }
    if (args.linkedTo) {
      notes = notes.filter(note => 
        note.linkedNotes.includes(args.linkedTo) ||
        note.linkedTasks.includes(args.linkedTo)
      );
    }

    const noteList = notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content.substring(0, 200) + '...',
      tags: note.tags,
      created: note.created,
      updated: note.updated,
      connections: note.linkedNotes.length + note.linkedTasks.length
    }));

    return { 
      content: [{ 
        type: 'text', 
        text: `Found ${noteList.length} notes:\n\n${JSON.stringify(noteList, null, 2)}` 
      }] 
    };
  }

  private async updateNote(args: any) {
    const note = this.data.notes.find(n => n.id === args.id);
    if (!note) {
      throw new Error(`Note ${args.id} not found`);
    }

    // Update fields
    if (args.title !== undefined) note.title = args.title;
    if (args.content !== undefined) note.content = args.content;
    if (args.tags !== undefined) note.tags = args.tags;
    if (args.linkedNotes !== undefined) note.linkedNotes = args.linkedNotes;
    if (args.linkedTasks !== undefined) note.linkedTasks = args.linkedTasks;

    note.updated = new Date();

    await this.saveData();
    return { content: [{ type: 'text', text: `Note updated: ${note.title}` }] };
  }

  private async deleteNote(args: any) {
    const noteIndex = this.data.notes.findIndex(note => note.id === args.id);
    if (noteIndex === -1) {
      throw new Error(`Note ${args.id} not found`);
    }

    const deletedNote = this.data.notes.splice(noteIndex, 1)[0];
    await this.saveData();
    return { content: [{ type: 'text', text: `Note deleted: ${deletedNote.title}` }] };
  }

  // Knowledge Graph Methods
  private async getConnections(args: any) {
    const _depth = args.depth || 1;
    const connections = this.findConnections(args.id, _depth);
    
    return { 
      content: [{ 
        type: 'text', 
        text: `Connections for ${args.id}:\n\n${JSON.stringify(connections, null, 2)}` 
      }] 
    };
  }

  private async searchKnowledge(args: any) {
    const query = args.query.toLowerCase();
    const limit = args.limit || 10;
    const type = args.type || 'all';
    
    let results: any[] = [];

    if (type === 'all' || type === 'notes') {
      const noteResults = this.data.notes
        .filter(note => 
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          note.tags.some(tag => tag.toLowerCase().includes(query))
        )
        .map(note => ({ type: 'note', ...note }));
      results.push(...noteResults);
    }

    if (type === 'all' || type === 'tasks') {
      const taskResults = this.getAllTasks()
        .filter(task => 
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.tags.some(tag => tag.toLowerCase().includes(query))
        )
        .map(task => ({ type: 'task', ...task }));
      results.push(...taskResults);
    }

    results = results.slice(0, limit);

    return { 
      content: [{ 
        type: 'text', 
        text: `Search results for "${args.query}":\n\n${JSON.stringify(results, null, 2)}` 
      }] 
    };
  }

  private async getAnalytics(args: any) {
    const period = args.period || 'week';
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const allTasks = this.getAllTasks();
    const recentTasks = allTasks.filter(task => task.created >= startDate);
    const completedTasks = allTasks.filter(task => task.status === 'completed');
    const recentNotes = this.data.notes.filter(note => note.created >= startDate);

    const analytics = {
      period,
      totalTasks: allTasks.length,
      recentTasks: recentTasks.length,
      completedTasks: completedTasks.length,
      completionRate: allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0,
      totalNotes: this.data.notes.length,
      recentNotes: recentNotes.length,
      totalTags: this.data.tags.length,
      tasksByStatus: {
        pending: allTasks.filter(t => t.status === 'pending').length,
        in_progress: allTasks.filter(t => t.status === 'in_progress').length,
        completed: allTasks.filter(t => t.status === 'completed').length,
        deferred: allTasks.filter(t => t.status === 'deferred').length
      },
      tasksByPriority: {
        low: allTasks.filter(t => t.priority === 'low').length,
        medium: allTasks.filter(t => t.priority === 'medium').length,
        high: allTasks.filter(t => t.priority === 'high').length
      }
    };

    return { 
      content: [{ 
        type: 'text', 
        text: `Analytics for ${period}:\n\n${JSON.stringify(analytics, null, 2)}` 
      }] 
    };
  }

  private async exportData(args: any) {
    const format = args.format || 'json';
    const includeCompleted = args.includeCompleted !== false;
    
    let tasks = this.getAllTasks();
    if (!includeCompleted) {
      tasks = tasks.filter(task => task.status !== 'completed');
    }

    const exportData = {
      tasks,
      notes: this.data.notes,
      tags: this.data.tags,
      exportDate: new Date(),
      format
    };

    let result: string;
    switch (format) {
      case 'json':
        result = JSON.stringify(exportData, null, 2);
        break;
      case 'markdown':
        result = this.exportToMarkdown(exportData);
        break;
      case 'csv':
        result = this.exportToCSV(exportData);
        break;
      default:
        result = JSON.stringify(exportData, null, 2);
    }

    return { 
      content: [{ 
        type: 'text', 
        text: `Exported data in ${format} format:\n\n${result}` 
      }] 
    };
  }

  // Helper Methods
  private getAllTasks(): Task[] {
    const allTasks: Task[] = [];
    
    const addTasks = (tasks: Task[]) => {
      tasks.forEach(task => {
        allTasks.push(task);
        if (task.subtasks.length > 0) {
          addTasks(task.subtasks);
        }
      });
    };
    
    addTasks(this.data.tasks);
    return allTasks;
  }

  private findTaskById(id: string): Task | null {
    const allTasks = this.getAllTasks();
    return allTasks.find(task => task.id === id) || null;
  }

  private findParentTask(subtaskId: string): Task | null {
    const findParent = (tasks: Task[]): Task | null => {
      for (const task of tasks) {
        if (task.subtasks.some(subtask => subtask.id === subtaskId)) {
          return task;
        }
        const parent = findParent(task.subtasks);
        if (parent) return parent;
      }
      return null;
    };
    
    return findParent(this.data.tasks);
  }

  private findConnections(id: string, _depth: number): any {
    const connections: any = {
      id,
      type: 'unknown',
      connections: []
    };

    // Find the item
    const task = this.findTaskById(id);
    const note = this.data.notes.find(n => n.id === id);

    if (task) {
      connections.type = 'task';
      connections.title = task.title;
      
      // Find linked notes
      const linkedNotes = this.data.notes.filter(n => n.linkedTasks.includes(id));
      connections.connections.push(...linkedNotes.map(n => ({ type: 'note', id: n.id, title: n.title })));
      
      // Find subtasks
      connections.connections.push(...task.subtasks.map(t => ({ type: 'task', id: t.id, title: t.title })));
    } else if (note) {
      connections.type = 'note';
      connections.title = note.title;
      
      // Find linked notes
      const linkedNotes = this.data.notes.filter(n => note.linkedNotes.includes(n.id));
      connections.connections.push(...linkedNotes.map(n => ({ type: 'note', id: n.id, title: n.title })));
      
      // Find linked tasks
      const linkedTasks = this.getAllTasks().filter(t => note.linkedTasks.includes(t.id));
      connections.connections.push(...linkedTasks.map(t => ({ type: 'task', id: t.id, title: t.title })));
    }

    return connections;
  }

  private exportToMarkdown(data: any): string {
    let markdown = `# Engie Second Brain Export\n\n`;
    markdown += `Export Date: ${data.exportDate}\n\n`;
    
    markdown += `## Tasks\n\n`;
    data.tasks.forEach((task: Task) => {
      markdown += `### ${task.title}\n`;
      markdown += `- **Status**: ${task.status}\n`;
      markdown += `- **Priority**: ${task.priority}\n`;
      markdown += `- **Created**: ${task.created}\n`;
      markdown += `- **Description**: ${task.description}\n`;
      if (task.tags.length > 0) {
        markdown += `- **Tags**: ${task.tags.join(', ')}\n`;
      }
      markdown += `\n`;
    });
    
    markdown += `## Notes\n\n`;
    data.notes.forEach((note: Note) => {
      markdown += `### ${note.title}\n`;
      markdown += `${note.content}\n`;
      if (note.tags.length > 0) {
        markdown += `**Tags**: ${note.tags.join(', ')}\n`;
      }
      markdown += `\n`;
    });
    
    return markdown;
  }

  private exportToCSV(data: any): string {
    let csv = 'Type,ID,Title,Description,Status,Priority,Tags,Created,Updated\n';
    
    data.tasks.forEach((task: Task) => {
      csv += `Task,${task.id},"${task.title}","${task.description}",${task.status},${task.priority},"${task.tags.join(';')}",${task.created},${task.updated}\n`;
    });
    
    data.notes.forEach((note: Note) => {
      csv += `Note,${note.id},"${note.title}","${note.content.substring(0, 100)}",,,,"${note.tags.join(';')}",${note.created},${note.updated}\n`;
    });
    
    return csv;
  }

  async start(): Promise<void> {
    console.log('Starting Engie MCP Server...');
    
    // Load existing data
    await this.loadData();
    
    // Create stdio transport
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    await this.server.connect(transport);
    
    console.log('Engie MCP Server started successfully');
  }

  async stop(): Promise<void> {
    console.log('Stopping Engie MCP Server...');
    this.cleanup();
    
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
    }
    
    await this.server.close();
  }

  private cleanup(): void {
    // Clear the auto-save interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    // Save data one final time
    this.saveData().catch(console.error);
  }
}

// Export the server instance
export const engieMCPServer = new EngieMCPServer();