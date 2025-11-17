// components/tabs/ValidatorTab.jsx
import React, { useState } from 'react';
import { 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  Code,
  Loader2
} from 'lucide-react';

/**
 * Enhanced Validator Tab - Collapsible sections + regeneration state
 */
export const ValidatorTab = ({ 
  validationResult,
  darkMode = false,
  generatedODRL = null,
  onRegenerate = null,
  isRegenerating = false,
  originalText = null  //  NEW: Original user input
}) => {
  const [showPolicy, setShowPolicy] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';
  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  if (!validationResult) {
    return (
      <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${textClass}`}>Step 4: SHACL Validation</h2>
          <p className={`text-sm ${mutedTextClass} mt-1`}>
            Validate ODRL policy against official specification
          </p>
        </div>
        <div className={`p-12 text-center ${mutedTextClass}`}>
          <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No validation results yet</p>
          <p className="text-sm mt-2">Generate ODRL first, then validate</p>
        </div>
      </div>
    );
  }

  const { is_valid, issues = [], summary, llm_explanation } = validationResult;

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Regeneration Loading Overlay */}
      {isRegenerating && (
        <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
          <div className="px-6 py-8 text-center">
            <Loader2 className={`w-12 h-12 mx-auto mb-4 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h3 className={`text-lg font-bold ${textClass} mb-2`}>
              Regenerating Policy with Fixes...
            </h3>
            <p className={`text-sm ${mutedTextClass}`}>
              Analyzing validation errors and generating corrected ODRL policy
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Validation Status */}
      {!isRegenerating && (
        <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
          
          {/* Header with Status */}
          <div className={`px-6 py-4 border-b ${
            is_valid 
              ? darkMode ? 'border-green-800 bg-gradient-to-r from-green-900/30 to-emerald-900/30' : 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50'
              : darkMode ? 'border-red-800 bg-gradient-to-r from-red-900/30 to-orange-900/30' : 'border-red-200 bg-gradient-to-r from-red-50 to-orange-50'
          }`}>
            <div className="flex items-center gap-3">
              {is_valid ? (
                <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h2 className={`text-xl font-bold ${textClass}`}>
                  {is_valid ? 'SHACL Validation Passed ✓' : 'SHACL Validation Failed ✗'}
                </h2>
                <p className={`text-sm ${mutedTextClass} mt-1`}>
                  {is_valid 
                    ? 'Generated ODRL policy conforms to the official specification'
                    : `Found ${issues.length} violation${issues.length !== 1 ? 's' : ''} in the generated policy`
                  }
                </p>
              </div>
              
              {/* Regenerate Button */}
              {!is_valid && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                  className="px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-lg"
                >
                  🔄 Regenerate with Fixes
                </button>
              )}
            </div>
          </div>

          {/* Violations List */}
          {!is_valid && issues.length > 0 && (
            <div className="px-6 py-4">
              <h3 className={`font-semibold mb-4 ${textClass}`}>Violations:</h3>
              
              <div className="space-y-4">
                {issues.map((issue, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border ${
                      issue.severity === 'Warning'
                        ? darkMode ? 'bg-yellow-900/10 border-yellow-800' : 'bg-yellow-50 border-yellow-200'
                        : darkMode ? 'bg-red-900/10 border-red-800' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {/* Issue Number and Type */}
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`font-bold ${
                        issue.severity === 'Warning' 
                          ? 'text-yellow-600 dark:text-yellow-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {index + 1}.
                      </span>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${textClass}`}>
                          {issue.type || 'Validation Error'}
                        </h4>
                      </div>
                    </div>

                    {/* Issue Details */}
                    <div className={`space-y-1 ml-6 text-sm ${mutedTextClass}`}>
                      {/* Field */}
                      {issue.field && issue.field !== 'unknown' && (
                        <p>
                          <span className="font-medium">Field:</span>{' '}
                          <code className={`${darkMode ? 'bg-black/20' : 'bg-white/50'} px-1.5 py-0.5 rounded`}>
                            {issue.field}
                          </code>
                        </p>
                      )}

                      {/* Issue Message */}
                      {issue.message && (
                        <p>
                          <span className="font-medium">Issue:</span>{' '}
                          {issue.message}
                        </p>
                      )}

                      {/* Actual Value */}
                      {issue.actual_value && issue.actual_value !== 'N/A' && issue.actual_value !== 'not specified' && (
                        <p>
                          <span className="font-medium">Actual Value:</span>{' '}
                          <code className={`${darkMode ? 'bg-black/20' : 'bg-white/50'} px-1.5 py-0.5 rounded`}>
                            {issue.actual_value}
                          </code>
                        </p>
                      )}

                      {/* Location/Focus Node */}
                      {issue.focus_node && issue.focus_node !== 'N/A' && (
                        <p>
                          <span className="font-medium">Location:</span>{' '}
                          <code className={`${darkMode ? 'bg-black/20' : 'bg-white/50'} px-1.5 py-0.5 rounded text-xs`}>
                            {issue.focus_node}
                          </code>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {is_valid && (
            <div className="px-6 py-4">
              <div className={`rounded-lg p-4 ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
                <p className={`text-sm ${mutedTextClass}`}>
                   No violations found. All SHACL constraints are satisfied.
                </p>
                <p className={`text-sm ${mutedTextClass} mt-2`}>
                  Your ODRL policy is valid and ready for deployment!
                </p>
              </div>
            </div>
          )}

          {/* LLM Explanation (Optional) */}
          {llm_explanation && (
            <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h4 className={`text-sm font-semibold mb-2 ${textClass}`}>💡 AI Suggestion:</h4>
              <p className={`text-sm ${mutedTextClass} whitespace-pre-wrap`}>
                {llm_explanation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Original Statement (always visible, not collapsible) */}
{!isRegenerating && originalText && (
  <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
    <div className="px-6 py-4 flex items-start gap-3">
      <FileText className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
      <div className="flex-1">
        <h3 className={`text-lg font-bold ${textClass} mb-2`}>
          Original Policy Statement:
        </h3>
        <p className={`text-sm ${textClass}`}>
          {originalText}
        </p>
      </div>
    </div>
  </div>
)}


     {/* Generated Policy (always visible, not collapsible) */}
{!isRegenerating && generatedODRL && generatedODRL.odrl_turtle && (
  <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
    <div className="px-6 py-4 flex items-start gap-3">
      <Code className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
      <div className="flex-1">
        <h3 className={`text-lg font-bold ${textClass} mb-2`}>
          Generated Policy (Turtle)
        </h3>
        {generatedODRL.attempt_number && generatedODRL.attempt_number > 1 && (
          <span className="text-xs px-2 py-1 bg-orange-500 text-white rounded">
            Attempt #{generatedODRL.attempt_number}
          </span>
        )}
        <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4 mt-2 overflow-auto max-h-96`}>
          <pre className={`text-sm ${textClass} font-mono`}>
            {generatedODRL.odrl_turtle}
          </pre>
        </div>
      </div>
    </div>
  </div>
)}


      {/* Footer */}
      <div className={`flex items-center justify-between text-xs ${mutedTextClass}`}>
        <span>Validator: SHACL Compliance Checking</span>
        {validationResult.processing_time_ms && (
          <span>{validationResult.processing_time_ms}ms</span>
        )}
      </div>
    </div>
  );
};