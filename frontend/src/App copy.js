import React, { useState, useEffect } from 'react';
import { AlertCircle, FileText, Brain, Code, Copy, Download, CheckCircle, Shield, Settings, ChevronDown, ChevronUp, Info, Cloud, Cpu, RefreshCw, Zap, Plus, Trash2, Edit, Upload, Save, X, Check } from 'lucide-react';

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
  
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('quick'); // 'quick' or 'custom'
  const [selectedModel, setSelectedModel] = useState(null);
  const [temperature, setTemperature] = useState(0.3);
  
  // Custom model form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customModels, setCustomModels] = useState([]);
  const [customForm, setCustomForm] = useState({
    name: '',
    provider_type: 'ollama',
    base_url: '',
    api_key: '',
    model_id: '',
    context_length: 4096,
    temperature_default: 0.3
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const API_BASE_URL = 'http://localhost:8000/api';

  const examples = [
    { title: "Document Policy", text: "Users can read and print the document but cannot modify or distribute it. The policy expires on December 31, 2025." },
    { title: "Academic Dataset", text: "Researchers can download and analyze the dataset for non-commercial research purposes. Attribution is required. Commercial use is prohibited." },
    { title: "Software License", text: "Users can use, copy, and modify the software. Distribution requires attribution and must use the same license. Patent claims are granted." },
    { title: "Photo Rights", text: "The photographer grants rights to use the photo on social media with attribution. Print publication requires additional permission." }
  ];

  useEffect(() => {
    loadProviders();
    loadCustomModels();
  }, []);

  const loadProviders = async () => {
    setLoadingProviders(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/available-providers`, { 
        signal: AbortSignal.timeout(5000) 
      });
      
      if (!response.ok) throw new Error('Backend not responding');
      
      const data = await response.json();
      setProviders(data.providers || []);
      setBackendConnected(true);
      
      // Set default model
      if (data.default_model) {
        setSelectedModel(data.default_model);
      } else if (data.providers && data.providers.length > 0 && data.providers[0].models.length > 0) {
        setSelectedModel(data.providers[0].models[0].value);
      }
    } catch (err) {
      console.error('Provider detection failed:', err);
      setError('⚠️ Backend not connected. Start: cd backend && uvicorn main:app --reload');
      setBackendConnected(false);
    }
    setLoadingProviders(false);
  };

  const loadCustomModels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/custom-models`);
      if (response.ok) {
        const data = await response.json();
        setCustomModels(data.models || []);
      }
    } catch (err) {
      console.error('Failed to load custom models:', err);
    }
  };

  const testCustomConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/custom-models/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customForm)
      });
      
      const result = await response.json();
      setConnectionStatus(result);
    } catch (err) {
      setConnectionStatus({ status: 'failed', error: err.message });
    }
    
    setTestingConnection(false);
  };

  const saveCustomModel = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/custom-models/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customForm)
      });
      
      if (response.ok) {
        await loadCustomModels();
        setShowCustomForm(false);
        resetCustomForm();
      }
    } catch (err) {
      setError('Failed to save custom model: ' + err.message);
    }
  };

  const deleteCustomModel = async (modelId) => {
    try {
      await fetch(`${API_BASE_URL}/custom-models/${modelId}`, {
        method: 'DELETE'
      });
      await loadCustomModels();
    } catch (err) {
      setError('Failed to delete model: ' + err.message);
    }
  };

  const resetCustomForm = () => {
    setCustomForm({
      name: '',
      provider_type: 'ollama',
      base_url: '',
      api_key: '',
      model_id: '',
      context_length: 4096,
      temperature_default: 0.3
    });
    setConnectionStatus(null);
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
          model: selectedModel,
          temperature: temperature
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
          model: selectedModel,
          temperature: temperature
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
          model: selectedModel,
          temperature: temperature
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
          model: selectedModel,
          temperature: temperature
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

  const getTemperatureLabel = () => {
    if (temperature < 0.4) return '🎯 Precise';
    if (temperature > 0.6) return '🎨 Creative';
    return '⚖️ Balanced';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">ODRL Policy Generator</h1>
                <p className="text-blue-100">Multi-Agent System • Flexible LLM Configuration</p>
              </div>
              
              <div className="flex flex-col gap-2 items-end">
                {loadingProviders ? (
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
                    {providers.length > 0 && (
                      <div className="bg-white/20 px-3 py-1 rounded-full text-xs backdrop-blur">
                        {providers.length} provider(s) available
                      </div>
                    )}
                    {selectedModel && (
                      <div className="bg-white/20 px-3 py-1 rounded-full text-xs backdrop-blur">
                        {selectedModel.split(':')[1]}
                      </div>
                    )}
                  </>
                ) : (
                  <button 
                    onClick={loadProviders} 
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
            
            {/* Settings Panel - Two Tabs */}
            <div className="border rounded-lg bg-gradient-to-br from-gray-50 to-blue-50 mb-6">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition rounded-t-lg"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-800">LLM Configuration</span>
                  {selectedModel && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {selectedModel.split(':')[1]}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    @ {temperature} {getTemperatureLabel()}
                  </span>
                </div>
                {settingsOpen ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
              </button>

              {settingsOpen && (
                <div className="border-t bg-white">
                  {/* Settings Tabs */}
                  <div className="flex border-b">
                    <button
                      onClick={() => setSettingsTab('quick')}
                      className={`flex-1 px-4 py-3 font-medium transition ${
                        settingsTab === 'quick'
                          ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Zap className="inline-block mr-2 h-4 w-4" />
                      Quick Setup
                    </button>
                    <button
                      onClick={() => setSettingsTab('custom')}
                      className={`flex-1 px-4 py-3 font-medium transition ${
                        settingsTab === 'custom'
                          ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Plus className="inline-block mr-2 h-4 w-4" />
                      Custom Models
                    </button>
                  </div>

                  <div className="p-4">
                    {/* Quick Setup Tab */}
                    {settingsTab === 'quick' && (
                      <div className="space-y-4">
                        {loadingProviders ? (
                          <div className="text-center py-8">
                            <RefreshCw className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" />
                            <p className="text-gray-500">Detecting providers...</p>
                          </div>
                        ) : !backendConnected ? (
                          <div className="text-center py-8">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                            <p className="text-red-600 font-semibold mb-2">Backend Not Connected</p>
                            <p className="text-sm text-gray-600 mb-3">Start the backend server first</p>
                            <div className="bg-gray-50 p-3 rounded text-xs text-left mb-3 font-mono max-w-md mx-auto">
                              <div>cd backend</div>
                              <div>uvicorn main:app --reload</div>
                            </div>
                            <button
                              onClick={loadProviders}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Retry Connection
                            </button>
                          </div>
                        ) : providers.length === 0 ? (
                          <div className="text-center py-8">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-orange-400" />
                            <p className="text-orange-600 font-semibold">No Providers Available</p>
                            <p className="text-sm text-gray-600 mt-2">Configure providers in backend .env file</p>
                            <div className="mt-4 text-left bg-gray-50 p-4 rounded text-xs font-mono max-w-2xl mx-auto">
                              <div className="text-gray-700 mb-2"># Enable at least one provider:</div>
                              <div>ENABLE_OLLAMA=true</div>
                              <div>ENABLE_FITS=true</div>
                              <div>ENABLE_GROQ=true</div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Available Providers Display */}
                            <div>
                              <h3 className="font-semibold text-gray-800 mb-3">✓ Available Providers</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {providers.map((provider) => (
                                  <div
                                    key={provider.id}
                                    className={`p-4 rounded-lg border-2 ${
                                      provider.status === 'online' 
                                        ? 'bg-green-50 border-green-300' 
                                        : 'bg-gray-50 border-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-2xl">{provider.icon}</span>
                                        <div>
                                          <div className="font-semibold text-gray-800">{provider.name}</div>
                                          <div className="text-xs text-gray-500 capitalize">{provider.type}</div>
                                        </div>
                                      </div>
                                      <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                                        provider.status === 'online'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        <div className={`w-2 h-2 rounded-full ${
                                          provider.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                                        }`} />
                                        {provider.status}
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-600 space-y-1">
                                      {provider.models.slice(0, 3).map((model, idx) => (
                                        <div key={idx}>
                                          • {model.label || model.value} {model.recommended && '⭐'}
                                        </div>
                                      ))}
                                      {provider.models.length > 3 && (
                                        <div className="text-gray-500">
                                          + {provider.models.length - 3} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Model Selector */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Select Model
                              </label>
                              <select
                                value={selectedModel || ''}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-base"
                              >
                                {providers.map((provider) => (
                                  <optgroup key={provider.id} label={`${provider.icon} ${provider.name}`}>
                                    {provider.models.map((model) => (
                                      <option key={model.value} value={model.value}>
                                        {model.label || model.value} {model.recommended && '⭐ (Recommended)'}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                This model will be used for all four agents (Parser, Reasoner, Generator, Validator)
                              </p>
                            </div>

                            {/* Temperature Slider */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Temperature: {temperature.toFixed(1)} {getTemperatureLabel()}
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={temperature}
                                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Precise</span>
                                <span>Balanced</span>
                                <span>Creative</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Custom Models Tab */}
                    {settingsTab === 'custom' && (
                      <div className="space-y-4">
                        {!showCustomForm ? (
                          <>
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-gray-800">Your Custom Models</h3>
                              <button
                                onClick={() => setShowCustomForm(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm"
                              >
                                <Plus className="w-4 h-4" />
                                Add Custom Model
                              </button>
                            </div>

                            {customModels.length === 0 ? (
                              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                <Cpu className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                <p className="text-gray-600 font-medium mb-2">No Custom Models Yet</p>
                                <p className="text-sm text-gray-500 mb-4">
                                  Add your own fine-tuned models or custom API endpoints
                                </p>
                                <button
                                  onClick={() => setShowCustomForm(true)}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add Your First Model
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {customModels.map((model) => (
                                  <div
                                    key={model.id}
                                    className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="font-semibold text-gray-800">{model.name}</div>
                                        <div className="text-sm text-gray-600 mt-1">
                                          {model.provider_type} • {model.base_url}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          Model: {model.model_id} • Context: {model.context_length}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                                          <Edit className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => deleteCustomModel(model.id)}
                                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Import/Export */}
                            <div className="pt-4 border-t flex gap-2">
                              <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2 text-sm">
                                <Upload className="w-4 h-4" />
                                Import Config
                              </button>
                              <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2 text-sm">
                                <Download className="w-4 h-4" />
                                Export Config
                              </button>
                            </div>
                          </>
                        ) : (
                          /* Custom Model Form */
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-gray-800">Add Custom Model</h3>
                              <button
                                onClick={() => {
                                  setShowCustomForm(false);
                                  resetCustomForm();
                                }}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  Model Name *
                                </label>
                                <input
                                  type="text"
                                  value={customForm.name}
                                  onChange={(e) => setCustomForm({...customForm, name: e.target.value})}
                                  placeholder="my-fine-tuned-llama"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  Provider Type *
                                </label>
                                <select
                                  value={customForm.provider_type}
                                  onChange={(e) => setCustomForm({...customForm, provider_type: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="ollama">Ollama (Local)</option>
                                  <option value="openai">OpenAI Compatible API</option>
                                  <option value="custom">Custom Endpoint</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  API Base URL *
                                </label>
                                <input
                                  type="url"
                                  value={customForm.base_url}
                                  onChange={(e) => setCustomForm({...customForm, base_url: e.target.value})}
                                  placeholder="http://localhost:11434"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  API Key (Optional)
                                </label>
                                <input
                                  type="password"
                                  value={customForm.api_key}
                                  onChange={(e) => setCustomForm({...customForm, api_key: e.target.value})}
                                  placeholder="sk-xxx (if required)"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  Model Identifier *
                                </label>
                                <input
                                  type="text"
                                  value={customForm.model_id}
                                  onChange={(e) => setCustomForm({...customForm, model_id: e.target.value})}
                                  placeholder="llama3.1:70b"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  required
                                />
                                <p className="text-xs text-gray-500 mt-1">Exact model name as used by the API</p>
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  Context Length
                                </label>
                                <input
                                  type="number"
                                  value={customForm.context_length}
                                  onChange={(e) => setCustomForm({...customForm, context_length: parseInt(e.target.value)})}
                                  placeholder="4096"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  Default Temperature
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="2"
                                  value={customForm.temperature_default}
                                  onChange={(e) => setCustomForm({...customForm, temperature_default: parseFloat(e.target.value)})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            {/* Test Connection */}
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-700">Connection Test</span>
                                {connectionStatus && (
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    connectionStatus.status === 'success'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {connectionStatus.status === 'success' ? '✓ Connected' : '✗ Failed'}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={testCustomConnection}
                                disabled={testingConnection || !customForm.base_url || !customForm.model_id}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                              >
                                {testingConnection ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Testing...
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-4 h-4" />
                                    Test Connection
                                  </>
                                )}
                              </button>
                              {connectionStatus && connectionStatus.error && (
                                <p className="text-xs text-red-600 mt-2">{connectionStatus.error}</p>
                              )}
                              {connectionStatus && connectionStatus.latency_ms && (
                                <p className="text-xs text-green-600 mt-2">
                                  Latency: {connectionStatus.latency_ms}ms
                                </p>
                              )}
                            </div>

                            {/* Form Actions */}
                            <div className="flex gap-2 pt-4 border-t">
                              <button
                                onClick={() => {
                                  setShowCustomForm(false);
                                  resetCustomForm();
                                }}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={saveCustomModel}
                                disabled={!customForm.name || !customForm.base_url || !customForm.model_id}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                Save Custom Model
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                  disabled={!inputText || loading || !selectedModel || !backendConnected}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Parsing with {selectedModel?.split(':')[1]}...
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
                      Reasoning with {selectedModel?.split(':')[1]}...
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
                        Generating with {selectedModel?.split(':')[1]}...
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
                        Validating with {selectedModel?.split(':')[1]}...
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
              {selectedModel && (
                <div className="text-xs text-gray-500">
                  {selectedModel.split(':')[1]} @ {temperature}
                </div>
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
          <p className="mt-1 text-xs">
            {providers.length > 0 && `${providers.length} provider(s) available • `}
            Flexible LLM Configuration
          </p>
        </div>
      </div>
    </div>
  );
};

export default ODRLDemo;