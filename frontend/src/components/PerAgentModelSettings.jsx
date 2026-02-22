import React from 'react';
import { Settings, Info, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Per-Agent Model Settings Component
 * Allows users to assign different models to each agent in the pipeline
 */
const PerAgentModelSettings = ({
  advancedMode,
  setAdvancedMode,
  agentModels,
  setAgentModels,
  selectedModel,
  providers,
  customModels,
  darkMode,
  textClass,
}) => {
  return (
    <div
      className={`rounded-lg border transition-all ${
        advancedMode
          ? darkMode
            ? 'border-purple-600 bg-purple-900/10'
            : 'border-purple-500 bg-purple-50'
          : darkMode
            ? 'border-gray-700'
            : 'border-gray-200'
      }`}
    >
      {/* Header Button */}
      <button
        onClick={() => setAdvancedMode(!advancedMode)}
        className={`w-full px-4 py-3 flex items-center justify-between transition ${
          darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
        } rounded-t-lg`}
      >
        <div className="flex items-center gap-2">
          <Settings
            className={`w-4 h-4 ${advancedMode ? 'text-purple-500' : ''}`}
          />
          <span className={`text-sm font-medium ${textClass}`}>
            Per-Agent Model Selection
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              advancedMode
                ? 'bg-purple-500 text-white'
                : darkMode
                  ? 'bg-gray-700 text-gray-400'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            {advancedMode ? 'ON' : 'OFF'}
          </span>
        </div>
        {advancedMode ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Expanded Content */}
      {advancedMode && (
        <div
          className={`px-4 py-4 border-t space-y-4 ${
            darkMode
              ? 'border-gray-700 bg-gray-800/50'
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          {/* Info Tip */}
          <div
            className={`flex items-start gap-2 p-3 rounded-lg ${
              darkMode
                ? 'bg-blue-900/20 border border-blue-800'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p
              className={`text-xs ${
                darkMode ? 'text-blue-300' : 'text-blue-700'
              }`}
            >
              <strong>Pro Tip:</strong> Use faster models (like GPT-4o-mini) for
              parsing/validation and powerful models (like o1) for
              reasoning/generation to optimize cost and performance.
            </p>
          </div>

          {/* Agent Model Selectors */}
          {[
            { id: 'parser', label: 'Parser', description: 'Extract structure from text' },
            { id: 'reasoner', label: 'Reasoner', description: 'Analyze conflicts and validate' },
            { id: 'generator', label: 'Generator', description: 'Create ODRL policy' },
            { id: 'validator', label: 'Validator', description: 'Check SHACL compliance' },
          ].map((agent) => (
            <div key={agent.id}>
              <label
                className={`block text-sm font-medium mb-1 ${textClass} capitalize`}
              >
                {agent.label} Model
              </label>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                {agent.description}
              </p>
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
                className={`w-full px-3 py-2 ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
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

          {/* Summary of selections */}
          <div
            className={`mt-4 pt-4 border-t ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}
          >
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <strong>Current Configuration:</strong>
            </p>
            <div className={`mt-2 space-y-1 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {Object.entries(agentModels).map(([agent, model]) => (
                <div key={agent} className="flex items-center gap-2">
                  <span className="capitalize font-medium w-20">{agent}:</span>
                  <span className={model ? 'text-purple-500 font-medium' : ''}>
                    {model
                      ? providers
                          .flatMap((p) => p.models)
                          .find((m) => m.value === model)?.label ||
                        customModels.find((m) => m.value === model)?.label ||
                        model
                      : 'Using default'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerAgentModelSettings;