// components/tabs/ReasonerTab.jsx
import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  Edit3,
  Copy,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

/**
 * Reasoner with Full Results Display + User Confirmation
 */
export const ReasonerTab = ({ 
  reasoningResult, 
  darkMode = false,
  onCopy = () => {},
  onDownload = () => {},
  onContinue = () => {},
  onEdit = () => {}
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('visual'); // 'visual' or 'json'
  const [expandedPolicies, setExpandedPolicies] = useState(new Set([0]));

  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  const handleCopy = () => {
    onCopy(JSON.stringify(reasoningResult, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePolicy = (index) => {
    setExpandedPolicies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  };

  if (!reasoningResult) return null;

  const canContinue = reasoningResult.overall_status === 'valid';
  
  // Collect critical issues
  const criticalIssues = [];
  reasoningResult.policies?.forEach(policy => {
    policy.issues?.forEach(issue => {
      if (issue.severity === 'critical') {
        criticalIssues.push({
          policy_id: policy.policy_id,
          field: issue.field,
          description: issue.description,
          suggestion: issue.suggestion
        });
      }
    });
  });

  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-sm overflow-hidden`}>
      
      {/* Header with View Toggle */}
      <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700 bg-gradient-to-r from-purple-900/30 to-pink-900/30' : 'border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-bold ${textClass}`}>
              Reasoning Results
            </h2>
            <p className={`text-sm ${mutedTextClass} mt-1`}>
              Review analysis before proceeding
            </p>
          </div>
          <div className="flex gap-2">
            {/* View Toggle */}
            <div className={`flex items-center gap-1 p-1 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white/70'}`}>
              <button
                onClick={() => setViewMode('visual')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  viewMode === 'visual'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Visual
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  viewMode === 'json'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                JSON
              </button>
            </div>
            
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => onDownload(reasoningResult, 'reasoning.json')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {viewMode === 'json' ? (
          // JSON View
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4 overflow-auto max-h-96 mb-6`}>
            <pre className={`text-sm ${textClass}`}>
              {JSON.stringify(reasoningResult, null, 2)}
            </pre>
          </div>
        ) : (
          // Visual View
          <div className="space-y-4 mb-6">
            {/* Status Banner */}
            <div className={`border-2 rounded-xl p-5 ${
              canContinue 
                ? darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300'
                : darkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${canContinue ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center shadow-lg`}>
                  {canContinue ? (
                    <CheckCircle className="w-7 h-7 text-white" />
                  ) : (
                    <XCircle className="w-7 h-7 text-white" />
                  )}
                </div>
                <div>
                  <div className={`text-xl font-bold ${canContinue ? 'text-green-600' : 'text-red-600'}`}>
                    {canContinue ? 'All Valid' : 'Has Issues'}
                  </div>
                  <div className={`text-sm ${mutedTextClass}`}>
                    {canContinue 
                      ? 'Policies are complete and enforceable'
                      : `${criticalIssues.length} critical issue${criticalIssues.length !== 1 ? 's' : ''} found`
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className={`text-sm ${textClass}`}>
                {reasoningResult.summary}
              </p>
            </div>

            {/* Critical Issues (if any) */}
            {criticalIssues.length > 0 && (
              <div className={`border-2 rounded-xl p-5 ${darkMode ? 'bg-red-900/10 border-red-800' : 'bg-red-50 border-red-200'}`}>
                <h3 className="text-lg font-bold text-red-600 mb-4">
                  Critical Issues ({criticalIssues.length})
                </h3>
                <div className="space-y-3">
                  {criticalIssues.map((issue, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-lg border-l-4 border-red-500 ${
                        darkMode ? 'bg-gray-800' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className={`font-semibold ${textClass}`}>
                            Policy {issue.policy_id}: {issue.field}
                          </div>
                          <p className={`text-sm ${mutedTextClass} mt-1`}>
                            {issue.description}
                          </p>
                          {issue.suggestion && (
                            <div className={`mt-2 text-sm ${darkMode ? 'text-green-400' : 'text-green-700'} bg-green-500/10 px-3 py-2 rounded`}>
                              <strong>How to fix:</strong> {issue.suggestion}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Policy Details (collapsible) */}
            <div>
              <h3 className={`text-sm font-semibold ${mutedTextClass} mb-2`}>
                Policy Details ({reasoningResult.policies?.length || 0})
              </h3>
              <div className="space-y-2">
                {reasoningResult.policies?.map((policy, idx) => (
                  <div 
                    key={idx}
                    className={`border rounded-lg overflow-hidden ${
                      darkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => togglePolicy(idx)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${textClass}`}>
                          Policy {policy.policy_id}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          policy.is_valid 
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}>
                          {policy.is_valid ? 'Valid' : 'Invalid'}
                        </span>
                      </div>
                      {expandedPolicies.has(idx) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    
                    {expandedPolicies.has(idx) && (
                      <div className={`px-4 pb-3 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                        <pre className={`text-xs ${mutedTextClass} mt-2 overflow-auto`}>
                          {JSON.stringify(policy, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ✅ Decision Buttons - Extra Compact */}
        <div className={`border-t pt-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs ${mutedTextClass} mb-2 text-center`}>
            {criticalIssues.length === 0 
              ? '✅ Ready to proceed' 
              : `⚠️ ${criticalIssues.length} issue${criticalIssues.length !== 1 ? 's' : ''} - fix or continue`
            }
          </p>

          <div className="flex gap-2">
            <button
              onClick={onContinue}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition flex items-center justify-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Continue
            </button>
            
            <button
              onClick={onEdit}
              className="flex-1 px-3 py-2 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 transition flex items-center justify-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`px-6 py-3 border-t ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between text-xs">
          <span className={mutedTextClass}>
            Validated {reasoningResult.policies?.length || 0} policies
          </span>
          <span className={mutedTextClass}>
            {reasoningResult.processing_time_ms}ms • {reasoningResult.model_used}
          </span>
        </div>
      </div>
    </div>
  );
};
