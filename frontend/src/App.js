import React, { useState, useEffect, useRef } from 'react';
import { encodingForModel } from 'js-tiktoken';
import { AlertCircle, FileText, Brain, Code, Copy, Download, CheckCircle, Shield, Settings, Info, RefreshCw, Plus, Trash2, Save, X, Moon, Sun, BarChart3, Clock, Activity, ArrowRight, Sparkles, PlayCircle, Upload, Zap, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import DebugPanel from './components/DebugPanel'; 
import { useAbortController } from './hooks/useAbortController';
import { useChatHistory, createHistoryItem } from './hooks/useChatHistory';
import { ChatHistory } from './components/ChatHistory';
import { StopButton } from './components/StopButton';
import { ParserTab } from './components/tabs/ParserTab';
import { ReasonerTab } from './components/tabs/ReasonerTab';
import ExamplePolicies from './components/ExamplePolicies';
import { GeneratorTab } from './components/tabs/GeneratorTab';
import { ValidatorTab } from './components/tabs/ValidatorTab';
import MetricsBar from './components/MetricsBar';

// API Configuration
// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_BASE_URL = 'http://localhost:8000';


// ============================================
// TOAST NOTIFICATION COMPONENT
// ============================================
const Toast = ({ message, type = 'success', onClose }) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const styles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  return (
    <div className={`fixed top-20 right-6 z-50 ${styles[type]} rounded-lg shadow-2xl px-6 py-4 flex items-center gap-3 min-w-[300px] max-w-[500px] animate-slide-in-right`}>
      {icons[type]}
      <span className="flex-1 font-medium">{message}</span>
      <button 
        onClick={onClose}
        className="hover:bg-white/20 rounded p-1 transition"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================
// PROGRESS BAR COMPONENT
// ============================================
const ProgressBar = ({ progress, label, darkMode }) => {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
        </span>
        <span className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          {progress}%
        </span>
      </div>
      <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>
    </div>
  );
};

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
  // Store generation context for regeneration
  const [generationContext, setGenerationContext] = useState(null);
  const { getSignal, abort } = useAbortController();

  // Create abort controller ref for cancellation
  const abortControllerRef = useRef(new AbortController());
  // Reset abort controller when needed
  const resetAbortController = () => {
    abortControllerRef.current = new AbortController();
  };
  const [advancedMode, setAdvancedMode] = useState(false);
  const [agentModels, setAgentModels] = useState({
    parser: null,      
    reasoner: null,
    generator: null,
    validator: null
  });
  const {
  history,
  addToHistory,
  clearHistory
  } = useChatHistory(50);
  const [currentHistoryId, setCurrentHistoryId] = useState(null);
  const [completedStages, setCompletedStages] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [temperature, setTemperature] = useState(0.3);
  
  const [darkMode, setDarkMode] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [autoProgress, setAutoProgress] = useState(false);

  const [validating, setValidating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [attemptNumber, setAttemptNumber] = useState(1);
  
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
    temperature: 0.3
  });
  
  const [syncMode, setSyncMode] = useState('both');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [showExamples, setShowExamples] = useState(false);

  // Toast notification state
  const [toasts, setToasts] = useState([]);
  
  // Processing progress state
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [reasonerLoading, setReasonerLoading] = useState(false);

  // ============================================
  // TOAST NOTIFICATION HELPER
  // ============================================
  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };
  // ============================================
  // HELPER: Get Custom Model Config
  // ============================================
  const getModelConfig = React.useCallback((modelValue) => {
    if (!modelValue) return null;
    
    const customModel = customModels.find(m => m.value === modelValue);
    if (!customModel) return null;
    
    return {
      provider_type: customModel.provider_type,
      base_url: customModel.base_url,
      model_id: customModel.model_id,
      api_key: customModel.api_key,
      context_length: customModel.context_length,
      temperature_default: customModel.temperature_default
    };
  }, [customModels]);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // ============================================
  // INITIALIZATION
  // ============================================

 // Add this with your other useEffect hooks
useEffect(() => {
  const initializeApp = async () => {
    // Load providers first
    await loadProviders();
    
    // Load custom models
    await loadCustomModels();
    
    // Then restore selected model from localStorage
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
      setSelectedModel(savedModel);
      console.log('Restored selected model:', savedModel);
    }
  };
  
  initializeApp();
}, []);


const loadProviders = async () => {
  setLoadingProviders(true);
  setError(null);
  try {
    const response = await fetch(`${API_BASE_URL}/api/available-providers`, { 
      signal: AbortSignal.timeout(5000) 
    });
    
    if (!response.ok) throw new Error('Backend not responding');
    
    const data = await response.json();
    setProviders(data.providers || []);
    setBackendConnected(true);
    showToast('Successfully connected to backend', 'success');
    
    if (data.default_model) {
      setSelectedModel(data.default_model);
    } else if (data.providers && data.providers.length > 0 && data.providers[0].models.length > 0) {
      setSelectedModel(data.providers[0].models[0].value);
    }
  } catch (err) {
    console.error('Provider detection failed:', err);
    setError('Backend not connected. Start: cd backend && uvicorn main:app --reload');
    setBackendConnected(false);
    showToast('Backend connection failed', 'error');
  }
  setLoadingProviders(false);
};

