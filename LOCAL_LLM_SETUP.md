# Local LLM Setup Guide for Engie Desktop App

This guide explains how to set up and use local Large Language Models (LLMs) with the Engie desktop application for complete privacy and offline functionality.

## Overview

The Engie desktop app now supports running AI models locally on your machine using:
- **Docker containers** for easy deployment and isolation
- **Ollama** as the LLM runtime engine
- **Automatic fallback models** to ensure chat functionality always works
- **GPU acceleration** when available for better performance

## Prerequisites

### Required Software
1. **Docker Desktop** - Download from [docker.com](https://www.docker.com/products/docker-desktop/)
2. **Engie Desktop App** - The latest version with local LLM support

### System Requirements
- **Minimum**: 8GB RAM, 10GB free disk space
- **Recommended**: 16GB RAM, 20GB free disk space
- **GPU Support**: NVIDIA GPU with CUDA drivers (optional but recommended)

## Quick Setup

### 1. Install Docker Desktop
1. Download Docker Desktop from the official website
2. Install and start Docker Desktop
3. Ensure Docker is running (check system tray/menu bar)

### 2. Configure Local LLM in Engie
1. Open Engie desktop app
2. Click the **Settings** button (gear icon)
3. Click **"Setup Local LLM (Offline)"**
4. In the Local LLM Setup dialog:
   - Verify Docker is detected (green checkmark)
   - Check if GPU support is available
   - Click **"Setup & Start Local LLM"**

### 3. Wait for Initial Setup
The first setup will:
1. Download the Ollama Docker image (~1GB)
2. Start the container
3. Download a small fallback model (Phi-3 Mini, ~2.2GB)
4. Verify everything is working

This process typically takes 5-10 minutes depending on your internet connection.

## Model Management

### Recommended Models

The app includes several pre-configured model options:

| Model | Size | Description | Best For |
|-------|------|-------------|----------|
| **Phi-3 Mini** | 2.2GB | Microsoft's efficient model | General writing tasks |
| **Llama 3.2 3B** | 2.0GB | Meta's balanced model | Conversation and analysis |
| **Qwen 2.5 3B** | 1.9GB | Excellent for coding | Technical writing |
| **Gemma 2 2B** | 1.6GB | Google's lightweight model | Quick responses |
| **TinyLlama** | 636MB | Ultra-small emergency fallback | Basic functionality |

### Adding New Models
1. Go to Settings → Local LLM Setup → Models tab
2. Browse the "Recommended Models" section
3. Click **Download** next to any model you want to install
4. Wait for download to complete (models are cached locally)

### Removing Models
1. In the Models tab, find installed models
2. Click the trash icon next to any model to remove it
3. Confirm deletion to free up disk space

## Configuration Options

### Basic Settings
- **Enable Local LLM**: Toggle local AI processing on/off
- **Use GPU Acceleration**: Enable if you have a compatible NVIDIA GPU
- **Fallback Model**: Choose which model to auto-download if none are available
- **Port**: Advanced users can change the port (default: 11434)

### Performance Tuning
- **GPU Users**: Enable GPU acceleration for 3-5x faster responses
- **CPU Users**: Stick with smaller models (Phi-3 Mini, Gemma 2 2B) for best performance
- **Low Memory**: Use TinyLlama as your primary model

## How It Works

### Architecture
```
Engie App → Local LLM Service → Docker Container → Ollama → AI Model
```

### Fallback Strategy
1. **Primary**: Use local LLM if available and running
2. **Secondary**: Fall back to cloud AI (Claude) if API key is configured
3. **Tertiary**: Use intelligent pre-programmed responses

### Data Privacy
- All conversations with local models stay on your machine
- No data is sent to external servers when using local LLM
- Models run in isolated Docker containers
- Chat history is stored locally only

## Troubleshooting

### Docker Issues
**Problem**: "Docker not available"
- **Solution**: Install Docker Desktop and ensure it's running
- **Check**: Look for Docker whale icon in system tray/menu bar

**Problem**: Container fails to start
- **Solution**: Restart Docker Desktop, try setup again
- **Check**: Ensure you have enough disk space (10GB minimum)

### Model Issues
**Problem**: Models download slowly
- **Solution**: This is normal for large files, be patient
- **Tip**: Download smaller models first (TinyLlama, Gemma 2B)

**Problem**: "Model not responding"
- **Solution**: Wait 30-60 seconds for model to load into memory
- **Check**: Ensure container is running in Docker Desktop

### Performance Issues
**Problem**: Responses are very slow
- **Solution**: 
  - Use smaller models (Phi-3 Mini instead of larger ones)
  - Enable GPU acceleration if available
  - Close other memory-intensive applications

**Problem**: Out of memory errors
- **Solution**:
  - Use TinyLlama for low-memory systems
  - Increase Docker memory limits in Docker Desktop settings
  - Close other applications

### GPU Issues
**Problem**: GPU not detected
- **Solution**:
  - Install latest NVIDIA drivers
  - Ensure Docker Desktop has GPU support enabled
  - Restart Docker Desktop after driver installation

## Advanced Configuration

### Custom Models
Advanced users can add custom GGUF models by:
1. Placing model files in the container's `/models` directory
2. Using Ollama's `create` command to register custom models
3. Configuring the model in Engie's settings

### Resource Limits
You can limit resource usage by modifying the Docker Compose configuration:
```yaml
deploy:
  resources:
    limits:
      memory: 8G
      cpus: '4'
```

### Network Configuration
For advanced networking setups, modify the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "11434:11434"  # Change first number to use different host port
```

## Security Considerations

### Container Security
- Models run in isolated Docker containers
- No network access except for the API port
- Container filesystem is ephemeral (except model storage)

### Data Privacy
- All model processing happens locally
- No telemetry or usage data is sent externally
- Chat history remains on your device

### Updates
- Model updates are manual (you control when to download new versions)
- Container updates happen through the app's update mechanism
- No automatic data collection or reporting

## FAQ

### Q: Can I use this without internet?
**A**: Yes! Once models are downloaded, everything works offline. You only need internet for initial setup and model downloads.

### Q: How much disk space do I need?
**A**: Minimum 10GB for Docker and one small model. For multiple models, budget 2-5GB per model.

### Q: Will this slow down my computer?
**A**: Models use RAM when active (2-8GB depending on model size). When not in use, they consume minimal resources.

### Q: Can I use multiple models?
**A**: Yes! You can install multiple models and the app will use the first available one. You can switch between them in settings.

### Q: Is this better than cloud AI?
**A**: Different trade-offs:
- **Local**: Private, offline, free after setup, but requires powerful hardware
- **Cloud**: More capable, less hardware requirements, but requires internet and API costs

### Q: What if something breaks?
**A**: You can always:
1. Stop the container in settings
2. Remove all models to free space
3. Restart the setup process
4. Fall back to cloud AI or built-in responses

## Support

For additional help:
1. Check the app's built-in status indicators
2. Review Docker Desktop logs for container issues
3. Ensure your system meets minimum requirements
4. Try with smaller models first before larger ones

The local LLM feature is designed to work alongside, not replace, cloud AI options. You can use both simultaneously and the app will automatically choose the best available option for each request.