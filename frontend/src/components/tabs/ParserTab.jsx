// components/tabs/ParserTab.jsx
import React, { useState } from 'react';
import { FileText, Copy, Download, CheckCircle, Info } from 'lucide-react';

/**
 * Parser Results Visualization Component
 * Displays parsed ODRL policies with Visual/JSON toggle
 */
export const ParserTab = ({ 
  parsedData, 
  darkMode = false,
  onCopy = () => {},
  onDownload = () => {}
}) => {
  const [viewMode, setViewMode] = useState('visual');
  const [copied, setCopied] = useState(false);

  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';
  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  const handleCopy = () => {
    onCopy(JSON.stringify(parsedData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    onDownload(parsedData, 'parsed-data.json');
  };

  if (!parsedData) return null;

  return (
    <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden animate-fade-in`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-bold ${textClass} flex items-center gap-2`}>
            <FileText className="w-6 h-6" />
            Parsed Results
          </h2>
          <div className="flex gap-2">
            {/* View Toggle */}
            <div className={`flex items-center gap-1 p-1 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <button
                onClick={() => setViewMode('visual')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  viewMode === 'visual'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                👁️ Visual
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  viewMode === 'json'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {'{}'} JSON
              </button>
            </div>
            
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4 overflow-auto max-h-96`}>
            <pre className={`text-sm ${textClass}`}>
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>
        ) : (
          // Visual View
          <div className="space-y-4">
            {/* Summary */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-blue-500" />
                <span className={`font-semibold ${textClass}`}>Summary</span>
              </div>
              <p className={`text-sm ${mutedTextClass}`}>
                Found <strong className={textClass}>{parsedData.total_policies || 1}</strong>{' '}
                {parsedData.total_policies === 1 ? 'policy' : 'policies'} in the input text
              </p>
            </div>

            {/* Policies */}
            {(parsedData.policies || [parsedData]).map((policy, idx) => (
              <PolicyCard 
                key={idx} 
                policy={policy} 
                darkMode={darkMode}
                textClass={textClass}
                mutedTextClass={mutedTextClass}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Individual Policy Card Component
 */
const PolicyCard = ({ policy, darkMode, textClass, mutedTextClass }) => {
  const ruleColors = {
    permission: { 
      bg: 'bg-green-500', 
      text: 'text-green-600 dark:text-green-400', 
      light: darkMode ? 'bg-green-900/20' : 'bg-green-50', 
      icon: '✓' 
    },
    prohibition: { 
      bg: 'bg-red-500', 
      text: 'text-red-600 dark:text-red-400', 
      light: darkMode ? 'bg-red-900/20' : 'bg-red-50', 
      icon: '✗' 
    },
    duty: { 
      bg: 'bg-blue-500', 
      text: 'text-blue-600 dark:text-blue-400', 
      light: darkMode ? 'bg-blue-900/20' : 'bg-blue-50', 
      icon: '!' 
    }
  };
  const colors = ruleColors[policy.rule_type] || ruleColors.permission;

  return (
    <div className={`border-2 rounded-xl p-5 ${colors.light} ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      {/* Policy Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
          {colors.icon}
        </div>
        <div className="flex-1">
          <div className={`text-lg font-bold ${colors.text} uppercase`}>
            {policy.rule_type}
          </div>
          <div className={`text-xs ${mutedTextClass}`}>
            Policy ID: {policy.policy_id}
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
          {policy.policy_type}
        </div>
      </div>

      {/* Original Text */}
      <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-gray-800/50' : 'bg-white/70'}`}>
        <div className={`text-xs font-semibold mb-1 ${mutedTextClass}`}>📝 Original Text:</div>
        <p className={`text-sm italic ${textClass}`}>"{policy.source_text}"</p>
      </div>

      {/* Details Grid */}
      <div className="space-y-3">
        {/* Actors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={`text-xs font-semibold mb-1 ${mutedTextClass}`}>👤 Assigner:</div>
            <div className={`px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <span className={`text-sm font-medium ${
                policy.assigner === 'not_specified' ? 'text-orange-500 italic' : textClass
              }`}>
                {policy.assigner === 'not_specified' ? '⚠️ Not specified' : policy.assigner}
              </span>
            </div>
          </div>
          <div>
            <div className={`text-xs font-semibold mb-1 ${mutedTextClass}`}>👥 Assignee:</div>
            <div className={`px-3 py-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <span className={`text-sm font-medium ${textClass}`}>
                {Array.isArray(policy.assignee) ? policy.assignee.join(', ') : policy.assignee}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {policy.actions && policy.actions.length > 0 && (
          <div>
            <div className={`text-xs font-semibold mb-1 ${mutedTextClass}`}>⚡ Actions:</div>
            <div className="flex flex-wrap gap-2">
              {policy.actions.map((action, i) => {
                const isVague = !action.startsWith('odrl:');
                return (
                  <span 
                    key={i} 
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isVague
                        ? darkMode ? 'bg-orange-900/30 text-orange-400 border border-orange-700' : 'bg-orange-100 text-orange-700 border border-orange-300'
                        : darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'
                    }`}
                    title={isVague ? 'Vague action - needs clarification' : 'ODRL-compliant action'}
                  >
                    {isVague && '⚠️ '}
                    {action}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Targets */}
        {policy.targets && policy.targets.length > 0 && (
          <div>
            <div className={`text-xs font-semibold mb-1 ${mutedTextClass}`}>🎯 Targets:</div>
            <div className="flex flex-wrap gap-2">
              {policy.targets.map((target, i) => {
                const isNotSpecified = target === 'not_specified';
                return (
                  <span 
                    key={i} 
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isNotSpecified
                        ? darkMode ? 'bg-orange-900/30 text-orange-400 border border-orange-700' : 'bg-orange-100 text-orange-700 border border-orange-300'
                        : darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'
                    }`}
                    title={isNotSpecified ? 'Target not specified' : 'Policy target'}
                  >
                    {isNotSpecified ? '⚠️ Not specified' : target}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Constraints */}
        {policy.constraints && policy.constraints.length > 0 ? (
          <div>
            <div className={`text-xs font-semibold mb-2 ${mutedTextClass}`}>🔒 Constraints:</div>
            <div className="space-y-2">
              {policy.constraints.map((constraint, i) => (
                <div key={i} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <code className={`text-xs ${textClass}`}>
                    {constraint.leftOperand} {constraint.operator} {constraint.rightOperand}
                  </code>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-100 border border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400" />
              <span className={`text-xs italic ${mutedTextClass}`}>
                No constraints specified
              </span>
            </div>
          </div>
        )}

        {/* Duties */}
        {policy.duties && policy.duties.length > 0 ? (
          <div>
            <div className={`text-xs font-semibold mb-2 ${mutedTextClass}`}>✅ Duties:</div>
            <div className="space-y-2">
              {policy.duties.map((duty, i) => (
                <div key={i} className={`p-3 rounded-lg ${darkMode ? 'bg-indigo-900/20' : 'bg-indigo-50'}`}>
                  <div className={`text-sm font-medium ${textClass}`}>{duty.action}</div>
                  {duty.constraints && duty.constraints.length > 0 && (
                    <div className={`text-xs ${mutedTextClass} mt-1`}>
                      {duty.constraints.map((c, j) => (
                        <div key={j}>{c.leftOperand} {c.operator} {c.rightOperand}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-100 border border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400" />
              <span className={`text-xs italic ${mutedTextClass}`}>
                No duties attached
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};