const loadCustomModels = async () => {
  try {
    const localModels = loadFromLocalStorage();
    let backendModels = [];
    
    if (backendConnected) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/custom-models`);
        if (response.ok) {
          const data = await response.json();
          backendModels = data.models || [];
          console.log(`Loaded ${backendModels.length} models from backend`);
        }
      } catch (err) {
        console.log('Backend custom models not available, using localStorage only');
      }
    }
    
    const merged = mergeModels(localModels, backendModels);
    setCustomModels(merged);
    console.log(`Total custom models loaded: ${merged.length}`);
  } catch (err) {
    console.error('Error loading custom models:', err);
    showToast('Failed to load custom models', 'error');
  }
};

const loadFromLocalStorage = () => {
  try {
    const saved = localStorage.getItem('customModels');
    if (saved) {
      const models = JSON.parse(saved);
      console.log(`Loaded ${models.length} models from localStorage`);
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
    console.log(`Saved ${models.length} models to localStorage`);
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }
};

const saveToBackend = async (model) => {
  if (!backendConnected) {
    console.log('Backend not connected');
    return false;
  }
  
  try {
    console.log('📤 Sending to backend:', JSON.stringify(model, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/api/custom-models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(model)
    });
    
    if (response.ok) {
      console.log('✅ Model saved to backend');
      return true;
    } else {
      const error = await response.json();
      console.error('❌ Backend validation error:', JSON.stringify(error, null, 2));
      return false;
    }
  } catch (err) {
    console.error('❌ Error saving to backend:', err);
    return false;
  }
};

const mergeModels = (local, backend) => {
  const map = new Map();
  [...local, ...backend].forEach(model => {
    map.set(model.value, model);
  });
  return Array.from(map.values());
};

const addOrUpdateCustomModel = async (modelData) => {
  console.log('📥 Input modelData:', modelData);
  
  // Prepare model for FRONTEND (with value/label)
  const frontendModel = {
    value: `custom:${modelData.model_id}`,
    label: modelData.name,
    provider_type: modelData.provider_type,
    base_url: modelData.base_url,
    api_key: modelData.api_key,
    model_id: modelData.model_id,
    context_length: modelData.context_length || 4096,
    temperature: modelData.temperature || 0.3
  };
  
  console.log('📤 Prepared for frontend:', frontendModel);
  
  // Update frontend state
  let updated = [...customModels];
  const existingIndex = updated.findIndex(m => m.value === frontendModel.value);
  
  if (existingIndex >= 0) {
    updated[existingIndex] = frontendModel;
  } else {
    updated.push(frontendModel);
  }
  
  setCustomModels(updated);
  
  // Save to localStorage
  if (syncMode === 'localStorage' || syncMode === 'both') {
    saveToLocalStorage(updated);
  }
  
  // Prepare DIFFERENT payload for BACKEND (without value/label)
  if (syncMode === 'backend' || syncMode === 'both') {
    const backendPayload = {
      name: modelData.name,
      provider_type: modelData.provider_type,
      base_url: modelData.base_url,
      model_id: modelData.model_id,
      api_key: modelData.api_key,
      context_length: modelData.context_length || 4096,
      temperature: modelData.temperature || 0.3
    };
    
    console.log('📤 Sending to backend:', backendPayload);
    
    const success = await saveToBackend(backendPayload);
    if (success) {
      showToast(`Model ${existingIndex >= 0 ? 'updated' : 'added'} successfully`, 'success');
    } else {
      showToast('Failed to save to backend', 'error');
    }
  }
  
  console.log(`✅ Model ${existingIndex >= 0 ? 'updated' : 'added'}: ${frontendModel.label}`);
};

const deleteCustomModel = async (modelValue) => {
  try {
    // Normalize to custom: format for deletion
    const modelId = modelValue.split(':').slice(1).join(':');
    const customValue = `custom:${modelId}`;
    
    console.log('🗑️ Deleting:', customValue);
    
    // Delete from state
    const updated = customModels.filter(m => m.value !== modelValue);
    setCustomModels(updated);
    
    // Delete from localStorage
    if (syncMode === 'localStorage' || syncMode === 'both') {
      saveToLocalStorage(updated);
    }
    
    // Delete from backend
    if (syncMode === 'backend' || syncMode === 'both') {
      const response = await fetch(`${API_BASE_URL}/api/custom-models/${encodeURIComponent(customValue)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log('✅ Deleted from backend');
        showToast('Model deleted successfully', 'success');
      } else {
        const error = await response.json();
        console.error('❌ Delete failed:', error);
        showToast('Failed to delete from backend', 'error');
      }
    }
  } catch (err) {
    console.error('❌ Delete error:', err);
    showToast('Failed to delete model', 'error');
  }
};

  const countTokens = (text) => {
    try {
      const encoder = encodingForModel('gpt-4');
      const tokens = encoder.encode(text);
      encoder.free();
      return tokens.length;
    } catch {
      return Math.ceil(text.length / 4);
    }
  };

  const callAPI = async (endpoint, body, signal = null) => {
  try {
    // ✅ ADD /api/ prefix if not already present
    const url = endpoint.startsWith('/api/') 
      ? `${API_BASE_URL}${endpoint}` 
      : `${API_BASE_URL}/api/${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal  
    });
    
    if (response.status === 499) {
      throw new Error('Request cancelled by user');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API request failed: ${response.statusText}`);
    }
    
    return await response.json();
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request cancelled by user');
    }
    
    if (error.message === 'Failed to fetch') {
      throw new Error('Network error - check if backend is running');
    }
    
    throw error;
  }
};

  const updateAgentState = (agent, state) => {
    setAgentStates(prev => ({ ...prev, [agent]: state }));
  };
 // ============================================
