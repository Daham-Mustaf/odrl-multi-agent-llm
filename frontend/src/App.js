import React, { useState, useEffect } from 'react';
import { encoding_for_model } from 'js-tiktoken';
import { AlertCircle, FileText, Brain, Code, Copy, Download, CheckCircle, Shield, Settings, Info, RefreshCw, Plus, Trash2, Save, X, Moon, Sun, BarChart3, Clock, Activity, ArrowRight, Sparkles, PlayCircle, Upload } from 'lucide-react';

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
  const [uploadStatus, setUploadStatus] = useState(null);

  const [advancedMode, setAdvancedMode] = useState(false);
  const [agentModels, setAgentModels] = useState({
    parser: null,      
    reasoner: null,
    generator: null,
    validator: null
  });
  
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [temperature, setTemperature] = useState(0.3);
  
  const [darkMode, setDarkMode] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [autoProgress, setAutoProgress] = useState(true);
  
  const [metrics, setMetrics] = useState({
    parseTime: 0,
    reasonTime: 0,
    generateTime: 0,
    validateTime: 0
  });
  
  const [agentStates, setAgentStates] = useState({
    parser: 'idle',
    reasoner: 'idle',
    generator: 'idle',
    validator: 'idle'
  });

  const [customModels, setCustomModels] = useState([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: '',
    provider_type: 'ollama',
    base_url: 'http://localhost:11434',
    api_key: '',
    model_id: '',
    context_length: 4096,
    temperature_default: 0.3
  });
  
  const [syncMode, setSyncMode] = useState('both'); // 'localStorage', 'backend', 'both'

  const API_BASE_URL = 'http://localhost:8000/api';

  const examples = [
    { 
      title: "Document Policy", 
      text: "Users can read and print the document but cannot modify or distribute it. The policy expires on December 31, 2025.",
      icon: "📄"
    },
    { 
      title: "Academic Dataset", 
      text: "Researchers can download and analyze the dataset for non-commercial research purposes. Attribution is required. Commercial use is prohibited.",
      icon: "🎓"
    },
    { 
      title: "Software License", 
      text: "Users can use, copy, and modify the software. Distribution requires attribution and must use the same license.",
      icon: "💻"
    },
    { 
      title: "Photo Rights", 
      text: "The photographer grants rights to use the photo on social media with attribution. Print publication requires additional permission.",
      icon: "📸"
    }
  ];

  // ============================================
  // INITIALIZATION
  // ============================================

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

  // ============================================
  // CUSTOM MODELS MANAGEMENT (BOTH STORAGE METHODS)
  // ============================================

  const loadCustomModels = async () => {
    try {
      // Load from localStorage
      const localModels = loadFromLocalStorage();
      
      // Load from backend (if connected)
      let backendModels = [];
      if (backendConnected) {
        try {
          const response = await fetch(`${API_BASE_URL}/custom-models`);
          if (response.ok) {
            const data = await response.json();
            backendModels = data.models || [];
            console.log(`📥 Loaded ${backendModels.length} models from backend`);
          }
        } catch (err) {
          console.log('Backend custom models not available, using localStorage only');
        }
      }
      
      // Merge both sources (backend takes precedence for conflicts)
      const merged = mergeModels(localModels, backendModels);
      setCustomModels(merged);
      
      console.log(`Total custom models loaded: ${merged.length}`);
    } catch (err) {
      console.error('Error loading custom models:', err);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('customModels');
      if (saved) {
        const models = JSON.parse(saved);
        console.log(`💾 Loaded ${models.length} models from localStorage`);
        return models;
      }
    } catch (err) {
      console.error('Error loading from localStorage:', err);
    }
    return [];
  };

  const saveToLocalStorage = (models) => {
    try {
      localStorage.setItem('customModels', JSON.stringify(models));
      console.log(`💾 Saved ${models.length} models to localStorage`);
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  };

  const saveToBackend = async (model) => {
    if (!backendConnected) {
      console.log('⚠️ Backend not connected, skipping backend save');
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/custom-models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: model.label,
          provider_type: model.provider_type,
          base_url: model.base_url,
          model_id: model.model_id,
          api_key: model.api_key || '',
          context_length: model.context_length || 4096,
          temperature_default: model.temperature_default || 0.3
        })
      });

      if (response.ok) {
        console.log(`Saved to backend: ${model.label}`);
        return true;
      }
    } catch (err) {
      console.error('Error saving to backend:', err);
    }
    return false;
  };

  const deleteFromBackend = async (modelValue) => {
    if (!backendConnected) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/custom-models/${modelValue}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log(`🗑️ Deleted from backend: ${modelValue}`);
        return true;
      }
    } catch (err) {
      console.error('Error deleting from backend:', err);
    }
    return false;
  };

  const mergeModels = (localModels, backendModels) => {
    const merged = [...backendModels];
    
    localModels.forEach(localModel => {
      const existsInBackend = merged.some(m => m.value === localModel.value);
      if (!existsInBackend) {
        merged.push(localModel);
      }
    });
    
    return merged;
  };

  const addOrUpdateCustomModel = async (modelData) => {
    const newModel = {
      value: `custom:${modelData.model_id}`,
      label: modelData.name,
      provider_type: modelData.provider_type,
      base_url: modelData.base_url,
      model_id: modelData.model_id,
      api_key: modelData.api_key,
      context_length: modelData.context_length,
      temperature_default: modelData.temperature_default,
      created_at: Date.now()
    };
    
    const existingIndex = customModels.findIndex(m => m.value === newModel.value);
    let updatedModels;
    
    if (existingIndex >= 0) {
      updatedModels = [...customModels];
      updatedModels[existingIndex] = newModel;
    } else {
      updatedModels = [...customModels, newModel];
    }
    
    setCustomModels(updatedModels);
    
    // Save to both storages based on sync mode
    if (syncMode === 'localStorage' || syncMode === 'both') {
      saveToLocalStorage(updatedModels);
    }
    
    if (syncMode === 'backend' || syncMode === 'both') {
      await saveToBackend(newModel);
    }
    
    setSelectedModel(newModel.value);
    return newModel;
  };

  const deleteCustomModel = async (modelValue) => {
    const updatedModels = customModels.filter(m => m.value !== modelValue);
    setCustomModels(updatedModels);
    
    // Delete from both storages based on sync mode
    if (syncMode === 'localStorage' || syncMode === 'both') {
      saveToLocalStorage(updatedModels);
    }
    
    if (syncMode === 'backend' || syncMode === 'both') {
      await deleteFromBackend(modelValue);
    }
    
    if (selectedModel === modelValue) {
      setSelectedModel(null);
    }
  };

  const exportCustomModels = () => {
    const exportData = {
      models: customModels,
      count: customModels.length,
      exported_at: new Date().toISOString(),
      version: "1.0"
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `custom-models-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCustomModels = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        const newModels = imported.models || imported;
        
        const merged = [...customModels];
        let addedCount = 0;
        let updatedCount = 0;
        
        for (const newModel of newModels) {
          const existingIndex = merged.findIndex(m => m.value === newModel.value);
          if (existingIndex >= 0) {
            merged[existingIndex] = newModel;
            updatedCount++;
          } else {
            merged.push(newModel);
            addedCount++;
          }
          
          // Save to backend if in backend or both mode
          if (syncMode === 'backend' || syncMode === 'both') {
            await saveToBackend(newModel);
          }
        }
        
        setCustomModels(merged);
        
        // Save to localStorage
        if (syncMode === 'localStorage' || syncMode === 'both') {
          saveToLocalStorage(merged);
        }
        
        alert(`Imported ${addedCount} new, ${updatedCount} updated. Total: ${merged.length}`);
      } catch (err) {
        console.error('Error importing custom models:', err);
        alert('Failed to import models. Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // ============================================
  // AGENT PROCESSING FUNCTIONS
  // ============================================

  const updateAgentState = (agent, state) => {
    setAgentStates(prev => ({ ...prev, [agent]: state }));
  };

  const handleParse = async () => {
    if (!backendConnected) {
      setError('Backend not connected. Please start the server.');
      return;
    }
    
    setLoading(true);
    setError(null);
    updateAgentState('parser', 'processing');
    const startTime = Date.now();
    
    try {
      // USE AGENT-SPECIFIC MODEL (or fall back to default)
      const modelToUse = agentModels.parser || selectedModel;
      const isCustomModel = modelToUse?.startsWith('custom:');
      const customModelConfig = isCustomModel 
        ? customModels.find(m => m.value === modelToUse)
        : null;
        
      const response = await fetch(`${API_BASE_URL}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText,
          model: modelToUse,  // Use agent-specific model
          temperature: temperature,
          ...(customModelConfig && {
            custom_model: {
              provider_type: customModelConfig.provider_type,
              base_url: customModelConfig.base_url,
              api_key: customModelConfig.api_key,
              model_id: customModelConfig.model_id
            }
          })
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Parsing failed');
      }
      
      const data = await response.json();
      setParsedData(data);
      updateAgentState('parser', 'success');
      
      const elapsed = Date.now() - startTime;
      setMetrics(prev => ({ ...prev, parseTime: elapsed }));
      
      if (autoProgress) {
        setTimeout(() => setActiveTab('reasoner'), 500);
      } else {
        setActiveTab('reasoner');
      }
    } catch (err) {
      setError('Parse failed: ' + err.message);
      updateAgentState('parser', 'error');
    }
    setLoading(false);
  };
    
  const handleReason = async () => {
    setLoading(true);
    setError(null);
    updateAgentState('reasoner', 'processing');
    const startTime = Date.now();
    
    try {
      const modelToUse = agentModels.reasoner || selectedModel;
      const isCustomModel = modelToUse?.startsWith('custom:');
      const customModelConfig = isCustomModel 
        ? customModels.find(m => m.value === modelToUse)
        : null;

      const response = await fetch(`${API_BASE_URL}/reason`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parsed_data: parsedData,
          model: modelToUse, 
          temperature: temperature,
          ...(customModelConfig && {
            custom_model: {
              provider_type: customModelConfig.provider_type,
              base_url: customModelConfig.base_url,
              api_key: customModelConfig.api_key,
              model_id: customModelConfig.model_id
            }
          })
        })
      });
      
      if (!response.ok) throw new Error('Reasoning failed');
      
      const data = await response.json();
      setReasoningResult(data);
      updateAgentState('reasoner', 'success');
      
      const elapsed = Date.now() - startTime;
      setMetrics(prev => ({ ...prev, reasonTime: elapsed }));
      
      if (autoProgress) {
        setTimeout(() => setActiveTab('generator'), 500);
      } else {
        setActiveTab('generator');
      }
    } catch (err) {
      setError('Reason failed: ' + err.message);
      updateAgentState('reasoner', 'error');
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    updateAgentState('generator', 'processing');
    const startTime = Date.now();
    
    try {
      const modelToUse = agentModels.generator || selectedModel;
      const isCustomModel = modelToUse?.startsWith('custom:');
      const customModelConfig = isCustomModel 
        ? customModels.find(m => m.value === modelToUse)
        : null;

      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reasoning_result: reasoningResult,
          model: modelToUse,  
          temperature: temperature,
          ...(customModelConfig && {
            custom_model: {
              provider_type: customModelConfig.provider_type,
              base_url: customModelConfig.base_url,
              api_key: customModelConfig.api_key,
              model_id: customModelConfig.model_id
            }
          })
        })
      });
      
      if (!response.ok) throw new Error('Generation failed');
      
      const data = await response.json();
      setGeneratedODRL(data);
      updateAgentState('generator', 'success');
      
      const elapsed = Date.now() - startTime;
      setMetrics(prev => ({ ...prev, generateTime: elapsed }));
      
      if (autoProgress) {
        setTimeout(() => {
          setActiveTab('validator');
          if (data.odrl_policy) {
            setTimeout(() => handleValidate(data.odrl_policy), 500);
          }
        }, 500);
      } else {
        setActiveTab('validator');
      }
    } catch (err) {
      setError('Generate failed: ' + err.message);
      updateAgentState('generator', 'error');
    }
    setLoading(false);
  };

  const handleValidate = async (policy) => {
    setLoading(true);
    setError(null);
    updateAgentState('validator', 'processing');
    const startTime = Date.now();
    
    try {
      const modelToUse = agentModels.validator || selectedModel;
      const isCustomModel = modelToUse?.startsWith('custom:');
      const customModelConfig = isCustomModel 
        ? customModels.find(m => m.value === modelToUse)
        : null;

      const response = await fetch(`${API_BASE_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          odrl_policy: policy || generatedODRL?.odrl_policy,
          model: modelToUse, 
          temperature: temperature,
          ...(customModelConfig && {
            custom_model: {
              provider_type: customModelConfig.provider_type,
              base_url: customModelConfig.base_url,
              api_key: customModelConfig.api_key,
              model_id: customModelConfig.model_id
            }
          })
        })
      });
      
      if (!response.ok) throw new Error('Validation failed');
      
      const data = await response.json();
      setValidationResult(data);
      updateAgentState('validator', data.is_valid ? 'success' : 'warning');
      
      const elapsed = Date.now() - startTime;
      setMetrics(prev => ({ ...prev, validateTime: elapsed }));
    } catch (err) {
      setError('Validate failed: ' + err.message);
      updateAgentState('validator', 'error');
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
    setAgentStates({
      parser: 'idle',
      reasoner: 'idle',
      generator: 'idle',
      validator: 'idle'
    });
    setMetrics({
      parseTime: 0,
      reasonTime: 0,
      generateTime: 0,
      validateTime: 0
    });
  };

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      model: selectedModel,
      temperature: temperature,
      input: inputText,
      parsed: parsedData,
      reasoning: reasoningResult,
      generated: generatedODRL,
      validation: validationResult,
      metrics: metrics
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `odrl-report-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getTemperatureLabel = () => {
    if (temperature < 0.4) return '🎯 Precise';
    if (temperature > 0.6) return '🎨 Creative';
    return '⚖️ Balanced';
  };

  const getAgentStateColor = (state) => {
    switch(state) {
      case 'processing': return 'bg-blue-500 animate-pulse';
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-300';
    }
  };
// ============================================
// FILE UPLOAD HANDLER
// ============================================

const handleFileUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    setError('File too large. Maximum size is 5MB.');
    setUploadStatus(null);
    return;
  }
  
  setLoading(true);
  setError(null);
  setUploadStatus(null);
  
  try {
    const fileType = file.name.split('.').pop().toLowerCase();
    
    // Only support txt and md
    if (fileType === 'txt' || fileType === 'md') {
      const text = await file.text();
      
      if (text.trim().length === 0) {
        setError('File is empty. Please upload a file with content.');
        return;
      }
      
      setInputText(text);
      setUploadStatus(`Loaded: ${file.name} (${text.length} characters)`);
    } 
    else {
      setError('Unsupported file type. Use .txt or .md files only.');
    }
  } catch (err) {
    setError(`Error reading file: ${err.message}`);
  } finally {
    setLoading(false);
    e.target.value = ''; // Reset file input
  }
};
  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100';
  const cardBg = darkMode ? 'bg-gray-800' : 'bg-white';
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-900';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className={`min-h-screen ${bgClass} p-4 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto">
        <div className={`${cardBg} rounded-xl shadow-2xl overflow-hidden transition-colors duration-300`}>
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <Sparkles className="w-8 h-8" />
                  ODRL Policy Generator
                </h1>
                <p className="text-blue-100">Transform Text to Policies • Multi-Model AI • Instant Validation</p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition backdrop-blur"
                    title="Settings & Custom Models"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition backdrop-blur"
                  >
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setShowMetrics(!showMetrics)}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition backdrop-blur"
                  >
                    <BarChart3 className="w-5 h-5" />
                  </button>
                </div>
                
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
                    {(providers.length > 0 || customModels.length > 0) && (
                      <div className="bg-white/20 px-3 py-1 rounded-full text-xs backdrop-blur">
                        {providers.length} provider(s) • {providers.reduce((acc, p) => acc + p.models.length, 0) + customModels.length} models
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

          {/* Visual Agent Pipeline */}
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} border-b ${borderClass} p-6`}>
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              {[
                { key: 'parser', label: 'Parser', icon: FileText },
                { key: 'reasoner', label: 'Reasoner', icon: Brain },
                { key: 'generator', label: 'Generator', icon: Code },
                { key: 'validator', label: 'Validator', icon: Shield }
              ].map((agent, idx) => (
                <React.Fragment key={agent.key}>
                  <div className="flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getAgentStateColor(agentStates[agent.key])} transition-all duration-300 ${
                      agentStates[agent.key] === 'processing' ? 'scale-110' : ''
                    }`}>
                      <agent.icon className="w-8 h-8 text-white" />
                    </div>
                    <span className={`text-xs mt-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {agent.label}
                    </span>
                    {agentStates[agent.key] === 'success' && (
                      <span className="text-xs text-green-600 mt-1">
                        {metrics[`${agent.key === 'parser' ? 'parse' : agent.key === 'reasoner' ? 'reason' : agent.key === 'generator' ? 'generate' : 'validate'}Time`]}ms
                      </span>
                    )}
                  </div>
                  {idx < 3 && (
                    <ArrowRight className={`w-6 h-6 ${
                      agentStates[['reasoner', 'generator', 'validator'][idx]] !== 'idle' 
                        ? 'text-blue-500' 
                        : darkMode ? 'text-gray-600' : 'text-gray-300'
                    } transition-colors duration-300`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          {showMetrics && (metrics.parseTime > 0 || metrics.reasonTime > 0) && (
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-green-50 to-blue-50'} border-b ${borderClass} p-4`}>
              <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} p-3 rounded-lg`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Parse</span>
                  </div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{metrics.parseTime}ms</div>
                </div>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} p-3 rounded-lg`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                    <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Reason</span>
                  </div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{metrics.reasonTime}ms</div>
                </div>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} p-3 rounded-lg`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Code className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                    <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Generate</span>
                  </div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{metrics.generateTime}ms</div>
                </div>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} p-3 rounded-lg`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                    <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Validate</span>
                  </div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{metrics.validateTime}ms</div>
                </div>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} p-3 rounded-lg`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                    <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total</span>
                  </div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.parseTime + metrics.reasonTime + metrics.generateTime + metrics.validateTime}ms
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className={`flex border-b ${borderClass} ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} overflow-x-auto`}>
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
                    ? `${darkMode ? 'bg-gray-700 text-blue-400' : 'bg-white text-blue-600'} border-b-2 border-blue-600`
                    : enabled 
                      ? `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}` 
                      : `${darkMode ? 'text-gray-600' : 'text-gray-400'} cursor-not-allowed`
                }`}
              >
                <Icon className="inline-block mr-2 h-5 w-5" />
                {idx + 1}. {label}
              </button>
            ))}
          </div>

          {/* Error Display */}
          {error && (
            <div className={`m-6 p-4 ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-lg flex items-start gap-3`}>
              <AlertCircle className={`h-5 w-5 ${darkMode ? 'text-red-400' : 'text-red-500'} flex-shrink-0 mt-0.5`} />
              <div className={`${darkMode ? 'text-red-300' : 'text-red-700'} text-sm flex-1`}>{error}</div>
            </div>
          )}

          {/* Content Area - Parser Tab (keeping it short due to length) */}
          <div className="p-6">
            {activeTab === 'parser' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoProgress}
                      onChange={(e) => setAutoProgress(e.target.checked)}
                      className="rounded"
                    />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      Auto-progress through agents
                    </span>
                  </label>
                  {(parsedData || reasoningResult || generatedODRL || validationResult) && (
                    <button
                      onClick={exportReport}
                      className={`px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg transition flex items-center gap-2 text-sm`}
                    >
                      <Download className="w-4 h-4" />
                      Export Report
                    </button>
                  )}
                </div>

            {/* Advanced Mode Toggle - Compact Design */}
            <div className={`mb-6 overflow-hidden rounded-xl border-2 ${
              darkMode ? 'bg-gray-800 border-blue-800' : 'bg-white border-blue-200'
            }`}>
              {/* Header */}
              <div className={`p-4 ${darkMode ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30' : 'bg-gradient-to-r from-blue-50 to-purple-50'}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedMode}
                    onChange={(e) => setAdvancedMode(e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-base ${textClass}`}>
                        Advanced Mode
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        advancedMode 
                          ? 'bg-green-500 text-white' 
                          : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {advancedMode ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Configure different models for each agent
                    </p>
                  </div>
                </label>
              </div>
              
              {/* Info Box */}
              <div className={`px-4 py-3 border-t ${darkMode ? 'bg-blue-900/10 border-gray-700' : 'bg-blue-50/50 border-blue-100'}`}>
                <div className="flex items-start gap-2">
                  <span className="text-sm">💡</span>
                  <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <strong>Pro Tip:</strong> Faster models for parsing/validation • Powerful models for reasoning/generation
                  </p>
                </div>
              </div>
            </div>

            {/* Per-Agent Model Selection */}
            {advancedMode && (
              <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${borderClass}`}>
                <h3 className={`text-lg font-bold ${textClass} mb-4 flex items-center gap-2`}>
                  <Brain className="w-5 h-5" />
                  Agent-Specific Models
                </h3>
                
                <div className="space-y-3">
                  {/* Parser Model */}
                  <div>
                    <label className={`text-sm font-medium ${textClass} mb-1 block`}>
                      📄 Parser Model
                    </label>
                    <select
                      value={agentModels.parser || ''}
                      onChange={(e) => setAgentModels({...agentModels, parser: e.target.value || null})}
                      className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg text-sm`}
                    >
                      <option value="">Use default model</option>
                      {providers.map(provider => 
                        provider.models.map(model => (
                          <option key={model.value} value={model.value}>
                            {model.label}
                          </option>
                        ))
                      )}
                      {customModels.map(model => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reasoner Model */}
                  <div>
                    <label className={`text-sm font-medium ${textClass} mb-1 block`}>
                      🧠 Reasoner Model
                    </label>
                    <select
                      value={agentModels.reasoner || ''}
                      onChange={(e) => setAgentModels({...agentModels, reasoner: e.target.value || null})}
                      className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg text-sm`}
                    >
                      <option value="">Use default model</option>
                      {providers.map(provider => 
                        provider.models.map(model => (
                          <option key={model.value} value={model.value}>
                            {model.label}
                          </option>
                        ))
                      )}
                      {customModels.map(model => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Generator Model */}
                  <div>
                    <label className={`text-sm font-medium ${textClass} mb-1 block`}>
                      ⚙️ Generator Model
                    </label>
                    <select
                      value={agentModels.generator || ''}
                      onChange={(e) => setAgentModels({...agentModels, generator: e.target.value || null})}
                      className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg text-sm`}
                    >
                      <option value="">Use default model</option>
                      {providers.map(provider => 
                        provider.models.map(model => (
                          <option key={model.value} value={model.value}>
                            {model.label}
                          </option>
                        ))
                      )}
                      {customModels.map(model => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Validator Model */}
                  <div>
                    <label className={`text-sm font-medium ${textClass} mb-1 block`}>
                      🛡️ Validator Model
                    </label>
                    <select
                      value={agentModels.validator || ''}
                      onChange={(e) => setAgentModels({...agentModels, validator: e.target.value || null})}
                      className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg text-sm`}
                    >
                      <option value="">Use default model</option>
                      {providers.map(provider => 
                        provider.models.map(model => (
                          <option key={model.value} value={model.value}>
                            {model.label}
                          </option>
                        ))
                      )}
                      {customModels.map(model => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
                            
                {/* Input Area */}
              <div>
                {/* Compact Example Selector - NEW */}
                <div className="flex items-center gap-2 mb-3">
                  <label className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1`}>
                    <Sparkles className="w-3 h-3" />
                    Quick examples:
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setInputText(e.target.value);
                        e.target.value = ''; // Reset dropdown
                      }
                    }}
                    className={`flex-1 px-3 py-1.5 text-xs rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    } border focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Choose an example policy...</option>
                    {examples.map((ex, idx) => (
                      <option key={idx} value={ex.text}>
                        {ex.icon} {ex.title}
                      </option>
                    ))}
                  </select>
                </div>

                <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Enter Policy Description
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Describe your policy in natural language..."
                  className={`w-full h-40 px-4 py-3 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'} border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none`}
                />
                
                {/* File Upload Section - TXT & MD Only */}
                <div className={`mt-3 flex items-center gap-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="text-xs">Or:</span>
                  <label className={`cursor-pointer px-3 py-1.5 text-xs rounded-lg flex items-center gap-2 ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
                  } border transition`}>
                    <Upload className="w-3 h-3" />
                    Choose File
                    <input
                      type="file"
                      accept=".txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-gray-500">.txt, .md (max 5MB)</span>
                </div>
                
                {/* Success/Upload Status Message */}
                {uploadStatus && (
                  <div className={`mt-2 text-xs ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {uploadStatus}
                  </div>
                )}
                
                {/* Character/Token Count */}
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {inputText.length} characters (~{Math.ceil(inputText.length / 4)} tokens)
                  </span>
                  {inputText && (
                    <button
                      onClick={() => setInputText('')}
                      className={`text-xs ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
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
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-5 h-5" />
                      Start Processing
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Results... (keeping other tabs code from your original) */}
              </div>
            )}
            
            {/* Add other tabs (reasoner, generator, validator) from your original code here */}
          </div>

          {/* Footer */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} px-6 py-4 border-t flex justify-between items-center flex-wrap gap-4`}>
            <div className="flex items-center gap-4">
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {selectedModel && `Model: ${selectedModel.split(':')[1] || selectedModel}`}
              </div>
            </div>
            <button
              onClick={resetDemo}
              className={`px-4 py-2 text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'} rounded-lg transition flex items-center gap-2`}
            >
              <RefreshCw className="w-4 h-4" />
              Reset Demo
            </button>
             {/* API Docs Button */}
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className={`px-4 py-2 text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'} rounded-lg transition`}
              >
                API Docs
              </a>
          </div>
        </div>

        {/* Info Footer */}
        <div className={`mt-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p className="font-medium">ODRL Policy Generator • Multi-Agent System</p>
          <p className="mt-1 text-xs">
            Flexible LLM Configuration • localStorage + Backend Storage
          </p>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSettingsOpen(false)}>
          <div 
            className={`${cardBg} rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="w-7 h-7" />
                    LLM Configuration
                  </h2>
                  <p className="text-purple-100 text-sm mt-1">
                    Configure models • Add custom providers • Sync across devices
                  </p>
                </div>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Settings Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              
              {/* Storage Mode Selector */}
              <div className={`${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-6`}>
                <h3 className={`font-bold ${darkMode ? 'text-blue-300' : 'text-blue-900'} mb-3 flex items-center gap-2`}>
                  💾 Storage Mode
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'localStorage', label: 'Browser Only', icon: '🌐' },
                    { value: 'backend', label: 'Server Only', icon: '☁️' },
                    { value: 'both', label: 'Both (Sync)', icon: '🔄' }
                  ].map(mode => (
                    <button
                      key={mode.value}
                      onClick={() => setSyncMode(mode.value)}
                      className={`p-3 rounded-lg border-2 transition ${
                        syncMode === mode.value
                          ? darkMode 
                            ? 'bg-blue-900/30 border-blue-600 text-blue-300' 
                            : 'bg-blue-50 border-blue-500 text-blue-900'
                          : darkMode
                            ? 'bg-gray-700 border-gray-600 text-gray-300'
                            : 'bg-white border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{mode.icon}</div>
                      <div className="text-xs font-medium">{mode.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Selection */}
              <div className="mb-6">
                <h3 className={`text-lg font-bold ${textClass} mb-4`}>Active Model</h3>
                <select
                  value={selectedModel || ''}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} border rounded-lg focus:ring-2 focus:ring-purple-500 text-base`}
                >
                  {providers.length === 0 && customModels.length === 0 && <option>No models available</option>}
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
                      {customModels.map((model, idx) => (
                        <option key={idx} value={model.value}>
                          {model.label} ({model.provider_type})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Temperature Control */}
              <div className="mb-6">
                <label className={`block text-sm font-semibold ${textClass} mb-2`}>
                  Temperature: {temperature.toFixed(2)} {getTemperatureLabel()}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Precise</span>
                  <span>Balanced</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Export/Import Section */}
              {customModels.length > 0 && (
                <div className="mb-6 flex gap-2">
                  <button
                    onClick={exportCustomModels}
                    className={`flex-1 px-4 py-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} border rounded-lg hover:shadow transition flex items-center justify-center gap-2`}
                  >
                    <Download className="w-4 h-4" />
                    Export Models
                  </button>
                  
                  <label className={`flex-1 px-4 py-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} border rounded-lg hover:shadow transition flex items-center justify-center gap-2 cursor-pointer`}>
                    <Upload className="w-4 h-4" />
                    Import Models
                    <input
                      type="file"
                      accept=".json"
                      onChange={importCustomModels}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Add Custom Model Section */}
              <div className={`${darkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'} border rounded-lg p-4 mb-6`}>
                <h3 className={`font-bold ${darkMode ? 'text-purple-300' : 'text-purple-900'} mb-3 flex items-center gap-2`}>
                  <Plus className="w-5 h-5" />
                  Add Custom Model
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
                  Connect to Ollama, custom OpenAI-compatible endpoints, or other LLM providers
                </p>

                {!showCustomForm ? (
                  <button
                    onClick={() => setShowCustomForm(true)}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add New Model
                  </button>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Model Name (e.g., My Llama 2)"
                      value={customForm.name}
                      onChange={(e) => setCustomForm({...customForm, name: e.target.value})}
                      className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} border rounded-lg`}
                    />
                    
                
                    <select
                      value={customForm.provider_type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        // Set appropriate default base URL
                        let defaultUrl = customForm.base_url;
                        if (newType === 'ollama') {
                          defaultUrl = 'http://localhost:11434';
                        } else if (newType === 'google-genai') {
                          defaultUrl = 'https://generativelanguage.googleapis.com';  // Not actually used, but for display
                        }
                        setCustomForm({
                          ...customForm, 
                          provider_type: newType,
                          base_url: defaultUrl
                        });
                      }}
                      className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} border rounded-lg`}
                    >
                      <option value="ollama">🦙 Ollama (Local)</option>
                      <option value="openai-compatible">🔗 OpenAI Compatible</option>
                      <option value="google-genai">🌟 Google Gemini</option>
                      <option value="custom">⚙️ Custom Endpoint</option>
                    </select>
                                        

                    <input
                      type="text"
                      placeholder="Base URL (e.g., http://localhost:11434)"
                      value={customForm.base_url}
                      onChange={(e) => setCustomForm({...customForm, base_url: e.target.value})}
                      className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} border rounded-lg font-mono text-sm`}
                    />

                    <input
                      type="text"
                      placeholder="Model ID (e.g., llama2, mistral)"
                      value={customForm.model_id}
                      onChange={(e) => setCustomForm({...customForm, model_id: e.target.value})}
                      className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} border rounded-lg font-mono text-sm`}
                    />
                    {/* NEW: Context Length Presets */}
                    <div>
                      <label className={`block text-sm font-semibold ${textClass} mb-2`}>
                        Context Length (tokens)
                      </label>
                      <div className="grid grid-cols-5 gap-2 mb-2">
                        {[
                          { label: '4K', value: 4096 },
                          { label: '8K', value: 8192 },
                          { label: '32K', value: 32768 },
                          { label: '64K', value: 65536 },
                          { label: '128K', value: 131072 }
                        ].map(preset => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setCustomForm({...customForm, context_length: preset.value})}
                            className={`px-3 py-2 text-sm rounded-lg border-2 transition ${
                              customForm.context_length === preset.value
                                ? darkMode 
                                  ? 'bg-blue-900/30 border-blue-600 text-blue-300' 
                                  : 'bg-blue-50 border-blue-500 text-blue-900'
                                : darkMode
                                  ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                                  : 'bg-white border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={customForm.context_length}
                        onChange={(e) => setCustomForm({
                          ...customForm, 
                          context_length: parseInt(e.target.value) || 4096
                        })}
                        placeholder="Or enter custom value"
                        min="1024"
                        max="2000000"
                        step="1024"
                        className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} border rounded-lg text-sm`}
                      />
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                        💡 Tip: DeepSeek-v3=64K, GPT-OSS=8K, Gemini=1M+
                      </p>
                    </div>

                    <input
                      type="password"
                      placeholder="API Key (optional for local models)"
                      value={customForm.api_key}
                      onChange={(e) => setCustomForm({...customForm, api_key: e.target.value})}
                      className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} border rounded-lg font-mono text-sm`}
                    />

                    <div className="flex gap-2 pt-2">
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
                            temperature_default: 0.3
                          });
                        }}
                        className={`flex-1 px-4 py-2 ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'} rounded-lg transition`}
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
                              temperature_default: 0.3
                            });
                          }
                        }}
                        disabled={!customForm.name || !customForm.model_id}
                        className="..."
                      >
                        <Save className="w-4 h-4" />
                        Save Model
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Models List */}
              {customModels.length > 0 && (
                <div>
                  <h3 className={`text-lg font-bold ${textClass} mb-3 flex items-center justify-between`}>
                    <span>Your Custom Models</span>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {customModels.length} model{customModels.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {customModels.map((model, idx) => (
                      <div
                        key={idx}
                        className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} border rounded-lg p-3 flex justify-between items-center`}
                      >
                        <div className="flex-1">
                          <div className={`font-medium ${textClass} flex items-center gap-2`}>
                            {model.label}
                            {selectedModel === model.value && (
                              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Active</span>
                            )}
                          </div>
                          {/* <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                            {model.provider_type === 'ollama' && '🦙 '}
                            {model.provider_type === 'openai-compatible' && '🔗 '}
                            {model.provider_type === 'custom' && '⚙️ '}
                            {model.provider_type} • {model.model_id}
                          </div> */}
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1 flex items-center gap-2 flex-wrap`}>
                              <span>
                                {model.provider_type === 'ollama' && '🦙 '}
                                {model.provider_type === 'openai-compatible' && '🔗 '}
                                {model.provider_type === 'google-genai' && '🌟 '}
                                {model.provider_type} • {model.model_id}
                              </span>
                              {/* NEW: Show context length badge */}
                              {model.context_length && (
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  darkMode 
                                    ? 'bg-blue-900/30 text-blue-300' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {model.context_length >= 1000000 
                                    ? `${(model.context_length / 1000000).toFixed(1)}M` 
                                    : `${(model.context_length / 1024).toFixed(0)}K`} ctx
                                </span>
                              )}
                            </div>
                        </div>
                        <button 
                          onClick={() => deleteCustomModel(model.value)}
                          className={`p-2 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded transition`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className={`mt-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                <h4 className={`font-semibold ${textClass} mb-2 flex items-center gap-2`}>
                  <Info className="w-4 h-4" />
                  Quick Setup Guide
                </h4>
                <ul className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} space-y-1`}>
                  <li>• <strong>Ollama:</strong> Install from ollama.ai, run: <code className={`${darkMode ? 'bg-gray-800' : 'bg-gray-200'} px-1 rounded`}>ollama run llama2</code></li>
                  <li>• <strong>OpenAI:</strong> Get API key from platform.openai.com</li>
                  <li>• <strong>Custom:</strong> Any OpenAI-compatible endpoint</li>
                  <li>• <strong>Storage:</strong> Use "Both" mode to sync across devices</li>
                </ul>
              </div>

            </div>

            {/* Modal Footer */}
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} px-6 py-4 border-t flex justify-end`}>
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default ODRLDemo;