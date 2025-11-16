// components/tabs/GeneratorTab.jsx
import React, { useState } from 'react';
import { 
  Code, 
  Copy, 
  CheckCircle,
  Shield,
  Loader2,
  Edit3,
  X,
  Save,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

/**
 * Generator Tab - Shows ODRL Turtle with EDIT and SAVE TO BACKEND capability
 */
export const GeneratorTab = ({ 
  generatedODRL,
  darkMode = false,
  onCopy = () => {},
  onSave = () => {},  // ✅ Changed from onDownload to onSave
  onValidate = () => {},
  onUpdateODRL = () => {},
  isValidating = false,
  showToast = () => {} 
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);  // ✅ Added
  const [policyName, setPolicyName] = useState('');  // ✅ Added
  const [policyDescription, setPolicyDescription] = useState('');  // ✅ Added

  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';
  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  const displayContent = generatedODRL?.odrl_turtle || '';

  const handleCopy = () => {
    onCopy(isEditing ? editedContent : displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ✅ NEW: Handle save to backend
  const handleSave = () => {
    const metadata = {
      name: policyName || `ODRL_Policy_${new Date().toISOString().split('T')[0]}`,
      description: policyDescription,
      odrl_turtle: isEditing ? editedContent : displayContent,
      metadata: {
        attempt_number: generatedODRL.attempt_number,
        processing_time_ms: generatedODRL.processing_time_ms,
        model_used: generatedODRL.model_used
      }
    };
    
    onSave(metadata);
    setShowSaveDialog(false);
    setPolicyName('');
    setPolicyDescription('');
  };

  const handleStartEdit = () => {
    setEditedContent(displayContent);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleSaveEdit = () => {
    onUpdateODRL(editedContent, true);
    setIsEditing(false);
    setEditedContent('');
    showToast('✅ ODRL Turtle updated. Please validate.', 'success');
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
                Generated ODRL Policy (Turtle)
                {isEditing && (
                  <span className="text-sm px-2 py-1 bg-yellow-500 text-white rounded">
                    Editing
                  </span>
                )}
              </h2>
              <p className={`text-sm ${mutedTextClass} mt-1`}>
                {isEditing 
                  ? 'Edit the Turtle content and save changes'
                  : 'Review the generated Turtle policy and validate with SHACL'
                }
              </p>
            </div>
            
            <div className="flex gap-2">
              {/* Edit Mode Buttons */}
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleStartEdit}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50 border border-gray-200'}`}
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  {/* ✅ Changed Download to Save */}
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Save className="w-4 h-4" />
                    Save to Backend
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Turtle Content with Collapsible */}
        <div className="p-6">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 mb-2 px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>ODRL Policy Turtle {isCollapsed ? '(collapsed)' : '(expanded)'}</span>
          </button>

          {!isCollapsed && (
            isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className={`w-full h-96 p-4 rounded-lg font-mono text-sm ${darkMode ? 'bg-gray-900 text-gray-300 border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                spellCheck={false}
              />
            ) : (
              <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4 overflow-auto max-h-96`}>
                <pre className={`text-sm ${textClass}`}>
                  {displayContent}
                </pre>
              </div>
            )
          )}
        </div>

        {/* Validate Button */}
        {!isEditing && (
          <div className={`px-6 pb-6`}>
            <button
              onClick={onValidate}
              disabled={isValidating}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${isValidating ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'}`}
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
        )}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between text-xs ${mutedTextClass}`}>
        <span>Generator: ODRL Policy Creation</span>
        {generatedODRL.processing_time_ms && (
          <span>{generatedODRL.processing_time_ms}ms • {generatedODRL.model_used}</span>
        )}
      </div>

      {/* ✅ SAVE DIALOG */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-md p-6`}>
            <h3 className={`text-xl font-bold ${textClass} mb-4`}>
              Save ODRL Policy
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
                  placeholder="e.g., MobilityData_ODRL_v1"
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
                  placeholder="Brief description of this ODRL policy..."
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
                className={`flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-2 ${
                  !policyName.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Save className="w-4 h-4" />
                Save Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};