// MAIN PIPELINE FUNCTION
// ============================================
const handleProcess = async () => {
  if (!inputText.trim()) {
    setError('Please enter a policy description');
    showToast('Please enter a policy description', 'warning');
    return;
  }

  // Reset states
  setLoading(true);
  setError(null);
  setAttemptNumber(1);
  setProcessingProgress(0);
  setProcessingStage('Starting process...');
  setParsedData(null);
  setReasoningResult(null);
  setGeneratedODRL(null);
  setValidationResult(null);

  const startTimes = { 
    total: Date.now(),
    parse: Date.now(), 
    reason: 0,
    generate: 0,
    validate: 0
  };

  const signal = getSignal();
  const completedStages = [];

  try {
    // ============================================
    // STAGE 1: PARSE
    // ============================================
    updateAgentState('parser', 'processing');
    setProcessingStage('Parsing policy text...');
    setProcessingProgress(10);

    const parserModel = advancedMode && agentModels.parser ? agentModels.parser : selectedModel;
    const parserCustomConfig = getModelConfig(parserModel);
    console.log('[DEBUG] Parse request:', {
      text: inputText.substring(0, 50) + '...',
      model: parserModel,
      temperature,
      custom_model: parserCustomConfig
    });

    const parseResult = await callAPI('parse', {
      text: inputText,
      model: parserModel,
      temperature,
      custom_model: parserCustomConfig
    }, signal);

    setParsedData(parseResult);
    setMetrics(prev => ({ ...prev, parseTime: Date.now() - startTimes.parse }));
    updateAgentState('parser', 'completed');
    completedStages.push('parser');
    setProcessingProgress(25);
    showToast('Policy parsed successfully!', 'success');

    startTimes.reason = Date.now();

    // ============================================
    // STAGE 2: REASON
    // ============================================
    updateAgentState('reasoner', 'processing');
    setProcessingStage('Analyzing policy...');
    setProcessingProgress(35);

    const reasonerModel = advancedMode && agentModels.reasoner ? agentModels.reasoner : selectedModel;
    const reasonerCustomConfig = getModelConfig(reasonerModel);

    const reasonResult = await callAPI('reason', {
      parsed_data: parseResult,
      original_text: inputText,
      model: reasonerModel,
      temperature,
      custom_model: reasonerCustomConfig
    }, signal);

    setReasoningResult(reasonResult);
    setMetrics(prev => ({ ...prev, reasonTime: Date.now() - startTimes.reason }));
    updateAgentState('reasoner', 'completed');
    completedStages.push('reasoner');
    setProcessingProgress(50);
    showToast('Analysis complete!', 'success');

    // ============================================
    // CHECKPOINT: Should we continue automatically?
    // ============================================
    if (!autoProgress) {
      console.log('[App] Manual mode - pausing at Reasoner checkpoint');
      setActiveTab('reasoner');
      setLoading(false);
      setProcessingProgress(0);
      setProcessingStage('');

      const totalTime = Date.now() - startTimes.total;
      const historyItem = createHistoryItem({
        inputText,
        selectedModel,
        temperature,
        completedStages,
        parsedData: parseResult,
        reasoningResult: reasonResult,
        totalTime,
        metrics: {
          parseTime: Date.now() - startTimes.parse,
          reasonTime: Date.now() - startTimes.reason
        },
        status: 'paused_at_reasoner'
      });

      addToHistory(historyItem);
      setCurrentHistoryId(historyItem.id);
      showToast('Review analysis and click Continue to generate ODRL', 'info');
      return; // STOP HERE in manual mode
    }

    // ============================================
    // AUTO-PROGRESS MODE: CONTINUE
    // ============================================
    console.log('[App] Auto-progress mode - continuing to Generator');
    startTimes.generate = Date.now();

    // ============================================
    // STAGE 3: GENERATE
    // ============================================
    updateAgentState('generator', 'processing');
    setProcessingStage('Generating ODRL policy...');
    setProcessingProgress(65);

    const generatorModel = advancedMode && agentModels.generator ? agentModels.generator : selectedModel;
    const generatorCustomConfig = getModelConfig(generatorModel);

    console.log('[Generator] Using model:', generatorModel);
    console.log('[Generator] Custom config:', generatorCustomConfig ? 'YES' : 'NO');

    const genResult = await callAPI('generate', {
      parsed_data: parseResult,
      original_text: inputText,
      reasoning: reasonResult,
      model: generatorModel,
      temperature,
      custom_config: generatorCustomConfig
    }, signal);

    setGeneratedODRL(genResult);
    setGenerationContext({
      parsed_data: parseResult,
      original_text: inputText,
      reasoning: reasonResult
    });
    setMetrics(prev => ({ ...prev, generateTime: Date.now() - startTimes.generate }));
    updateAgentState('generator', 'completed');
    completedStages.push('generator');
    setProcessingProgress(80);
    showToast('ODRL policy generated!', 'success');

    startTimes.validate = Date.now();

    // ============================================
    // STAGE 4: VALIDATE
    // ============================================
    updateAgentState('validator', 'processing');
    setProcessingStage('Validating with SHACL...');
    setProcessingProgress(90);

    const validatorModel = advancedMode && agentModels.validator ? agentModels.validator : selectedModel;
    const validatorCustomConfig = getModelConfig(validatorModel);

    // Ensure Turtle output exists
    if (!genResult.odrl_turtle) {
      throw new Error('Generator did not return odrl_turtle format');
    }
    // ebug logs
    console.log('[Validator] Validating Turtle policy');
    console.log('[Validator]  Length:', genResult.odrl_turtle.length, 'characters');
    console.log('[Validator] Model:', validatorModel);
    console.log('[Validator] Has custom config?', !!validatorCustomConfig);


    const valResult = await callAPI('validate', {
      odrl_turtle: genResult.odrl_turtle,
      original_text: inputText,
      model: validatorModel,
      temperature,
      custom_config: validatorCustomConfig
    }, signal);

    setValidationResult(valResult);
    setMetrics(prev => ({ ...prev, validateTime: Date.now() - startTimes.validate }));
    updateAgentState('validator', 'completed');
    completedStages.push('validator');
    setProcessingProgress(100);

    if (valResult.is_valid) {
      showToast('Complete! All validations passed!', 'success');
    } else {
      showToast(`Complete! ${valResult.issues?.length || 0} SHACL violations found`, 'warning');
    }

    setActiveTab('validator');

    // ============================================
    // SAVE HISTORY
    // ============================================
    const totalTime = Date.now() - startTimes.total;
    const historyItem = createHistoryItem({
      inputText,
      selectedModel,
      temperature,
      completedStages,
      parsedData: parseResult,
      reasoningResult: reasonResult,
      generatedODRL: genResult,
      validationResult: valResult,
      totalTime,
      metrics: {
        parseTime: Date.now() - startTimes.parse,
        reasonTime: Date.now() - startTimes.reason,
        generateTime: Date.now() - startTimes.generate,
        validateTime: Date.now() - startTimes.validate
      },
      status: 'completed'
    });

    const historyId = addToHistory(historyItem);
    setCurrentHistoryId(historyId);

  } catch (err) {
    const errorMessage =
      (err instanceof Error ? err.message : null) ||
      (typeof err === 'string' ? err : null) ||
      err?.message ||
      err?.detail ||
      'An error occurred';

    if (errorMessage === 'Request cancelled by user') {
      setError(null);
      showToast('Processing cancelled', 'warning');

      Object.keys(agentStates).forEach(agent => {
        if (agentStates[agent] === 'processing') {
          updateAgentState(agent, 'cancelled');
        }
      });
    } else {
      setError(errorMessage);
      showToast(`Error: ${errorMessage}`, 'error');

      Object.keys(agentStates).forEach(agent => {
        if (agentStates[agent] === 'processing') {
          updateAgentState(agent, 'error');
        }
      });
    }

    const historyItem = createHistoryItem({
      inputText,
      selectedModel,
      temperature,
      completedStages,
      error: errorMessage,
      status: errorMessage === 'Request cancelled by user' ? 'cancelled' : 'failed',
      totalTime: Date.now() - startTimes.total
    });
    addToHistory(historyItem);

  } finally {
    setLoading(false);
    setProcessingProgress(0);
    setProcessingStage('');
  }
};

