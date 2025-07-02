import React, { useState, useEffect } from 'react';
import './App.css';

// ENGIE v2.0 - Simplified UI Foundation
// Following PRD Phase 1: Basic Electron Shell with IPC Communication

interface AppInfo {
  name: string;
  version: string;
  platform: string;
}

function App() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 ENGIE v2.0 - Initializing...');
      
      // Test IPC communication
      const [name, version, platform] = await Promise.all([
        window.electronAPI.app.getName(),
        window.electronAPI.app.getVersion(),
        window.electronAPI.system.platform()
      ]);

      setAppInfo({
        name,
        version,
        platform
      });

      console.log('✅ ENGIE v2.0 - Initialized successfully');
      setIsLoading(false);
    } catch (err) {
      console.error('❌ Failed to initialize ENGIE v2.0:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  const handleWindowAction = async (action: 'minimize' | 'close' | 'maximize') => {
    try {
      await window.electronAPI.window[action]();
    } catch (err) {
      console.error(`Failed to ${action} window:`, err);
    }
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>ENGIE v2.0</h2>
          <p>Initializing Enhanced Neural Gateway...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <div className="error-container">
          <h2>❌ Initialization Error</h2>
          <p>{error}</p>
          <button 
            onClick={initializeApp}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Title Bar */}
      <div className="title-bar">
        <div className="title-bar-title">
          {appInfo?.name} v{appInfo?.version}
        </div>
        <div className="title-bar-controls">
          <button 
            onClick={() => handleWindowAction('minimize')}
            className="title-bar-button minimize"
            title="Minimize"
          >
            −
          </button>
          <button 
            onClick={() => handleWindowAction('maximize')}
            className="title-bar-button maximize"
            title="Maximize"
          >
            □
          </button>
          <button 
            onClick={() => handleWindowAction('close')}
            className="title-bar-button close"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="app-content">
        <div className="welcome-section">
          <h1>Welcome to ENGIE v2.0</h1>
          <p className="subtitle">Enhanced Neural Gateway for Intelligent Execution</p>
          
          <div className="system-info">
            <h3>System Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>App Name:</label>
                <span>{appInfo?.name}</span>
              </div>
              <div className="info-item">
                <label>Version:</label>
                <span>{appInfo?.version}</span>
              </div>
              <div className="info-item">
                <label>Platform:</label>
                <span>{appInfo?.platform}</span>
              </div>
              <div className="info-item">
                <label>Status:</label>
                <span className="status-ok">✅ Ready</span>
              </div>
            </div>
          </div>

          <div className="phase-status">
            <h3>Development Phase</h3>
            <div className="phase-indicator">
              <div className="phase active">
                <span className="phase-number">1</span>
                <span className="phase-title">Foundation</span>
                <span className="phase-status">✅ Complete</span>
              </div>
              <div className="phase pending">
                <span className="phase-number">2</span>
                <span className="phase-title">Task Management</span>
                <span className="phase-status">⏳ Next</span>
              </div>
              <div className="phase pending">
                <span className="phase-number">3</span>
                <span className="phase-title">AI Integration</span>
                <span className="phase-status">⏳ Planned</span>
              </div>
            </div>
          </div>

          <div className="next-steps">
            <h3>Next Steps (Phase 1.3)</h3>
            <ul>
              <li>✅ Basic Electron Shell</li>
              <li>✅ IPC Communication Working</li>
              <li>✅ Basic React App Renders</li>
              <li>⏳ Single Task CRUD Implementation</li>
            </ul>
            <p className="note">
              Following PRD principle: "Make one thing work perfectly before adding anything else"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;