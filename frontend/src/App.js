import React, { useState, useEffect, useRef } from 'react';
import { encodingForModel } from 'js-tiktoken';
import { API_URL } from './config/api';
import { AlertCircle, FileText, Brain, Code, CheckCircle, Shield, Settings, Info, RefreshCw, Plus, Trash2, Save, X, Moon, Sun, BarChart3, Clock, Activity, ArrowRight, Sparkles, PlayCircle, Upload, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
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
import StatusTab from "./components/tabs/StatusTab";
import { saveGeneratedPolicy, saveReasoningAnalysis } from './utils/storageApi';
import SettingsModal from './components/SettingsModal';

// API Configuration
const API_BASE_URL = API_URL;

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
  const [sseConnected, setSseConnected] = useState(false);
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

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
  const [isInitializing, setIsInitializing] = useState(true);

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
  
  const [syncMode, setSyncMode] = useState('backend');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [showExamples, setShowExamples] = useState(false);

  // Toast notification state
  const [toasts, setToasts] = useState([]);
  
  // Processing progress state
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('idle');
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
    console.log('[getModelConfig] Input:', modelValue);
    console.log('[getModelConfig] Available custom models:', customModels.map(m => m.value));
    
    if (!modelValue) return null;
    
    // WAIT FOR CUSTOM MODELS TO LOAD
    if (modelValue.startsWith('custom:') && customModels.length === 0) {
      console.warn('[getModelConfig] Custom models not loaded yet');
      return null;
    }
    
    const customModel = customModels.find(m => m.value === modelValue);
    console.log('[getModelConfig] Found model:', customModel ? '✅' : '❌');
    
    if (!customModel) return null;
    
    const config = {
      provider_type: customModel.provider_type,
      base_url: customModel.base_url,
      model_id: customModel.model_id,
      api_key: customModel.api_key,
      context_length: customModel.context_length,
      temperature_default: customModel.temperature 
    };
    
    console.log('[getModelConfig] Returning config:', config);
    return config;
  }, [customModels]);

  // ADD THE VALIDATION HELPER 
  const validateModelConfig = React.useCallback((modelValue, agentName = 'Agent') => {
    if (!modelValue) {
      console.error(`[${agentName}] No model specified`);
      return { valid: false, error: 'No model selected' };
    }
    
    // Custom model validation
    if (modelValue.startsWith('custom:')) {
      if (customModels.length === 0) {
        console.error(`[${agentName}] Custom models not loaded yet`);
        return { 
          valid: false, 
          error: 'Custom models still loading. Please wait a moment...' 
        };
      }
      
      const config = getModelConfig(modelValue);
      if (!config) {
        console.error(`[${agentName}] Custom model not found:`, modelValue);
        console.error(`[${agentName}] Available:`, customModels.map(m => m.value));
        return { 
          valid: false, 
          error: `Custom model "${modelValue}" not found. Please reconfigure.` 
        };
      }
      
      return { valid: true, config };
    }
    
    // Standard model - no config needed
    return { valid: true, config: null };
  }, [customModels, getModelConfig]);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  // ============================================
  // INITIALIZATION
  // ============================================
  useEffect(() => {
    const initializeApp = async () => {
      setIsInitializing(true);
      
      try {
        console.log('[Init] Step 1: Loading providers and custom models...');
        await loadProviders();
        
        console.log('[Init] Step 2: Waiting for state sync...');
        await new Promise(resolve => setTimeout(resolve, 250));
        
        console.log('[Init] Step 3: Verifying state...');
        console.log(`[Init] customModels state length: ${customModels.length}`);
        console.log(`[Init] providers state length: ${providers.length}`);
        
        const savedModel = localStorage.getItem('selectedModel');
        console.log(`[Init] Saved model: ${savedModel}`);
        
        if (savedModel) {
          console.log('[Init] Step 4: Restoring saved model...');
          
          if (savedModel.startsWith('custom:')) {
            const exists = customModels.some(m => m.value === savedModel);
            console.log(`[Init] Custom model exists: ${exists}`);
            
            if (exists) {
              setSelectedModel(savedModel);
              console.log('[Init] ✅ Restored:', savedModel);
            } else {
              console.warn('[Init] ⚠️ Model not found, clearing');
              localStorage.removeItem('selectedModel');
              showToast('Saved model no longer exists', 'warning');
            }
          } else {
            setSelectedModel(savedModel);
          }
        }
        
        console.log('[Init] ✅ Complete');
        
      } catch (error) {
        console.error('[Init] ❌ Failed:', error);
        showToast('Failed to load models', 'error');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeApp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    console.log('[Debug] Selected Model Changed:', selectedModel);
    console.log('[Debug] Available Custom Models:', customModels.map(m => m.value));
    console.log('[Debug] Available Provider Models:', providers.flatMap(p => p.models).map(m => m.value));
  }, [selectedModel, customModels, providers]);

  const loadProviders = async () => {
    setLoadingProviders(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/available-providers`, { 
        signal: AbortSignal.timeout(5000) 
      });
      
      if (!response.ok) throw new Error('Backend not responding');
      
      const data = await response.json();
      console.log('[loadProviders] Response:', data);
      
      // EXTRACT CUSTOM MODELS
      const customProvider = data.providers?.find(p => p.id === 'custom');
      if (customProvider && customProvider.models) {
        console.log(`[loadProviders] ✅ Found ${customProvider.models.length} custom models`);
        setCustomModels(customProvider.models);
      } else {
        console.warn('[loadProviders] No custom models found in response');
        setCustomModels([]);
      }
      
      // Set regular providers
      const regularProviders = data.providers?.filter(p => p.id !== 'custom') || [];
      setProviders(regularProviders);
      
      setBackendConnected(true);
      showToast('Backend connected successfully', 'success');
      
      // Set default model
      if (data.default_model) {
        setSelectedModel(data.default_model);
      } else if (regularProviders.length > 0 && regularProviders[0].models.length > 0) {
        setSelectedModel(regularProviders[0].models[0].value);
      }
      
    } catch (err) {
      console.error('[loadProviders] Error:', err);
      setError('Backend not connected');
      setBackendConnected(false);
      showToast('Backend connection failed', 'error');
    } finally {
      setLoadingProviders(false);
    }
  };

  const loadCustomModels = async () => {
    try {
      console.log('[loadCustomModels] Starting...');
      
      if (syncMode === 'localStorage') {
        const localModels = loadFromLocalStorage();
        setCustomModels(localModels);
        console.log(`[loadCustomModels] ✅ Loaded ${localModels.length} from localStorage`);
        return localModels;
      }
      
      console.log(`[loadCustomModels] ✅ Using models from providers (${customModels.length})`);
      return customModels;
      
    } catch (err) {
      console.error('[loadCustomModels] Error:', err);
      showToast('Failed to load custom models', 'error');
      return [];
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
      console.log('Sending to backend:', JSON.stringify(model, null, 2));
      
      const response = await fetch(`${API_BASE_URL}/api/custom-models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(model)
      });
      
      if (response.ok) {
        console.log('Model saved to backend');
        return true;
      } else {
        const error = await response.json();
        console.error('Backend validation error:', JSON.stringify(error, null, 2));
        return false;
      }
    } catch (err) {
      console.error('Error saving to backend:', err);
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
    console.log('Input modelData:', modelData);
    
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
    
    console.log('Prepared for frontend:', frontendModel);
    
    let updated = [...customModels];
    const existingIndex = updated.findIndex(m => m.value === frontendModel.value);
    
    if (existingIndex >= 0) {
      updated[existingIndex] = frontendModel;
    } else {
      updated.push(frontendModel);
    }
    
    setCustomModels(updated);
    
    if (syncMode === 'localStorage' || syncMode === 'both') {
      saveToLocalStorage(updated);
    }
    
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
      
      console.log('Sending to backend:', backendPayload);
      
      const success = await saveToBackend(backendPayload);
      if (success) {
        showToast(`Model ${existingIndex >= 0 ? 'updated' : 'added'} successfully`, 'success');
      } else {
        showToast('Failed to save to backend', 'error');
      }
    }
    
    console.log(`Model ${existingIndex >= 0 ? 'updated' : 'added'}: ${frontendModel.label}`);
  };

  const deleteCustomModel = async (modelValue) => {
    try {
      const modelId = modelValue.split(':').slice(1).join(':');
      const customValue = `custom:${modelId}`;
      
      console.log('Deleting:', customValue);
      
      const updated = customModels.filter(m => m.value !== modelValue);
      setCustomModels(updated);
      
      if (syncMode === 'localStorage' || syncMode === 'both') {
        saveToLocalStorage(updated);
      }
      
      if (syncMode === 'backend' || syncMode === 'both') {
        const response = await fetch(`${API_BASE_URL}/api/custom-models/${encodeURIComponent(customValue)}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          console.log('Deleted from backend');
          showToast('Model deleted successfully', 'success');
        } else {
          const error = await response.json();
          console.error('Delete failed:', error);
          showToast('Failed to delete from backend', 'error');
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
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
      const url = endpoint.startsWith('/api/') 
        ? `${API_BASE_URL}${endpoint}` 
        : `${API_BASE_URL}/api/${endpoint}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId.current
        },
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

  // ============================================
  // SSE CONNECTION FOR REAL-TIME STATUS
  // ============================================
  useEffect(() => {
    if (!backendConnected) {
      console.log('[SSE] Waiting for backend connection...');
      setSseConnected(false);
      return;
    }
    
    console.log('[SSE] Connecting to status stream...', sessionId.current);
    
    let eventSource = null;
    let reconnectTimeout = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    const connect = () => {
      if (eventSource) {
        eventSource.close();
      }
      
      const sseUrl = `${API_BASE_URL}/api/agent-status/${sessionId.current}`;
      console.log('[SSE] Connecting to:', sseUrl);
      
      eventSource = new EventSource(sseUrl);
      
      let connectionConfirmed = false;
      
      eventSource.onopen = () => {
        console.log('[SSE] ✅ Connected');
        setSseConnected(true);
        connectionConfirmed = true;
        reconnectAttempts = 0;
      };
      
      eventSource.onmessage = (event) => {
        try {
          if (!connectionConfirmed) {
            console.log('[SSE] ✅ First message received');
            setSseConnected(true);
            connectionConfirmed = true;
          }
          
          if (event.data === ': keepalive') return;
          
          const status = JSON.parse(event.data);
          
          if (status.status === 'connected') {
            console.log('[SSE] Session confirmed:', status.session_id);
            return;
          }
          
          console.log('[SSE] Status update:', status);
          
          setAgentStates(prev => ({
            ...prev,
            [status.agent]: status.status
          }));
          
          if (status.progress !== undefined) {
            setProcessingProgress(status.progress);
          }
          
          if (status.message) {
            setProcessingStage(status.message);
          }
          
        } catch (e) {
          console.error('[SSE] Parse error:', e);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('[SSE] ❌ Error:', error);
        setSseConnected(false);
        connectionConfirmed = false;
        eventSource.close();
        
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`[SSE] Reconnecting in ${delay}ms...`);
          
          reconnectTimeout = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    };
    
    connect();
    
    return () => {
      console.log('[SSE] Cleanup');
      setSseConnected(false);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
    };
  }, [backendConnected]);

  const updateAgentState = (agent, state) => {
    setAgentStates(prev => ({ ...prev, [agent]: state }));
  };

  // ============================================
  // MAIN PIPELINE FUNCTION (full auto-run)
  // ============================================
  const handleProcess = async () => {
    if (!inputText.trim()) {
      setError('Please enter a policy description');
      showToast('Please enter a policy description', 'warning');
      return;
    }

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
      // STAGE 1: PARSE
      updateAgentState('parser', 'processing');
      setProcessingStage('Parsing policy text...');
      setProcessingProgress(10);
      
      const parserModel = advancedMode && agentModels.parser ? agentModels.parser : selectedModel;
      const parserCustomConfig = getModelConfig(parserModel);
      
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

      // STAGE 2: REASON
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

      // CHECKPOINT: Should we continue automatically?
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
        return;
      }

      // AUTO-PROGRESS MODE: CONTINUE
      console.log('[App] Auto-progress mode - continuing to Generator');
      startTimes.generate = Date.now();

      // STAGE 3: GENERATE
      updateAgentState('generator', 'processing');
      setProcessingStage('Generating ODRL policy...');
      setProcessingProgress(65);
      
      const generatorModel = advancedMode && agentModels.generator ? agentModels.generator : selectedModel;
      const generatorCustomConfig = getModelConfig(generatorModel);
      
      const genResult = await callAPI('generate', {
        parsed_data: parseResult,
        original_text: inputText,
        reasoning: reasonResult,
        model: generatorModel,
        temperature,
        custom_model: generatorCustomConfig
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

      // STAGE 4: VALIDATE
      updateAgentState('validator', 'processing');
      setProcessingStage('Validating with SHACL...');
      setProcessingProgress(90);
      
      const validatorModel = advancedMode && agentModels.validator ? agentModels.validator : selectedModel;
      const validatorCustomConfig = getModelConfig(validatorModel);

      if (!genResult.odrl_turtle) {
        throw new Error('Generator did not return odrl_turtle format');
      }
      
      const valResult = await callAPI('validate', {
        odrl_turtle: genResult.odrl_turtle,
        original_text: inputText,
        model: validatorModel,
        temperature,
        custom_model: validatorCustomConfig
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

      // SAVE HISTORY
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
  // STEP-BY-STEP HANDLERS (with auto-progress fix)
  // ============================================
  // FIX: Each handler accepts an optional parameter from the previous
  // stage so auto-progress doesn't read stale React state.
  // ============================================

  const handleParse = async () => {
    if (!inputText.trim()) {
      showToast('Please enter a policy description', 'warning');
      return;
    }
    const parserModel = advancedMode && agentModels.parser ? agentModels.parser : selectedModel;
    const validation = validateModelConfig(parserModel, 'Parser');
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }

    setLoading(true);
    setProcessingStage('parsing');
    setProcessingProgress(25);
    setError(null);
    setParsedData(null);
    
    const startTime = Date.now();
    const signal = getSignal();

    try {
      updateAgentState('parser', 'processing');
      const parserCustomConfig = validation.config;
      
      const parseResult = await callAPI('parse', {
        text: inputText,
        model: parserModel,
        temperature,
        custom_model: parserCustomConfig
      }, signal);
      
      setParsedData(parseResult);
      setMetrics(prev => ({ ...prev, parseTime: Date.now() - startTime }));
      updateAgentState('parser', 'completed');
      
      setProcessingStage('parsing_done');
      setProcessingProgress(0); 
      setActiveTab('parser');
      showToast('Parsing complete!', 'success');
      
      // AUTO-PROGRESS FIX: pass parseResult directly to handleReason
      if (autoProgress) {
        console.log('[AutoProgress] Parse done → auto-triggering Reason');
        setLoading(false);
        setTimeout(() => handleReason(parseResult), 50);
        return;
      }
      
    } catch (err) {
      const errorMessage = err?.message || 'Parsing failed';
      setError(errorMessage);
      showToast(`Parse error: ${errorMessage}`, 'error');
      updateAgentState('parser', 'error');
      setProcessingStage('idle');
      setProcessingProgress(0); 
    } finally {
      setLoading(false);
    }
  };

  /**
   * handleReason
   * @param {object} [parsedDataOverride] - When called from auto-progress,
   *   the parse result is passed directly to avoid stale state.
   */
  const handleReason = async (parsedDataOverride) => {
    // Use override if provided (auto-progress), otherwise fall back to state
    const effectiveParsedData = parsedDataOverride || parsedData;

    if (!effectiveParsedData) {
      showToast('Please parse text first!', 'warning');
      return;
    }
    const reasonerModel = advancedMode && agentModels.reasoner ? agentModels.reasoner : selectedModel;
    const validation = validateModelConfig(reasonerModel, 'Reasoner');
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }

    setLoading(true);
    setProcessingStage('reasoning');
    setReasoningResult(null);
    
    const startTime = Date.now();
    const signal = getSignal();

    try {
      updateAgentState('reasoner', 'processing');
      const reasonerCustomConfig = validation.config;
      
      const reasonResult = await callAPI('reason', {
        parsed_data: effectiveParsedData,
        original_text: inputText,
        model: reasonerModel,
        temperature,
        custom_model: reasonerCustomConfig
      }, signal);
      
      setReasoningResult(reasonResult);
      setMetrics(prev => ({ ...prev, reasonTime: Date.now() - startTime }));
      updateAgentState('reasoner', 'completed');
      
      setProcessingStage('reasoning_done');
      setProcessingProgress(0); 
      setActiveTab('reasoner');
      showToast('Analysis complete!', 'success');
      
      // AUTO-PROGRESS FIX: pass both results directly to handleGenerate
      if (autoProgress) {
        console.log('[AutoProgress] Reason done → auto-triggering Generate');
        setLoading(false);
        setTimeout(() => handleGenerate(effectiveParsedData, reasonResult), 50);
        return;
      }
      
    } catch (err) {
      const errorMessage = err?.message || 'Reasoning failed';
      setError(errorMessage);
      showToast(`Reasoning error: ${errorMessage}`, 'error');
      updateAgentState('reasoner', 'error');
      setProcessingStage('parsing_done');
    } finally {
      setLoading(false);
    }
  };

  /**
   * handleGenerate
   * @param {object} [parsedDataOverride] - Parsed data from auto-progress chain
   * @param {object} [reasoningOverride]  - Reasoning result from auto-progress chain
   */
  const handleGenerate = async (parsedDataOverride, reasoningOverride) => {
    const effectiveParsedData = parsedDataOverride || parsedData;
    const effectiveReasoning = reasoningOverride || reasoningResult;

    if (!effectiveReasoning) {
      showToast('Please run analysis first!', 'warning');
      return;
    }
    if (!effectiveParsedData) {
      showToast('Parser data missing - please run parsing again', 'error');
      return;
    }
    
    const generatorModel = advancedMode && agentModels.generator ? agentModels.generator : selectedModel;
    const validation = validateModelConfig(generatorModel, 'Generator');
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }
    
    setLoading(true);
    setProcessingStage('Generating ODRL policy...');
    setProcessingProgress(50);
    setGeneratedODRL(null);
    setValidationResult(null);
    
    const startTime = Date.now();
    const signal = getSignal();
    
    try {
      updateAgentState('generator', 'processing');
      const generatorCustomConfig = validation.config;
      
      console.log('[Generator] Sending generate request...');
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId.current
        },
        body: JSON.stringify({
          parsed_data: effectiveParsedData,
          original_text: inputText,
          reasoning: effectiveReasoning,
          attempt_number: 1,
          model: generatorModel,
          temperature,
          custom_model: generatorCustomConfig
        }),
        signal
      });
      
      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status}`);
      }
      
      const genResult = await response.json();
      console.log('[Generator] Generation complete');
      
      setGeneratedODRL(genResult);
      setGenerationContext({
        parsed_data: effectiveParsedData,
        original_text: inputText,
        reasoning: effectiveReasoning
      });
      
      setMetrics(prev => ({
        ...prev,
        generateTime: Date.now() - startTime
      }));
      
      updateAgentState('generator', 'completed');
      setProcessingProgress(100);
      setProcessingStage('generating_done');
      setProcessingProgress(0);
      
      showToast('ODRL generated!', 'success');
      
      // AUTO-PROGRESS FIX: pass genResult directly to handleValidate
      if (autoProgress) {
        console.log('[AutoProgress] Generate done → auto-triggering Validate');
        setLoading(false);
        setTimeout(() => handleValidate(genResult), 50);
        return;
      }
      setActiveTab('generator');
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[Generator] Generation cancelled');
        showToast('Generation cancelled', 'info');
      } else {
        console.error('[Generator] Error:', error);
        showToast(`Generation failed: ${error.message}`, 'error');
        updateAgentState('generator', 'error');
      }
    } finally {
      setLoading(false);
      setProcessingProgress(0);
      setProcessingStage('');
    }
  };

  /**
   * handleValidate
   * @param {object} [generatedODRLOverride] - Generated ODRL from auto-progress chain
   */
  const handleValidate = async (generatedODRLOverride) => {
    const effectiveODRL = generatedODRLOverride || generatedODRL;

    if (!effectiveODRL) {
      showToast('Please generate ODRL first!', 'warning');
      return;
    }
    
    if (!effectiveODRL.odrl_turtle) {
      showToast('Generated ODRL missing Turtle format!', 'error');
      console.error('[Validator] Generated ODRL:', effectiveODRL);
      return;
    }
    
    const validatorModel = advancedMode && agentModels.validator ? agentModels.validator : selectedModel;
    const validation = validateModelConfig(validatorModel, 'Validator');
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }
    
    setValidating(true);
    setLoading(true);
    setProcessingStage('Validating ODRL...');
    setProcessingProgress(90);
    
    const startTime = Date.now();
    const signal = getSignal();
    
    try {
      updateAgentState('validator', 'processing');
      const validatorCustomConfig = validation.config;
      
      console.log('[Validator] Validation starting...');
      console.log('[Validator] Turtle length:', effectiveODRL.odrl_turtle.length, 'chars');
      console.log('[Validator] Model:', validatorModel);
      
      const valResult = await callAPI('validate', {
        odrl_turtle: effectiveODRL.odrl_turtle,
        original_text: inputText,
        model: validatorModel,
        temperature,
        custom_model: validatorCustomConfig
      }, signal);
      
      setValidationResult(valResult);
      setMetrics(prev => ({ ...prev, validateTime: Date.now() - startTime }));
      updateAgentState('validator', 'completed');
      setProcessingProgress(100);
      
      setActiveTab('validator');
      
      if (valResult.is_valid) {
        showToast('SHACL validation passed! ✅', 'success');
      } else {
        showToast(`${valResult.issues?.length || 0} SHACL violations found`, 'warning');
      }
      
      setProcessingStage('complete');
      setProcessingProgress(0);
      
    } catch (error) {
      console.error('[Validator] Error:', error);
      showToast('Validation failed: ' + error.message, 'error');
      updateAgentState('validator', 'error');
    } finally {
      setValidating(false);
      setLoading(false);
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
    
    const regenerateModel = advancedMode && agentModels.generator ? agentModels.generator : selectedModel;
    const validation = validateModelConfig(regenerateModel, 'Generator');
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }
    
    setRegenerating(true);
    setValidationResult(null);
    setProcessingStage(`Regenerating ODRL (attempt ${(generatedODRL.attempt_number || 1) + 1})...`);
    setProcessingProgress(50);
    
    try {
      const regenerateCustomConfig = validation.config;
      
      console.log('[Generator] Regenerating ODRL with validation fixes...');
      console.log('[Regenerate] Model:', regenerateModel);
      
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
          custom_model: regenerateCustomConfig
        }),
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`Regeneration failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[Generator] Regeneration complete, attempt:', data.attempt_number);
      
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
  // handleEditFromValidator Function 
  // ============================================
  const handleEditFromValidator = () => {
    console.log('[App] User wants to edit input from validator');
    setActiveTab('parser');
    setAttemptNumber(1);
    showToast('Edit your input and click "Start Processing" to regenerate', 'info');
  };

  // ============================================
  // handleStop Function
  // ============================================
  const handleStop = () => {
    console.log('Stop button clicked - cancelling operations');
    
    abort();
    abortControllerRef.current.abort();
    resetAbortController();
    
    setLoading(false);
    setProcessingProgress(0);
    setProcessingStage('');
    
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

    setInputText(historyItem.inputText);
    setSelectedModel(historyItem.model || selectedModel);
    setTemperature(historyItem.temperature || 0.3);

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
    if (historyItem.metrics) {
      setMetrics(historyItem.metrics);
    }
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
    // Abort any running request first
    abort();
    abortControllerRef.current.abort();
    resetAbortController();

    setInputText('');
    setParsedData(null);
    setReasoningResult(null);
    setGeneratedODRL(null);
    setValidationResult(null);
    setError(null);
    setLoading(false);
    setActiveTab('parser');
    setProcessingStage('idle');
    setProcessingProgress(0);
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
    });
    setFileName('');
    setCompletedStages([]);
    showToast('Pipeline reset', 'info');
  };

  // ============================================
  // handleUpdateODRL Function 
  // ============================================
  const handleUpdateODRL = (updatedODRL, isTurtle = false) => {
    if (isTurtle) {
      console.log('[App] User updated ODRL Turtle manually');
      setGeneratedODRL({
        ...generatedODRL,
        odrl_turtle: updatedODRL
      });
    } else {
      console.log('[App] User updated ODRL JSON-LD manually');
      setGeneratedODRL({
        ...generatedODRL,
        odrl_policy: updatedODRL,
        odrl: updatedODRL
      });
    }
    setValidationResult(null);
    showToast('ODRL updated. Please validate the changes.', 'info');
  };

  const handleSaveReasoning = async (metadata) => {
    try {
      const result = await saveReasoningAnalysis(metadata);
      showToast(`Saved to backend: ${result.filename}`, 'success');
    } catch (error) {
      showToast(`Failed to save: ${error.message}`, 'error');
    }
  };

  const handleSaveGenerator = async (metadata) => {
    try {
      const result = await saveGeneratedPolicy(metadata);
      showToast(`Saved to backend: ${result.filename}`, 'success');
    } catch (error) {
      showToast(`Failed to save: ${error.message}`, 'error');
    }
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
  // RENDER UI
  // ============================================
  if (isInitializing) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
        <div className="text-center">
          {/* Pipeline visualization */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {[
              { icon: <FileText className="w-5 h-5" />, label: 'Parse', delay: '0s' },
              { icon: <Brain className="w-5 h-5" />, label: 'Reason', delay: '0.4s' },
              { icon: <Code className="w-5 h-5" />, label: 'Generate', delay: '0.8s' },
              { icon: <Shield className="w-5 h-5" />, label: 'Validate', delay: '1.2s' },
            ].map((stage, i) => (
              <React.Fragment key={stage.label}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                    style={{
                      background: ['#3b82f6','#8b5cf6','#10b981','#f59e0b'][i],
                      animation: `init-pulse 2s ease-in-out infinite`,
                      animationDelay: stage.delay,
                      opacity: 0.3,
                    }}
                  >
                    {stage.icon}
                  </div>
                  <span className={`text-xs font-medium ${mutedTextClass}`}>{stage.label}</span>
                </div>
                {i < 3 && (
                  <div className={`w-8 h-0.5 mb-5 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
                    style={{ animation: `init-line 2s ease-in-out infinite`, animationDelay: `${i * 0.4 + 0.2}s` }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <h2 className={`text-xl font-bold ${textClass} mb-2`}>
            ODRL Policy Generator
          </h2>
          <p className={`text-sm ${mutedTextClass}`}>
            Connecting to models...
          </p>
        </div>
      </div>
    );
  }

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

              {/* SSE STATUS */}
              {backendConnected && (
                <button
                  onClick={() => setActiveTab('status')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm transition ${
                    sseConnected
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
                      : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-white animate-pulse' : 'bg-white/50'}`} />
                  <span className="text-xs font-semibold">
                    {sseConnected ? 'Live Status' : 'Status Idle'}
                  </span>
                  <Activity className="w-3 h-3 ml-1" />
                </button>
              )}

              {/* Model Info in Header */}
              {backendConnected && selectedModel && (
                <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                  {(() => {
                    const customModel = customModels.find(m => m.value === selectedModel);
                    if (customModel) return customModel.label;
                    const providerModel = providers.flatMap(p => p.models).find(m => m.value === selectedModel);
                    if (providerModel) return providerModel.label;
                    return selectedModel;
                  })()}
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

      {/* UNIFIED PIPELINE NAV */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        {/* Progress bar */}
        {loading && processingProgress > 0 && (
          <div className={`h-1 w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div 
              className="h-full bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${processingProgress}%` }}
            />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2">
            {/* Agent Tabs */}
            {['parser', 'reasoner', 'generator', 'validator'].map((agent, idx) => {
              const Icon = getAgentIcon(agent);
              const isActive = activeTab === agent;
              const state = agentStates[agent];
              
              const agentColor = {
                parser: { solid: '#3b82f6', light: darkMode ? 'bg-blue-900/30' : 'bg-blue-50', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500' },
                reasoner: { solid: '#8b5cf6', light: darkMode ? 'bg-violet-900/30' : 'bg-violet-50', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500' },
                generator: { solid: '#10b981', light: darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500' },
                validator: { solid: '#f59e0b', light: darkMode ? 'bg-amber-900/30' : 'bg-amber-50', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500' },
              }[agent];

              const metricsKey = agent === 'generator' ? 'generateTime' : agent === 'reasoner' ? 'reasonTime' : agent === 'validator' ? 'validateTime' : 'parseTime';
              
              return (
                <React.Fragment key={agent}>
                  <button
                    onClick={() => setActiveTab(agent)}
                    className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition border-2 ${
                      isActive 
                        ? `${agentColor.light} ${agentColor.border}` 
                        : darkMode ? 'hover:bg-gray-700/50 border-transparent' : 'hover:bg-gray-50 border-transparent'
                    } ${state === 'processing' ? 'animate-agent-active' : ''}`}
                  >
                    <div className={`p-1.5 rounded-lg ${
                      state === 'completed' ? 'shadow-sm' :
                      state === 'error' ? 'bg-red-500/20' :
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}
                      style={state === 'completed' || state === 'processing' ? { background: agentColor.solid } : {}}
                    >
                      <Icon className={`w-4 h-4 ${
                        state === 'completed' || state === 'processing' ? 'text-white' : 
                        state === 'error' ? 'text-red-500' :
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="text-left min-w-0">
                      <div className={`font-semibold text-sm leading-tight ${isActive ? agentColor.text : textClass}`}>
                        {agent.charAt(0).toUpperCase() + agent.slice(1)}
                      </div>
                      {showMetrics && metrics[metricsKey] > 0 && (
                        <div className={`text-xs flex items-center gap-1 ${isActive ? agentColor.text : mutedTextClass}`}>
                          <Clock className="w-3 h-3" />
                          {(metrics[metricsKey] / 1000).toFixed(2)}s
                        </div>
                      )}
                    </div>
                  </button>
                  {idx < 3 && (
                    <ArrowRight className={`w-4 h-4 flex-shrink-0 ${mutedTextClass}`} />
                  )}
                </React.Fragment>
              );
            })}

            {/* Divider */}
            <div className={`w-px h-8 mx-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

            {/* SSE indicator */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
              sseConnected 
                ? 'text-green-600 dark:text-green-400' 
                : mutedTextClass
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                sseConnected ? 'bg-green-500 animate-pulse' : darkMode ? 'bg-gray-600' : 'bg-gray-400'
              }`} />
              {sseConnected ? 'Live' : 'Idle'}
            </div>

            {/* Status tab button */}
            <button
              onClick={() => setActiveTab('status')}
              className={`p-2 rounded-lg transition ${
                activeTab === 'status'
                  ? 'bg-indigo-600 text-white'
                  : darkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-500'
              }`}
              title="View pipeline details"
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>

          {/* Processing stage label */}
          {loading && processingStage && (
            <div className={`mt-2 text-xs font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'} flex items-center gap-2`}>
              <RefreshCw className="w-3 h-3 animate-spin" />
              {processingStage}
            </div>
          )}
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
                {/* Example Cards */}
                <ExamplePolicies
                  onSelectExample={(text) => setInputText(text)}
                  darkMode={darkMode}
                  textClass={textClass}
                  mutedTextClass={mutedTextClass}
                />

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
                    className={`w-full h-32 px-4 py-3 bg-transparent rounded-lg resize-y focus:outline-none ${textClass}`}
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

                {/* ADVANCED SETTINGS */}
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

                      {['parser', 'reasoner', 'generator', 'validator'].map((agent) => (
                        <div key={agent}>
                          <label className={`block text-sm font-medium mb-2 ${textClass} capitalize`}>
                            {agent} Model
                          </label>
                          <select
                            value={agentModels[agent] || ''}
                            onChange={(e) => {
                              const newValue = e.target.value || null;
                              console.log(`[Advanced] ${agent} model changed to:`, newValue);
                              setAgentModels({
                                ...agentModels,
                                [agent]: newValue,
                              });
                            }}
                            className={`w-full px-3 py-2 ${
                              darkMode
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-white border-gray-300'
                            } border rounded-lg text-sm`}
                          >
                            <option value="">
                              Use default ({selectedModel
                                ? providers.flatMap(p => p.models).find(m => m.value === selectedModel)?.label ||
                                  customModels.find(m => m.value === selectedModel)?.label ||
                                  'Unknown'
                                : 'llama3.3'})
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
                  )}
                </div>

                {/* Auto-progress Setting */}
                <div className="flex items-center justify-between pt-2">
                  <label className={`flex items-center gap-2 cursor-pointer ${autoProgress ? 'text-green-600 dark:text-green-400 font-medium' : ''}`}>
                    <input
                      type="checkbox"
                      checked={autoProgress}
                      aria-label="Toggle automatic progression through stages"
                      onChange={(e) => setAutoProgress(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className={`text-sm ${textClass}`}>Auto-Agent Pipeline</span>
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
                    onClick={() => {
                      if (processingStage === 'idle') {
                        handleParse();
                      } else if (processingStage === 'parsing_done') {
                        handleReason();
                      } else if (processingStage === 'reasoning_done') {
                        handleGenerate();
                      } else if (processingStage === 'generating_done') {
                        handleValidate();
                      } else if (processingStage === 'complete') {
                        resetDemo();
                      }
                    }}
                    disabled={loading || (!inputText.trim() && processingStage === 'idle')}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-500/30"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        {processingStage === 'parsing' && 'Parsing...'}
                        {processingStage === 'reasoning' && 'Analyzing...'}
                        {processingStage === 'generating' && 'Generating...'}
                        {processingStage === 'Generating ODRL policy...' && 'Generating...'}
                        {processingStage === 'validating' && 'Validating...'}
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-5 h-5" />
                        {processingStage === 'idle' && 'Start Parsing'}
                        {processingStage === 'parsing_done' && 'Start Reasoning'}
                        {processingStage === 'reasoning_done' && 'Generate ODRL'}
                        {processingStage === 'generating_done' && 'Validate Policy'}
                        {processingStage === 'complete' && 'Start Over'}
                      </>
                    )}
                  </button>

                  {/* Stop button */}
                  {loading && (
                    <button
                      onClick={handleStop}
                      className="px-6 py-3 rounded-lg font-medium transition bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                    >
                      Stop
                    </button>
                  )}
                  
                  {/* Reset button */}
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
        
            {/* Parser Results */}
            {parsedData && (
              <ParserTab
                parsedData={parsedData}
                darkMode={darkMode}
                onCopy={copyToClipboard}
                onDownload={downloadJSON}
              />
            )}
            
            {/* Footer */}
            <div className={`flex items-center justify-end gap-3 text-sm ${mutedTextClass} pt-2`}>
              <button
                onClick={resetDemo}
                className={`hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
              >
                Reset
              </button>
              <span>•</span>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className={`hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
              >
                API Docs
              </a>
            </div>
          </div>
        )}

        {/* Reasoner Tab */}
        {activeTab === 'reasoner' && (
          <div className="space-y-6 animate-fade-in">
            {!reasoningResult ? (
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
                  <p className="text-sm mt-2">Go to Parser tab and click "Start Parsing"</p>
                </div>
              </div>
            ) : (
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
                    showToast('Edit your policy text and click "Start Parsing" again', 'info');
                  }}
                  onSave={handleSaveReasoning}
                />
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
            onSave={handleSaveGenerator} 
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
 
        {/* Status Tab */}
        {activeTab === 'status' && (
          <StatusTab
            agentStates={agentStates}
            metrics={metrics}
            processingProgress={processingProgress}
            processingStage={processingStage}
            sseConnected={sseConnected}
            sessionId={sessionId.current}
            darkMode={darkMode}
          />
        )}
      </div>

      {/* PERSISTENT PIPELINE ACTION BAR */}
      {activeTab !== 'parser' && processingStage !== 'idle' && (
        <div className={`border-t ${darkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'} backdrop-blur-sm sticky bottom-0 z-30`}>
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
            {/* Next step button */}
            {!loading && (
              <button
                onClick={() => {
                  if (processingStage === 'parsing_done') handleReason();
                  else if (processingStage === 'reasoning_done') handleGenerate();
                  else if (processingStage === 'generating_done') handleValidate();
                  else if (processingStage === 'complete') resetDemo();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition shadow-lg shadow-blue-500/20"
              >
                <PlayCircle className="w-4 h-4" />
                {processingStage === 'parsing_done' && 'Continue → Reasoning'}
                {processingStage === 'reasoning_done' && 'Continue → Generate ODRL'}
                {processingStage === 'generating_done' && 'Continue → Validate'}
                {processingStage === 'complete' && 'Start Over'}
              </button>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span className={`text-sm font-medium ${textClass}`}>
                  {processingStage}
                </span>
              </div>
            )}

            {/* Stop button */}
            {loading && (
              <button
                onClick={handleStop}
                className="px-5 py-2.5 rounded-lg font-medium transition bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
              >
                Stop
              </button>
            )}

            {/* Reset button */}
            <button
              onClick={resetDemo}
              className={`px-5 py-2.5 rounded-lg font-medium transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      <SettingsModal
        darkMode={darkMode}
        textClass={textClass}
        mutedTextClass={mutedTextClass}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        temperature={temperature}
        setTemperature={setTemperature}
        providers={providers}
        customModels={customModels}
        customForm={customForm}
        setCustomForm={setCustomForm}
        showCustomForm={showCustomForm}
        setShowCustomForm={setShowCustomForm}
        addOrUpdateCustomModel={addOrUpdateCustomModel}
        deleteCustomModel={deleteCustomModel}
        syncMode={syncMode}
        setSyncMode={setSyncMode}
        backendConnected={backendConnected}
        showToast={showToast}
      />

      {/* DebugPanel */}
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
      
      <style>{`
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
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
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
  
  @keyframes init-pulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.08); }
  }
  @keyframes init-line {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 0.8; }
  }

  @keyframes agent-active {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.2); }
    50% { box-shadow: 0 0 12px 2px rgba(59,130,246,0.15); }
  }
  .animate-agent-active {
    animation: agent-active 1.5s ease-in-out infinite;
  }

  @keyframes stage-complete {
    0% { background-color: transparent; }
    30% { background-color: rgba(16,185,129,0.1); }
    100% { background-color: transparent; }
  }

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