// ============================================
// handleGenerate Function
// ============================================
const handleGenerate = async () => {
  if (!reasoningResult) {
    showToast('Please run analysis first!', 'warning');
    return;
  }

  if (!parsedData) {
    showToast('Parser data missing - please run parsing again', 'error');
    return;
  }

  setLoading(true);
  setProcessingStage('Generating ODRL policy...');
  setProcessingProgress(50);
  setGeneratedODRL(null);
  setValidationResult(null);

  const startTime = Date.now();
  const signal = abortControllerRef.current.signal;
  try {
    // Update generator agent state
    updateAgentState('generator', 'processing');

    const generatorModel = advancedMode && agentModels.generator
      ? agentModels.generator
      : selectedModel;

    const generatorCustomConfig = getModelConfig(generatorModel?.value);

    // Call backend API
    console.log('[Generator] Sending generate request...');
    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parsed_data: parsedData,
        original_text: inputText,
        reasoning: reasoningResult,
        attempt_number: 1,
        model: generatorModel?.id || null,
        temperature,
        custom_config: generatorCustomConfig
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.status}`);
    }

    const genResult = await response.json();
    console.log('[Generator] Generation complete');

    // Save generated ODRL
    setGeneratedODRL(genResult);

    // Store context for regeneration
    setGenerationContext({
      parsed_data: parsedData,
      original_text: inputText,
      reasoning: reasoningResult
    });

    // Update metrics & agent state
    setMetrics(prev => ({ ...prev, generateTime: Date.now() - startTime }));
    updateAgentState('generator', 'completed');

    // Update progress & notify
    setProcessingProgress(100);
    showToast('ODRL policy generated!', 'success');

    // Switch to generator tab
    setActiveTab('generator');

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[Generator] Generation cancelled');
      showToast('Generation cancelled', 'info');
    } else {
      console.error('[Generator] Error:', error);
      showToast('Generation failed: ' + error.message, 'error');
      updateAgentState('generator', 'error');
    }
  } finally {
    setLoading(false);
    setProcessingProgress(0);
    setProcessingStage('');
  }
};
// ============================================
// handleValidate Function
// ============================================
const handleValidate = async () => {
  if (!generatedODRL) {
    showToast('Please generate ODRL first!', 'warning');
    return;
  }
  
  // Check if Turtle exists
  if (!generatedODRL.odrl_turtle) {
    showToast('Generated ODRL missing Turtle format!', 'error');
    console.error('[Validator] Generated ODRL:', generatedODRL);
    return;
  }
  
  setValidating(true);
  setProcessingStage('Validating ODRL...');
  setProcessingProgress(90);
  
  const startTime = Date.now();
  const signal = getSignal();
  
  const getModelConfig = (modelValue) => {
    if (!modelValue) return null;
    const customModel = customModels.find(m => m.value === modelValue);
    if (!customModel) return null;
    return {
      provider_type: customModel.provider_type,
      base_url: customModel.base_url,
      model_id: customModel.model_id,
      api_key: customModel.api_key,
      context_length: customModel.context_length,
      temperature_default: customModel.temperature_default
    };
  };
  
  try {
    updateAgentState('validator', 'processing');
    
    const validatorModel = advancedMode && agentModels.validator ? agentModels.validator : selectedModel;
    const validatorCustomConfig = getModelConfig(validatorModel);
    
    console.log('[Validator] Manual validation starting...');
    console.log('[Validator] Turtle length:', generatedODRL.odrl_turtle.length, 'chars');
    console.log('[Validator] Model:', validatorModel);
    console.log('[Validator] Has custom config?', !!validatorCustomConfig);
    if (validatorCustomConfig) {
      console.log('[Validator] Config preview:', {
        provider: validatorCustomConfig.provider_type,
        model: validatorCustomConfig.model_id,
        url: validatorCustomConfig.base_url
      });
    }
    
    const valResult = await callAPI('validate', {
      odrl_turtle: generatedODRL.odrl_turtle,
      original_text: inputText,
      model: validatorModel,
      temperature,
      custom_config: validatorCustomConfig 
    }, signal);
    
    setValidationResult(valResult);
    setMetrics(prev => ({ ...prev, validateTime: Date.now() - startTime }));
    updateAgentState('validator', 'completed');
    setProcessingProgress(100);
    
    // Switch to validator tab
    setActiveTab('validator');
    
    if (valResult.is_valid) {
      showToast('SHACL validation passed!', 'success');
    } else {
      showToast(`${valResult.issues?.length || 0} SHACL violations found`, 'warning');
    }
    
  } catch (error) {
    console.error('[Validator] Error:', error);
    showToast('Validation failed: ' + error.message, 'error');
    updateAgentState('validator', 'error');
  } finally {
    setValidating(false);
    setProcessingProgress(0);
    setProcessingStage('');
  }
};
// ============================================
// handleRegenerate Function
// ============================================
const handleRegenerate = async () => {
  if (!validationResult || !generatedODRL || !generationContext) {
    showToast('Missing context for regeneration', 'error');
    return;
  }

  setRegenerating(true);
  setValidationResult(null);
  setProcessingStage(`Regenerating ODRL (attempt ${(generatedODRL.attempt_number || 1) + 1})...`);
  setProcessingProgress(50);
   const getModelConfig = (modelValue) => {
    if (!modelValue) return null;
    const customModel = customModels.find(m => m.value === modelValue);
    if (!customModel) return null;
    return {
      provider_type: customModel.provider_type,
      base_url: customModel.base_url,
      model_id: customModel.model_id,
      api_key: customModel.api_key,
      context_length: customModel.context_length,
      temperature_default: customModel.temperature_default
    };
  };

  try {
    console.log('[Generator] Regenerating ODRL with validation fixes...');
    console.log('[Generator] Context preview:', {
      original_text: generationContext.original_text?.substring(0, 50) + '...',
      has_parsed_data: !!generationContext.parsed_data,
      has_reasoning: !!generationContext.reasoning,
      validation_issues: validationResult.issues?.length
    });

    // Get model config
    const regenerateModel = advancedMode && agentModels.generator ? agentModels.generator : selectedModel;
    const regenerateCustomConfig = getModelConfig(regenerateModel);

    console.log('[Regenerate] Model:', regenerateModel);
    console.log('[Regenerate] Has custom config?', !!regenerateCustomConfig);

    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parsed_data: generationContext.parsed_data,
        original_text: generationContext.original_text,
        reasoning: generationContext.reasoning,
        validation_errors: validationResult,
        previous_odrl: generatedODRL.odrl_turtle,
        attempt_number: (generatedODRL.attempt_number || 1) + 1,
        model: regenerateModel,
        temperature,
        custom_config: regenerateCustomConfig  
      }),
      signal: abortControllerRef.current.signal
    });

    if (!response.ok) {
      throw new Error(`Regeneration failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Generator] Regeneration complete');
    console.log('[Generator] Attempt number:', data.attempt_number);

    // Update state
    setGeneratedODRL(data);
    setActiveTab('generator');
    showToast(`Regenerated ODRL (attempt ${data.attempt_number})`, 'success');

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[Generator] Regeneration cancelled');
      showToast('Regeneration cancelled', 'info');
    } else {
      console.error('[Generator] Regeneration error:', error);
      showToast('Regeneration failed: ' + error.message, 'error');
    }
  } finally {
    setRegenerating(false);
    setProcessingProgress(0);
    setProcessingStage('');
  }
};

