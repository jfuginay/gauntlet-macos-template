import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Key, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { ApiKeySettings } from './ApiKeySettings';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isComplete: boolean;
  isRequired: boolean;
}

const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  return (
    <div className="text-center max-w-4xl mx-auto">
      <div className="mb-12">
        <div className="mx-auto w-32 h-32 bg-gradient-to-br from-gauntlet-500 via-neon-cyan to-neon-purple rounded-3xl flex items-center justify-center mb-8 shadow-glow-xl animate-glow-pulse">
          <Sparkles className="h-16 w-16 text-white" />
        </div>
        <h1 className="text-6xl font-bold text-white mb-6 font-mono tracking-wider">
          ENGIE_AI
        </h1>
        <p className="text-xl text-gauntlet-300 mb-12 font-mono">
          {'>'} EXPERT_NAVIGATOR_FOR_GOAL_IMPLEMENTATION
        </p>
      </div>

      <div className="bg-gradient-to-r from-terminal-800/50 to-terminal-700/30 backdrop-blur-sm border border-gauntlet-500/30 rounded-2xl p-8 mb-12 shadow-glow-lg">
        <h2 className="text-2xl font-semibold text-white mb-8 font-mono tracking-wide text-center">SYSTEM_CAPABILITIES</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="flex items-start gap-4 p-4 bg-terminal-900/30 rounded-xl border border-matrix-500/20">
            <div className="p-2 bg-matrix-500/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-matrix-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1 font-mono">AI_CONVERSATIONS</h3>
              <p className="text-terminal-300 text-sm font-mono">Multi-model AI integration: Claude, GPT, Perplexity</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-terminal-900/30 rounded-xl border border-gauntlet-500/20">
            <div className="p-2 bg-gauntlet-500/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-gauntlet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1 font-mono">TASK_MANAGEMENT</h3>
              <p className="text-terminal-300 text-sm font-mono">Intelligent project planning with MCP integration</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-terminal-900/30 rounded-xl border border-neon-cyan/20">
            <div className="p-2 bg-neon-cyan/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-neon-cyan" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1 font-mono">CONTEXT_AWARENESS</h3>
              <p className="text-terminal-300 text-sm font-mono">Adaptive workflow understanding and automation</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-terminal-900/30 rounded-xl border border-neon-green/20">
            <div className="p-2 bg-neon-green/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-neon-green" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1 font-mono">SECURE_PRIVATE</h3>
              <p className="text-terminal-300 text-sm font-mono">Local processing with Keychain encryption</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="px-12 py-4 bg-gradient-to-r from-gauntlet-600 to-gauntlet-500 hover:from-gauntlet-500 hover:to-gauntlet-400 text-white rounded-2xl font-mono font-semibold flex items-center gap-3 mx-auto shadow-glow hover:shadow-glow-lg transition-all duration-300 text-lg tracking-wide"
      >
        INITIALIZE_SYSTEM
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

const ApiKeySetupStep: React.FC<{ onNext: () => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const [hasRequiredKeys, setHasRequiredKeys] = useState(false);

  useEffect(() => {
    checkRequiredKeys();
  }, []);

  const checkRequiredKeys = async () => {
    try {
      const hasKeys = await window.electronAPI?.hasRequiredApiKeys(['ANTHROPIC_API_KEY', 'PERPLEXITY_API_KEY']);
      setHasRequiredKeys(hasKeys || false);
    } catch (error) {
      console.error('Failed to check API keys:', error);
    }
  };

  const handleContinue = () => {
    if (hasRequiredKeys) {
      onNext();
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <Key className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Configure API Keys</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Set up your AI service API keys to unlock Engie's full potential
        </p>
      </div>

      <ApiKeySettings 
        isFirstRun={true} 
        onClose={() => {
          checkRequiredKeys();
          if (hasRequiredKeys) {
            onNext();
          }
        }} 
      />

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-8 py-3 bg-terminal-800/50 hover:bg-terminal-700/50 border border-terminal-600/50 hover:border-terminal-500/50 text-terminal-300 hover:text-terminal-200 rounded-xl transition-all duration-200 font-mono text-sm flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          BACK
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!hasRequiredKeys}
          className="px-8 py-3 bg-gradient-to-r from-gauntlet-600 to-gauntlet-500 hover:from-gauntlet-500 hover:to-gauntlet-400 disabled:from-terminal-700 disabled:to-terminal-600 text-white rounded-xl disabled:cursor-not-allowed transition-all duration-200 font-mono text-sm shadow-glow hover:shadow-glow-lg flex items-center gap-2"
        >
          CONTINUE
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const CompletionStep: React.FC<{ onFinish: () => void; onBack: () => void }> = ({ onFinish, onBack }) => {
  return (
    <div className="text-center max-w-4xl mx-auto">
      <div className="mb-12">
        <div className="mx-auto w-32 h-32 bg-gradient-to-br from-matrix-500 via-matrix-400 to-neon-green rounded-3xl flex items-center justify-center mb-8 shadow-glow-xl animate-glow-pulse">
          <CheckCircle className="h-16 w-16 text-white" />
        </div>
        <h2 className="text-5xl font-bold text-white mb-6 font-mono tracking-wider">
          SYSTEM_READY
        </h2>
        <p className="text-xl text-gauntlet-300 mb-12 font-mono">
          {'>'} ENGIE_AI_INITIALIZED_SUCCESSFULLY
        </p>
      </div>

      <div className="bg-gradient-to-r from-terminal-800/50 to-terminal-700/30 backdrop-blur-sm border border-gauntlet-500/30 rounded-2xl p-8 mb-12 shadow-glow-lg">
        <h3 className="font-semibold text-white mb-6 font-mono text-xl tracking-wide text-center">QUICK_START_GUIDE</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="flex items-start gap-3 p-3 bg-terminal-900/30 rounded-lg border border-gauntlet-500/20">
            <span className="text-gauntlet-400 font-mono text-lg">01</span>
            <span className="text-terminal-200 font-mono text-sm">Chat interface for AI conversations</span>
          </div>
          <div className="flex items-start gap-3 p-3 bg-terminal-900/30 rounded-lg border border-gauntlet-500/20">
            <span className="text-gauntlet-400 font-mono text-lg">02</span>
            <span className="text-terminal-200 font-mono text-sm">Task Master tab for project management</span>
          </div>
          <div className="flex items-start gap-3 p-3 bg-terminal-900/30 rounded-lg border border-gauntlet-500/20">
            <span className="text-gauntlet-400 font-mono text-lg">03</span>
            <span className="text-terminal-200 font-mono text-sm">Settings gear icon for key management</span>
          </div>
          <div className="flex items-start gap-3 p-3 bg-terminal-900/30 rounded-lg border border-gauntlet-500/20">
            <span className="text-gauntlet-400 font-mono text-lg">04</span>
            <span className="text-terminal-200 font-mono text-sm">Local encryption ensures privacy</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-8 py-3 bg-terminal-800/50 hover:bg-terminal-700/50 border border-terminal-600/50 hover:border-terminal-500/50 text-terminal-300 hover:text-terminal-200 rounded-xl transition-all duration-200 font-mono text-sm flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          BACK
        </button>
        
        <button
          onClick={onFinish}
          className="px-12 py-4 bg-gradient-to-r from-matrix-600 to-matrix-500 hover:from-matrix-500 hover:to-matrix-400 text-white rounded-2xl font-mono font-semibold flex items-center gap-3 shadow-glow hover:shadow-glow-lg transition-all duration-300 text-lg tracking-wide"
        >
          LAUNCH_ENGIE_AI
          <Sparkles className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

interface FirstRunSetupProps {
  onComplete: () => void;
}

export const FirstRunSetup: React.FC<FirstRunSetupProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps: SetupStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Introduction to Engie AI',
      component: WelcomeStep,
      isComplete: completedSteps.has(0),
      isRequired: true
    },
    {
      id: 'api-keys',
      title: 'API Keys',
      description: 'Configure AI service access',
      component: ApiKeySetupStep,
      isComplete: completedSteps.has(1),
      isRequired: true
    },
    {
      id: 'completion',
      title: 'Complete',
      description: 'Setup finished',
      component: CompletionStep,
      isComplete: completedSteps.has(2),
      isRequired: true
    }
  ];

  const goToNextStep = () => {
    setCompletedSteps(prev => new Set(prev).add(currentStep));
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    try {
      // Mark setup as complete
      await window.electronAPI?.setFirstRunComplete?.();
      onComplete();
    } catch (error) {
      console.error('Failed to complete setup:', error);
      onComplete(); // Continue anyway
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-terminal-950 via-terminal-900 to-gauntlet-950 relative overflow-hidden flex items-center justify-center p-6">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-retro-grid bg-[size:40px_40px] opacity-20 animate-pulse"></div>
      
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gauntlet-500/10 rounded-full blur-3xl animate-glow-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-neon-cyan/10 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10 w-full max-w-6xl">
        {/* Progress indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
                    index <= currentStep
                      ? 'bg-gradient-to-r from-gauntlet-600 to-gauntlet-500 border-gauntlet-400 text-white shadow-glow'
                      : 'bg-terminal-800/50 border-terminal-600 text-terminal-400'
                  }`}
                >
                  {completedSteps.has(index) ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <span className="text-lg font-bold font-mono">{index + 1}</span>
                  )}
                </div>
                
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-1 mx-3 rounded-full transition-all duration-300 ${
                      index < currentStep ? 'bg-gradient-to-r from-gauntlet-600 to-gauntlet-500 shadow-glow-sm' : 'bg-terminal-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center mt-6">
            <h3 className="text-2xl font-bold text-white font-mono tracking-wide">
              {steps[currentStep].title.toUpperCase()}
            </h3>
            <p className="text-gauntlet-300 font-mono mt-2">
              {'>'} {steps[currentStep].description}
            </p>
          </div>
        </div>

        {/* Current step content */}
        <div className="bg-gradient-to-r from-terminal-800/50 to-terminal-700/30 backdrop-blur-sm border border-gauntlet-500/30 rounded-3xl shadow-glow-xl p-12">
          <CurrentStepComponent
            onNext={goToNextStep}
            onBack={goToPreviousStep}
            onFinish={handleFinish}
          />
        </div>
      </div>
    </div>
  );
};