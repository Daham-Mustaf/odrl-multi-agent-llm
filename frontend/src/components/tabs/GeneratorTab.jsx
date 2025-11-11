// components/tabs/GeneratorTab.jsx
import React, { useState } from 'react';
import { 
  Code, 
  Copy, 
  Download, 
  CheckCircle,
  Shield,
  Info,
  Loader2
} from 'lucide-react';

/**
 * Generator Tab - Shows Generated ODRL
 */
export const GeneratorTab = ({ 
  generatedODRL,
  darkMode = false,
  onCopy = () => {},
  onDownload = () => {},
  onValidate = () => {},
  isValidating = false
}) => {
  const [copied, setCopied] = useState(false);

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
                Review the generated policy and validate with SHACL
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
        <div className={`px-6 pb-6`}>
          <div className={`p-4 rounded-lg mb-4 ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                <strong>Next step:</strong> Validate this generated ODRL policy against the official ODRL specification using SHACL constraints to ensure compliance.
              </p>
            </div>
          </div>
          
          <button
            onClick={onValidate}
            disabled={isValidating}
            className={`w-full px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              isValidating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
            }`}
          >
            {isValidating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Validate with SHACL
              </>
            )}
          </button>
        </div>
      </div>

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