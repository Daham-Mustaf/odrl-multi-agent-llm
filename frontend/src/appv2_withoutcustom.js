import React, { useState, useEffect } from 'react';
import { AlertCircle, FileText, Brain, Code, Copy, Download, CheckCircle, Shield, Settings, ChevronDown, ChevronUp, Info, Cloud, Cpu, RefreshCw, Zap, Plus, Trash2, Edit, Upload, Save, X, Check, Moon, Sun, BarChart3, Clock, Activity, ArrowRight, Sparkles, PlayCircle, PauseCircle } from 'lucide-react';

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
  const [settingsTab, setSettingsTab] = useState('quick');
  const [selectedModel, setSelectedModel] = useState(null);
  const [temperature, setTemperature] = useState(0.3);
  
  const [darkMode, setDarkMode] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [autoProgress, setAutoProgress] = useState(true);
  
  // Performance metrics
  const [metrics, setMetrics] = useState({
    parseTime: 0,
    reasonTime: 0,
    generateTime: 0,
    validateTime: 0,
    totalTokens: 0
  });
  
  // Agent states for visual pipeline
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
      text: "Users can use, copy, and modify the software. Distribution requires attribution and must use the same license. Patent claims are granted.",
      icon: "💻"
    },
    { 
      title: "Photo Rights", 
      text: "The photographer grants rights to use the photo on social media with attribution. Print publication requires additional permission.",
      icon: "📸"
    }
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
      validateTime: 0,
      totalTokens: 0
    });
  };

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
                <p className="text-blue-100">Multi-Agent System • Flexible LLM Configuration • Real-time Processing</p>
              </div>
              
              <div className="flex flex-col gap-2 items-end">
                <div className="flex items-center gap-2">
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
                    {providers.length > 0 && (
                      <div className="bg-white/20 px-3 py-1 rounded-full text-xs backdrop-blur">
                        {providers.length} provider(s) • {providers.reduce((acc, p) => acc + p.models.length, 0)} models
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

          {/* Content Area */}
          <div className="p-6">
            
            {/* Parser Tab */}
            {activeTab === 'parser' && (
              <div className="space-y-4">
                {/* Quick Actions */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
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
                  </div>
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

                {/* Example Prompts */}
                <div className={`${darkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'} border rounded-lg p-4`}>
                  <h3 className={`font-semibold ${darkMode ? 'text-purple-300' : 'text-gray-800'} mb-3 flex items-center gap-2`}>
                    <Sparkles className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                    Example Policies (Click to load)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {examples.map((ex, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInputText(ex.text)}
                        className={`text-left p-3 ${darkMode ? 'bg-gray-700 border-purple-700 hover:border-purple-500' : 'bg-white border-purple-200 hover:border-purple-400'} rounded-lg border hover:shadow-md transition`}
                      >
                        <div className={`font-medium text-sm ${darkMode ? 'text-purple-300' : 'text-purple-900'} flex items-center gap-2`}>
                          <span className="text-xl">{ex.icon}</span>
                          {ex.title}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1 line-clamp-2`}>{ex.text}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Area */}
                <div>
                  <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Enter Policy Description
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Describe your policy in natural language...&#10;&#10;Example: Users can read and print the document but cannot modify or distribute it. The policy expires on December 31, 2025."
                    className={`w-full h-40 px-4 py-3 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'} border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none`}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{inputText.length} characters</span>
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
                      Parsing with {selectedModel?.split(':')[1]}...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-5 h-5" />
                      Start Processing
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Parsed Data */}
                {parsedData && (
                  <div className={`p-4 ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border rounded-lg animate-fade-in`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`h-5 w-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                        <h3 className={`font-semibold ${darkMode ? 'text-green-300' : 'text-green-900'}`}>Parsing Complete</h3>
                      </div>
                      {parsedData.model_used && (
                        <span className={`text-xs ${darkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'} px-2 py-1 rounded`}>
                          {parsedData.model_used.split(':')[1]}
                        </span>
                      )}
                    </div>
                    <pre className={`text-sm ${darkMode ? 'bg-gray-800 text-gray-300 border-green-900' : 'bg-white text-gray-700 border-green-200'} p-4 rounded overflow-auto max-h-96 border font-mono`}>
                      {JSON.stringify(parsedData.parsed_data, null, 2)}
                    </pre>
                    <button
                      onClick={() => setActiveTab('reasoner')}
                      className={`mt-3 w-full ${darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2`}
                    >
                      Continue to Reasoner
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Reasoner Tab */}
            {activeTab === 'reasoner' && (
              <div className="space-y-4">
                <div className={`p-4 ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
                  <h3 className={`font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-900'} mb-2 flex items-center gap-2`}>
                    <FileText className="w-5 h-5" />
                    Parsed Data (Input)
                  </h3>
                  <pre className={`text-sm ${darkMode ? 'bg-gray-800 text-gray-300 border-blue-900' : 'bg-white text-gray-700 border-blue-200'} p-4 rounded overflow-auto max-h-60 border font-mono`}>
                    {JSON.stringify(parsedData?.parsed_data, null, 2)}
                  </pre>
                </div>

                <button
                  onClick={handleReason}
                  disabled={loading || !backendConnected}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Reasoning with {selectedModel?.split(':')[1]}...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Apply Reasoning
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {reasoningResult && (
                  <div className={`p-4 ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border rounded-lg animate-fade-in`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`h-5 w-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                        <h3 className={`font-semibold ${darkMode ? 'text-green-300' : 'text-green-900'}`}>Reasoning Complete</h3>
                      </div>
                      {reasoningResult.model_used && (
                        <span className={`text-xs ${darkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'} px-2 py-1 rounded`}>
                          {reasoningResult.model_used.split(':')[1]}
                        </span>
                      )}
                    </div>
                    <pre className={`text-sm ${darkMode ? 'bg-gray-800 text-gray-300 border-green-900' : 'bg-white text-gray-700 border-green-200'} p-4 rounded overflow-auto max-h-96 border font-mono`}>
                      {JSON.stringify(reasoningResult.reasoning_result, null, 2)}
                    </pre>
                    <button
                      onClick={() => setActiveTab('generator')}
                      className={`mt-3 w-full ${darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2`}
                    >
                      Continue to Generator
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Generator Tab */}
            {activeTab === 'generator' && (
              <div className="space-y-4">
                <div className={`p-4 ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
                  <h3 className={`font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-900'} mb-2 flex items-center gap-2`}>
                    <Brain className="w-5 h-5" />
                    Reasoning Result (Input)
                  </h3>
                  <pre className={`text-sm ${darkMode ? 'bg-gray-800 text-gray-300 border-blue-900' : 'bg-white text-gray-700 border-blue-200'} p-4 rounded overflow-auto max-h-60 border font-mono`}>
                    {JSON.stringify(reasoningResult?.reasoning_result, null, 2)}
                  </pre>
                </div>

                {!generatedODRL && (
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !backendConnected}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Generating with {selectedModel?.split(':')[1]}...
                      </>
                    ) : (
                      <>
                        <Code className="w-5 h-5" />
                        Generate ODRL Policy
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}

                {generatedODRL && (
                  <div className={`p-4 ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border rounded-lg animate-fade-in`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`h-5 w-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                        <h3 className={`font-semibold ${darkMode ? 'text-green-300' : 'text-green-900'}`}>ODRL Policy Generated</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {generatedODRL.model_used && (
                          <span className={`text-xs ${darkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'} px-2 py-1 rounded`}>
                            {generatedODRL.model_used.split(':')[1]}
                          </span>
                        )}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(generatedODRL.odrl_policy, null, 2));
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className={`px-3 py-1 ${darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-300 hover:bg-gray-50'} border rounded text-sm transition flex items-center gap-1`}
                        >
                          {copied ? (
                            <>
                              <CheckCircle className={`h-4 w-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
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
                          className={`px-3 py-1 ${darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-300 hover:bg-gray-50'} border rounded text-sm transition flex items-center gap-1`}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                      </div>
                    </div>
                    <pre className={`text-sm ${darkMode ? 'bg-gray-800 text-gray-300 border-green-900' : 'bg-white text-gray-700 border-green-200'} p-4 rounded overflow-auto max-h-96 border font-mono`}>
                      {JSON.stringify(generatedODRL.odrl_policy, null, 2)}
                    </pre>
                    <button
                      onClick={() => setActiveTab('validator')}
                      className={`mt-3 w-full ${darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2`}
                    >
                      Continue to Validator
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Validator Tab */}
            {activeTab === 'validator' && (
              <div className="space-y-4">
                <div className={`p-4 ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
                  <h3 className={`font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-900'} mb-2 flex items-center gap-2`}>
                    <Code className="w-5 h-5" />
                    Generated ODRL Policy
                  </h3>
                  <pre className={`text-sm ${darkMode ? 'bg-gray-800 text-gray-300 border-blue-900' : 'bg-white text-gray-700 border-blue-200'} p-4 rounded overflow-auto max-h-48 border font-mono`}>
                    {JSON.stringify(generatedODRL?.odrl_policy, null, 2)}
                  </pre>
                </div>

                {!validationResult && (
                  <button
                    onClick={() => handleValidate()}
                    disabled={loading || !backendConnected}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-lg font-medium hover:from-orange-700 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
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
                  <div className={`p-6 rounded-lg border-2 animate-fade-in ${
                    validationResult.is_valid 
                      ? darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-400'
                      : darkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-400'
                  }`}>
                    <div className="flex items-center mb-4">
                      {validationResult.is_valid ? (
                        <CheckCircle className={`h-8 w-8 ${darkMode ? 'text-green-400' : 'text-green-600'} mr-3 flex-shrink-0`} />
                      ) : (
                        <AlertCircle className={`h-8 w-8 ${darkMode ? 'text-red-400' : 'text-red-600'} mr-3 flex-shrink-0`} />
                      )}
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold ${
                          validationResult.is_valid 
                            ? darkMode ? 'text-green-300' : 'text-green-900'
                            : darkMode ? 'text-red-300' : 'text-red-900'
                        }`}>
                          {validationResult.is_valid ? '✓ Validation PASSED' : '✗ Validation FAILED'}
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                          SHACL: {validationResult.shacl_valid ? '✓ Valid' : '✗ Invalid'} | 
                          Errors: {validationResult.errors?.length || 0} | 
                          Warnings: {validationResult.warnings?.length || 0}
                        </p>
                      </div>
                    </div>

                    {validationResult.errors && validationResult.errors.length > 0 && (
                      <div className={`mb-4 p-4 ${darkMode ? 'bg-gray-800 border-red-800' : 'bg-white border-red-300'} rounded-lg border`}>
                        <h4 className={`font-semibold ${darkMode ? 'text-red-300' : 'text-red-900'} mb-3 flex items-center gap-2`}>
                          <AlertCircle className="w-5 h-5" />
                          Errors ({validationResult.errors.length})
                        </h4>
                        <ul className="space-y-2">
                          {validationResult.errors.map((err, idx) => (
                            <li key={idx} className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-800'} flex items-start gap-2`}>
                              <span className={darkMode ? 'text-red-400' : 'text-red-500'}>•</span>
                              <span className="flex-1">{err.message || err}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {validationResult.warnings && validationResult.warnings.length > 0 && (
                      <div className={`mb-4 p-4 ${darkMode ? 'bg-gray-800 border-yellow-800' : 'bg-white border-yellow-300'} rounded-lg border`}>
                        <h4 className={`font-semibold ${darkMode ? 'text-yellow-300' : 'text-yellow-900'} mb-3 flex items-center gap-2`}>
                          <Info className="w-5 h-5" />
                          Warnings ({validationResult.warnings.length})
                        </h4>
                        <ul className={`space-y-1 text-sm ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                          {validationResult.warnings.map((warning, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className={darkMode ? 'text-yellow-400' : 'text-yellow-500'}>•</span>
                              <span className="flex-1">{warning.message || warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {validationResult.recommendations && validationResult.recommendations.length > 0 && (
                      <div className={`p-4 ${darkMode ? 'bg-gray-800 border-blue-800' : 'bg-white border-blue-300'} rounded-lg border`}>
                        <h4 className={`font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-900'} mb-3 flex items-center gap-2`}>
                          <Info className="w-5 h-5" />
                          Recommendations
                        </h4>
                        <ul className={`space-y-1 text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                          {validationResult.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className={darkMode ? 'text-blue-400' : 'text-blue-500'}>•</span>
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
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} px-6 py-4 border-t flex justify-between items-center flex-wrap gap-4`}>
            <div className="flex items-center gap-4">
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {parsedData && <span className={darkMode ? 'text-green-400' : 'text-green-600'}>✓ Parsed</span>}
                {reasoningResult && <span className={darkMode ? 'text-green-400' : 'text-green-600'}> → ✓ Reasoned</span>}
                {generatedODRL && <span className={darkMode ? 'text-green-400' : 'text-green-600'}> → ✓ Generated</span>}
                {validationResult && (
                  <span className={validationResult.is_valid 
                    ? darkMode ? 'text-green-400' : 'text-green-600' 
                    : darkMode ? 'text-red-400' : 'text-red-600'}>
                    {validationResult.is_valid ? ' → ✓ Validated' : ' → ✗ Failed'}
                  </span>
                )}
              </div>
              {selectedModel && (
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedModel.split(':')[1]} @ {temperature}
                </div>
              )}
            </div>
            <button
              onClick={resetDemo}
              className={`px-4 py-2 text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'} rounded-lg transition flex items-center gap-2`}
            >
              <RefreshCw className="w-4 h-4" />
              Reset Demo
            </button>
          </div>
        </div>

        {/* Info Footer */}
        <div className={`mt-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p className="font-medium">ODRL Policy Generator • Multi-Agent System</p>
          <p className="mt-1 text-xs">
            {providers.length > 0 && `${providers.length} provider(s) • ${providers.reduce((acc, p) => acc + p.models.length, 0)} models available • `}
            Flexible LLM Configuration
          </p>
        </div>
      </div>
      
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
      `}</style>
    </div>
  );
};

export default ODRLDemo;