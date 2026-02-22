import React from 'react';

const QuickSettingsBar = ({
  darkMode,
  selectedModel,
  setSelectedModel,
  temperature,
  setTemperature,
  autoProgress,
  setAutoProgress,
  providers,
  customModels,
  backendConnected,
  textClass,
  mutedTextClass,
}) => {
  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Model Selection */}
          <div className="space-y-2">
            <label className={`text-xs font-semibold uppercase tracking-wider ${mutedTextClass}`}>
              Model
            </label>
            <select
              value={selectedModel || ''}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                localStorage.setItem('selectedModel', e.target.value);
              }}
              disabled={!backendConnected}
              className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                  : 'bg-white border-gray-300 focus:border-blue-500'
              } focus:outline-none`}
            >
              {!backendConnected && <option>Backend not connected</option>}
              
              {providers.map(provider => (
                <optgroup key={provider.name} label={provider.name}>
                  {provider.models.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </optgroup>
              ))}
              
              {customModels.length > 0 && (
                <optgroup label="Custom Models">
                  {customModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <label className={`text-xs font-semibold uppercase tracking-wider ${mutedTextClass}`}>
              Temperature
            </label>
            <select
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                  : 'bg-white border-gray-300 focus:border-blue-500'
              } focus:outline-none`}
            >
              <option value="0.1">0.1 - Precise</option>
              <option value="0.3">0.3 - Balanced</option>
              <option value="0.5">0.5 - Moderate</option>
              <option value="0.7">0.7 - Creative</option>
              <option value="1.0">1.0 - Very Creative</option>
            </select>
          </div>

          {/* Auto-Progress Toggle */}
          <div className="space-y-2">
            <label className={`text-xs font-semibold uppercase tracking-wider ${mutedTextClass}`}>
              Auto-Continue
            </label>
            <button
              onClick={() => setAutoProgress(!autoProgress)}
              className={`w-full px-3 py-2 rounded-lg border-2 transition flex items-center justify-between ${
                autoProgress
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : darkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                    : 'bg-white border-gray-300 hover:border-gray-400'
              }`}
            >
              <span className="text-sm font-medium">
                {autoProgress ? 'Enabled' : 'Disabled'}
              </span>
              <div className={`w-12 h-6 rounded-full transition relative ${
                autoProgress ? 'bg-blue-600' : darkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}>
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  autoProgress ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickSettingsBar;
