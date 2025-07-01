# Engie - Build Instructions for Evaluators

## 🚀 Quick Build & Run

### **Prerequisites**
- **Node.js 18+** ([Download here](https://nodejs.org/))
- **macOS 12.0+**
- **Git** (pre-installed on macOS)

### **Clone & Build**
```bash
# Clone the repository
git clone https://github.com/jfuginay/gauntlet-macos-template.git
cd gauntlet-macos-template

# Install dependencies
npm install

# Option 1: Run in development mode (recommended for evaluation)
npm run dev

# Option 2: Build distributable app
npm run build
```

### **Development Mode (Recommended)**
```bash
npm run dev
```

**What this does:**
- Starts Vite development server on `http://localhost:5173`
- Compiles TypeScript in watch mode
- Launches Electron app with hot reload
- All background services start automatically

**Console output you'll see:**
```
✅ LangGraph workflow engine ready
✅ Background processor started (3 workers)
✅ Local AI ready with model: llama3.2:1b  
✅ TaskMaster MCP: Connected
📊 Available models: 2
```

### **Production Build (Optional)**
```bash
npm run build
```

**What this creates:**
- `release/Engie - AI Writing Companion-1.0.0.dmg` (Intel Macs)
- `release/Engie - AI Writing Companion-1.0.0-arm64.dmg` (Apple Silicon)

## ⚡ **What to Test**

### **Core LangGraph Workflow Features**
1. **Conversational AI**: Type natural language queries
2. **Workflow Automation**: Ask "I need to implement user authentication"
3. **Background Processing**: Watch real-time workflow execution
4. **System Status**: Monitor all services in right sidebar

### **Technical Validation**
- ✅ **LangGraph Integration**: Multi-step workflow chains execute automatically
- ✅ **Background Processing**: 3 concurrent workers handle jobs
- ✅ **Local AI**: Ollama + llama3.2:1b model for offline processing
- ✅ **Desktop Integration**: Native macOS app with system integration

### **UI/UX Experience**
- **Terminal aesthetics** with split-pane layout
- **Real-time system monitoring** in sidebar
- **Immediate responsiveness** (Enter key sends messages)
- **Professional terminal styling** with vim-inspired navigation

## 🐛 **Troubleshooting**

### **Build Issues**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist/
npm run build:main
```

### **Electron Issues**
```bash
# Rebuild electron dependencies
npm run build:main
npm run dev
```

### **Missing Dependencies**
All dependencies are included in `package.json`. The build includes:
- **LangGraph** (@langchain/langgraph) - Workflow automation
- **Ollama Integration** - Local AI processing
- **Electron** - Desktop application framework
- **React + TypeScript** - Frontend with type safety

## 📊 **Performance Expectations**
- **Startup**: < 3 seconds with all services
- **Memory**: ~150MB with background services
- **Response Time**: < 200ms for interactions
- **Workflow Processing**: < 500ms for complex analysis

## 🎯 **Evaluation Focus**

### **Gauntlet Requirements Met**
- ✅ **LangGraph Integration** (MANDATORY): `src/main/workflow-engine.ts`
- ✅ **Local Workflow Execution**: `src/main/background-processor.ts`
- ✅ **Background Intelligence**: Automatic analysis and task generation
- ✅ **Desktop Platform**: Native macOS app with system integration
- ✅ **Personal Problem**: Daily development workflow automation

### **Innovation Highlights**
- **First-of-its-kind**: LangGraph + TaskMaster MCP + conversational AI
- **Terminal-style interface** for AI interaction (unique UX)
- **Context-aware task management** with AI insights
- **Local-first processing** with privacy protection

---

**Repository**: https://github.com/jfuginay/gauntlet-macos-template  
**Build Time**: ~2 minutes on modern hardware  
**Ready for Gauntlet AI Evaluation** ✅ 