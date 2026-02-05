import React, { useState } from 'react';
import { FileText, Copy, Download, CheckCircle, Info, Shield, Ban, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';

export const ParserTab = ({ 
  parsedData, 
  darkMode = false,
  onCopy = () => {},
  onDownload = () => {}
}) => {
  const [viewMode, setViewMode] = useState('visual');
  const [copied, setCopied] = useState(false);
  const [jsonCollapsed, setJsonCollapsed] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
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
  const policy = parsedData.policies?.[0] || parsedData;

  return (
    <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden animate-fade-in`}>
      <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-bold ${textClass} flex items-center gap-2`}>
            <FileText className="w-6 h-6" />
            Parsed Results
          </h2>
          <div className="flex gap-2">
            {viewMode === 'visual' && (
              <button
                onClick={() => setCompactMode(!compactMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  compactMode
                    ? 'bg-purple-600 text-white shadow-lg'
                    : darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title={compactMode ? 'Switch to full view' : 'Compact view for screenshots'}
              >
                {compactMode ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                {compactMode ? 'Full' : 'Compact'}
              </button>
            )}
            <div className={`flex items-center gap-1 p-1 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <button
                onClick={() => setViewMode('visual')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  viewMode === 'visual'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Visual
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  viewMode === 'json'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {'{ }'} JSON
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
      <div className="p-6">
        {viewMode === 'visual' ? (
          compactMode ? (
            <CompactView policy={policy} darkMode={darkMode} textClass={textClass} mutedTextClass={mutedTextClass} />
          ) : (
            <FullVisualView policy={policy} darkMode={darkMode} textClass={textClass} mutedTextClass={mutedTextClass} />
          )
        ) : (
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4 overflow-auto max-h-96`}>
            <div className="mb-2 flex justify-between items-center">
              <span className={`text-xs ${mutedTextClass}`}>Parsed policy structure in JSON format</span>
              <button
                onClick={() => setJsonCollapsed((c) => !c)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                  darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                {jsonCollapsed ? "Expand JSON ▼" : "Collapse JSON ▲"}
              </button>
            </div>
            {!jsonCollapsed && (
              <pre className={`text-sm ${textClass}`}>{JSON.stringify(parsedData, null, 2)}</pre>
            )}
            {jsonCollapsed && (
              <div className={`text-center py-8 ${mutedTextClass}`}>
                <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">JSON collapsed. Click "Expand JSON" to view.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CompactView = ({ policy, darkMode, textClass, mutedTextClass }) => {
  return (
    <div className="space-y-3 max-w-4xl">
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className={`p-2 rounded ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
          <div className={`${mutedTextClass} mb-1`}>Policy Type</div>
          <div className={`font-bold ${textClass}`}>{policy.policy_type}</div>
        </div>
        <div className={`p-2 rounded ${darkMode ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
          <div className={`${mutedTextClass} mb-1`}>Assigner</div>
          <div className={`font-medium ${textClass} truncate`}>
            {policy.assigner === 'not_specified' ? 'N/A' : policy.assigner}
          </div>
        </div>
        <div className={`p-2 rounded ${darkMode ? 'bg-indigo-900/20 border border-indigo-800' : 'bg-indigo-50 border border-indigo-200'}`}>
          <div className={`${mutedTextClass} mb-1`}>Assignee</div>
          <div className={`font-medium ${textClass} truncate`}>
            {Array.isArray(policy.assignee) ? policy.assignee.join(', ') : policy.assignee}
          </div>
        </div>
        <div className={`p-2 rounded ${darkMode ? 'bg-orange-900/20 border border-orange-800' : 'bg-orange-50 border border-orange-200'}`}>
          <div className={`${mutedTextClass} mb-1`}>Target</div>
          <div className={`font-medium ${textClass} truncate`}>
            {policy.targets?.[0] || 'N/A'}
          </div>
        </div>
      </div>
      <div className={`p-2 rounded text-xs ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
        <span className={`${mutedTextClass} font-semibold`}>Input: </span>
        <span className={`italic ${textClass}`}>"{policy.source_text}"</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {policy.rules?.map((rule, idx) => (
          <CompactRuleCard key={idx} rule={rule} ruleNumber={idx + 1} darkMode={darkMode} textClass={textClass} mutedTextClass={mutedTextClass} />
        ))}
      </div>
      {policy.temporal?.end_date && (
        <div className={`p-2 rounded text-xs flex items-center justify-between ${darkMode ? 'bg-cyan-900/20 border border-cyan-800' : 'bg-cyan-50 border border-cyan-200'}`}>
          <span className={`${mutedTextClass} font-semibold`}>⏰ Temporal Constraint:</span>
          <span className={`font-medium ${textClass}`}>Expires on {policy.temporal.end_date}</span>
        </div>
      )}
    </div>
  );
};

const CompactRuleCard = ({ rule, ruleNumber, darkMode, textClass, mutedTextClass }) => {
  const ruleStyles = {
    permission: { gradient: darkMode ? 'from-green-900/30 to-emerald-900/30' : 'from-green-50 to-emerald-50', border: darkMode ? 'border-green-700' : 'border-green-300', iconBg: 'bg-green-500', label: 'Permission', icon: '✓' },
    prohibition: { gradient: darkMode ? 'from-red-900/30 to-rose-900/30' : 'from-red-50 to-rose-50', border: darkMode ? 'border-red-700' : 'border-red-300', iconBg: 'bg-red-500', label: 'Prohibition', icon: '✗' },
    duty: { gradient: darkMode ? 'from-blue-900/30 to-indigo-900/30' : 'from-blue-50 to-indigo-50', border: darkMode ? 'border-blue-700' : 'border-blue-300', iconBg: 'bg-blue-500', label: 'Duty', icon: '!' }
  };
  const style = ruleStyles[rule.rule_type] || ruleStyles.permission;
  return (
    <div className={`p-3 rounded-lg bg-gradient-to-br ${style.gradient} border ${style.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded ${style.iconBg} flex items-center justify-center text-white text-sm font-bold`}>{style.icon}</div>
        <div className="flex-1">
          <div className={`text-sm font-bold ${textClass}`}>{style.label}</div>
        </div>
      </div>
      <div className="mb-2">
        <div className={`text-xs font-semibold mb-1 ${mutedTextClass}`}>Actions:</div>
        <div className="flex flex-wrap gap-1">
          {rule.actions.map((action, i) => (
            <span key={i} className={`px-2 py-0.5 rounded text-xs font-medium ${darkMode ? 'bg-gray-800 text-purple-400' : 'bg-white text-purple-700'}`}>
              {action.replace('odrl:', '')}
            </span>
          ))}
        </div>
      </div>
      {rule.constraints && rule.constraints.length > 0 && (
        <div>
          <div className={`text-xs font-semibold mb-1 ${mutedTextClass}`}>Constraints:</div>
          {rule.constraints.map((c, i) => (
            <div key={i} className={`p-1.5 rounded text-xs ${darkMode ? 'bg-gray-800/70' : 'bg-white/70'}`}>
              <code className={textClass}>{c.leftOperand.replace('odrl:', '')} {c.operator.replace('odrl:', '')} {c.rightOperand}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FullVisualView = ({ policy, darkMode, textClass, mutedTextClass }) => {
  return (
    <div className="space-y-6">
      <div className={`p-5 rounded-xl ${darkMode ? 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <span className={`font-bold text-lg ${textClass}`}>Policy Overview</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <div className={`text-xs font-semibold mb-1 ${mutedTextClass}`}>Policy Type</div>
                <div className={`px-3 py-1.5 rounded-lg inline-block ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <span className={`text-sm font-medium ${textClass}`}>{policy.policy_type}</span>
                </div>
              </div>
              <div>
                <div className={`text-xs font-semibold mb-1 ${mutedTextClass}`}>Rules Extracted</div>
                <div className={`px-3 py-1.5 rounded-lg inline-block ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <span className={`text-sm font-medium ${textClass}`}>{policy.rules?.length || 0} rules</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
        <div className={`text-xs font-semibold mb-2 ${mutedTextClass} flex items-center gap-2`}>
          <FileText className="w-4 h-4" />
          Original Input Text
        </div>
        <p className={`text-sm italic ${textClass}`}>"{policy.source_text}"</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
          <div className={`text-xs font-semibold mb-2 ${mutedTextClass}`}>Assigner (Provider)</div>
          <div className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <span className={`text-sm font-medium ${policy.assigner === 'not_specified' ? 'text-orange-500 italic' : textClass}`}>
              {policy.assigner === 'not_specified' ? '⚠ Not specified' : policy.assigner}
            </span>
          </div>
        </div>
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-indigo-900/20 border border-indigo-800' : 'bg-indigo-50 border border-indigo-200'}`}>
          <div className={`text-xs font-semibold mb-2 ${mutedTextClass}`}>Assignee (Recipient)</div>
          <div className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <span className={`text-sm font-medium ${textClass}`}>
              {Array.isArray(policy.assignee) ? policy.assignee.join(', ') : policy.assignee}
            </span>
          </div>
        </div>
      </div>
      {policy.targets && policy.targets.length > 0 && (
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-orange-900/20 border border-orange-800' : 'bg-orange-50 border border-orange-200'}`}>
          <div className={`text-xs font-semibold mb-2 ${mutedTextClass}`}>Target Assets</div>
          <div className="flex flex-wrap gap-2">
            {policy.targets.map((target, i) => {
              const isNotSpecified = target === 'not_specified';
              return (
                <span key={i} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  isNotSpecified
                    ? darkMode ? 'bg-gray-700 text-orange-400 border border-orange-700' : 'bg-white text-orange-700 border border-orange-300'
                    : darkMode ? 'bg-gray-800 text-orange-300' : 'bg-white text-orange-700'
                }`}>
                  {isNotSpecified ? '⚠ Not specified' : target}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {policy.rules && policy.rules.length > 0 ? (
        <div className="space-y-4">
          <div className={`text-lg font-bold ${textClass} flex items-center gap-2`}>
            <Shield className="w-5 h-5" />
            Extracted Rules ({policy.rules.length})
          </div>
          {policy.rules.map((rule, idx) => (
            <FullRuleCard key={idx} rule={rule} ruleNumber={idx + 1} darkMode={darkMode} textClass={textClass} mutedTextClass={mutedTextClass} />
          ))}
        </div>
      ) : (
        <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-100 border border-gray-200'}`}>
          <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className={`text-sm ${mutedTextClass}`}>No rules extracted</p>
        </div>
      )}
      {policy.temporal && (policy.temporal.start_date || policy.temporal.end_date) && (
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-cyan-900/20 border border-cyan-800' : 'bg-cyan-50 border border-cyan-200'}`}>
          <div className={`text-xs font-semibold mb-2 ${mutedTextClass}`}>Temporal Constraints</div>
          <div className="grid grid-cols-2 gap-3">
            {policy.temporal.start_date && (
              <div className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="text-xs text-gray-500">Start Date</div>
                <div className={`text-sm font-medium ${textClass}`}>{policy.temporal.start_date}</div>
              </div>
            )}
            {policy.temporal.end_date && (
              <div className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="text-xs text-gray-500">End Date</div>
                <div className={`text-sm font-medium ${textClass}`}>{policy.temporal.end_date}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FullRuleCard = ({ rule, ruleNumber, darkMode, textClass, mutedTextClass }) => {
  const ruleStyles = {
    permission: { gradient: darkMode ? 'from-green-900/30 to-emerald-900/30' : 'from-green-50 to-emerald-50', border: darkMode ? 'border-green-700' : 'border-green-300', icon: Shield, iconBg: 'bg-green-500', iconColor: 'text-white', label: 'Permission' },
    prohibition: { gradient: darkMode ? 'from-red-900/30 to-rose-900/30' : 'from-red-50 to-rose-50', border: darkMode ? 'border-red-700' : 'border-red-300', icon: Ban, iconBg: 'bg-red-500', iconColor: 'text-white', label: 'Prohibition' },
    duty: { gradient: darkMode ? 'from-blue-900/30 to-indigo-900/30' : 'from-blue-50 to-indigo-50', border: darkMode ? 'border-blue-700' : 'border-blue-300', icon: AlertCircle, iconBg: 'bg-blue-500', iconColor: 'text-white', label: 'Duty' }
  };
  const style = ruleStyles[rule.rule_type] || ruleStyles.permission;
  const Icon = style.icon;
  return (
    <div className={`p-5 rounded-xl bg-gradient-to-br ${style.gradient} border-2 ${style.border}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl ${style.iconBg} flex items-center justify-center shadow-lg`}>
          <Icon className={`w-6 h-6 ${style.iconColor}`} />
        </div>
        <div className="flex-1">
          <div className={`text-lg font-bold ${textClass} flex items-center gap-2`}>Rule {ruleNumber}: {style.label}</div>
          <div className={`text-xs ${mutedTextClass}`}>
            {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''} • {rule.constraints.length} constraint{rule.constraints.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      <div className="mb-3">
        <div className={`text-xs font-semibold mb-2 ${mutedTextClass}`}>Actions:</div>
        <div className="flex flex-wrap gap-2">
          {rule.actions.map((action, i) => (
            <span key={i} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${darkMode ? 'bg-gray-800 text-purple-400' : 'bg-white text-purple-700'}`}>{action}</span>
          ))}
        </div>
      </div>
      {rule.constraints && rule.constraints.length > 0 && (
        <div>
          <div className={`text-xs font-semibold mb-2 ${mutedTextClass}`}>Constraints:</div>
          <div className="space-y-2">
            {rule.constraints.map((constraint, i) => (
              <div key={i} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800/70' : 'bg-white/70'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <code className={`text-xs ${textClass}`}>{constraint.leftOperand} {constraint.operator} {constraint.rightOperand}</code>
              </div>
            ))}
          </div>
        </div>
      )}
      {rule.duties && rule.duties.length > 0 && (
        <div className="mt-3">
          <div className={`text-xs font-semibold mb-2 ${mutedTextClass}`}>Associated Duties:</div>
          {rule.duties.map((duty, i) => (
            <div key={i} className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
              <span className={`text-sm ${textClass}`}>{duty.action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};