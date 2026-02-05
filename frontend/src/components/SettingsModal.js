import React from 'react';
import { Settings, Info, Plus, Trash2, Save, X } from 'lucide-react';

const SettingsModal = ({
  darkMode,
  textClass,
  mutedTextClass,
  settingsOpen,
  setSettingsOpen,
  selectedModel,
  setSelectedModel,
  temperature,
  setTemperature,
  providers,
  customModels,
  customForm,
  setCustomForm,
  showCustomForm,
  setShowCustomForm,
  addOrUpdateCustomModel,
  deleteCustomModel,
  syncMode,
  setSyncMode,
  backendConnected,
  showToast,
}) => {
  if (!settingsOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto`}>
        <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10`}>
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5" />
            <h2 className={`text-lg font-bold ${textClass}`}>Settings</h2>
          </div>
          <button onClick={() => setSettingsOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">

          {/* Model Selection */}
          <div>
            <h3 className={`text-md font-semibold ${textClass} mb-3`}>Default Model Selection</h3>
            <div className="space-y-3">
              <select
                value={selectedModel || ''}
                onChange={(e) => {
                  const newModel = e.target.value;
                  console.log('[Settings] Model changed to:', newModel);
                  setSelectedModel(newModel);
                  localStorage.setItem('selectedModel', newModel);
                  showToast(`Model updated: ${providers.flatMap(p => p.models).find(m => m.value === newModel)?.label || customModels.find(m => m.value === newModel)?.label || 'Unknown'}`, 'success');
                }}
                className={`w-full px-4 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} border rounded-lg`}
                disabled={!backendConnected}
              >
                {!backendConnected && <option>Backend not connected</option>}
                
                {providers.map(provider => (
                  <optgroup key={provider.name} label={provider.name}>
                    {provider.models.map(model => (
                      <option key={model.value} value={model.value}>
                        {model.label} {model.context_length ? `(${(model.context_length).toLocaleString()} tokens)` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
                
                {customModels.length > 0 && (
                  <optgroup label="My Custom Models">
                    {customModels.map(model => (
                      <option key={model.value} value={model.value}>
                        {model.label} ({(model.context_length || 4096).toLocaleString()} tokens)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <div className={`flex items-start gap-2 p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                <Info className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                <div className={`text-xs ${mutedTextClass}`}>
                  <p className="font-medium mb-1">Quick Setup Guide</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><strong>Ollama (OSS)</strong> — Install Ollama, run <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">ollama run llama3.3</code></li>
                    <li><strong>Groq</strong> — Get API Key from <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">console.groq.com</code></li>
                    <li><strong>OpenAI</strong> — Use GPT-4 compatible endpoint</li>
                    <li><strong>Google GenAI</strong> — Use Gemini models via <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">google.generativeai</code></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Temperature Slider */}
          <div>
            <h3 className={`text-md font-semibold ${textClass} mb-3`}>Temperature</h3>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between">
                <span className={`text-sm ${mutedTextClass}`}>Lower (more focused)</span>
                <span className={`text-sm font-bold ${textClass}`}>{temperature.toFixed(1)}</span>
                <span className={`text-sm ${mutedTextClass}`}>Higher (more creative)</span>
              </div>
            </div>
          </div>

          {/* Storage Sync Mode */}
          <div>
            <h3 className={`text-md font-semibold ${textClass} mb-3`}>Storage Sync Mode</h3>
            <div className="grid grid-cols-3 gap-3">
              {['local', 'backend', 'both'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setSyncMode(mode)}
                  className={`px-4 py-3 rounded-lg border-2 transition text-center ${
                    syncMode === mode
                      ? 'border-blue-500 bg-blue-500/10'
                      : darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`font-medium ${textClass}`}>{mode === 'local' ? 'Browser Only' : mode === 'backend' ? 'Backend Only' : 'Both'}</p>
                  <p className={`text-xs ${mutedTextClass} mt-1`}>
                    {mode === 'local' ? 'localStorage' : mode === 'backend' ? 'Backend API' : 'Sync across devices'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Models */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-md font-semibold ${textClass}`}>Custom Models</h3>
              <button
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Model
              </button>
            </div>

            {/* Custom Model Form */}
            {showCustomForm && (
              <div className={`p-4 rounded-lg border mb-4 ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-sm font-medium ${textClass}`}>Name</label>
                    <input
                      type="text"
                      value={customForm.name}
                      onChange={(e) => setCustomForm({...customForm, name: e.target.value})}
                      placeholder="My Custom Model"
                      className={`w-full mt-1 px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg`}
                    />
                  </div>
                  <div>
                    <label className={`text-sm font-medium ${textClass}`}>Provider</label>
                    <select
                      value={customForm.provider_type}
                      onChange={(e) => setCustomForm({...customForm, provider_type: e.target.value})}
                      className={`w-full mt-1 px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg`}
                    >
                      <option value="ollama">Ollama</option>
                      <option value="groq">Groq</option>
                      <option value="openai">OpenAI Compatible</option>
                      <option value="google-genai">Google GenAI</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-sm font-medium ${textClass}`}>Model ID</label>
                    <input
                      type="text"
                      value={customForm.model_id}
                      onChange={(e) => setCustomForm({...customForm, model_id: e.target.value})}
                      placeholder="llama3.3, gpt-4, DeepSeek-V3..."
                      className={`w-full mt-1 px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg`}
                    />
                  </div>
                  <div>
                    <label className={`text-sm font-medium ${textClass}`}>
                      Base URL 
                      {customForm.provider_type === 'google-genai' && <span className={`text-xs ${mutedTextClass}`}> (not allowed for Google GenAI)</span>}
                    </label>
                    <input
                      type="text"
                      value={customForm.base_url}
                      onChange={(e) => setCustomForm({...customForm, base_url: e.target.value})}
                      placeholder="http://localhost:11434"
                      disabled={customForm.provider_type === 'google-genai'}
                      className={`w-full mt-1 px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg ${customForm.provider_type === 'google-genai' ? 'opacity-50' : ''}`}
                    />
                  </div>
                  <div>
                    <label className={`text-sm font-medium ${textClass}`}>API Key (optional)</label>
                    <input
                      type="password"
                      value={customForm.api_key}
                      onChange={(e) => setCustomForm({...customForm, api_key: e.target.value})}
                      placeholder="your-api-key"
                      className={`w-full mt-1 px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg`}
                    />
                  </div>
                  <div>
                    <label className={`text-sm font-medium ${textClass}`}>Context Length</label>
                    <input
                      type="number"
                      value={customForm.context_length}
                      onChange={(e) => setCustomForm({...customForm, context_length: parseInt(e.target.value)})}
                      className={`w-full mt-1 px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg`}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowCustomForm(false);
                      setCustomForm({
                        name: '',
                        provider_type: 'ollama',
                        base_url: 'http://localhost:11434',
                        api_key: '',
                        model_id: '',
                        context_length: 4096,
                        temperature: 0.3
                      });
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg transition ${
                      darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const isValid = customForm.name && customForm.model_id && 
                        (customForm.provider_type === 'google-genai' || customForm.base_url);
                      
                      if (isValid) {
                        await addOrUpdateCustomModel(customForm);
                        setShowCustomForm(false);
                        setCustomForm({
                          name: '',
                          provider_type: 'ollama',
                          base_url: 'http://localhost:11434',
                          api_key: '',
                          model_id: '',
                          context_length: 4096,
                          temperature: 0.3
                        });
                      }
                    }}
                    disabled={!customForm.name || !customForm.model_id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Save className="w-4 h-4" />
                    Save Model
                  </button>
                </div>
              </div>
            )}

            {/* Custom Models List */}
            <div className="space-y-2">
              {customModels.length === 0 ? (
                <p className={`text-sm ${mutedTextClass}`}>None — Add custom models to use with any compatible platform</p>
              ) : (
                customModels.map(model => (
                  <div
                    key={model.value}
                    className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  >
                    <div>
                      <p className={`font-medium ${textClass}`}>{model.label}</p>
                      <p className={`text-xs ${mutedTextClass}`}>
                        {model.provider_type || 'ollama'} • {model.model_id || model.value} • {(model.context_length || 4096).toLocaleString()} ctx
                      </p>
                    </div>
                    <button
                      onClick={() => deleteCustomModel(model.value)}
                      className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Configuration */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <h3 className={`text-md font-semibold ${textClass} mb-2`}>Active Configuration</h3>
            <div className={`text-sm ${mutedTextClass} space-y-1 font-mono`}>
              <p>Model: {selectedModel || 'None selected'}</p>
              <p>Temperature: {temperature}</p>
              <p>Storage: {syncMode}</p>
              <p>Custom Models: {customModels.length}</p>
              <p>Backend: {backendConnected ? 'Connected' : 'Not connected'}</p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} px-6 py-4 border-t sticky bottom-0`}>
          <button
            onClick={() => setSettingsOpen(false)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;