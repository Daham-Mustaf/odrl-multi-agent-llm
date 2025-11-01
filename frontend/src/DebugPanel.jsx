// Debug Panel Component - Add this to your React app to see what's being sent
// This will help you debug and see exactly what data is being passed to your backend

import React from 'react';
import { Eye, EyeOff, Bug } from 'lucide-react';

const DebugPanel = ({ 
  darkMode, 
  selectedModel, 
  customModels, 
  agentModels, 
  advancedMode,
  temperature 
}) => {
  const [showDebug, setShowDebug] = React.useState(false);
  const [lastAPICall, setLastAPICall] = React.useState(null);

  // Helper function to get custom model config
  const getModelConfig = (modelValue) => {
    if (!modelValue) return null;
    const customModel = customModels.find(m => m.value === modelValue);
    if (customModel) {
      return {
        provider_type: customModel.provider_type,
        base_url: customModel.base_url,
        model_id: customModel.model_id,
        api_key: customModel.api_key ? '***hidden***' : null,
        context_length: customModel.context_length,
        temperature_default: customModel.temperature_default
      };
    }
    return null;
  };

  // Mock what would be sent for each agent
  const getAgentPayload = (agent) => {
    const model = advancedMode && agentModels[agent] ? agentModels[agent] : selectedModel;
    const customConfig = getModelConfig(model);
    
    return {
      model: model,
      temperature: temperature,
      custom_model: customConfig,
      is_custom: !!customConfig
    };
  };

  React.useEffect(() => {
    // Intercept fetch to capture API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options] = args;
      if (url.includes('/api/') && options?.body) {
        try {
          const body = JSON.parse(options.body);
          setLastAPICall({
            url,
            method: options.method,
            body,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          // Not JSON body
        }
      }
      return originalFetch(...args);
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className={`fixed bottom-4 right-4 p-3 rounded-full shadow-lg z-40 ${
          darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'
        } text-white transition-all transform hover:scale-110`}
        title="Show Debug Panel"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 w-96 max-h-[600px] overflow-auto rounded-lg shadow-2xl z-40 ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border`}>
      <div className={`sticky top-0 px-4 py-3 border-b ${
        darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
      } flex items-center justify-between`}>
        <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <Bug className="w-4 h-4" />
          Debug Panel
        </h3>
        <button
          onClick={() => setShowDebug(false)}
          className={`p-1 rounded hover:bg-gray-600/20`}
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Configuration */}
        <div>
          <h4 className={`font-semibold text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Current Configuration
          </h4>
          <div className={`text-xs space-y-1 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-3 rounded`}>
            <div><span className="font-semibold">Selected Model:</span> {selectedModel || 'none'}</div>
            <div><span className="font-semibold">Advanced Mode:</span> {advancedMode ? 'ON' : 'OFF'}</div>
            <div><span className="font-semibold">Temperature:</span> {temperature}</div>
            <div><span className="font-semibold">Custom Models:</span> {customModels.length}</div>
          </div>
        </div>

        {/* Agent Configurations */}
        <div>
          <h4 className={`font-semibold text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            What Will Be Sent Per Agent
          </h4>
          {['parser', 'reasoner', 'generator', 'validator'].map(agent => {
            const payload = getAgentPayload(agent);
            return (
              <div key={agent} className="mb-3">
                <div className={`text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {agent.charAt(0).toUpperCase() + agent.slice(1)}:
                </div>
                <pre className={`text-xs ${darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'} p-2 rounded overflow-auto`}>
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            );
          })}
        </div>

        {/* Last API Call */}
        {lastAPICall && (
          <div>
            <h4 className={`font-semibold text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Last API Call
            </h4>
            <div className={`text-xs ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-3 rounded`}>
              <div className="font-semibold text-green-500 mb-1">
                {lastAPICall.method} {lastAPICall.url}
              </div>
              <div className="text-gray-500 mb-2">{lastAPICall.timestamp}</div>
              <pre className="overflow-auto max-h-40">
                {JSON.stringify(lastAPICall.body, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Custom Models Details */}
        <div>
          <h4 className={`font-semibold text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Custom Models Registry
          </h4>
          <div className={`text-xs space-y-2 max-h-40 overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-3 rounded`}>
            {customModels.length === 0 ? (
              <div className="text-gray-500">No custom models</div>
            ) : (
              customModels.map((model, idx) => (
                <div key={idx} className={`pb-2 border-b last:border-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="font-semibold">{model.label}</div>
                  <div className="text-gray-500">
                    {model.provider_type} | {model.model_id}
                  </div>
                  {model.base_url && (
                    <div className="text-gray-500 truncate">URL: {model.base_url}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;

// Usage: Add this to your main component:
// <DebugPanel 
//   darkMode={darkMode}
//   selectedModel={selectedModel}
//   customModels={customModels}
//   agentModels={agentModels}
//   advancedMode={advancedMode}
//   temperature={temperature}
// />