import React from 'react';
import { X, Settings, Info } from 'lucide-react';

/**
 * Per-Agent Model Settings Modal
 * Opens when user clicks "Per-Agent Models" toggle in header
 */
const PerAgentModelModal = ({
  isOpen,
  onClose,
  agentModels,
  setAgentModels,
  selectedModel,
  providers,
  customModels,
  darkMode,
  textClass,
}) => {
  if (!isOpen) return null;

  const agents = [
    { id: 'parser', label: 'Parser', description: 'Extract structure from text', icon: '📄' },
    { id: 'reasoner', label: 'Reasoner', description: 'Analyze conflicts and validate', icon: '🧠' },
    { id: 'generator', label: 'Generator', description: 'Create ODRL policy', icon: '⚡' },
    { id: 'validator', label: 'Validator', description: 'Check SHACL compliance', icon: '🛡️' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] overflow-y-auto z-50 rounded-xl shadow-2xl ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div
          className={`sticky top-0 px-6 py-4 border-b flex items-center justify-between ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } z-10`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${textClass}`}>
                Per-Agent Model Selection
              </h2>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Assign different models to each pipeline agent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Tip */}
          <div
            className={`flex items-start gap-3 p-4 rounded-lg ${
              darkMode
                ? 'bg-blue-900/20 border border-blue-800'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              <p className="font-semibold mb-1">💡 Pro Tip</p>
              <p>
                Use <strong>faster models</strong> (like GPT-4o-mini) for parsing/validation
                and <strong>powerful models</strong> (like o1) for reasoning/generation 
                to optimize cost and performance.
              </p>
            </div>
          </div>

          {/* Agent Model Selectors */}
          <div className="space-y-5">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{agent.icon}</span>
                  <div className="flex-1">
                    <label className={`block text-sm font-semibold mb-1 ${textClass}`}>
                      {agent.label}
                    </label>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {agent.description}
                    </p>
                  </div>
                </div>

                <select
                  value={agentModels[agent.id] || ''}
                  onChange={(e) => {
                    const newValue = e.target.value || null;
                    console.log(`[Per-Agent] ${agent.id} model changed to:`, newValue);
                    setAgentModels({
                      ...agentModels,
                      [agent.id]: newValue,
                    });
                  }}
                  className={`w-full px-3 py-2.5 ${
                    darkMode
                      ? 'bg-gray-800 border-gray-600 text-white'
                      : 'bg-white border-gray-300'
                  } border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition`}
                >
                  <option value="">
                    Use default (
                    {selectedModel
                      ? providers
                          .flatMap((p) => p.models)
                          .find((m) => m.value === selectedModel)?.label ||
                        customModels.find((m) => m.value === selectedModel)?.label ||
                        'Unknown'
                      : 'Not selected'}
                    )
                  </option>

                  {providers.length > 0 && (
                    <optgroup label="━━ Available Providers ━━">
                      {providers.flatMap((p) => p.models).map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {customModels.length > 0 && (
                    <optgroup label="━━ Your Custom Models ━━">
                      {customModels.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}{' '}
                          {model.context_length >= 1000000
                            ? `(${(model.context_length / 1000000).toFixed(1)}M ctx)`
                            : `(${(model.context_length / 1024).toFixed(0)}K ctx)`}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            ))}
          </div>

          {/* Current Configuration Summary */}
          <div
            className={`p-4 rounded-lg border ${
              darkMode
                ? 'bg-purple-900/20 border-purple-800'
                : 'bg-purple-50 border-purple-200'
            }`}
          >
            <p className={`text-sm font-semibold mb-3 ${textClass}`}>
              📊 Current Configuration
            </p>
            <div className="grid grid-cols-2 gap-3">
              {agents.map((agent) => {
                const model = agentModels[agent.id];
                const modelName = model
                  ? providers
                      .flatMap((p) => p.models)
                      .find((m) => m.value === model)?.label ||
                    customModels.find((m) => m.value === model)?.label ||
                    model
                  : 'Using default';

                return (
                  <div key={agent.id} className="flex items-center gap-2">
                    <span className="text-sm">{agent.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {agent.label}
                      </p>
                      <p
                        className={`text-xs truncate ${
                          model
                            ? 'text-purple-500 font-semibold'
                            : darkMode
                              ? 'text-gray-500'
                              : 'text-gray-400'
                        }`}
                      >
                        {modelName}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`sticky bottom-0 px-6 py-4 border-t flex items-center justify-end gap-3 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              darkMode
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
};

export default PerAgentModelModal;