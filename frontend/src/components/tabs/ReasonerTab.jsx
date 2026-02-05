import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ArrowRight, Edit3, Copy, Save, Shield, Brain, TrendingUp, Clock, Zap, Code, Eye, Minimize2, Maximize2 } from 'lucide-react';

export const ReasonerTab = ({ reasoningResult, darkMode = false, onCopy = () => {}, onContinue = () => {}, onEdit = () => {}, onSave = () => {} }) => {
  const [copied, setCopied] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [policyName, setPolicyName] = useState('');
  const [policyDescription, setPolicyDescription] = useState('');
  const [compactMode, setCompactMode] = useState(false);
  const [viewMode, setViewMode] = useState('visual');
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  const handleCopy = () => { onCopy(JSON.stringify(reasoningResult, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleSave = () => {
    const metadata = { name: policyName || `Analysis_${new Date().toISOString().split('T')[0]}`, description: policyDescription, reasoning_result: reasoningResult };
    onSave(metadata); setShowSaveDialog(false); setPolicyName(''); setPolicyDescription('');
  };

  if (!reasoningResult) return null;
  const decision = reasoningResult.decision || 'approve';
  const issues = reasoningResult.issues || [];
  const highIssues = issues.filter(i => i.severity === 'high');
  const lowIssues = issues.filter(i => i.severity === 'low');

  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-sm overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
              <Brain className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${textClass}`}>Reasoning Analysis</h2>
              <p className={`text-sm ${mutedTextClass}`}>
                {issues.length === 0 ? 'No issues detected - ready to proceed' : `${issues.length} issue${issues.length !== 1 ? 's' : ''} detected - review recommended`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className={`flex items-center gap-1 p-1 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <button onClick={() => setViewMode('visual')} className={`px-3 py-1.5 rounded text-sm font-medium transition ${viewMode === 'visual' ? 'bg-purple-600 text-white shadow-sm' : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                <Eye className="w-4 h-4 inline mr-1" /> Visual
              </button>
              <button onClick={() => setViewMode('json')} className={`px-3 py-1.5 rounded text-sm font-medium transition ${viewMode === 'json' ? 'bg-purple-600 text-white shadow-sm' : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                <Code className="w-4 h-4 inline mr-1" /> JSON
              </button>
            </div>
            {viewMode === 'visual' && (
              <button onClick={() => setCompactMode(!compactMode)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${compactMode ? 'bg-blue-600 text-white shadow-lg' : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                {compactMode ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                {compactMode ? 'Full' : 'Compact'}
              </button>
            )}
            <button onClick={handleCopy} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
              {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={() => setShowSaveDialog(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        {viewMode === 'visual' ? (
          compactMode ? (
            <CompactReasonerView reasoningResult={reasoningResult} decision={decision} highIssues={highIssues} lowIssues={lowIssues} darkMode={darkMode} textClass={textClass} mutedTextClass={mutedTextClass} />
          ) : (
            <FullReasonerView reasoningResult={reasoningResult} decision={decision} issues={issues} highIssues={highIssues} lowIssues={lowIssues} darkMode={darkMode} textClass={textClass} mutedTextClass={mutedTextClass} />
          )
        ) : (
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4 overflow-auto max-h-[600px]`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-semibold ${textClass}`}>Complete Reasoning Result</span>
              <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>Raw Output</span>
            </div>
            <pre className={`text-xs ${textClass} whitespace-pre-wrap`}>{JSON.stringify(reasoningResult, null, 2)}</pre>
          </div>
        )}
        <div className={`border-t pt-6 mt-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onEdit} className="px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition flex items-center justify-center gap-2">
              <Edit3 className="w-5 h-5" /> Edit Input
            </button>
            <button onClick={onContinue} className={`px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${decision === 'reject' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
              <ArrowRight className="w-5 h-5" /> {decision === 'reject' ? 'Continue Anyway' : 'Generate ODRL'}
            </button>
          </div>
          {decision === 'reject' && (
            <p className={`text-xs ${mutedTextClass} text-center mt-2`}>Warning: Continuing with unresolved issues may produce invalid ODRL</p>
          )}
        </div>
      </div>
      {showSaveDialog && <SaveDialog darkMode={darkMode} textClass={textClass} policyName={policyName} setPolicyName={setPolicyName} policyDescription={policyDescription} setPolicyDescription={setPolicyDescription} onSave={handleSave} onCancel={() => setShowSaveDialog(false)} />}
    </div>
  );
};

const CompactReasonerView = ({ reasoningResult, decision, highIssues, lowIssues, darkMode, textClass, mutedTextClass }) => {
  const issues = reasoningResult.issues || [];
  const isApproved = decision === 'approve';
  return (
    <div className="space-y-3 max-w-4xl">
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className={`p-3 rounded-lg ${isApproved ? darkMode ? 'bg-green-900/20 border border-green-700' : 'bg-green-50 border border-green-300' : darkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-300'}`}>
          <div className={`${mutedTextClass} mb-1`}>Decision</div>
          <div className={`font-bold flex items-center gap-1 ${isApproved ? 'text-green-600' : 'text-yellow-600'}`}>
            {isApproved ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {decision.toUpperCase()}
          </div>
        </div>
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
          <div className={`${mutedTextClass} mb-1`}>Confidence</div>
          <div className={`font-bold ${textClass} flex items-center gap-1`}><TrendingUp className="w-4 h-4" /> {(reasoningResult.confidence * 100).toFixed(0)}%</div>
        </div>
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
          <div className={`${mutedTextClass} mb-1`}>Risk Level</div>
          <div className={`font-bold ${textClass} uppercase`}>{reasoningResult.risk_level || 'low'}</div>
        </div>
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-100 border border-gray-300'}`}>
          <div className={`${mutedTextClass} mb-1`}>Issues Found</div>
          <div className={`font-bold ${textClass}`}>{issues.length} total</div>
        </div>
      </div>
      <div className={`p-3 rounded-lg text-sm ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
        <div className={`${mutedTextClass} text-xs font-semibold mb-1`}>Analysis Summary:</div>
        <p className={`${textClass} leading-relaxed`}>{reasoningResult.reasoning || 'No reasoning provided'}</p>
      </div>
      {issues.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {highIssues.length > 0 && (
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-red-900/20 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2"><XCircle className="w-4 h-4 text-red-600" /><span className="text-xs font-bold text-red-600">High Priority ({highIssues.length})</span></div>
              <div className="space-y-1">
                {highIssues.slice(0, 2).map((issue, idx) => (
                  <div key={idx} className={`text-xs ${textClass} p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="font-semibold">{issue.field || issue.category}</div>
                    <div className={`${mutedTextClass} mt-0.5`}>{issue.message}</div>
                  </div>
                ))}
                {highIssues.length > 2 && <div className={`text-xs ${mutedTextClass} text-center py-1`}>+{highIssues.length - 2} more</div>}
              </div>
            </div>
          )}
          {lowIssues.length > 0 && (
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-yellow-600" /><span className="text-xs font-bold text-yellow-600">Low Priority ({lowIssues.length})</span></div>
              <div className="space-y-1">
                {lowIssues.slice(0, 2).map((issue, idx) => (
                  <div key={idx} className={`text-xs ${textClass} p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="font-semibold">{issue.field || issue.category}</div>
                    <div className={`${mutedTextClass} mt-0.5`}>{issue.message}</div>
                  </div>
                ))}
                {lowIssues.length > 2 && <div className={`text-xs ${mutedTextClass} text-center py-1`}>+{lowIssues.length - 2} more</div>}
              </div>
            </div>
          )}
        </div>
      )}
      {reasoningResult.recommendations && reasoningResult.recommendations.length > 0 && (
        <div className={`p-3 rounded-lg text-xs ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
          <div className={`${mutedTextClass} font-semibold mb-2`}>Recommendations:</div>
          <ul className={`${textClass} space-y-1 list-disc list-inside`}>{reasoningResult.recommendations.slice(0, 3).map((rec, idx) => <li key={idx}>{rec}</li>)}</ul>
        </div>
      )}
      <div className={`flex items-center justify-between text-xs ${mutedTextClass} pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {reasoningResult.policies_analyzed || 1} {reasoningResult.policies_analyzed === 1 ? 'policy' : 'policies'} analyzed</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {reasoningResult.processing_time_ms}ms</span>
        <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {reasoningResult.model_used?.split(':').pop() || 'default'}</span>
      </div>
    </div>
  );
};

const FullReasonerView = ({ reasoningResult, decision, issues, highIssues, lowIssues, darkMode, textClass, mutedTextClass }) => {
  const isApproved = decision === 'approve';
  return (
    <div className="space-y-6">
      <div className={`p-5 rounded-xl border-2 ${isApproved ? darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300' : darkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-300'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-xl ${isApproved ? 'bg-green-500' : 'bg-yellow-500'} flex items-center justify-center shadow-lg`}>
            {isApproved ? <CheckCircle className="w-8 h-8 text-white" /> : <AlertTriangle className="w-8 h-8 text-white" />}
          </div>
          <div className="flex-1">
            <div className={`text-2xl font-bold ${isApproved ? 'text-green-600' : 'text-yellow-600'}`}>{decision.toUpperCase()}</div>
            <p className={`${mutedTextClass} mt-1`}>{reasoningResult.reasoning}</p>
          </div>
          <div className="text-right">
            <div className={`text-sm ${mutedTextClass}`}>Confidence</div>
            <div className={`text-3xl font-bold ${textClass}`}>{(reasoningResult.confidence * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <MetricCard icon={Shield} label="Risk Level" value={reasoningResult.risk_level || 'low'} color="purple" darkMode={darkMode} textClass={textClass} mutedTextClass={mutedTextClass} />
        <MetricCard icon={AlertTriangle} label="Issues Found" value={`${issues.length} total`} color={issues.length > 0 ? 'yellow' : 'green'} darkMode={darkMode} textClass={textClass} mutedTextClass={mutedTextClass} />
        <MetricCard icon={Clock} label="Processing Time" value={`${reasoningResult.processing_time_ms}ms`} color="blue" darkMode={darkMode} textClass={textClass} mutedTextClass={mutedTextClass} />
      </div>
      {issues.length > 0 && (
        <div className="space-y-4">
          {highIssues.length > 0 && <IssueSection title="High Priority Issues" issues={highIssues} severity="high" darkMode={darkMode} textClass={textClass} mutedTextClass={mutedTextClass} />}
          {lowIssues.length > 0 && <IssueSection title="Low Priority Warnings" issues={lowIssues} severity="low" darkMode={darkMode} textClass={textClass} mutedTextClass={mutedTextClass} />}
        </div>
      )}
      {reasoningResult.recommendations && reasoningResult.recommendations.length > 0 && (
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
          <div className={`font-bold ${textClass} mb-3 flex items-center gap-2`}>Recommendations</div>
          <ul className={`${textClass} space-y-2`}>{reasoningResult.recommendations.map((rec, idx) => <li key={idx} className="flex items-start gap-2"><span className="text-blue-500">•</span><span>{rec}</span></li>)}</ul>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, color, darkMode, textClass, mutedTextClass }) => {
  const colorClasses = { purple: darkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200', yellow: darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200', green: darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200', blue: darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200' };
  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2"><Icon className="w-5 h-5 text-gray-500" /><span className={`text-xs font-semibold ${mutedTextClass}`}>{label}</span></div>
      <div className={`text-xl font-bold ${textClass} uppercase`}>{value}</div>
    </div>
  );
};

const IssueSection = ({ title, issues, severity, darkMode, textClass, mutedTextClass }) => {
  const severityStyles = { high: { bg: darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200', icon: XCircle, iconColor: 'text-red-600' }, low: { bg: darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200', icon: AlertTriangle, iconColor: 'text-yellow-600' } };
  const style = severityStyles[severity];
  const Icon = style.icon;
  return (
    <div className={`p-4 rounded-xl border ${style.bg}`}>
      <div className="flex items-center gap-2 mb-3"><Icon className={`w-5 h-5 ${style.iconColor}`} /><span className={`font-bold ${textClass}`}>{title} ({issues.length})</span></div>
      <div className="space-y-2">
        {issues.map((issue, idx) => (
          <div key={idx} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`font-semibold text-sm ${textClass}`}>{issue.field || issue.category}</div>
            <p className={`text-sm ${mutedTextClass} mt-1`}>{issue.message}</p>
            {issue.suggestion && <div className={`mt-2 text-xs ${darkMode ? 'text-green-400' : 'text-green-700'} bg-green-500/10 px-2 py-1.5 rounded`}>{issue.suggestion}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

const SaveDialog = ({ darkMode, textClass, policyName, setPolicyName, policyDescription, setPolicyDescription, onSave, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-md p-6`}>
        <h3 className={`text-xl font-bold ${textClass} mb-4`}>Save Reasoning Analysis</h3>
        <div className="space-y-4">
          <div><label className={`block text-sm font-medium ${textClass} mb-1`}>Analysis Name *</label>
            <input type="text" value={policyName} onChange={(e) => setPolicyName(e.target.value)} placeholder="e.g., MobilityData_Analysis_v1" className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} /></div>
          <div><label className={`block text-sm font-medium ${textClass} mb-1`}>Description (Optional)</label>
            <textarea value={policyDescription} onChange={(e) => setPolicyDescription(e.target.value)} placeholder="Brief notes about this analysis..." rows={3} className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} /></div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className={`flex-1 px-4 py-2 rounded-lg font-medium ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>Cancel</button>
          <button onClick={onSave} disabled={!policyName.trim()} className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 ${!policyName.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}><Save className="w-4 h-4" /> Save</button>
        </div>
      </div>
    </div>
  );
};