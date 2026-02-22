import React, { useState } from 'react';
import { 
  Shield, AlertCircle, CheckCircle, Info, ChevronDown, ChevronUp, 
  FileText, Code, Loader2, Download, Save, RotateCcw, RefreshCw, 
  Edit3, PlusCircle
} from 'lucide-react';

export const ValidatorTab = ({ 
  validationResult, 
  darkMode = false, 
  generatedODRL = null, 
  onRegenerate = null, 
  isRegenerating = false, 
  originalText = null,
  onDownload = () => {},
  onSave = () => {},
  onStartNew = () => {},
  onEditManually = () => {},
  metrics = {}
}) => {
  const [showPolicy, setShowPolicy] = useState(false);
  
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';
  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  const totalTime = (metrics.parseTime || 0) + (metrics.reasonTime || 0) + 
                    (metrics.generateTime || 0) + (metrics.validateTime || 0);

  if (!validationResult) {
    return (
      <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${textClass}`}>Step 4: SHACL Validation</h2>
          <p className={`text-sm ${mutedTextClass} mt-1`}>Validate ODRL policy against official specification</p>
        </div>
        <div className={`p-12 text-center ${mutedTextClass}`}>
          <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No validation results yet</p>
          <p className="text-sm mt-2">Generate ODRL first, then validate</p>
        </div>
      </div>
    );
  }

  const { is_valid, issues = [], llm_explanation } = validationResult;

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* ========== VALIDATION DETAILS FIRST (Top of page) ========== */}
      {!isRegenerating && !is_valid && issues.length > 0 && (
        <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
          <div className={`px-5 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-base font-bold ${textClass}`}>Validation Details</h3>
          </div>
          <div className="px-5 py-4">
            <h4 className={`font-semibold mb-3 ${textClass} text-sm`}>Violations:</h4>
            <div className="space-y-3">
              {issues.map((issue, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${
                    darkMode ? 'bg-orange-900/10 border-orange-800' : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-orange-600 dark:text-orange-400 text-sm">
                      {index + 1}.
                    </span>
                    <div className="flex-1">
                      <h4 className={`font-semibold text-sm ${textClass} mb-1`}>
                        {issue.type || 'Validation Error'}
                      </h4>
                      {issue.field && issue.field !== 'unknown' && (
                        <p className={`text-xs ${mutedTextClass} mb-1`}>
                          <span className="font-medium">Field:</span>{' '}
                          <code className={`${darkMode ? 'bg-black/20' : 'bg-white/50'} px-1.5 py-0.5 rounded`}>
                            {issue.field}
                          </code>
                        </p>
                      )}
                      {issue.message && (
                        <p className={`text-xs ${mutedTextClass}`}>
                          <span className="font-medium">Issue:</span> {issue.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {llm_explanation && (
            <div className={`px-5 py-3 border-t ${darkMode ? 'border-gray-700 bg-blue-900/10' : 'border-gray-200 bg-blue-50'}`}>
              <h4 className={`text-xs font-semibold mb-2 ${textClass} flex items-center gap-2`}>
                <Info className="w-3 h-3" />
                AI Suggestion:
              </h4>
              <div className={`text-xs ${mutedTextClass} space-y-1`}>
                {llm_explanation.split('\n').filter(line => line.trim()).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== ORIGINAL INPUT - Compact ========== */}
      {!isRegenerating && originalText && (
        <div className={`${cardClass} border rounded-lg shadow-sm overflow-hidden`}>
          <div className="px-4 py-2.5 flex items-center gap-2">
            <FileText className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${mutedTextClass}`}>Original: <span className={`${textClass} italic`}>"{originalText}"</span></p>
            </div>
          </div>
        </div>
      )}

      {/* ========== GENERATED POLICY - Compact Collapsible ========== */}
      {!isRegenerating && generatedODRL && generatedODRL.odrl_turtle && (
        <div className={`${cardClass} border rounded-lg shadow-sm overflow-hidden`}>
          <button
            onClick={() => setShowPolicy(!showPolicy)}
            className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition`}
          >
            <div className="flex items-center gap-2">
              <Code className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              <div className="text-left">
                <span className={`text-sm font-semibold ${textClass}`}>
                  Generated Policy (Turtle)
                </span>
                <span className={`text-xs ${mutedTextClass} ml-2`}>
                  {generatedODRL.odrl_turtle.length} chars
                  {generatedODRL.attempt_number && generatedODRL.attempt_number > 1 && 
                    ` • Attempt #${generatedODRL.attempt_number}`
                  }
                </span>
              </div>
            </div>
            {showPolicy ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showPolicy && (
            <div className="px-4 pb-3 border-t dark:border-gray-700">
              <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-3 overflow-auto max-h-60 mt-3`}>
                <pre className={`text-xs ${textClass} font-mono leading-relaxed`}>
                  {generatedODRL.odrl_turtle}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== REGENERATING STATE ========== */}
      {isRegenerating && (
        <div className={`${cardClass} border-2 border-blue-500 rounded-lg shadow-lg overflow-hidden`}>
          <div className="px-6 py-8 text-center">
            <Loader2 className={`w-10 h-10 mx-auto mb-3 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h3 className={`text-lg font-bold ${textClass} mb-1`}>
              Regenerating Policy...
            </h3>
            <p className={`text-xs ${mutedTextClass}`}>
              Analyzing validation errors and generating corrected ODRL
            </p>
          </div>
        </div>
      )}

      {/* ========== COMPACT COMPLETION CARD (At bottom) ========== */}
      {!isRegenerating && (
        <div className={`${cardClass} border-2 rounded-lg shadow-md overflow-hidden ${
          is_valid ? 'border-green-500' : 'border-orange-500'
        }`}>
          <div className={`px-4 py-3 ${
            is_valid
              ? darkMode ? 'bg-green-900/10' : 'bg-green-50'
              : darkMode ? 'bg-orange-900/10' : 'bg-orange-50'
          }`}>
            
            {is_valid ? (
              /* ===== SUCCESS - Compact ===== */
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-md flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${textClass}`}>
                      ✓ Validation Passed
                    </h3>
                    <p className={`text-xs ${mutedTextClass}`}>
                      All SHACL constraints satisfied
                      {totalTime > 0 && ` • ${totalTime}ms total`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onDownload(generatedODRL?.odrl_turtle, 'policy.ttl')}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                  <button
                    onClick={onSave}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </button>
                  <button
                    onClick={onStartNew}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition shadow-sm ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    New
                  </button>
                </div>
              </div>

            ) : (
              
              /* ===== FAILURE - Compact ===== */
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 shadow-md flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${textClass}`}>
                      Validation Issues Found
                    </h3>
                    <p className={`text-xs ${mutedTextClass}`}>
                      {issues.length} SHACL violation{issues.length !== 1 ? 's' : ''} detected
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition shadow-md font-semibold"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Auto-Fix & Regenerate
                    </button>
                  )}
                  <button
                    onClick={onEditManually}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={onStartNew}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition shadow-sm ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== FOOTER STATS - Minimal ========== */}
      <div className={`flex items-center justify-between text-xs ${mutedTextClass} px-1`}>
        <span>SHACL Validation</span>
        {validationResult.processing_time_ms && (
          <span>{validationResult.processing_time_ms}ms</span>
        )}
      </div>
    </div>
  );
};