// DebugPanel.jsx - Improved version without Framer Motion
// Features: Tabs, Copy JSON, Keyboard Toggle (Ctrl+D), Multiple API Logs

import React from 'react';
import { EyeOff, Bug, Copy, CheckCircle } from 'lucide-react';

const DebugPanel = ({
  darkMode,
  selectedModel,
  customModels = [],
  agentModels = {},
  advancedMode,
  temperature,
  enableLogging = true,
}) => {
  const [showDebug, setShowDebug] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('config');
  const [apiLogs, setApiLogs] = React.useState([]);
  const [copiedIndex, setCopiedIndex] = React.useState(null);

  // Handle keyboard toggle (Ctrl + D)
  React.useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowDebug((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fetch interception (log last 5 API calls)
  React.useEffect(() => {
    if (!enableLogging) return;
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options] = args;
      if (url.includes('/api/') && options?.body) {
        try {
          const body = JSON.parse(options.body);
          setApiLogs((prev) => [
            { 
              url, 
              method: options.method || 'POST', 
              body, 
              timestamp: new Date().toLocaleTimeString(),
              id: Date.now()
            },
            ...prev.slice(0, 4),
          ]);
        } catch {
          // non-JSON body
        }
      }
      return originalFetch(...args);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [enableLogging]);

  // Helpers
  const getModelConfig = (modelValue) => {
    if (!modelValue) return null;
    const customModel = customModels.find((m) => m.value === modelValue);
    if (customModel) {
      return {
        provider_type: customModel.provider_type,
        base_url: customModel.base_url,
        model_id: customModel.model_id,
        api_key: customModel.api_key ? '***hidden***' : null,
        context_length: customModel.context_length,
        temperature_default: customModel.temperature_default,
      };
    }
    return null;
  };

  const getAgentPayload = (agent) => {
    const model = advancedMode && agentModels[agent] ? agentModels[agent] : selectedModel;
    const customConfig = getModelConfig(model);
    return {
      model,
      temperature,
      custom_model: customConfig,
      is_custom: !!customConfig,
    };
  };

  const copyJSON = (data, index = null) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    if (index !== null) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Toggle button (when hidden)
  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className={`fixed bottom-4 right-4 p-3 rounded-full shadow-lg z-40 transition-all transform hover:scale-110 ${
          darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'
        } text-white group`}
        title="Open Debug Console (Ctrl + D)"
      >
        <Bug className="w-5 h-5" />
        <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Debug Panel (Ctrl+D)
        </span>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-4 right-4 w-96 max-h-[600px] rounded-lg shadow-2xl z-40 border transition-all duration-300 transform ${
        showDebug ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      } ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
      style={{ display: showDebug ? 'block' : 'none' }}
    >
      {/* Header */}
      <div
        className={`sticky top-0 flex items-center justify-between px-4 py-3 border-b ${
          darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-purple-500" />
          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Debug Panel
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded ${
            darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
          }`}>
            Ctrl+D
          </span>
        </div>
        <button
          onClick={() => setShowDebug(false)}
          className={`p-1.5 rounded-lg transition ${
            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
          }`}
          title="Hide Debug Panel"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b text-sm">
        {[
          { key: 'config', label: '⚙️ Config', emoji: true },
          { key: 'agents', label: '🤖 Agents', emoji: true },
          { key: 'api', label: '📡 API', badge: apiLogs.length },
          { key: 'models', label: '🎯 Models', badge: customModels.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-1 font-medium transition relative ${
              activeTab === tab.key
                ? darkMode 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-purple-500 text-white'
                : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className={`absolute top-1 right-1 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key 
                  ? 'bg-white/20 text-white' 
                  : darkMode 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-purple-500 text-white'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4 text-xs overflow-y-auto max-h-[450px]">
        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold text-sm">Current Configuration</span>
              <button
                onClick={() => copyJSON({
                  selectedModel,
                  advancedMode,
                  temperature,
                  customModelsCount: customModels.length
                }, 'config')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                  copiedIndex === 'config'
                    ? 'bg-green-500 text-white'
                    : darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {copiedIndex === 'config' ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className={`space-y-2 p-3 rounded ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <div className="flex justify-between">
                <span className="font-semibold">Selected Model:</span>
                <span className={`${selectedModel ? 'text-green-500' : 'text-gray-500'}`}>
                  {selectedModel || 'none'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Advanced Mode:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  advancedMode 
                    ? 'bg-green-500 text-white' 
                    : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-300 text-gray-600'
                }`}>
                  {advancedMode ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Temperature:</span>
                <span className="font-mono">{temperature}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Custom Models:</span>
                <span className="font-mono">{customModels.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* AGENTS TAB */}
        {activeTab === 'agents' && (
          <div className="space-y-3">
            {['parser', 'reasoner', 'generator', 'validator'].map((agent, idx) => {
              const payload = getAgentPayload(agent);
              const isCustom = payload.is_custom;
              return (
                <div key={agent} className={`rounded-lg border ${
                  isCustom 
                    ? darkMode ? 'border-green-600' : 'border-green-500'
                    : darkMode ? 'border-gray-700' : 'border-gray-300'
                }`}>
                  <div className={`flex justify-between items-center p-2 ${
                    darkMode ? 'bg-gray-900' : 'bg-gray-50'
                  }`}>
                    <span className={`font-semibold capitalize ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {idx + 1}. {agent}
                      {isCustom && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-green-500 text-white rounded">
                          Custom
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => copyJSON(payload, agent)}
                      className={`flex items-center gap-1 px-2 py-1 rounded transition text-xs ${
                        copiedIndex === agent
                          ? 'bg-green-500 text-white'
                          : 'text-blue-500 hover:bg-blue-500/10'
                      }`}
                    >
                      {copiedIndex === agent ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre className={`p-2 text-xs overflow-auto ${
                    darkMode ? 'bg-gray-900/50 text-gray-300' : 'bg-white text-gray-700'
                  }`}>
                    {JSON.stringify(payload, null, 2)}
                  </pre>
                </div>
              );
            })}
          </div>
        )}

        {/* API TAB */}
        {activeTab === 'api' && (
          <div>
            <div className={`flex justify-between items-center mb-3 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <span className="font-semibold text-sm">Recent API Calls</span>
              {apiLogs.length > 0 && (
                <button
                  onClick={() => setApiLogs([])}
                  className={`text-xs px-2 py-1 rounded transition ${
                    darkMode ? 'bg-red-900/50 hover:bg-red-900 text-red-400' 
                    : 'bg-red-100 hover:bg-red-200 text-red-600'
                  }`}
                >
                  Clear All
                </button>
              )}
            </div>
            {apiLogs.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <div className="text-2xl mb-2">📭</div>
                <div>No API calls logged yet</div>
                <div className="text-xs mt-1">Make a request to see it here</div>
              </div>
            ) : (
              apiLogs.map((call, idx) => (
                <div
                  key={call.id}
                  className={`mb-3 p-3 rounded-lg border ${
                    darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className={`font-semibold text-xs px-2 py-0.5 rounded ${
                        call.method === 'POST' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-blue-500 text-white'
                      }`}>
                        {call.method}
                      </span>
                      <span className={`ml-2 font-mono text-xs ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {call.url.replace('http://localhost:8000', '')}
                      </span>
                    </div>
                    <button
                      onClick={() => copyJSON(call.body, call.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded transition text-xs ${
                        copiedIndex === call.id
                          ? 'bg-green-500 text-white'
                          : 'text-blue-500 hover:bg-blue-500/10'
                      }`}
                    >
                      {copiedIndex === call.id ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                  <div className={`text-xs mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {call.timestamp}
                  </div>
                  <pre className={`text-xs overflow-auto max-h-32 p-2 rounded ${
                    darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white border border-gray-200'
                  }`}>
                    {JSON.stringify(call.body, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}

        {/* CUSTOM MODELS TAB */}
        {activeTab === 'models' && (
          <div>
            <div className={`font-semibold text-sm mb-3 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Custom Models Registry ({customModels.length})
            </div>
            {customModels.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <div className="text-2xl mb-2">📦</div>
                <div>No custom models configured</div>
                <div className="text-xs mt-1">Add models in Settings</div>
              </div>
            ) : (
              <div className={`space-y-2 p-3 rounded ${
                darkMode ? 'bg-gray-900' : 'bg-gray-50'
              }`}>
                {customModels.map((model, idx) => (
                  <div
                    key={idx}
                    className={`pb-2 border-b last:border-0 ${
                      darkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {model.label}
                        </div>
                        <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <span className={`inline-block px-2 py-0.5 rounded mr-2 ${
                            darkMode ? 'bg-gray-800' : 'bg-gray-200'
                          }`}>
                            {model.provider_type}
                          </span>
                          <span className="font-mono">{model.model_id}</span>
                        </div>
                        {model.base_url && (
                          <div className={`text-xs mt-1 truncate ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            📍 {model.base_url}
                          </div>
                        )}
                      </div>
                      {selectedModel === model.value && (
                        <span className="text-xs px-2 py-0.5 bg-green-500 text-white rounded">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className={`px-4 py-2 border-t text-xs flex justify-between items-center ${
        darkMode ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
      }`}>
        <span>Debug Mode Active</span>
        <span>Press Ctrl+D to toggle</span>
      </div>
    </div>
  );
};

export default DebugPanel;