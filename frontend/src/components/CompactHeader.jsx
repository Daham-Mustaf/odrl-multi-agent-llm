import React from 'react';
import { Settings, Moon, Sun } from 'lucide-react';

const CompactHeader = ({
  darkMode,
  setDarkMode,
  backendConnected,
  selectedModel,
  setSelectedModel,
  providers,
  customModels,
  autoProgress,
  setAutoProgress,
  advancedMode,
  setAdvancedMode,
  onOpenSettings,
}) => {
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center gap-4">
          
          {/* Logo + Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              OP
            </div>
            <span className={`font-bold text-sm ${textClass}`}>ODRL Generator</span>
          </div>

          {/* Divider */}
          <div className={`w-px h-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />

          {/* Status */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
            backendConnected 
              ? 'bg-green-500/10 text-green-500' 
              : 'bg-red-500/10 text-red-500'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${backendConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span>{backendConnected ? 'Online' : 'Offline'}</span>
          </div>

          {/* Model Selection */}
          <select
            value={selectedModel || ''}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              localStorage.setItem('selectedModel', e.target.value);
            }}
            disabled={!backendConnected}
            className={`px-3 py-1.5 text-xs rounded-lg border transition ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300'
            } focus:outline-none focus:border-blue-500`}
          >
            {!backendConnected && <option>Offline</option>}
            
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
              <optgroup label="Custom">
                {customModels.map(model => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {/* Advanced Mode Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={advancedMode}
              onChange={(e) => setAdvancedMode(e.target.checked)}
              className="w-3.5 h-3.5 rounded"
            />
            <span className={`text-xs font-medium ${mutedTextClass}`}>
              Per-Agent Models
            </span>
          </label>

          {/* Auto-Progress Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoProgress}
              onChange={(e) => setAutoProgress(e.target.checked)}
              className="w-3.5 h-3.5 rounded"
            />
            <span className={`text-xs font-medium ${mutedTextClass}`}>
              Auto-Continue
            </span>
          </label>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Settings & Theme */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className={`p-1.5 rounded-lg transition ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-1.5 rounded-lg transition ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactHeader;
