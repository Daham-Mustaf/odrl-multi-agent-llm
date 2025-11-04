const handleProcess = async () => {
  if (!inputText.trim()) {
    setError('Please enter a policy description');
    showToast('Please enter a policy description', 'warning');
    return;
  }

  setLoading(true);
  setError(null);
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

  //Get abort signal for cancellation support
  const signal = getSignal();
  
  //Track completed stages for history
  const completedStages = [];

  // Helper function to get custom model config if it's a custom model
  const getModelConfig = (modelValue) => {
    if (!modelValue) return null;
    
    // Check if this is a custom model
    const customModel = customModels.find(m => m.value === modelValue);
    if (customModel) {
      // Return the custom model configuration
      return {
        provider_type: customModel.provider_type,
        base_url: customModel.base_url,
        model_id: customModel.model_id,
        api_key: customModel.api_key,
        context_length: customModel.context_length,
        temperature_default: customModel.temperature_default
      };
    }
    return null;
  };

  try {
    // ============================================
    // STAGE 1: PARSE
    // ============================================
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

    if (autoProgress) setActiveTab('reasoner');
    startTimes.reason = Date.now();

    // ============================================
    // STAGE 2: REASON
    // ============================================
    updateAgentState('reasoner', 'processing');
    setProcessingStage('Reasoning about policy...');
    setProcessingProgress(30);
    
    const reasonerModel = advancedMode && agentModels.reasoner ? agentModels.reasoner : selectedModel;
    const reasonerCustomConfig = getModelConfig(reasonerModel);
    
    const reasonResult = await callAPI('reason', {
      parsed_data: parseResult,
      model: reasonerModel,
      temperature,
      custom_model: reasonerCustomConfig
    }, signal);  
    
    setReasoningResult(reasonResult);
    setMetrics(prev => ({ ...prev, reasonTime: Date.now() - startTimes.reason }));
    updateAgentState('reasoner', 'completed');
    completedStages.push('reasoner');  
    setProcessingProgress(50);
    showToast('Reasoning completed!', 'success');

    if (autoProgress) setActiveTab('generator');
    startTimes.generate = Date.now();

    // ============================================
    // STAGE 3: GENERATE
    // ============================================
    updateAgentState('generator', 'processing');
    setProcessingStage('Generating ODRL policy...');
    setProcessingProgress(55);
    
    const generatorModel = advancedMode && agentModels.generator ? agentModels.generator : selectedModel;
    const generatorCustomConfig = getModelConfig(generatorModel);
    
    const genResult = await callAPI('generate', {
      reasoning_result: reasonResult,
      model: generatorModel,
      temperature,
      custom_model: generatorCustomConfig
    }, signal); 
    
    setGeneratedODRL(genResult);
    setMetrics(prev => ({ ...prev, generateTime: Date.now() - startTimes.generate }));
    updateAgentState('generator', 'completed');
    completedStages.push('generator'); 
    setProcessingProgress(75);
    showToast('ODRL policy generated!', 'success');

    if (autoProgress) setActiveTab('validator');
    startTimes.validate = Date.now();

    // ============================================
    // STAGE 4: VALIDATE
    // ============================================
    updateAgentState('validator', 'processing');
    setProcessingStage('Validating ODRL policy...');
    setProcessingProgress(80);
    
    const validatorModel = advancedMode && agentModels.validator ? agentModels.validator : selectedModel;
    const validatorCustomConfig = getModelConfig(validatorModel);
    
    const valResult = await callAPI('validate', {
      odrl_policy: genResult.odrl_policy,
      model: validatorModel,
      temperature,
      custom_model: validatorCustomConfig
    }, signal);  
    
    setValidationResult(valResult);
    setMetrics(prev => ({ ...prev, validateTime: Date.now() - startTimes.validate }));
    updateAgentState('validator', 'completed');
    completedStages.push('validator');  
    setProcessingProgress(100);
    showToast('Validation complete!', 'success');

    // ============================================
    // SAVE TO HISTORY (Success)
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
    console.log('Session saved to history:', historyId);

  } catch (err) {
    console.error('Processing error:', err);
    
    //Check if error is due to user cancellation
    if (err.message === 'Request cancelled by user' || err.name === 'AbortError') {
      console.log('User cancelled processing');
      setError('Processing cancelled by user');
      showToast('Processing cancelled', 'warning');
      
      // Mark processing agents as cancelled
      Object.keys(agentStates).forEach(agent => {
        if (agentStates[agent] === 'processing') {
          updateAgentState(agent, 'cancelled');
        }
      });

      //Save cancelled session to history
      const totalTime = Date.now() - startTimes.total;
      const historyItem = createHistoryItem({
        inputText,
        selectedModel,
        temperature,
        completedStages,
        parsedData,
        reasoningResult,
        generatedODRL,
        validationResult,
        totalTime,
        metrics,
        status: 'cancelled',
        error: 'Cancelled by user'
      });
      addToHistory(historyItem);
      
    } else {
      // Regular error
      setError(err.message);
      showToast(`Error: ${err.message}`, 'error');
      
      // Mark processing agents as error
      Object.keys(agentStates).forEach(agent => {
        if (agentStates[agent] === 'processing') {
          updateAgentState(agent, 'error');
        }
      });

      //Save failed session to history
      const totalTime = Date.now() - startTimes.total;
      const historyItem = createHistoryItem({
        inputText,
        selectedModel,
        temperature,
        completedStages,
        parsedData,
        reasoningResult,
        generatedODRL,
        validationResult,
        totalTime,
        metrics,
        status: 'failed',
        error: err.message
      });
      addToHistory(historyItem);
    }
    
  } finally {
    setLoading(false);
    setProcessingProgress(0);
    setProcessingStage('');
  }
};

