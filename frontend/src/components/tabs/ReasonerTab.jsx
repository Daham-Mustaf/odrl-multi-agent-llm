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
  ChevronUp,
  Save,
  FileText,
  Code
} from 'lucide-react';

/**
 * Reasoner with Always-Enabled Continue + Collapsible JSON Display
 */
export const ReasonerTab = ({ 
  reasoningResult, 
  darkMode = false,
  onCopy = () => {},
  onDownload = () => {},
  onContinue = () => {},
  onEdit = () => {},
  onSave = () => {}
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    json: true,      // JSON expanded by default
    issues: true,
    policies: false
  });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [policyName, setPolicyName] = useState('');
  const [policyDescription, setPolicyDescription] = useState('');

  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  const handleCopy = () => {
    onCopy(JSON.stringify(reasoningResult, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

const handleSave = () => {
  const metadata = {
    name: policyName || `Policy_${new Date().toISOString().split('T')[0]}`,
    description: policyDescription,
    reasoning_result: reasoningResult
  };
  
  onSave(metadata);  // This calls the backend
  setShowSaveDialog(false);
  setPolicyName('');
  setPolicyDescription('');
};

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!reasoningResult) return null;

  const hasIssues = reasoningResult.overall_status !== 'valid';
  
  // Collect all issues by severity
  const criticalIssues = [];
  const warningIssues = [];
  
  reasoningResult.policies?.forEach(policy => {
    policy.issues?.forEach(issue => {
      const issueData = {
        policy_id: policy.policy_id,
        field: issue.field,
        description: issue.description,
        suggestion: issue.suggestion
      };
      
      if (issue.severity === 'critical') {
        criticalIssues.push(issueData);
      } else if (issue.severity === 'warning') {
        warningIssues.push(issueData);
      }
    });
  });

  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-sm overflow-hidden`}>
      
      {/* Header */}
      <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700 bg-gradient-to-r from-purple-900/30 to-pink-900/30' : 'border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-bold ${textClass}`}>
              Reasoning Analysis
            </h2>
            <p className={`text-sm ${mutedTextClass} mt-1`}>
              {hasIssues 
                ? `${criticalIssues.length + warningIssues.length} issue${criticalIssues.length + warningIssues.length !== 1 ? 's' : ''} detected - review or continue anyway`
                : 'Analysis complete - ready to proceed'
              }
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
              onClick={() => setShowSaveDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            
        
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 space-y-4">
        
        {/* STATUS BANNER - Compact */}
        <div className={`border-2 rounded-lg p-4 ${
          hasIssues 
            ? darkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-300'
            : darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${hasIssues ? 'bg-yellow-500' : 'bg-green-500'} flex items-center justify-center shadow-sm flex-shrink-0`}>
                {hasIssues ? (
                  <AlertTriangle className="w-6 h-6 text-white" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <div className={`font-bold ${hasIssues ? 'text-yellow-600' : 'text-green-600'}`}>
                  {hasIssues ? 'Issues Detected' : 'Analysis Complete'}
                </div>
                <div className={`text-sm ${mutedTextClass}`}>
                  {reasoningResult.summary}
                </div>
              </div>
            </div>
            
            {/* Issue Counts */}
            <div className="flex gap-4 text-sm">
              {criticalIssues.length > 0 && (
                <div className="flex items-center gap-1 text-red-600 font-semibold">
                  <XCircle className="w-4 h-4" />
                  {criticalIssues.length} Critical
                </div>
              )}
              {warningIssues.length > 0 && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="w-4 h-4" />
                  {warningIssues.length} Warnings
                </div>
              )}
              <div className={`flex items-center gap-1 ${hasIssues ? mutedTextClass : 'text-green-600 font-semibold'}`}>
                <CheckCircle className="w-4 h-4" />
                {reasoningResult.policies?.filter(p => p.is_valid).length || 0}/{reasoningResult.policies?.length || 0} Valid
              </div>
            </div>
          </div>
        </div>

        {/* 📄 JSON RESULT - Collapsible (Primary Display) */}
        <div className={`border rounded-lg overflow-hidden ${
          darkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'
        }`}>
          <button
            onClick={() => toggleSection('json')}
            className={`w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              <span className={`font-semibold ${textClass}`}>
                JSON Reasoning Result
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                darkMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
              }`}>
                Primary Output
              </span>
            </div>
            {expandedSections.json ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
          
          {expandedSections.json && (
            <div className={`p-4 border-t ${darkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-200 bg-white'}`}>
              <pre className={`text-xs ${textClass} overflow-auto max-h-96 p-3 rounded ${
                darkMode ? 'bg-gray-950' : 'bg-gray-50'
              }`}>
                {JSON.stringify(reasoningResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/*  ISSUES SECTION - Collapsible */}
        {(criticalIssues.length > 0 || warningIssues.length > 0) && (
          <div className={`border rounded-lg overflow-hidden ${
            darkMode ? 'border-red-700 bg-red-900/10' : 'border-red-200 bg-red-50'
          }`}>
            <button
              onClick={() => toggleSection('issues')}
              className={`w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition ${
                darkMode ? 'bg-red-900/30' : 'bg-red-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className={`font-semibold ${textClass}`}>
                  Detected Issues ({criticalIssues.length + warningIssues.length})
                </span>
              </div>
              {expandedSections.issues ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            
            {expandedSections.issues && (
              <div className={`p-4 border-t ${darkMode ? 'border-red-800' : 'border-red-200'} space-y-4`}>
                {/* Critical Issues */}
                {criticalIssues.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Critical Issues ({criticalIssues.length})
                    </h4>
                    <div className="space-y-2">
                      {criticalIssues.map((issue, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-lg border-l-4 border-red-500 ${
                            darkMode ? 'bg-gray-800' : 'bg-white'
                          }`}
                        >
                          <div className={`font-semibold text-sm ${textClass}`}>
                            Policy {issue.policy_id}: {issue.field}
                          </div>
                          <p className={`text-xs ${mutedTextClass} mt-1`}>
                            {issue.description}
                          </p>
                          {issue.suggestion && (
                            <div className={`mt-2 text-xs ${darkMode ? 'text-green-400' : 'text-green-700'} bg-green-500/10 px-2 py-1.5 rounded`}>
                              💡 {issue.suggestion}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {warningIssues.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-yellow-600 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Warnings ({warningIssues.length})
                    </h4>
                    <div className="space-y-2">
                      {warningIssues.map((issue, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-lg border-l-4 border-yellow-500 ${
                            darkMode ? 'bg-gray-800' : 'bg-white'
                          }`}
                        >
                          <div className={`font-semibold text-sm ${textClass}`}>
                            Policy {issue.policy_id}: {issue.field}
                          </div>
                          <p className={`text-xs ${mutedTextClass}`}>
                            {issue.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 📋 POLICY DETAILS - Collapsible */}
        <div className={`border rounded-lg overflow-hidden ${
          darkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'
        }`}>
          <button
            onClick={() => toggleSection('policies')}
            className={`w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span className={`font-semibold ${textClass}`}>
                Policy Details ({reasoningResult.policies?.length || 0})
              </span>
            </div>
            {expandedSections.policies ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
          
          {expandedSections.policies && (
            <div className={`p-4 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'} space-y-2`}>
              {reasoningResult.policies?.map((policy, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg ${
                    darkMode ? 'bg-gray-800' : 'bg-white'
                  } border ${
                    policy.is_valid 
                      ? darkMode ? 'border-green-700' : 'border-green-200'
                      : darkMode ? 'border-red-700' : 'border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${textClass}`}>
                      Policy {policy.policy_id}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      policy.is_valid 
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                      {policy.is_valid ? '✓ Valid' : '✗ Invalid'}
                    </span>
                  </div>
                  <pre className={`text-xs ${mutedTextClass} overflow-auto max-h-32`}>
                    {JSON.stringify(policy, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🎯 ACTION BUTTONS - Always Both Enabled */}
        <div className={`border-t pt-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Edit3 className="w-5 h-5" />
              Edit Input
            </button>
            
            <button
              onClick={onContinue}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-sm ${
                hasIssues
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <ArrowRight className="w-5 h-5" />
              {hasIssues ? 'Continue Anyway' : 'Continue to Generator'}
            </button>
          </div>
          
          {hasIssues && (
            <p className={`text-xs ${mutedTextClass} text-center mt-2`}>
               Continuing with issues may result in invalid ODRL policies
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={`px-6 py-3 border-t ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between text-xs">
          <span className={mutedTextClass}>
            Analyzed {reasoningResult.policies?.length || 0} policies • {reasoningResult.model_used}
          </span>
          <span className={mutedTextClass}>
            Processing time: {reasoningResult.processing_time_ms}ms
          </span>
        </div>
      </div>

      {/* 💾 SAVE DIALOG */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-md p-6`}>
            <h3 className={`text-xl font-bold ${textClass} mb-4`}>
              Save Reasoning Analysis
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-1`}>
                  Policy Name *
                </label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g., MobilityData_AccessPolicy_v1"
                  className={`w-full px-3 py-2 border rounded-lg ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-1`}>
                  Description (Optional)
                </label>
                <textarea
                  value={policyDescription}
                  onChange={(e) => setPolicyDescription(e.target.value)}
                  placeholder="Brief description of this policy analysis..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!policyName.trim()}
                className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 ${
                  !policyName.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Save className="w-4 h-4" />
                Save Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};