import React, { useState, useEffect, useRef } from 'react';

// Utilities
import { countTokens } from './utils/tokenCounter';
import { getAgentIcon, getAgentColor, getMetricsKey } from './utils/agentHelpers';

// Hooks
import { useToast } from './hooks/useToast';
import { useFileUpload } from './hooks/useFileUpload';
import { useAbortController } from './hooks/useAbortController';
import { useChatHistory, createHistoryItem } from './hooks/useChatHistory';

// Config & API
import { API_URL } from './config/api';

// Icons
import { 
  AlertCircle, FileText, Brain, Code, CheckCircle, Shield, 
  Settings, Info, RefreshCw, X, Moon, Sun, BarChart3, 
  Clock, Activity, ArrowRight, PlayCircle, Upload, 
  ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle 
} from 'lucide-react';

// Components
import DebugPanel from './components/DebugPanel'; 
import { ChatHistory } from './components/ChatHistory';
import { StopButton } from './components/StopButton';
import { ParserTab } from './components/tabs/ParserTab';
import { ReasonerTab } from './components/tabs/ReasonerTab';
import { GeneratorTab } from './components/tabs/GeneratorTab';
import { ValidatorTab } from './components/tabs/ValidatorTab';
import StatusTab from "./components/tabs/StatusTab";
import SettingsModal from './components/SettingsModal';
import SimpleExampleCards from './components/SimpleExampleCards';
import CompactHeader from './components/CompactHeader';
import CompactAgentNav from './components/CompactAgentNav';
import PerAgentModelSettings from './components/PerAgentModelSettings';
import PerAgentModelModal from './components/PerAgentModelModal';

