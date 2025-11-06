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

  const signal = getSignal();
  const completedStages = [];

  const getModelConfig = (modelValue) => {
    if (!modelValue) return null;
    const customModel = customModels.find(m => m.value === modelValue);
    if (customModel) {
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

    // Check if auto-progress is ON
    if (!autoProgress) {
      // Manual mode - stop here and show reasoner tab
      setActiveTab('reasoner');
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
        status: 'completed'
      });
      addToHistory(historyItem);
      setCurrentHistoryId(historyItem.id);
      return; // Stop here - user must click Continue
    }

    // Auto-progress mode - continue to generation
    startTimes.generate = Date.now();

    // ============================================
    // STAGE 3: GENERATE (Auto if auto-progress ON)
    // ============================================
    updateAgentState('generator', 'processing');
    setProcessingStage('Generating ODRL policy...');
    setProcessingProgress(65);
    
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
    setProcessingProgress(80);
    showToast('ODRL policy generated!', 'success');

    startTimes.validate = Date.now();

    // ============================================
    // STAGE 4: VALIDATE (Auto if auto-progress ON)
    // ============================================
    updateAgentState('validator', 'processing');
    setProcessingStage('Validating with SHACL...');
    setProcessingProgress(90);
    
    const validatorModel = advancedMode && agentModels.validator ? agentModels.validator : selectedModel;
    const validatorCustomConfig = getModelConfig(validatorModel);
    
    const odrlPolicy = genResult.odrl_policy || genResult.odrl || genResult;
    
    const valResult = await callAPI('validate', {
      odrl_policy: odrlPolicy,
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

    // Auto-switch to validator tab to show final results
    setActiveTab('validator');

    // Save complete workflow to history
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