// ============================================
// handleStop Function
// ============================================
const handleStop = () => {
  console.log('Stop button clicked - cancelling operations');
  
  // Abort all ongoing API calls
  abort('User clicked stop button');
  
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
  
  showToast('Processing stopped', 'warning');
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

// ============================================
// ✅ REQUIRED IMPORTS (Add these at the top of your file)
// ============================================
/*
import { StopButton } from './components/StopButton';
import { ChatHistory } from './components/ChatHistory';
import { useAbortController } from './hooks/useAbortController';
import { useChatHistory, createHistoryItem } from './hooks/useChatHistory';
*/

// ============================================
// ✅ REQUIRED HOOKS (Add these in your component)
// ============================================
/*
// Abort controller
const { getSignal, abort } = useAbortController();

// Chat history
const {
  history,
  addToHistory,
  clearHistory
} = useChatHistory(50);

// Track current history item
const [currentHistoryId, setCurrentHistoryId] = useState(null);
*/

// ============================================
// ✅ UPDATED callAPI Function (Add signal parameter)
// ============================================
/*
const callAPI = async (endpoint, body, signal = null) => {
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal  // ✅ ADD THIS
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `API request failed: ${response.statusText}`);
  }

  return response.json();
};
*/

// ============================================
// ✅ COMPONENTS TO ADD TO JSX
// ============================================
/*
// Add before closing </div> tag:

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
*/

// ============================================
// ✅ SUMMARY OF CHANGES
// ============================================
/*
1. ✅ Added abort signal to all callAPI calls
2. ✅ Track completed stages in array
3. ✅ Save to history on success
4. ✅ Save to history on failure
5. ✅ Save to history on cancellation
6. ✅ Handle abort errors separately
7. ✅ Add handleStop function
8. ✅ Add handleLoadHistory function
9. ✅ Mark agents as 'cancelled' when stopped
10. ✅ Include all metrics in history

FEATURES ADDED:
- 🛑 Stop button support
- 📚 Chat history tracking
- ⚠️  Proper error handling
- 📊 Complete metrics tracking
- 🔄 Session restore capability
*/