// Utils
import { saveGeneratedPolicy, saveReasoningAnalysis } from './utils/storageApi';

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
  // ============================================
  // STATE VARIABLES
  // ============================================
  
  // Tab & Navigation
  const [activeTab, setActiveTab] = useState('parser');
  
  // Pipeline Data
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [reasoningResult, setReasoningResult] = useState(null);
  const [generatedODRL, setGeneratedODRL] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [generationContext, setGenerationContext] = useState(null);
  
  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validating, setValidating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);
  
  // Processing States
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('idle');
  const [attemptNumber, setAttemptNumber] = useState(1);

  const [perAgentModalOpen, setPerAgentModalOpen] = useState(false);
  
  // Agent States
  const [agentStates, setAgentStates] = useState({
    parser: 'idle',
    reasoner: 'idle',
    generator: 'idle',
    validator: 'idle'
  });
  
  // Metrics
  const [metrics, setMetrics] = useState({
    parseTime: 0,
    reasonTime: 0,
    generateTime: 0,
    validateTime: 0
  });
  
  // Models & Providers
  const [providers, setProviders] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [temperature, setTemperature] = useState(0.3);
  const [customModels, setCustomModels] = useState([]);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [agentModels, setAgentModels] = useState({
    parser: null,      
    reasoner: null,
    generator: null,
    validator: null
  });
  
  // Custom Model Management
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
  
  // UI Settings
  const [darkMode, setDarkMode] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [autoProgress, setAutoProgress] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Connection States
  const [backendConnected, setBackendConnected] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  
  // History
  const {
    history,
    addToHistory,
    clearHistory
  } = useChatHistory(50);
  const [currentHistoryId, setCurrentHistoryId] = useState(null);
  const [completedStages, setCompletedStages] = useState([]);
  
  // Refs
  const abortControllerRef = useRef(new AbortController());
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // Hooks
  const { getSignal, abort } = useAbortController();
  const { toasts, showToast, removeToast } = useToast();
  const { 
    dragActive, 
    fileName, 
    uploadStatus, 
    handleFileUpload: uploadFile, 
    handleDrag, 
    handleDrop 
  } = useFileUpload();
  
  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  const resetAbortController = () => {
    abortControllerRef.current = new AbortController();
  };

  const getModelConfig = React.useCallback((modelValue) => {
    console.log('[getModelConfig] Input:', modelValue);
    console.log('[getModelConfig] Available custom models:', customModels.map(m => m.value));
    
    if (!modelValue) return null;
    
    if (modelValue.startsWith('custom:') && customModels.length === 0) {
      console.warn('[getModelConfig] Custom models not loaded yet');
      return null;
    }
    
    const customModel = customModels.find(m => m.value === modelValue);
    console.log('[getModelConfig] Found model:', customModel ? '' : '❌');
    
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

  const validateModelConfig = React.useCallback((modelValue, agentName = 'Agent') => {
    if (!modelValue) {
      console.error(`[${agentName}] No model specified`);
      return { valid: false, error: 'No model selected' };
    }
    
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
    
    return { valid: true, config: null };
  }, [customModels, getModelConfig]);
  
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
              console.log('[Init]  Restored:', savedModel);
            } else {
              console.warn('[Init] ⚠️ Model not found, clearing');
              localStorage.removeItem('selectedModel');
              showToast('Saved model no longer exists', 'warning');
            }
          } else {
            setSelectedModel(savedModel);
          }
        }
        
        console.log('[Init]  Complete');
        
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
      
      const customProvider = data.providers?.find(p => p.id === 'custom');
      if (customProvider && customProvider.models) {
        console.log(`[loadProviders]  Found ${customProvider.models.length} custom models`);
        setCustomModels(customProvider.models);
      } else {
        console.warn('[loadProviders] No custom models found in response');
        setCustomModels([]);
      }
      
      const regularProviders = data.providers?.filter(p => p.id !== 'custom') || [];
      setProviders(regularProviders);
      
      setBackendConnected(true);
      showToast('Backend connected successfully', 'success');
      
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
        console.log(`[loadCustomModels]  Loaded ${localModels.length} from localStorage`);
        return localModels;
      }
      
      console.log(`[loadCustomModels]  Using models from providers (${customModels.length})`);
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
        console.log('[SSE]  Connected');
        setSseConnected(true);
        connectionConfirmed = true;
        reconnectAttempts = 0;
      };
      
      eventSource.onmessage = (event) => {
        try {
          if (!connectionConfirmed) {
            console.log('[SSE]  First message received');
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

      console.log('[App] Auto-progress mode - continuing to Generator');
      startTimes.generate = Date.now();

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

  const handleReason = async (parsedDataOverride) => {
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
      console.log('[Generator]  Full response:', genResult);
      console.log('[Generator] Has odrl_turtle:', !!genResult.odrl_turtle);
      console.log('[Generator] Turtle length:', genResult.odrl_turtle?.length);

            
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

const handleValidate = async (generatedODRLOverride) => {
  const effectiveODRL = generatedODRLOverride || generatedODRL;
  
  // Check if ODRL exists
  if (!effectiveODRL) {
    showToast('Please generate ODRL first!', 'warning');
    return;
  }
  
  // Check for turtle format - CRITICAL
  if (!effectiveODRL.odrl_turtle) {
    console.error('[Validator] Missing odrl_turtle field');
    console.error('[Validator] Available fields:', Object.keys(effectiveODRL));
    console.error('[Validator] Full object:', effectiveODRL);
    showToast('Generated ODRL missing Turtle format! Please regenerate the policy.', 'error');
    return;
  }
  
  // Validate model configuration
  const validatorModel = advancedMode && agentModels.validator ? agentModels.validator : selectedModel;
  const validation = validateModelConfig(validatorModel, 'Validator');
  if (!validation.valid) {
    showToast(validation.error, 'error');
    return;
  }
  
  // Start validation
  setValidating(true);
  setLoading(true);
  setProcessingStage('Validating ODRL...');
  setProcessingProgress(90);
  
  const startTime = Date.now();
  const signal = getSignal();
  
  try {
    updateAgentState('validator', 'processing');
    const validatorCustomConfig = validation.config;
    
    console.log('[Validator]  Starting validation...');
    console.log('[Validator] Turtle length:', effectiveODRL.odrl_turtle.length, 'characters');
    console.log('[Validator] Model:', validatorModel);
    console.log('[Validator] Original text length:', inputText.length, 'characters');
    
    // Call validation API
    const valResult = await callAPI('validate', {
      odrl_turtle: effectiveODRL.odrl_turtle,
      original_text: inputText,
      model: validatorModel,
      temperature,
      custom_model: validatorCustomConfig
    }, signal);
    
    console.log('[Validator]  Validation complete');
    console.log('[Validator] Is valid:', valResult.is_valid);
    console.log('[Validator] Issues found:', valResult.issues?.length || 0);
    
    // Update state with results
    setValidationResult(valResult);
    setMetrics(prev => ({ ...prev, validateTime: Date.now() - startTime }));
    updateAgentState('validator', 'completed');
    setProcessingProgress(100);
    
    // Switch to validator tab
    setActiveTab('validator');
    
    // Show appropriate toast
    if (valResult.is_valid) {
      showToast(' SHACL validation passed!', 'success');
    } else {
      const issueCount = valResult.issues?.length || 0;
      showToast(`⚠️ ${issueCount} SHACL violation${issueCount !== 1 ? 's' : ''} found`, 'warning');
    }
    
    // Mark as complete
    setProcessingStage('complete');
    
  } catch (error) {
    console.error('[Validator] ❌ Validation error:', error);
    console.error('[Validator] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      showToast('Validation cancelled', 'info');
      updateAgentState('validator', 'cancelled');
    } else {
      showToast(`Validation failed: ${error.message}`, 'error');
      updateAgentState('validator', 'error');
    }
    
  } finally {
    // Always clean up, regardless of success or failure
    setValidating(false);
    setLoading(false);
    setProcessingProgress(0);
    
    // Only clear processingStage if we're not in 'complete' state
    // (complete state is set in the try block on success)
    if (processingStage !== 'complete') {
      setProcessingStage('');
    }
    
    console.log('[Validator] Cleanup complete');
  }
};

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

  const handleEditFromValidator = () => {
    console.log('[App] User wants to edit input from validator');
    setActiveTab('parser');
    setAttemptNumber(1);
    showToast('Edit your input and click "Start Processing" to regenerate', 'info');
  };

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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
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
    setCompletedStages([]);
    showToast('Pipeline reset', 'info');
  };

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

// Function to start completely over
const handleStartNew = () => {
  // Clear all state
  setInputText('');
  setParsedData(null);
  setReasoningResult(null);
  setGeneratedODRL(null);
  setValidationResult(null);
  setError(null);
  
  // Reset all agent states
  updateAgentState('parser', 'idle');
  updateAgentState('reasoner', 'idle');
  updateAgentState('generator', 'idle');
  updateAgentState('validator', 'idle');
  
  // Reset processing stage
  setProcessingStage('idle');
  setProcessingProgress(0);
  
  // Go back to parser tab
  setActiveTab('parser');
  
  showToast('Ready to create a new policy', 'success');
};

// Function to edit the generated ODRL manually
const handleEditManually = () => {
  // Switch to generator tab where editing happens
  setActiveTab('generator');
  showToast('Switched to editor. Click "Edit" to modify the policy.', 'info');
};

// Function to download the ODRL policy
const handleDownloadODRL = (content, filename = 'policy.ttl') => {
  try {
    const blob = new Blob([content], { type: 'text/turtle' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Policy downloaded successfully!', 'success');
  } catch (error) {
    console.error('Download error:', error);
    showToast('Failed to download policy', 'error');
  }
};

// Function to save ODRL to backend storage
const handleSaveToBackend = async () => {
  if (!generatedODRL?.odrl_turtle) {
    showToast('No policy to save', 'warning');
    return;
  }
  
  try {
    const metadata = {
      name: `Policy_${new Date().toISOString().split('T')[0]}`,
      description: originalText || inputText,
      odrl_turtle: generatedODRL.odrl_turtle,
      validation_status: validationResult?.is_valid ? 'valid' : 'invalid',
      created_at: new Date().toISOString(),
      metadata: {
        model_used: generatedODRL.model_used,
        processing_time_ms: generatedODRL.processing_time_ms,
        attempt_number: generatedODRL.attempt_number
      }
    };
    
    // Call your storage API
    const response = await fetch(`${API_BASE_URL}/api/storage/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata)
    });
    
    if (response.ok) {
      showToast('Policy saved to library!', 'success');
    } else {
      throw new Error('Save failed');
    }
  } catch (error) {
    console.error('Save error:', error);
    showToast('Failed to save policy', 'error');
  }
};

  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50';
  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  if (isInitializing) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
        <div className="text-center">
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

     <CompactHeader
  darkMode={darkMode}
  setDarkMode={setDarkMode}
  backendConnected={backendConnected}
  selectedModel={selectedModel}
  setSelectedModel={setSelectedModel}
  providers={providers}
  customModels={customModels}
  autoProgress={autoProgress}
  setAutoProgress={setAutoProgress}
  advancedMode={advancedMode}
  setAdvancedMode={setAdvancedMode}
  onOpenSettings={() => setSettingsOpen(true)}
  onOpenPerAgentSettings={() => setPerAgentModalOpen(true)}  // NEW!
  
/>

      <CompactAgentNav
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      agentStates={agentStates}
      parsedData={parsedData}
      reasoningResult={reasoningResult}
      generatedODRL={generatedODRL}
      validationResult={validationResult}
      darkMode={darkMode}
    />

      <div className="max-w-7xl mx-auto px-6 py-8">

       {activeTab === 'parser' && (
  <div className="space-y-6 animate-fade-in">
    
    {/* Show INPUT SECTION only if no parsed data yet */}
    {!parsedData && (
      <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className={`text-lg font-bold ${textClass} flex items-center gap-2`}>
            <FileText className="w-5 h-5" />
            Enter Policy Description
          </h2>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Example cards */}
          <SimpleExampleCards
            onSelectExample={(text) => setInputText(text)}
            darkMode={darkMode}
          />
          
          {/* Textarea */}
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
              placeholder="Describe your policy in natural language... Example: Users can read and print the document but cannot modify or distribute it. The policy expires on December 31, 2025. Or drag and drop a .txt, .md, or .json file here"
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
          
          {/* File upload and token count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}>
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">Choose File</span>
                <input
                  type="file"
                  accept=".txt,.md,.json"
                  onChange={async (e) => {
                    if (e.target.files[0]) {
                      const text = await uploadFile(e.target.files[0]);
                      if (text) setInputText(text);
                    }
                  }}
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
      
          {/* Upload status */}
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
        
          
          {/* Error display */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-200">Error</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleParse}
              disabled={loading || !inputText.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-500/30"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5" />
                  Start Parsing
                </>
              )}
            </button>
            
            {/* <button
              onClick={resetDemo}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Reset
            </button> */}
          </div>
        </div>
      </div>
    )}
    
    {/* Show RESULTS only if parsed data exists */}
    {parsedData && (
      <>
        {/* Add a compact summary header */}
        <div className={`${cardClass} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-4">
              <h3 className={`text-sm font-semibold ${textClass}`}>Original Input</h3>
              <p className={`text-xs ${mutedTextClass} mt-1 line-clamp-2`}>{inputText}</p>
            </div>
            <button
              onClick={() => {
                setParsedData(null);
                setReasoningResult(null);
                setGeneratedODRL(null);
                setValidationResult(null);
                updateAgentState('parser', 'idle');
                updateAgentState('reasoner', 'idle');
                updateAgentState('generator', 'idle');
                updateAgentState('validator', 'idle');
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex-shrink-0 ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Edit Input
            </button>
          </div>
        </div>
        
        {/* Parser Results with Continue button */}
        <ParserTab
          parsedData={parsedData}
          darkMode={darkMode}
          onCopy={copyToClipboard}
          onDownload={downloadJSON}
          onContinue={() => handleReason()}
          isLoading={loading}         
        />
      </>
    )}
    
    {/* Footer - only show when no parsed data */}
    {!parsedData && (
      <div className={`flex items-center justify-end gap-3 text-sm ${mutedTextClass} pt-2`}>
        <button onClick={resetDemo} className={`hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          Reset
        </button>
        <span>•</span>
        <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className={`hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          API Docs
        </a>
      </div>
    )}
  </div>
)}

        {activeTab === 'reasoner' && (
          <div className="space-y-6 animate-fade-in">
            {!reasoningResult ? (
              <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
                <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className={`text-xl font-bold ${textClass}`}>Step 2: Policy Analysis</h2>
                  <p className={`text-sm ${mutedTextClass} mt-1`}>Review policy validation results</p>
                </div>
                <div className={`p-12 text-center ${mutedTextClass}`}>
                  <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Please parse text first</p>
                  <p className="text-sm mt-2">Go to Parser tab and click &quot;Start Parsing&quot;</p>
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
                  <span>{reasoningResult.processing_time_ms}ms • {reasoningResult.model_used}</span>
                </div>
              </>
            )}
          </div>
        )}

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

        {activeTab === 'validator' && (
  <ValidatorTab
    validationResult={validationResult}
    generatedODRL={generatedODRL}
    darkMode={darkMode}
    onRegenerate={handleRegenerate}
    isRegenerating={regenerating}
    originalText={inputText}
    
    // ✅ ADD THESE PROPS:
    onDownload={(content, filename) => handleDownloadODRL(content, filename)}
    onSave={handleSaveToBackend}
    onStartNew={handleStartNew}
    onEditManually={handleEditManually}
    metrics={{
      parseTime: metrics.parseTime,
      reasonTime: metrics.reasonTime,
      generateTime: metrics.generateTime,
      validateTime: metrics.validateTime
    }}
  />
)}
 
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

{/* FIX: Remove activeTab === 'validator' check so it shows on all tabs */}
{processingStage !== 'idle' && activeTab !== 'generator' && activeTab !== 'validator' && (  <div className={`border-t ${darkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'} backdrop-blur-sm sticky bottom-0 z-30`}>
    <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
      
      {/* Continue button - hide on parser, reasoner tabs since they have their own buttons */}
      {!loading && activeTab !== 'parser' && activeTab !== 'reasoner' && (
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
          <span className={`text-sm font-medium ${textClass}`}>{processingStage}</span>
        </div>
      )}

      {/* Stop button when loading */}
      {loading && (
        <button 
          onClick={handleStop} 
          className="px-5 py-2.5 rounded-lg font-medium transition bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
        >
          Stop
        </button>
      )}

      {/* Reset button - ALWAYS VISIBLE */}
      <button 
        onClick={resetDemo} 
        className={`px-5 py-2.5 rounded-lg font-medium transition ${
          darkMode 
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }`}
      >
        Reset
      </button>
    </div>
  </div>
)}
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


        {/* Per-Agent Model Settings Modal */}
      <PerAgentModelModal
        isOpen={perAgentModalOpen}
        onClose={() => setPerAgentModalOpen(false)}
        agentModels={agentModels}
        setAgentModels={setAgentModels}
        selectedModel={selectedModel}
        providers={providers}
        customModels={customModels}
        darkMode={darkMode}
        textClass={textClass}
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