// ============================================
// handleEditFromValidator Function (NEW)
// ============================================
const handleEditFromValidator = () => {
  console.log('[App] User wants to edit input from validator');
  setActiveTab('parser');
  setAttemptNumber(1); // Reset attempt counter
  showToast('Edit your input and click "Start Processing" to regenerate', 'info');
};

// ============================================
// handleStop Function
// ============================================
const handleStop = () => {
  console.log('Stop button clicked - cancelling operations');
  
  // Abort current request
  abortControllerRef.current.abort();
  // Create new controller for next request
  resetAbortController();
  
  // Reset loading state
  setLoading(false);
  setProcessingProgress(0);
  setProcessingStage('');
  
  // Mark processing agents as cancelled
  Object.keys(agentStates).forEach(agent => {
    if (agentStates[agent] === 'processing') {
      updateAgentState(agent, 'cancelled');
    }
  });
  
  showToast('Processing stopped', 'info'); 
};

// ============================================
// handleLoadHistory Function
// ============================================
const handleLoadHistory = (historyItem) => {
  console.log('Loading history item:', historyItem.id);

  // Restore input
  setInputText(historyItem.inputText);
  setSelectedModel(historyItem.model || selectedModel);
  setTemperature(historyItem.temperature || 0.3);

  // Restore results if available
  if (historyItem.parsedData) {
    setParsedData(historyItem.parsedData);
    updateAgentState('parser', 'completed');
  }
  if (historyItem.reasoningResult) {
    setReasoningResult(historyItem.reasoningResult);
    updateAgentState('reasoner', 'completed');
  }
  if (historyItem.generatedODRL) {
    setGeneratedODRL(historyItem.generatedODRL);
    updateAgentState('generator', 'completed');
  }
  if (historyItem.validationResult) {
    setValidationResult(historyItem.validationResult);
    updateAgentState('validator', 'completed');
  }

  // Restore metrics
  if (historyItem.metrics) {
    setMetrics(historyItem.metrics);
  }

  // Set active tab to first completed stage or parser
  if (historyItem.completedStages && historyItem.completedStages.length > 0) {
    setActiveTab(historyItem.completedStages[0]);
  }

  setCurrentHistoryId(historyItem.id);
  showToast('History loaded successfully', 'success');
};

  const handleFileUpload = async (file) => {
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadStatus({ type: 'error', message: 'File too large (max 5MB)' });
      return;
    }

    const allowedTypes = ['text/plain', 'text/markdown', 'application/json'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|json)$/i)) {
      setUploadStatus({ type: 'error', message: 'Invalid file type. Use .txt, .md, or .json' });
      return;
    }

    try {
      const text = await file.text();
      setInputText(text);
      setFileName(file.name);
      setUploadStatus({ type: 'success', message: `Loaded ${file.name}` });
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      setUploadStatus({ type: 'error', message: 'Failed to read file' });
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success');
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
    setFileName('');
  };

  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50';
  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  const getAgentIcon = (agent) => {
    const icons = {
      parser: FileText,
      reasoner: Brain,
      generator: Code,
      validator: Shield
    };
    return icons[agent] || FileText;
  };
  // ============================================
  // handleUpdateODRL Function 
  // ============================================
