// components/HumanInputForm.jsx
import React, { useState } from 'react';
import { Edit3, RotateCcw } from 'lucide-react';

/**
 * Simple edit form - just text area with original text
 */
export const HumanInputForm = ({ 
  originalText,
  issues,
  darkMode = false,
  onResubmit,
  onCancel
}) => {
  const [editedText, setEditedText] = useState(originalText);

  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-2 border-orange-500 rounded-xl shadow-lg overflow-hidden`}>
      
      {/* Header */}
      <div className={`p-6 border-b ${darkMode ? 'border-gray-700 bg-orange-900/20' : 'border-orange-200 bg-orange-50'}`}>
        <div className="flex items-center gap-3">
          <Edit3 className="w-6 h-6 text-orange-500" />
          <div>
            <h3 className={`text-xl font-bold ${textClass}`}>
              Edit Your Policy
            </h3>
            <p className={`text-sm ${mutedTextClass}`}>
              Fix the issues below and resubmit
            </p>
          </div>
        </div>
      </div>

      {/* Issues Summary */}
      <div className={`p-4 ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
        <p className={`text-sm ${textClass} font-semibold mb-2`}>
          Issues to fix:
        </p>
        <ul className={`text-sm ${mutedTextClass} space-y-1`}>
          {issues.map((issue, idx) => (
            <li key={idx}>• {issue.description}</li>
          ))}
        </ul>
      </div>

      {/* Text Editor */}
      <div className="p-6">
        <label className={`block font-semibold mb-2 ${textClass}`}>
          Your Policy Text:
        </label>
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className={`w-full h-40 px-4 py-3 rounded-lg border-2 font-mono text-sm ${
            darkMode 
              ? 'bg-gray-900 border-gray-700 text-white focus:border-orange-500' 
              : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
          } focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
          placeholder="Edit your policy text here..."
        />
      </div>

      {/* Actions */}
      <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex gap-3`}>
        <button
          onClick={() => onResubmit(editedText)}
          disabled={!editedText.trim()}
          className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold inline-flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Resubmit for Parsing
        </button>
        <button
          onClick={onCancel}
          className={`px-6 py-3 rounded-lg transition font-semibold ${
            darkMode 
              ? 'bg-gray-700 text-white hover:bg-gray-600' 
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};