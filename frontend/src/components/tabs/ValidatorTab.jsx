// components/tabs/ValidatorTab.jsx
import React from 'react';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Info,
  RefreshCw,
  Edit3,
  AlertTriangle
} from 'lucide-react';

export const ValidatorTab = ({
  validationResult,
  generatedODRL,
  darkMode = false,
  onCopy = () => {},
  onDownload = () => {},
  onRegenerate = () => {},
  onEditInput = () => {}
}) => {
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';
  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  if (!validationResult) {
    return (
      <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${textClass}`}>Step 4: SHACL Validation</h2>
          <p className={`text-sm ${mutedTextClass} mt-1`}>
            Validate ODRL compliance using SHACL constraints
          </p>
        </div>
        <div className={`p-12 text-center ${mutedTextClass}`}>
          <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No validation results yet</p>
          <p className="text-sm mt-2">Generate ODRL policy first, then click "Validate with SHACL"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Validation Header */}
      <div className={`${cardClass} border-2 rounded-xl shadow-sm overflow-hidden ${
        validationResult.is_valid 
          ? darkMode ? 'border-green-700' : 'border-green-300'
          : darkMode ? 'border-red-700' : 'border-red-300'
      }`}>
        
        <div className={`px-6 py-5 ${
          validationResult.is_valid
            ? darkMode ? 'bg-green-900/20' : 'bg-green-50'
            : darkMode ? 'bg-red-900/20' : 'bg-red-50'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-lg ${
              validationResult.is_valid ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {validationResult.is_valid ? (
                <CheckCircle className="w-10 h-10 text-white" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h2 className={`text-2xl font-bold ${
                validationResult.is_valid ? 'text-green-600' : 'text-red-600'
              }`}>
                {validationResult.is_valid ? 'SHACL Validation Passed ✓' : 'SHACL Validation Failed ✗'}
              </h2>
              <p className={`text-sm ${mutedTextClass} mt-1`}>
                {validationResult.is_valid 
                  ? 'Generated ODRL policy conforms to the official specification'
                  : `Found ${validationResult.issues?.length || 0} violation${validationResult.issues?.length !== 1 ? 's' : ''} in the generated policy`
                }
              </p>
            </div>
          </div>
        </div>

        {/* What is SHACL? */}
        <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700 bg-blue-900/10' : 'border-gray-200 bg-blue-50/50'}`}>
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              <strong>SHACL (Shapes Constraint Language)</strong> validates the generated ODRL against official constraints including required properties, data types, allowed values, and relationships defined in the ODRL specification.
            </p>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-bold ${textClass}`}>Validation Details</h3>
        </div>

        <div className="p-6 space-y-4">
          
          {/* Issues */}
          {validationResult.issues && validationResult.issues.length > 0 ? (
            <div>
              <h4 className={`font-semibold mb-3 ${textClass} flex items-center gap-2`}>
                <AlertCircle className="w-5 h-5 text-red-500" />
                SHACL Violations ({validationResult.issues.length})
              </h4>
              <div className="space-y-2">
                {validationResult.issues.map((issue, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-lg border-l-4 border-red-500 ${
                      darkMode ? 'bg-gray-700' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-200 text-red-800'
                        }`}>
                          #{idx + 1}
                        </span>
                        <p className={`text-sm flex-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                          {issue.message || issue}
                        </p>
                      </div>

                      {/* Display actual value if present */}
                      {issue.actual_value && (
                        <div className={`text-xs mt-1 px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                          <strong>Actual value:</strong> <code>{issue.actual_value}</code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className={`text-sm font-medium ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                  No violations found. All SHACL constraints are satisfied.
                </p>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {validationResult.suggestions && validationResult.suggestions.length > 0 && (
            <div>
              <h4 className={`font-semibold mb-3 ${textClass}`}>How to Fix:</h4>
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
        </div>
      </div>

      {/* Actions */}
      {!validationResult.is_valid && (
        <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-bold ${textClass}`}>Next Steps</h3>
          </div>
          <div className="p-6">
            <p className={`text-sm ${mutedTextClass} mb-4`}>
              The generated ODRL has validation errors. You can regenerate the policy or edit the original input to fix the issues.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onRegenerate}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate Policy
              </button>
              <button
                onClick={onEditInput}
                className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Edit Original Input
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Actions */}
      {validationResult.is_valid && (
        <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
          <div className={`px-6 py-4 ${darkMode ? 'bg-green-900/10' : 'bg-green-50/50'}`}>
            <p className={`text-sm ${textClass} font-medium`}>
              Your ODRL policy is valid and ready for deployment!
            </p>
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