const handleUpdateODRL = (updatedODRL, isTurtle = false) => {
  if (isTurtle) {
    console.log('[App] User updated ODRL Turtle manually');

    // Update Turtle string
    setGeneratedODRL({
      ...generatedODRL,
      odrl_turtle: updatedODRL
    });
  } else {
    console.log('[App] User updated ODRL JSON-LD manually');

    // Update JSON-LD objects
    setGeneratedODRL({
      ...generatedODRL,
      odrl_policy: updatedODRL,
      odrl: updatedODRL
    });
  }

  // Clear previous validation result
  setValidationResult(null);

  showToast('ODRL updated. Please validate the changes.', 'info');
};
  // ============================================
  // RENDER UI
  // ============================================

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
      
      {/* Toast Notifications */}
      <div className="fixed top-20 right-6 z-50 space-y-3">
        {toasts.map(toast => (
          <Toast 
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* IMPROVED HEADER */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent`}>
                  ODRL Policy Generator
                </h1>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Transform Text to Policies</span>
                  {' • '}
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">Multi-Model AI</span>
                  {' • '}
                  <span className="text-purple-600 dark:text-purple-400 font-medium">Instant Validation</span>
                </p>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
              {/* Backend Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm ${
                backendConnected 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                  : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
              }`}>
                <div className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-white' : 'bg-white'} animate-pulse`} />
                <span className="text-xs font-semibold">
                  {backendConnected ? 'Backend Connected' : 'Backend Offline'}
                </span>
              </div>

              {/* Model Info in Header */}
            {backendConnected && selectedModel && (
              <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                {/* Show custom model label if it's a custom model */}
                {customModels.find(m => m.value === selectedModel)?.label ||
                providers.flatMap(p => p.models).find(m => m.value === selectedModel)?.label ||
                'Unknown Model'}
              </div>
            )}

              {/* Settings Button */}
              <button
                onClick={() => setSettingsOpen(true)}
                aria-label="Open settings"
                className={`p-2 rounded-lg transition ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
                title="Settings"
              >
                <Settings className={`w-5 h-5 ${mutedTextClass}`} />
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className={`p-2 rounded-lg transition ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
                title={darkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>

              {/* Metrics Toggle */}
              <button
                onClick={() => setShowMetrics(!showMetrics)}
                className={`p-2 rounded-lg transition ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
                title="Toggle Metrics"
              >
                <BarChart3 className={`w-5 h-5 ${mutedTextClass}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      
      {/* Processing Progress Bar */}
      {loading && processingProgress > 0 && (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="max-w-7xl mx-auto">
            <ProgressBar 
              progress={processingProgress} 
              label={processingStage} 
              darkMode={darkMode}
            />
          </div>
        </div>
      )}

      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {['parser', 'reasoner', 'generator', 'validator'].map((agent, idx) => {
              const Icon = getAgentIcon(agent);
              const isActive = activeTab === agent;
              const state = agentStates[agent];
              
              // Define unique colors for each agent
              const agentColors = {
                parser: {
                  bg: 'from-blue-500 to-cyan-500',
                  bgLight: darkMode ? 'bg-blue-900/30' : 'bg-blue-50',
                  text: 'text-blue-600 dark:text-blue-400',
                  border: 'border-blue-500',
                  icon: 'text-blue-500'
                },
                reasoner: {
                  bg: 'from-purple-500 to-pink-500',
                  bgLight: darkMode ? 'bg-purple-900/30' : 'bg-purple-50',
                  text: 'text-purple-600 dark:text-purple-400',
                  border: 'border-purple-500',
                  icon: 'text-purple-500'
                },
                generator: {
                  bg: 'from-green-500 to-emerald-500',
                  bgLight: darkMode ? 'bg-green-900/30' : 'bg-green-50',
                  text: 'text-green-600 dark:text-green-400',
                  border: 'border-green-500',
                  icon: 'text-green-500'
                },
                validator: {
                  bg: 'from-orange-500 to-red-500',
                  bgLight: darkMode ? 'bg-orange-900/30' : 'bg-orange-50',
                  text: 'text-orange-600 dark:text-orange-400',
                  border: 'border-orange-500',
                  icon: 'text-orange-500'
                }
              };

              const colors = agentColors[agent];
              
              return (
                <React.Fragment key={agent}>
                  <button
                    onClick={() => setActiveTab(agent)}
                    className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg transition border-2 ${
                      isActive 
                        ? `${colors.bgLight} ${colors.border}` 
                        : darkMode ? 'hover:bg-gray-700/50 border-transparent' : 'hover:bg-gray-50 border-transparent'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      state === 'completed' ? `bg-gradient-to-r ${colors.bg} shadow-lg` :
                      state === 'processing' ? `bg-gradient-to-r ${colors.bg} animate-pulse shadow-lg` :
                      state === 'error' ? 'bg-red-500/20' :
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        state === 'completed' || state === 'processing' ? 'text-white' : 
                        state === 'error' ? 'text-red-500' :
                        colors.icon
                      }`} />
                    </div>
                    <div className="text-left">
                      <div className={`font-semibold text-sm ${isActive ? colors.text : textClass}`}>
                        {idx + 1}. {agent.charAt(0).toUpperCase() + agent.slice(1)}
                      </div>
                      {showMetrics && metrics[`${agent === 'generator' ? 'generate' : agent === 'reasoner' ? 'reason' : agent === 'validator' ? 'validate' : 'parse'}Time`] > 0 && (
                        <div className={`text-xs flex items-center gap-1 ${isActive ? colors.text : mutedTextClass}`}>
                          <Clock className="w-3 h-3" />
                          {(metrics[`${agent === 'generator' ? 'generate' : agent === 'reasoner' ? 'reason' : agent === 'validator' ? 'validate' : 'parse'}Time`] / 1000).toFixed(2)}s
                        </div>
                      )}
                    </div>
                  </button>
                  {idx < 3 && (
                    <ArrowRight className={`w-5 h-5 mx-2 ${mutedTextClass}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'parser' && (
          <div className="space-y-6 animate-fade-in">
            {/* INPUT SECTION */}
            <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className={`text-lg font-bold ${textClass} flex items-center gap-2`}>
                  <FileText className="w-5 h-5" />
                  Enter Policy Description
                </h2>
              </div>

                <div className="p-6 space-y-4">
                  {/* Example Cards - Using Component */}
                  {!inputText && (
                    <ExamplePolicies
                      onSelectExample={(text) => setInputText(text)}
                      darkMode={darkMode}
                      textClass={textClass}
                      mutedTextClass={mutedTextClass}
                    />
                  )}
                {/* Drag and Drop Text Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative rounded-lg border-2 border-dashed transition-all ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : darkMode
                      ? 'border-gray-600 hover:border-gray-500'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Describe your policy in natural language... 

Example: Users can read and print the document but cannot modify or distribute it. The policy expires on December 31, 2025.

Or drag and drop a .txt, .md, or .json file here"
                    className={`w-full h-64 px-4 py-3 bg-transparent rounded-lg resize-none focus:outline-none ${textClass}`}
                    disabled={loading}
                  />
                  {dragActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm rounded-lg pointer-events-none">
                      <div className="text-center">
                        <Upload className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                        <p className={`font-medium ${textClass}`}>Drop your file here</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* File Info and Upload Options */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition ${
                      darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                    }`}>
                      <Upload className="w-4 h-4" />
                      <span className="text-sm font-medium">Choose File</span>
                      <input
                        type="file"
                        aria-label="Upload policy file"
                        accept=".txt,.md,.json"
                        onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                    {fileName && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{fileName}</span>
                      </div>
                    )}
                  </div>
                  <div className={`text-sm ${mutedTextClass}`}>
                    {countTokens(inputText)} tokens • Max 5MB
                  </div>
                </div>

                {/* Upload Status */}
                {uploadStatus && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    uploadStatus.type === 'success' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {uploadStatus.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span className="text-sm">{uploadStatus.message}</span>
                  </div>
                )}
{/* ============================================ */}
{/* ADVANCED SETTINGS - COLLAPSIBLE SECTION */}
{/* ============================================ */}
<div
  className={`rounded-lg border ${
    advancedMode
      ? darkMode
        ? 'border-green-600 bg-green-900/10'
        : 'border-green-500 bg-green-50'
      : darkMode
        ? 'border-gray-700'
        : 'border-gray-200'
  }`}
>
  <button
    onClick={() => setAdvancedMode(!advancedMode)}
    className={`w-full px-4 py-3 flex items-center justify-between transition ${
      darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
    }`}
  >
    <div className="flex items-center gap-2">
      <Settings className={`w-4 h-4 ${advancedMode ? 'text-green-500' : ''}`} />
      <span className={`text-sm font-medium ${textClass}`}>
        Advanced Settings
      </span>
      <span
        className={`text-xs px-2 py-0.5 rounded ${
          advancedMode
            ? 'bg-green-500 text-white'
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

  {/* Expanded content */}
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
          <strong>Pro Tip:</strong> Use faster models for parsing/validation
          and powerful models for reasoning/generation.
        </p>
      </div>

      {/* Agent model selectors */}
      {['parser', 'reasoner', 'generator', 'validator'].map((agent) => (
        <div key={agent}>
          <label
            className={`block text-sm font-medium mb-2 ${textClass} capitalize`}
          >
            {agent} Model
          </label>

          <select
            value={agentModels[agent] || ''}
            onChange={(e) =>
              setAgentModels({
                ...agentModels,
                [agent]: e.target.value || null,
              })
            }
            className={`w-full px-3 py-2 ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300'
            } border rounded-lg text-sm`}
          >
            {/* Default Option */}
            <option value="">
              Use default (
              {selectedModel
                ? providers
                    .flatMap((p) => p.models)
                    .find((m) => m.value === selectedModel)?.label ||
                  customModels.find((m) => m.value === selectedModel)?.label ||
                  'llama3.3'
                : 'llama3.3'}
              )
            </option>

            {/* Default Provider Models */}
            {providers.length > 0 && (
              <optgroup label="━━ Available Providers ━━">
                {providers.flatMap((p) => p.models).map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </optgroup>
            )}

            {/* Custom Models */}
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
  )}
</div>


                {/* Auto-progress Setting - Moved to bottom */}
                <div className="flex items-center justify-between pt-2">
                  <label className={`flex items-center gap-2 cursor-pointer ${autoProgress ? 'text-green-600 dark:text-green-400 font-medium' : ''}`}>
                    <input
                      type="checkbox"
                      checked={autoProgress}
                      aria-label="Toggle automatic progression through stages"
                      onChange={(e) => setAutoProgress(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className={`text-sm ${textClass}`}>Auto-progress through agents</span>
                    {autoProgress && (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-500 text-white">ON</span>
                    )}
                  </label>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 dark:text-red-200">Error</p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleProcess}
                    disabled={loading || !inputText.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-500/30"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-5 h-5" />
                        Start Processing
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetDemo}
                    className={`px-6 py-3 rounded-lg font-medium transition ${
                      darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
            {/* Model Info Footer */}
            <div className={`flex items-center justify-between ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <div className="flex items-center gap-4 text-sm">
                <span>Model: {selectedModel ? providers.flatMap(p => p.models).find(m => m.value === selectedModel)?.label || 'llama3.3' : 'llama3.3'}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetDemo}
                  className={`text-sm hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Reset Demo
                </button>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  API Docs
                </a>
              </div>
            </div>

            {/* Subtitle Footer */}
            <div className={`text-center text-xs ${mutedTextClass} pt-2`}>
              <p>ODRL Policy Generator • Multi-Agent System</p>
              <p>Flexible LLM Configuration • localStorage + Backend Storage</p>
            </div>
          </div>
        )}

   {/* Reasoner Tab - Shows results automatically after parsing */}
{activeTab === 'reasoner' && (
  <div className="space-y-6 animate-fade-in">
    
    {!reasoningResult ? (
      // No results yet - show placeholder
      <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${textClass}`}>Step 2: Policy Analysis</h2>
          <p className={`text-sm ${mutedTextClass} mt-1`}>
            Review policy validation results
          </p>
        </div>
        <div className={`p-12 text-center ${mutedTextClass}`}>
          <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Please parse text first</p>
          <p className="text-sm mt-2">Go to Parser tab and click "Start Processing"</p>
        </div>
      </div>
    ) : (
      // Show reasoning results
      <>
        <ReasonerTab
          reasoningResult={reasoningResult}
          darkMode={darkMode}
          onCopy={copyToClipboard}
          onDownload={downloadJSON}
          onContinue={() => {
            console.log('[App] User approved - continuing to Generator');
            handleGenerate();
          }}
          onEdit={() => {
            console.log('[App] User wants to edit - returning to Parser');
            setActiveTab('parser');
            showToast('Edit your policy text and click "Start Processing" again', 'info');
          }}
        />

        {/* Footer */}
        <div className={`flex items-center justify-between text-sm ${mutedTextClass}`}>
          <span>Reasoner: Validation & Conflict Detection</span>
          <span>
            {reasoningResult.processing_time_ms}ms • {reasoningResult.model_used}
          </span>
        </div>
      </>
    )}
  </div>
)}

        {/* Generator Tab */}
    {activeTab === 'generator' && (
      <GeneratorTab
        generatedODRL={generatedODRL}
        darkMode={darkMode}
        onCopy={copyToClipboard}
        onDownload={downloadJSON}
        onValidate={handleValidate}
        onUpdateODRL={handleUpdateODRL} 
        isValidating={validating}
        showToast={showToast}
      />
    )}

{/* Validator Tab */}
{activeTab === 'validator' && (
  <ValidatorTab
    validationResult={validationResult}
    generatedODRL={generatedODRL}
    darkMode={darkMode}
    onCopy={copyToClipboard}
    onDownload={downloadJSON}
    onRegenerate={handleRegenerate}        
    onEditInput={handleEditFromValidator}   
    isRegenerating={regenerating}  
    originalText={inputText}  
         
  />
)}   
      </div>

     {/* SETTINGS MODAL*/}
{settingsOpen && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto`}>
      <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10`}>
        <h2 className={`text-xl font-bold ${textClass} flex items-center gap-2`}>
          <Settings className="w-5 h-5" />
          Settings & Configuration
        </h2>
        <button
          onClick={() => setSettingsOpen(false)}
          className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Model Selection - UPDATED */}
        <div>
          <h3 className={`text-lg font-bold ${textClass} mb-3`}>Default Model</h3>
          <select
            value={selectedModel || ''}
            onChange={(e) => {
              const newModel = e.target.value;
              setSelectedModel(newModel);
              localStorage.setItem('selectedModel', newModel);  // ✅ Save to localStorage
              showToast('Model updated', 'success');
            }}
            className={`w-full px-4 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} border rounded-lg`}
            disabled={!backendConnected}
          >
            {!backendConnected && <option>Backend not connected</option>}
            
            {/* Default Providers */}
            {providers.map(provider => (
              <optgroup key={provider.name} label={provider.name}>
                {provider.models.map(model => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </optgroup>
            ))}
            
            {/* Custom Models - UPDATED to show context length */}
            {customModels.length > 0 && (
              <optgroup label="━━ Your Custom Models ━━">
                {customModels.map(model => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                    {' '}
                    ({model.context_length >= 1000000 
                      ? `${(model.context_length / 1000000).toFixed(1)}M` 
                      : `${(model.context_length / 1024).toFixed(0)}K`} ctx)
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          
          {/* ✅ NEW: Show current selection */}
          <div className={`mt-2 text-sm ${mutedTextClass}`}>
            Currently selected: {
              customModels.find(m => m.value === selectedModel)?.label ||
              providers.flatMap(p => p.models).find(m => m.value === selectedModel)?.label ||
              'None'
            }
          </div>
        </div>

              {/* Temperature Slider */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className={`text-xs ${mutedTextClass} mt-1`}>
                  Lower = more focused, Higher = more creative
                </p>
              </div>
              

              {/* Storage Mode */}
              <div>
                <h3 className={`text-lg font-bold ${textClass} mb-3`}>Storage Mode</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'localStorage', label: 'Browser Only', icon: '💾' },
                    { value: 'backend', label: 'Backend Only', icon: '☁️' },
                    { value: 'both', label: 'Both (Sync)', icon: '🔄' }
                  ].map(mode => (
                    <button
                      key={mode.value}
                      onClick={() => setSyncMode(mode.value)}
                      className={`p-3 rounded-lg text-center transition ${
                        syncMode === mode.value
                          ? 'bg-blue-600 text-white'
                          : darkMode
                          ? 'bg-gray-700 hover:bg-gray-600'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <div className="text-2xl mb-1">{mode.icon}</div>
                      <div className="text-sm font-medium">{mode.label}</div>
                    </button>
                  ))}
                </div>
              </div>

             {/* Custom Model Form */}
<div>
  <div className="flex items-center justify-between mb-3">
    <h3 className={`text-lg font-bold ${textClass}`}>Custom Models</h3>
    <button
      onClick={() => setShowCustomForm(!showCustomForm)}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
    >
      <Plus className="w-4 h-4" />
      Add Model
    </button>
  </div>
  
  {showCustomForm && (
    <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4 space-y-3`}>
      {/* Model Name */}
      <input
        type="text"
        placeholder="Model Name (e.g., My GPT-4)"
        value={customForm.name}
        onChange={(e) => setCustomForm({...customForm, name: e.target.value})}
        className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg`}
      />
      
      {/* Provider Type */}
      <select
        value={customForm.provider_type}
        onChange={(e) => setCustomForm({...customForm, provider_type: e.target.value})}
        className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg`}
      >
        <option value="ollama">Ollama (Local)</option>
        <option value="openai-compatible">OpenAI Compatible API</option>
        <option value="google-genai">Google GenAI</option>
        <option value="custom">Custom Provider</option>
      </select>
      
      {/* Base URL (hide for google-genai) */}
      {customForm.provider_type !== 'google-genai' && (
        <input
          type="text"
          placeholder="Base URL (e.g., http://localhost:11434)"
          value={customForm.base_url}
          onChange={(e) => setCustomForm({...customForm, base_url: e.target.value})}
          className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg`}
        />
      )}
      
      {/* Model ID */}
      <input
        type="text"
        placeholder="Model ID (e.g., llama3.3, gpt-4)"
        value={customForm.model_id}
        onChange={(e) => setCustomForm({...customForm, model_id: e.target.value})}
        className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg`}
      />
      
      {/* Context Length */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${textClass}`}>
          Context Length: {customForm.context_length.toLocaleString()} tokens
        </label>
        <input
          type="number"
          value={customForm.context_length}
          onChange={(e) => setCustomForm({
            ...customForm, 
            context_length: parseInt(e.target.value) || 4096
          })}
          placeholder="Context length in tokens"
          min="1024"
          max="2000000"
          step="1024"
          className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg text-sm`}
        />
        <p className={`text-xs ${mutedTextClass} mt-1`}>
          Tip: DeepSeek-v3=64K, GPT-OSS=8K, Gemini=1M+
        </p>
      </div>
      
      {/* ✅ FIXED: Default Temperature Slider */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${textClass}`}>
          Default Temperature: {customForm.temperature || 0.3}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={customForm.temperature || 0.3}
          onChange={(e) => setCustomForm({
            ...customForm, 
            temperature: parseFloat(e.target.value)
          })}
          className="w-full"
        />
        <p className={`text-xs ${mutedTextClass} mt-1`}>
          Lower = more focused, Higher = more creative
        </p>
      </div>
      
      {/* API Key */}
      <input
        type="password"
        placeholder="API Key (optional for local models)"
        value={customForm.api_key}
        onChange={(e) => setCustomForm({...customForm, api_key: e.target.value})}
        className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} border rounded-lg font-mono text-sm`}
      />
      
      {/* Cancel & Save Buttons */}
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
              temperature: 0.3  // ← FIXED: Use "temperature" not "temperature_default"
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
                temperature: 0.3  // ← FIXED: Use "temperature" not "temperature_default"
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
</div>
              {/* Custom Models List */}
              {customModels.length > 0 && (
                <div>
                  <h3 className={`text-lg font-bold ${textClass} mb-3 flex items-center justify-between`}>
                    <span>Your Custom Models</span>
                    <span className={`text-xs ${mutedTextClass}`}>
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
                          <div className={`text-xs ${mutedTextClass} mt-1 flex items-center gap-2 flex-wrap`}>
                            <span>
                              {model.provider_type === 'ollama' && '🦙 '}
                              {model.provider_type === 'openai-compatible' && '🔗 '}
                              {model.provider_type === 'google-genai' && '🌟 '}
                              {model.provider_type} • {model.model_id}
                            </span>
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
                          className={`p-2 rounded transition ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                <h4 className={`font-semibold ${textClass} mb-2 flex items-center gap-2`}>
                  <Info className="w-4 h-4" />
                  Quick Setup Guide
                </h4>
                <ul className={`text-sm ${mutedTextClass} space-y-1`}>
                  <li>• <strong>Ollama:</strong> Install from ollama.ai, run: <code className={`${darkMode ? 'bg-gray-800' : 'bg-gray-200'} px-1 rounded`}>ollama run llama2</code></li>
                  <li>• <strong>OpenAI:</strong> Get API key from platform.openai.com</li>
                  <li>• <strong>Custom:</strong> Any OpenAI-compatible endpoint</li>
                  <li>• <strong>Storage:</strong> Use "Both" mode to sync across devices</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} px-6 py-4 border-t flex justify-end sticky bottom-0`}>
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

      {/* DebugPanel*/}
        <DebugPanel 
          darkMode={darkMode}
          selectedModel={selectedModel}
          customModels={customModels}
          agentModels={agentModels}
          advancedMode={advancedMode}
          temperature={temperature}
        />
        <StopButton
        isProcessing={loading}
        onStop={handleStop}
        currentStage={processingStage}
        darkMode={darkMode}
      />

      <ChatHistory
        history={history}
        onLoadHistory={handleLoadHistory}
        onClearHistory={clearHistory}
        darkMode={darkMode}
      />
      

      {activeTab === 'parser' && parsedData && (
  <ParserTab
    parsedData={parsedData}
    darkMode={darkMode}
    onCopy={copyToClipboard}
    onDownload={downloadJSON}
  />
)}

      <style>{`
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
  
  @keyframes slide-in-right {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
  
  /* Better focus states for accessibility */
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
`}</style>
    </div>
  );
};

export default ODRLDemo;