import React, { useState, useEffect } from 'react';
import { AlertCircle, FileText, Brain, Code, Copy, Download, CheckCircle, Shield, Settings, ChevronDown, ChevronUp, Info, Cloud, Cpu, RefreshCw, Zap } from 'lucide-react';

const ODRLDemo = () => {
  const [activeTab, setActiveTab] = useState('parser');
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [reasoningResult, setReasoningResult] = useState(null);
  const [generatedODRL, setGeneratedODRL] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const [providerInfo, setProviderInfo] = useState(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [llmSettings, setLlmSettings] = useState({
    singleModel: null,
    temperature: 0.3,
    parserModel: null,
    reasonerModel: null,
    generatorModel: null,
    validatorModel: null,
    showReasoning: false
  });

  const API_BASE_URL = 'http://localhost:8000/api';

  // All possible models - GUI will only show what backend has available
  const allModels = {
    'groq': {
      name: 'Groq Cloud',
      badge: 'FREE',
      badgeColor: 'bg-green-100 text-green-700',
      icon: '☁️',
      models: [
        { value: 'groq:llama-3.1-70b-versatile', label: 'Llama 3.1 70B', speed: '⚡', recommended: true },
        { value: 'groq:llama-3.3-70b-versatile', label: 'Llama 3.3 70B', speed: '⚡' },
        { value: 'groq:mixtral-8x7b-32768', label: 'Mixtral 8x7B', speed: '🚀' },
        { value: 'groq:llama-3.1-8b-instant', label: 'Llama 3.1 8B', speed: '🚀' }
      ]
    },
    'openai': {
      name: 'OpenAI',
      badge: 'PREMIUM',
      badgeColor: 'bg-purple-100 text-purple-700',
      icon: '🤖',
      models: [
        { value: 'openai:gpt-4', label: 'GPT-4', speed: '🐢', recommended: true },
        { value: 'openai:gpt-4-turbo', label: 'GPT-4 Turbo', speed: '⚡' },
        { value: 'openai:gpt-3.5-turbo', label: 'GPT-3.5 Turbo', speed: '🚀' }
      ]
    },
    'anthropic': {
      name: 'Anthropic Claude',
      badge: 'PREMIUM',
      badgeColor: 'bg-blue-100 text-blue-700',
      icon: '🧠',
      models: [
        { value: 'anthropic:claude-3-opus-20240229', label: 'Claude 3 Opus', speed: '🐢', recommended: true },
        { value: 'anthropic:claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', speed: '⚡' },
        { value: 'anthropic:claude-3-haiku-20240307', label: 'Claude 3 Haiku', speed: '🚀' }
      ]
    },
    'ollama': {
      name: 'Ollama Local',
      badge: 'LOCAL',
      badgeColor: 'bg-gray-100 text-gray-700',
      icon: '💻',
      models: [
        { value: 'ollama:deepseek-r1:70b', label: 'DeepSeek R1 70B', speed: '⚡', recommended: true },
        { value: 'ollama:llama3.1:70b', label: 'Llama 3.1 70B', speed: '⚡' },
        { value: 'ollama:llama3.3:70b', label: 'Llama 3.3 70B', speed: '⚡' },
        { value: 'ollama:mixtral:8x7b', label: 'Mixtral 8x7B', speed: '⚡' },
        { value: 'ollama:llama3.1:8b', label: 'Llama 3.1 8B', speed: '🚀' }
      ]
    }
  };

  const presets = {
    balanced: {
      name: '⚖️ Balanced',
      desc: 'Best quality/speed trade-off',
      getModel: (providers) => {
        if (providers.includes('groq')) return 'groq:llama-3.1-70b-versatile';
        if (providers.includes('ollama')) return 'ollama:llama3.1:70b';
        if (providers.includes('openai')) return 'openai:gpt-3.5-turbo';
        return null;
      }
    },
    fast: {
      name: '🚀 Fast',
      desc: 'Fastest responses',
      getModel: (providers) => {
        if (providers.includes('groq')) return 'groq:mixtral-8x7b-32768';
        if (providers.includes('ollama')) return 'ollama:llama3.1:8b';
        if (providers.includes('openai')) return 'openai:gpt-3.5-turbo';
        return null;
      }
    },
    quality: {
      name: '💎 Quality',
      desc: 'Highest quality',
      getModel: (providers) => {
        if (providers.includes('openai')) return 'openai:gpt-4';
        if (providers.includes('anthropic')) return 'anthropic:claude-3-opus-20240229';
        if (providers.includes('groq')) return 'groq:llama-3.1-70b-versatile';
        return null;
      }
    }
  };

  const examples = [
    { title: "Document Policy", text: "Users can read and print the document but cannot modify or distribute it. The policy expires on December 31, 2025." },
    { title: "Academic Dataset", text: "Researchers can download and analyze the dataset for non-commercial research purposes. Attribution is required. Commercial use is prohibited." },
    { title: "Software License", text: "Users can use, copy, and modify the software. Distribution requires attribution and must use the same license. Patent claims are granted." },
    { title: "Photo Rights", text: "The photographer grants rights to use the photo on social media with attribution. Print publication requires additional permission." }
  ];

  useEffect(() => {
    detectProvider();
  }, []);

  const detectProvider = async () => {
    setLoadingProvider(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/provider-info`, { 
        signal: AbortSignal.timeout(5000) 
      });
      
      if (!response.ok) throw new Error('Backend not responding');
      
      const data = await response.json();
      setProviderInfo(data);
      setBackendConnected(true);
      
      // Set default model from available providers
      const availableProviders = data.all_providers || [];
      const firstProvider = availableProviders[0];
      
      if (firstProvider && allModels[firstProvider]) {
        const defaultModel = allModels[firstProvider].models[0]?.value;
        setLlmSettings(prev => ({
          ...prev,
          singleModel: defaultModel,
          parserModel: defaultModel,
          reasonerModel: defaultModel,
          generatorModel: defaultModel,
          validatorModel: defaultModel
        }));
      }
    } catch (err) {
      console.error('Provider detection failed:', err);
      setError('⚠️ Backend not connected. Start: cd backend && uvicorn main:app --reload');
      setBackendConnected(false);
    }
    setLoadingProvider(false);
  };

  const getAvailableModels = () => {
    if (!providerInfo?.all_providers) return {};
    
    // Only return models for providers that backend has configured
    const available = {};
    providerInfo.all_providers.forEach(provider => {
      if (allModels[provider]) {
        available[provider] = allModels[provider];
      }
    });
    return available;
  };

  const applyPreset = (presetKey) => {
    const preset = presets[presetKey];
    const model = preset.getModel(providerInfo?.all_providers || []);
    
    if (model) {
      setLlmSettings(prev => ({
        ...prev,
        singleModel: model,
        parserModel: model,
        reasonerModel: model,
        generatorModel: model,
        validatorModel: model
      }));
      setAdvancedMode(false);
    }
  };

  const getModelForAgent = (agent) => {
    return advancedMode ? llmSettings[`${agent}Model`] : llmSettings.singleModel;
  };

  const handleParse = async () => {
    if (!backendConnected) {
      setError('Backend not connected. Please start the server.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText,
          model: getModelForAgent('parser'),
          temperature: llmSettings.temperature
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Parsing failed');
      }
      
      const data = await response.json();
      setParsedData(data);
      setActiveTab('reasoner');
    } catch (err) {
      setError('Parse failed: ' + err.message);
    }
    setLoading(false);
  };

  const handleReason = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/reason`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parsed_data: parsedData,
          model: getModelForAgent('reasoner'),
          temperature: llmSettings.temperature
        })
      });
      
      if (!response.ok) throw new Error('Reasoning failed');
      
      const data = await response.json();
      setReasoningResult(data);
      setActiveTab('generator');
    } catch (err) {
      setError('Reason failed: ' + err.message);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reasoning_result: reasoningResult,
          model: getModelForAgent('generator'),
          temperature: llmSettings.temperature
        })
      });
      
      if (!response.ok) throw new Error('Generation failed');
      
      const data = await response.json();
      setGeneratedODRL(data);
      setActiveTab('validator');
      
      if (data.odrl_policy) {
        setTimeout(() => handleValidate(data.odrl_policy), 500);
      }
    } catch (err) {
      setError('Generate failed: ' + err.message);
    }
    setLoading(false);
  };

  const handleValidate = async (policy) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          odrl_policy: policy || generatedODRL?.odrl_policy,
          model: getModelForAgent('validator'),
          temperature: llmSettings.temperature
        })
      });
      
      if (!response.ok) throw new Error('Validation failed');
      
      const data = await response.json();
      setValidationResult(data);
    } catch (err) {
      setError('Validate failed: ' + err.message);
    }
    setLoading(false);
  };

  const resetDemo = () => {
    setInputText('');
    setParsedData(null);
    setReasoningResult(null);
    setGeneratedODRL(null);
    setValidationResult(null);
    setError(null);
    setActiveTab('parser');
  };

  const availableModels = getAvailableModels();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">ODRL Policy Generator</h1>
                <p className="text-blue-100">Multi-Agent System • Multi-Model Support</p>
              </div>
              
              <div className="flex flex-col gap-2 items-end">
                {loadingProvider ? (
                  <div className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Connecting...
                  </div>
                ) : backendConnected ? (
                  <>
                    <div className="bg-green-500/30 px-3 py-1 rounded-full text-sm flex items-center gap-2 backdrop-blur">
                      <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                      Backend Connected
                    </div>
                    {providerInfo?.all_providers && (
                      <div className="bg-white/20 px-3 py-1 rounded-full text-xs backdrop-blur">
                        {providerInfo.all_providers.length} provider(s): {providerInfo.all_providers.join(', ')}
                      </div>
                    )}
                    {advancedMode && (
                      <div className="bg-purple-500/30 px-3 py-1 rounded-full text-sm backdrop-blur">
                        Advanced Mode
                      </div>
                    )}
                  </>
                ) : (
                  <button 
                    onClick={detectProvider} 
                    className="bg-red-500/30 px-3 py-1 rounded-full text-sm hover:bg-red-500/40 transition flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reconnect
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b bg-gray-50 overflow-x-auto">
            {[
              { key: 'parser', label: 'Parser', icon: FileText, enabled: true },
              { key: 'reasoner', label: 'Reasoner', icon: Brain, enabled: parsedData },
              { key: 'generator', label: 'Generator', icon: Code, enabled: reasoningResult },
              { key: 'validator', label: 'Validator', icon: Shield, enabled: generatedODRL }
            ].map(({ key, label, icon: Icon, enabled }, idx) => (
              <button
                key={key}
                onClick={() => enabled && setActiveTab(key)}
                disabled={!enabled}
                className={`flex-1 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === key
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : enabled ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                <Icon className="inline-block mr-2 h-5 w-5" />
                {idx + 1}. {label}
              </button>
            ))}
          </div>

          {/* Error Display */}
          {error && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-red-700 text-sm flex-1">{error}</div>
            </div>
          )}

          {/* Content Area */}
          <div className="p-6">
            
            {/* Settings Panel */}
            <div className="border rounded-lg bg-gradient-to-br from-gray-50 to-blue-50 mb-6">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition rounded-t-lg"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-800">LLM Configuration</span>
                  <span className={`text-xs px-2 py-1 rounded ${advancedMode ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {advancedMode ? 'Per-Agent Models' : 'Single Model'}
                  </span>
                  {llmSettings.singleModel && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      {llmSettings.singleModel.split(':')[1]}
                    </span>
                  )}
                </div>
                {settingsOpen ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
              </button>

              {settingsOpen && (
                <div className="px-4 pb-4 space-y-4 border-t pt-4 bg-white">
                  
                  {loadingProvider ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" />
                      <p className="text-gray-500">Detecting available providers...</p>
                    </div>
                  ) : !backendConnected ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                      <p className="text-red-600 font-semibold mb-2">Backend Not Connected</p>
                      <p className="text-sm text-gray-600 mb-3">Start the backend server to configure models</p>
                      <button
                        onClick={detectProvider}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Retry Connection
                      </button>
                    </div>
                  ) : Object.keys(availableModels).length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-orange-400" />
                      <p className="text-orange-600 font-semibold">No LLM Providers Available</p>
                      <p className="text-sm text-gray-600 mt-2">Configure at least one provider in backend .env file</p>
                    </div>
                  ) : (
                    <>
                      {/* Available Providers Info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="font-semibold text-blue-900 text-sm mb-2">Available Providers</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(availableModels).map(([provider, config]) => (
                            <div key={provider} className={`px-3 py-1 rounded text-xs font-medium ${config.badgeColor}`}>
                              {config.icon} {config.name}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Quick Presets</label>
                        <div className="grid grid-cols-3 gap-2">
                          {Object.entries(presets).map(([key, preset]) => {
                            const model = preset.getModel(providerInfo?.all_providers || []);
                            return (
                              <button
                                key={key}
                                onClick={() => applyPreset(key)}
                                disabled={!model}
                                className={`p-3 rounded-lg transition text-left ${
                                  model 
                                    ? 'bg-blue-50 border border-blue-200 hover:border-blue-400 hover:shadow'
                                    : 'bg-gray-100 border border-gray-200 opacity-50 cursor-not-allowed'
                                }`}
                              >
                                <div className="font-medium text-sm">{preset.name}</div>
                                <div className="text-xs text-gray-600">{preset.desc}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Advanced Mode Toggle */}
                      <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-800">Advanced Mode</div>
                          <div className="text-xs text-gray-600">Use different models for each agent</div>
                        </div>
                        <button
                          onClick={() => setAdvancedMode(!advancedMode)}
                          className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                            advancedMode 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {advancedMode ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      {/* Model Selection */}
                      {!advancedMode ? (
                        /* Simple Mode */
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Model (Used for all agents)
                          </label>
                          <select
                            value={llmSettings.singleModel || ''}
                            onChange={(e) => setLlmSettings({...llmSettings, singleModel: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            {Object.entries(availableModels).map(([provider, config]) => (
                              <optgroup key={provider} label={`${config.icon} ${config.name}`}>
                                {config.models.map(m => (
                                  <option key={m.value} value={m.value}>
                                    {m.speed} {m.label} {m.recommended ? '⭐' : ''}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      ) : (
                        /* Advanced Mode */
                        <div className="space-y-3">
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
                            <strong className="block mb-1">💡 Optimization Tips:</strong>
                            <ul className="space-y-0.5">
                              <li>• <strong>Parser:</strong> Use fast models (extracts basic info)</li>
                              <li>• <strong>Reasoner:</strong> Use powerful models (complex logic)</li>
                              <li>• <strong>Generator:</strong> Use precise models (creates ODRL)</li>
                              <li>• <strong>Validator:</strong> Use fast models (checks syntax)</li>
                            </ul>
                          </div>

                          {[
                            { key: 'parser', label: 'Parser', icon: FileText },
                            { key: 'reasoner', label: 'Reasoner', icon: Brain },
                            { key: 'generator', label: 'Generator', icon: Code },
                            { key: 'validator', label: 'Validator', icon: Shield }
                          ].map(({ key, label, icon: Icon }) => (
                            <div key={key}>
                              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {label}
                              </label>
                              <select
                                value={llmSettings[`${key}Model`] || ''}
                                onChange={(e) => setLlmSettings({
                                  ...llmSettings,
                                  [`${key}Model`]: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                              >
                                {Object.entries(availableModels).map(([provider, config]) => (
                                  <optgroup key={provider} label={`${config.icon} ${config.name}`}>
                                    {config.models.map(m => (
                                      <option key={m.value} value={m.value}>
                                        {m.speed} {m.label} {m.recommended ? '⭐' : ''}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Temperature Slider */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Temperature: {llmSettings.temperature.toFixed(1)}
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            ({llmSettings.temperature < 0.4 ? 'Precise' : llmSettings.temperature > 0.6 ? 'Creative' : 'Balanced'})
                          </span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={llmSettings.temperature}
                          onChange={(e) => setLlmSettings({...llmSettings, temperature: parseFloat(e.target.value)})}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0.0</span>
                          <span>0.5</span>
                          <span>1.0</span>
                        </div>
                      </div>

                      {/* Current Configuration Summary */}
                      {advancedMode && (
                        <div className="border-t pt-3">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Configuration Summary</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-gray-50 p-2 rounded border">
                              <span className="text-gray-500">Parser:</span>
                              <span className="ml-1 font-medium">{llmSettings.parserModel?.split(':')[1] || 'Not set'}</span>
                            </div>
                            <div className="bg-gray-50 p-2 rounded border">
                              <span className="text-gray-500">Reasoner:</span>
                              <span className="ml-1 font-medium">{llmSettings.reasonerModel?.split(':')[1] || 'Not set'}</span>
                            </div>
                            <div className="bg-gray-50 p-2 rounded border">
                              <span className="text-gray-500">Generator:</span>
                              <span className="ml-1 font-medium">{llmSettings.generatorModel?.split(':')[1] || 'Not set'}</span>
                            </div>
                            <div className="bg-gray-50 p-2 rounded border">
                              <span className="text-gray-500">Validator:</span>
                              <span className="ml-1 font-medium">{llmSettings.validatorModel?.split(':')[1] || 'Not set'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Tab Content */}
            
            {/* Parser Tab */}
            {activeTab === 'parser' && (
              <div className="space-y-4">
                {/* Example Prompts */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Example Policies (Click to load)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {examples.map((ex, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInputText(ex.text)}
                        className="text-left p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 hover:shadow-md transition"
                      >
                        <div className="font-medium text-sm text-purple-900">{ex.title}</div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">{ex.text}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Area */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Enter Policy Description
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Describe your policy in natural language...&#10;&#10;Example: Users can read and print the document but cannot modify or distribute it. The policy expires on December 31, 2025."
                    className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">{inputText.length} characters</span>
                    {inputText && (
                      <button
                        onClick={() => setInputText('')}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Parse Button */}
                <button
                  onClick={handleParse}
                  disabled={!inputText || loading || !llmSettings.singleModel || !backendConnected}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Parsing with {getModelForAgent('parser')?.split(':')[1]}...
                    </>
                  ) : (
                    <>
                      Parse Text
                      <span className="text-blue-200">→</span>
                    </>
                  )}
                </button>

                {/* Parsed Data */}
                {parsedData && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-green-900">Parsing Complete</h3>
                      </div>
                      {parsedData.model_used && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          {parsedData.model_used.split(':')[1]}
                        </span>
                      )}
                    </div>
                    <pre className="text-sm bg-white p-4 rounded overflow-auto max-h-96 border border-green-200 text-gray-700">
                      {JSON.stringify(parsedData.parsed_data, null, 2)}
                    </pre>
                    <button
                      onClick={() => setActiveTab('reasoner')}
                      className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Continue to Reasoner →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Reasoner Tab */}
            {activeTab === 'reasoner' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Parsed Data (Input)
                  </h3>
                  <pre className="text-sm bg-white p-4 rounded overflow-auto max-h-60 border border-blue-200 text-gray-700">
                    {JSON.stringify(parsedData?.parsed_data, null, 2)}
                  </pre>
                </div>

                <button
                  onClick={handleReason}
                  disabled={loading || !backendConnected}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Reasoning with {getModelForAgent('reasoner')?.split(':')[1]}...
                    </>
                  ) : (
                    <>
                      Apply Reasoning
                      <span className="text-blue-200">→</span>
                    </>
                  )}
                </button>

                {reasoningResult && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-green-900">Reasoning Complete</h3>
                      </div>
                      {reasoningResult.model_used && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          {reasoningResult.model_used.split(':')[1]}
                        </span>
                      )}
                    </div>
                    <pre className="text-sm bg-white p-4 rounded overflow-auto max-h-96 border border-green-200 text-gray-700">
                      {JSON.stringify(reasoningResult.reasoning_result, null, 2)}
                    </pre>
                    <button
                      onClick={() => setActiveTab('generator')}
                      className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Continue to Generator →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Generator Tab */}
            {activeTab === 'generator' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Reasoning Result (Input)
                  </h3>
                  <pre className="text-sm bg-white p-4 rounded overflow-auto max-h-60 border border-blue-200 text-gray-700">
                    {JSON.stringify(reasoningResult?.reasoning_result, null, 2)}
                  </pre>
                </div>

                {!generatedODRL && (
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !backendConnected}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Generating with {getModelForAgent('generator')?.split(':')[1]}...
                      </>
                    ) : (
                      <>
                        Generate ODRL Policy
                        <span className="text-blue-200">→</span>
                      </>
                    )}
                  </button>
                )}

                {generatedODRL && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-green-900">ODRL Policy Generated</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {generatedODRL.model_used && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {generatedODRL.model_used.split(':')[1]}
                          </span>
                        )}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(generatedODRL.odrl_policy, null, 2));
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 transition flex items-center gap-1"
                        >
                          {copied ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(generatedODRL.odrl_policy, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = 'odrl-policy.json';
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 transition flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                      </div>
                    </div>
                    <pre className="text-sm bg-white p-4 rounded overflow-auto max-h-96 border border-green-200 text-gray-700 font-mono">
                      {JSON.stringify(generatedODRL.odrl_policy, null, 2)}
                    </pre>
                    <button
                      onClick={() => setActiveTab('validator')}
                      className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Continue to Validator →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Validator Tab */}
            {activeTab === 'validator' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Generated ODRL Policy
                  </h3>
                  <pre className="text-sm bg-white p-4 rounded overflow-auto max-h-48 border border-blue-200 text-gray-700 font-mono">
                    {JSON.stringify(generatedODRL?.odrl_policy, null, 2)}
                  </pre>
                </div>

                {!validationResult && (
                  <button
                    onClick={() => handleValidate()}
                    disabled={loading || !backendConnected}
                    className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Validating with {getModelForAgent('validator')?.split(':')[1]}...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Validate with SHACL
                      </>
                    )}
                  </button>
                )}

                {validationResult && (
                  <div className={`p-6 rounded-lg border-2 ${
                    validationResult.is_valid ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
                  }`}>
                    <div className="flex items-center mb-4">
                      {validationResult.is_valid ? (
                        <CheckCircle className="h-8 w-8 text-green-600 mr-3 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-8 w-8 text-red-600 mr-3 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold ${
                          validationResult.is_valid ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {validationResult.is_valid ? '✓ Validation PASSED' : '✗ Validation FAILED'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          SHACL: {validationResult.shacl_valid ? '✓ Valid' : '✗ Invalid'} | 
                          Errors: {validationResult.errors?.length || 0} | 
                          Warnings: {validationResult.warnings?.length || 0}
                        </p>
                      </div>
                    </div>

                    {validationResult.errors && validationResult.errors.length > 0 && (
                      <div className="mb-4 p-4 bg-white rounded-lg border border-red-300">
                        <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          Errors ({validationResult.errors.length})
                        </h4>
                        <ul className="space-y-2">
                          {validationResult.errors.map((err, idx) => (
                            <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                              <span className="text-red-500 mt-0.5">•</span>
                              <span className="flex-1">{err.message || err}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {validationResult.warnings && validationResult.warnings.length > 0 && (
                      <div className="mb-4 p-4 bg-white rounded-lg border border-yellow-300">
                        <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                          <Info className="w-5 h-5" />
                          Warnings ({validationResult.warnings.length})
                        </h4>
                        <ul className="space-y-1 text-sm text-yellow-800">
                          {validationResult.warnings.map((warning, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-yellow-500">•</span>
                              <span className="flex-1">{warning.message || warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {validationResult.recommendations && validationResult.recommendations.length > 0 && (
                      <div className="p-4 bg-white rounded-lg border border-blue-300">
                        <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                          <Info className="w-5 h-5" />
                          Recommendations
                        </h4>
                        <ul className="space-y-1 text-sm text-blue-800">
                          {validationResult.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-500">•</span>
                              <span className="flex-1">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {parsedData && <span className="text-green-600 font-medium">✓ Parsed</span>}
                {reasoningResult && <span className="text-green-600 font-medium"> → ✓ Reasoned</span>}
                {generatedODRL && <span className="text-green-600 font-medium"> → ✓ Generated</span>}
                {validationResult && (
                  <span className={validationResult.is_valid ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {validationResult.is_valid ? ' → ✓ Validated' : ' → ✗ Failed'}
                  </span>
                )}
              </div>
              {advancedMode ? (
                <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  Multi-Model Mode
                </div>
              ) : (
                llmSettings.singleModel && (
                  <div className="text-xs text-gray-500">
                    {llmSettings.singleModel.split(':')[1]} @ {llmSettings.temperature}
                  </div>
                )
              )}
            </div>
            <button
              onClick={resetDemo}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Demo
            </button>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p className="font-medium">ODRL Policy Generator • Multi-Agent System</p>
          {providerInfo?.all_providers && (
            <p className="mt-1 text-xs">
              Powered by: {providerInfo.all_providers.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ODRLDemo;