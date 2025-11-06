// components/tabs/GeneratorTab.jsx
import React, { useState } from 'react';
import { 
  Code, 
  Copy, 
  Download, 
  CheckCircle,
  Shield,
  AlertTriangle,
  RefreshCw,
  Edit3,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Info
} from 'lucide-react';

/**
 * Generator Tab - Shows ODRL + Validation
 */
export const GeneratorTab = ({ 
  generatedODRL,
  validationResult,
  darkMode = false,
  onCopy = () => {},
  onDownload = () => {},
  onValidate = () => {},
  onRegenerate = () => {},
  onEditInput = () => {},
  isValidating = false
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('formatted');
  const [showValidation, setShowValidation] = useState(true);

  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';
  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  const handleCopy = () => {
    const odrlJson = generatedODRL?.odrl_policy || generatedODRL?.odrl || generatedODRL;
    onCopy(JSON.stringify(odrlJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const odrlJson = generatedODRL?.odrl_policy || generatedODRL?.odrl || generatedODRL;
    onDownload(odrlJson, 'odrl-policy.json');
  };

  if (!generatedODRL) {
    return (
      <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${textClass}`}>Step 3: ODRL Generation</h2>
          <p className={`text-sm ${mutedTextClass} mt-1`}>
            Generate ODRL policy from validated rules
          </p>
        </div>
        <div className={`p-12 text-center ${mutedTextClass}`}>
          <Code className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No ODRL policy generated yet</p>
          <p className="text-sm mt-2">Complete reasoning first</p>
        </div>
      </div>
    );
  }

  const odrlJson = generatedODRL.odrl_policy || generatedODRL.odrl || generatedODRL;

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Generated ODRL Section */}
      <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700 bg-gradient-to-r from-green-900/30 to-emerald-900/30' : 'border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${textClass} flex items-center gap-2`}>
                <Code className="w-6 h-6" />
                Generated ODRL Policy
              </h2>
              <p className={`text-sm ${mutedTextClass} mt-1`}>
                Review and validate the generated policy
              </p>
            </div>
            <div className="flex gap-2">
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
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>

        {/* ODRL Content */}
        <div className="p-6">
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4 overflow-auto max-h-96`}>
            <pre className={`text-sm ${textClass}`}>
              {JSON.stringify(odrlJson, null, 2)}
            </pre>
          </div>
        </div>

        {/* Validate Button */}
        {!validationResult && (
          <div className={`px-6 pb-6`}>
            <button
              onClick={onValidate}
              disabled={isValidating}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                isValidating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Validating with SHACL...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Validate with SHACL
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className={`${cardClass} border-2 rounded-xl shadow-sm overflow-hidden ${
          validationResult.is_valid 
            ? darkMode ? 'border-green-700' : 'border-green-300'
            : darkMode ? 'border-red-700' : 'border-red-300'
        }`}>
          
          {/* Validation Header */}
          <div className={`px-6 py-4 border-b ${
            validationResult.is_valid
              ? darkMode ? 'border-green-700 bg-green-900/20' : 'border-green-200 bg-green-50'
              : darkMode ? 'border-red-700 bg-red-900/20' : 'border-red-200 bg-red-50'
          }`}>
            <button
              onClick={() => setShowValidation(!showValidation)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  validationResult.is_valid ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {validationResult.is_valid ? (
                    <CheckCircle className="w-7 h-7 text-white" />
                  ) : (
                    <AlertTriangle className="w-7 h-7 text-white" />
                  )}
                </div>
                <div className="text-left">
                  <h3 className={`text-lg font-bold ${
                    validationResult.is_valid ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {validationResult.is_valid ? 'SHACL Validation Passed' : 'SHACL Validation Failed'}
                  </h3>
                  <p className={`text-sm ${mutedTextClass}`}>
                    {validationResult.is_valid 
                      ? 'Policy conforms to ODRL specification'
                      : `${validationResult.issues?.length || 0} violation${validationResult.issues?.length !== 1 ? 's' : ''} found`
                    }
                  </p>
                </div>
              </div>
              {showValidation ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {/* Validation Details */}
          {showValidation && (
            <div className="p-6 space-y-4">
              
              {/* Issues */}
              {validationResult.issues && validationResult.issues.length > 0 && (
                <div>
                  <h4 className={`font-semibold mb-3 ${textClass}`}>SHACL Violations:</h4>
                  <div className="space-y-2">
                    {validationResult.issues.map((issue, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg border-l-4 border-red-500 ${
                          darkMode ? 'bg-gray-800' : 'bg-red-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'} font-medium`}>
                              {issue}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                <div>
                  <h4 className={`font-semibold mb-3 ${textClass}`}>Suggestions:</h4>
                  <div className="space-y-2">
                    {validationResult.suggestions.map((suggestion, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}
                      >
                        <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                          💡 {suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className={`pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-xs ${mutedTextClass} mb-3`}>
                  {validationResult.is_valid 
                    ? '✅ Policy is ready to use'
                    : '⚠️ Fix validation errors to ensure ODRL compliance'
                  }
                </p>
                
                {!validationResult.is_valid && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onRegenerate}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </button>
                    <button
                      onClick={onEditInput}
                      className="px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Input
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className={`flex items-center justify-between text-xs ${mutedTextClass}`}>
        <span>Generator: ODRL Policy Creation</span>
        {generatedODRL.processing_time_ms && (
          <span>{generatedODRL.processing_time_ms}ms • {generatedODRL.model_used}</span>
        )}
      </div>
    </div>
  );
};