import React from 'react';
import { Clock, Activity, Zap, FileText, Brain, Code, Shield, TrendingUp, DollarSign, Gauge } from 'lucide-react';

/**
 * MetricsBar Component
 * 
 * Displays comprehensive metrics about the ODRL policy generation process including:
 * - Processing times for each agent
 * - Token usage and cost estimates
 * - Success rates and efficiency metrics
 * - Model performance indicators
 */
const MetricsBar = ({ 
  metrics = {},
  inputText = '',
  parsedData = null,
  reasoningResult = null,
  generatedODRL = null,
  validationResult = null,
  selectedModel = '',
  darkMode = false,
  showMetrics = true,
  attemptNumber = 1
}) => {
  
  // ============================================
  // TOKEN COUNTING UTILITIES
  // ============================================
  
  /**
   * Estimate token count (rough approximation)
   * More accurate with js-tiktoken, but this works without it
   */
  const estimateTokens = (text) => {
    if (!text) return 0;
    // Average: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  };

  /**
   * Calculate total tokens used across all stages
   */
  const calculateTokenMetrics = () => {
    const inputTokens = estimateTokens(inputText);
    const parserOutputTokens = parsedData ? estimateTokens(JSON.stringify(parsedData)) : 0;
    const reasonerOutputTokens = reasoningResult ? estimateTokens(JSON.stringify(reasoningResult)) : 0;
    const generatorOutputTokens = generatedODRL ? estimateTokens(JSON.stringify(generatedODRL)) : 0;
    const validatorOutputTokens = validationResult ? estimateTokens(JSON.stringify(validationResult)) : 0;

    // Each agent receives context from previous stages
    const parserTotal = inputTokens + parserOutputTokens;
    const reasonerTotal = inputTokens + parserOutputTokens + reasonerOutputTokens;
    const generatorTotal = inputTokens + parserOutputTokens + reasonerOutputTokens + generatorOutputTokens;
    const validatorTotal = generatorOutputTokens + validatorOutputTokens;

    const totalTokens = parserTotal + reasonerTotal + generatorTotal + validatorTotal;

    return {
      input: inputTokens,
      parser: parserTotal,
      reasoner: reasonerTotal,
      generator: generatorTotal,
      validator: validatorTotal,
      total: totalTokens
    };
  };

  /**
   * Estimate cost based on model and token usage
   * Prices as of 2024 (approximate)
   */
  const estimateCost = (tokens, model) => {
    const costPer1MTokens = {
      'llama3.3': 0, // Free (local)
      'gpt-4': 30.00,
      'gpt-4-turbo': 10.00,
      'gpt-3.5-turbo': 0.50,
      'claude-3-opus': 15.00,
      'claude-3-sonnet': 3.00,
      'gemini-pro': 0.50,
      'default': 0
    };

    const modelKey = Object.keys(costPer1MTokens).find(key => 
      model.toLowerCase().includes(key)
    ) || 'default';

    const cost = (tokens / 1000000) * costPer1MTokens[modelKey];
    return cost;
  };

  // ============================================
  // PERFORMANCE METRICS
  // ============================================

  /**
   * Calculate processing efficiency
   */
  const calculateEfficiency = () => {
    const totalTime = Object.values(metrics).reduce((sum, time) => sum + time, 0);
    const tokenMetrics = calculateTokenMetrics();
    
    if (totalTime === 0) return 0;
    
    // Tokens per second
    const tokensPerSecond = (tokenMetrics.total / (totalTime / 1000)).toFixed(0);
    
    return tokensPerSecond;
  };

  /**
   * Calculate success rate
   */
  const calculateSuccessRate = () => {
    if (!validationResult) return null;
    
    if (validationResult.is_valid) {
      return 100;
    }
    
    // Partial success based on error count
    const totalIssues = validationResult.issues?.length || 0;
    if (totalIssues === 0) return 100;
    
    // Assume max 20 possible issues, scale accordingly
    const maxIssues = 20;
    const successRate = Math.max(0, ((maxIssues - totalIssues) / maxIssues) * 100);
    
    return Math.round(successRate);
  };

  /**
   * Get total processing time
   */
  const getTotalTime = () => {
    const total = Object.values(metrics).reduce((sum, time) => sum + time, 0);
    return (total / 1000).toFixed(2);
  };

  // ============================================
  // DATA PREPARATION
  // ============================================

  const tokenMetrics = calculateTokenMetrics();
  const estimatedCost = estimateCost(tokenMetrics.total, selectedModel);
  const efficiency = calculateEfficiency();
  const successRate = calculateSuccessRate();
  const totalTime = getTotalTime();

  // ============================================
  // STYLING
  // ============================================

  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';
  const accentClass = darkMode ? 'text-blue-400' : 'text-blue-600';

  if (!showMetrics) return null;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className={`text-lg font-bold ${textClass} flex items-center gap-2`}>
          <Activity className="w-5 h-5" />
          Processing Metrics
        </h2>
      </div>

      {/* Metrics Grid */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Processing Time */}
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          label="Total Time"
          value={`${totalTime}s`}
          subtitle={`${Object.keys(metrics).filter(k => metrics[k] > 0).length}/4 stages`}
          darkMode={darkMode}
          color="blue"
        />

        {/* Token Usage */}
        <MetricCard
          icon={<FileText className="w-5 h-5" />}
          label="Total Tokens"
          value={tokenMetrics.total.toLocaleString()}
          subtitle={`Input: ${tokenMetrics.input.toLocaleString()}`}
          darkMode={darkMode}
          color="indigo"
        />

        {/* Processing Efficiency */}
        <MetricCard
          icon={<Zap className="w-5 h-5" />}
          label="Efficiency"
          value={efficiency > 0 ? `${efficiency} t/s` : 'N/A'}
          subtitle="Tokens per second"
          darkMode={darkMode}
          color="yellow"
        />

        {/* Estimated Cost */}
        <MetricCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Est. Cost"
          value={estimatedCost > 0 ? `$${estimatedCost.toFixed(4)}` : 'Free'}
          subtitle={selectedModel.includes('llama') ? 'Local model' : 'API usage'}
          darkMode={darkMode}
          color="green"
        />

        {/* Parser Time */}
        {metrics.parseTime > 0 && (
          <MetricCard
            icon={<FileText className="w-4 h-4" />}
            label="Parser"
            value={`${(metrics.parseTime / 1000).toFixed(2)}s`}
            subtitle={`${tokenMetrics.parser.toLocaleString()} tokens`}
            darkMode={darkMode}
            color="blue"
            size="small"
          />
        )}

        {/* Reasoner Time */}
        {metrics.reasonTime > 0 && (
          <MetricCard
            icon={<Brain className="w-4 h-4" />}
            label="Reasoner"
            value={`${(metrics.reasonTime / 1000).toFixed(2)}s`}
            subtitle={`${tokenMetrics.reasoner.toLocaleString()} tokens`}
            darkMode={darkMode}
            color="purple"
            size="small"
          />
        )}

        {/* Generator Time */}
        {metrics.generateTime > 0 && (
          <MetricCard
            icon={<Code className="w-4 h-4" />}
            label="Generator"
            value={`${(metrics.generateTime / 1000).toFixed(2)}s`}
            subtitle={`${tokenMetrics.generator.toLocaleString()} tokens`}
            darkMode={darkMode}
            color="green"
            size="small"
          />
        )}

        {/* Validator Time */}
        {metrics.validateTime > 0 && (
          <MetricCard
            icon={<Shield className="w-4 h-4" />}
            label="Validator"
            value={`${(metrics.validateTime / 1000).toFixed(2)}s`}
            subtitle={`${tokenMetrics.validator.toLocaleString()} tokens`}
            darkMode={darkMode}
            color="orange"
            size="small"
          />
        )}

        {/* Success Rate */}
        {successRate !== null && (
          <MetricCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Success Rate"
            value={`${successRate}%`}
            subtitle={successRate === 100 ? 'All valid' : `${validationResult?.issues?.length || 0} issues`}
            darkMode={darkMode}
            color={successRate === 100 ? 'green' : successRate >= 50 ? 'yellow' : 'red'}
          />
        )}

        {/* Attempt Number */}
        {attemptNumber > 1 && (
          <MetricCard
            icon={<Gauge className="w-5 h-5" />}
            label="Attempt"
            value={`#${attemptNumber}`}
            subtitle={attemptNumber >= 3 ? 'Max reached' : 'Regenerated'}
            darkMode={darkMode}
            color="purple"
          />
        )}
      </div>

      {/* Detailed Breakdown (collapsible) */}
      <details className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <summary className={`px-6 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${mutedTextClass} text-sm font-medium`}>
          View Detailed Token Breakdown
        </summary>
        <div className="px-6 py-4 space-y-3">
          <TokenBreakdownRow label="Input" tokens={tokenMetrics.input} darkMode={darkMode} />
          <TokenBreakdownRow label="Parser Output" tokens={tokenMetrics.parser - tokenMetrics.input} darkMode={darkMode} />
          <TokenBreakdownRow label="Reasoner Output" tokens={tokenMetrics.reasoner - tokenMetrics.parser} darkMode={darkMode} />
          <TokenBreakdownRow label="Generator Output" tokens={tokenMetrics.generator - tokenMetrics.reasoner} darkMode={darkMode} />
          <TokenBreakdownRow label="Validator Output" tokens={tokenMetrics.validator - tokenMetrics.generator} darkMode={darkMode} />
          <div className={`pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <TokenBreakdownRow label="Total" tokens={tokenMetrics.total} darkMode={darkMode} bold />
          </div>
        </div>
      </details>
    </div>
  );
};

// ============================================
// HELPER COMPONENTS
// ============================================

/**
 * Individual metric card
 */
const MetricCard = ({ icon, label, value, subtitle, darkMode, color = 'blue', size = 'normal' }) => {
  const colors = {
    blue: 'from-blue-500 to-cyan-500',
    indigo: 'from-indigo-500 to-purple-500',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-green-500 to-emerald-500',
    yellow: 'from-yellow-500 to-orange-500',
    orange: 'from-orange-500 to-red-500',
    red: 'from-red-500 to-rose-500'
  };

  const bgClass = darkMode ? 'bg-gray-700/50' : 'bg-gray-50';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={`${bgClass} rounded-lg p-4 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${colors[color]}`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
      </div>
      <div className={`text-xs ${mutedTextClass} mb-1`}>
        {label}
      </div>
      <div className={`${size === 'small' ? 'text-lg' : 'text-2xl'} font-bold ${textClass} mb-1`}>
        {value}
      </div>
      <div className={`text-xs ${mutedTextClass}`}>
        {subtitle}
      </div>
    </div>
  );
};

/**
 * Token breakdown row
 */
const TokenBreakdownRow = ({ label, tokens, darkMode, bold = false }) => {
  const textClass = darkMode ? 'text-gray-300' : 'text-gray-700';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-bold' : ''} ${textClass}`}>
        {label}
      </span>
      <span className={`text-sm ${bold ? 'font-bold' : ''} ${mutedTextClass}`}>
        {tokens.toLocaleString()} tokens
      </span>
    </div>
  );
};

export default MetricsBar;