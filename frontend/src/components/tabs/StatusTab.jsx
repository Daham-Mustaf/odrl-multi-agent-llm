import React from 'react';
import { Activity, CheckCircle, XCircle, Clock, Zap, AlertTriangle } from 'lucide-react';

const StatusTab = ({ 
  agentStates, 
  metrics, 
  processingProgress, 
  processingStage,
  sseConnected,
  sessionId,
  darkMode 
}) => {
  
  const getStatusIcon = (status) => {
    switch(status) {
      case 'active':
      case 'processing':
        return <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'completed':
      case 'done':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active':
      case 'processing':
        return darkMode ? 'bg-yellow-900/20 border-yellow-600' : 'bg-yellow-50 border-yellow-500';
      case 'completed':
      case 'done':
        return darkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-500';
      case 'error':
        return darkMode ? 'bg-red-900/20 border-red-600' : 'bg-red-50 border-red-500';
      case 'cancelled':
        return darkMode ? 'bg-orange-900/20 border-orange-600' : 'bg-orange-50 border-orange-500';
      default:
        return darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'active':
      case 'processing':
        return 'Processing';
      case 'completed':
      case 'done':
        return 'Completed';
      case 'error':
        return 'Error';
      case 'cancelled':
        return 'Cancelled';
      case 'idle':
      default:
        return 'Idle';
    }
  };

  const agents = [
    { key: 'parser', name: 'Parser Agent', description: 'Extracts policy components' },
    { key: 'reasoner', name: 'Reasoner Agent', description: 'Validates and analyzes' },
    { key: 'generator', name: 'Generator Agent', description: 'Creates ODRL policy' },
    { key: 'validator', name: 'Validator Agent', description: 'SHACL validation' }
  ];

  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* SSE Connection Status */}
      <div className={`${cardClass} border rounded-xl shadow-sm p-6`}>
        <h3 className={`text-lg font-bold ${textClass} mb-4 flex items-center gap-2`}>
          <Activity className="w-5 h-5" />
          Live Connection Status
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SSE Status */}
          <div className={`p-4 rounded-lg border-2 ${
            sseConnected 
              ? 'bg-green-500/10 border-green-500' 
              : 'bg-red-500/10 border-red-500'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${
                sseConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className={`font-semibold ${textClass}`}>SSE Connection</span>
            </div>
            <p className={`text-sm ${mutedTextClass}`}>
              {sseConnected ? 'Connected to live updates' : 'Disconnected'}
            </p>
          </div>

          {/* Session ID */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className={`font-semibold ${textClass}`}>Session ID</span>
            </div>
            <p className={`text-xs font-mono ${mutedTextClass} truncate`}>
              {sessionId || 'Not initialized'}
            </p>
          </div>

          {/* Overall Progress */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-500" />
              <span className={`font-semibold ${textClass}`}>Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
              <span className={`text-sm font-bold ${textClass}`}>{processingProgress}%</span>
            </div>
          </div>
        </div>

        {/* Current Stage */}
        {processingStage && (
          <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              <strong>Current:</strong> {processingStage}
            </p>
          </div>
        )}
      </div>

      {/* Agent Status Cards */}
      <div className={`${cardClass} border rounded-xl shadow-sm p-6`}>
        <h3 className={`text-lg font-bold ${textClass} mb-4`}>Agent Pipeline Status</h3>
        
        <div className="space-y-3">
          {agents.map((agent, index) => {
            const status = agentStates[agent.key] || 'idle';
            const time = metrics[`${agent.key === 'generator' ? 'generate' : agent.key === 'reasoner' ? 'reason' : agent.key === 'validator' ? 'validate' : 'parse'}Time`] || 0;

            return (
              <div
                key={agent.key}
                className={`p-4 rounded-lg border-2 transition-all ${getStatusColor(status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {getStatusIcon(status)}
                    </div>

                    {/* Agent Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${textClass}`}>
                          {index + 1}. {agent.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          status === 'active' ? 'bg-yellow-500 text-white' :
                          status === 'done' ? 'bg-green-500 text-white' :
                          status === 'error' ? 'bg-red-500 text-white' :
                          darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {getStatusText(status)}
                        </span>
                      </div>
                      <p className={`text-sm ${mutedTextClass} mt-1`}>
                        {agent.description}
                      </p>
                    </div>
                  </div>

                  {/* Timing Info */}
                  {time > 0 && (
                    <div className={`text-right ${mutedTextClass}`}>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{(time / 1000).toFixed(2)}s</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Bar for Active Agent */}
                {status === 'active' && (
                  <div className="mt-3">
                    <div className={`h-1 rounded-full overflow-hidden ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" 
                           style={{ width: '100%' }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className={`${cardClass} border rounded-xl shadow-sm p-6`}>
        <h3 className={`text-lg font-bold ${textClass} mb-4`}>Performance Metrics</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Parse', value: metrics.parseTime },
            { label: 'Reason', value: metrics.reasonTime },
            { label: 'Generate', value: metrics.generateTime },
            { label: 'Validate', value: metrics.validateTime }
          ].map((metric) => (
            <div key={metric.label} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className={`text-xs ${mutedTextClass} mb-1`}>{metric.label}</p>
              <p className={`text-2xl font-bold ${textClass}`}>
                {metric.value > 0 ? `${(metric.value / 1000).toFixed(2)}s` : '-'}
              </p>
            </div>
          ))}
        </div>

        {/* Total Time */}
        {Object.values(metrics).some(v => v > 0) && (
          <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
            <div className="flex justify-between items-center">
              <span className={`font-semibold ${textClass}`}>Total Processing Time</span>
              <span className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {((metrics.parseTime + metrics.reasonTime + metrics.generateTime + metrics.validateTime) / 1000).toFixed(2)}s
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default StatusTab;