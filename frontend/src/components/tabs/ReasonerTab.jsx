import React, { useState } from 'react';
import { Brain, Copy, Save, CheckCircle, AlertTriangle, XCircle, TrendingUp, Shield, AlertCircle, ArrowRight, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

export const ReasonerTab = ({
  reasoningResult,
  darkMode = false,
  onCopy = () => {},
  onDownload = () => {},
  onContinue = () => {},
  onEdit = () => {},
  onSave = null,
}) => {
  const [viewMode, setViewMode] = useState('visual');
  const [copied, setCopied] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState({});

  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';
  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  const handleCopy = () => {
    onCopy(JSON.stringify(reasoningResult, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        decision: reasoningResult.decision,
        confidence: reasoningResult.confidence,
        risk_level: reasoningResult.risk_level,
        issues_found: reasoningResult.issues_found,
        analysis_summary: reasoningResult.analysis_summary,
        recommendations: reasoningResult.recommendations,
        high_priority_issues: reasoningResult.high_priority_issues,
        medium_priority_issues: reasoningResult.medium_priority_issues,
        low_priority_issues: reasoningResult.low_priority_issues,
      });
    }
  };

  const toggleIssue = (category, index) => {
    const key = `${category}-${index}`;
    setExpandedIssues(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!reasoningResult) return null;

  const getDecisionStyle = (decision) => {
    const styles = {
      APPROVE: {
        gradient: darkMode ? 'from-green-900/30 to-emerald-900/30' : 'from-green-50 to-emerald-50',
        border: darkMode ? 'border-green-700' : 'border-green-300',
        icon: CheckCircle,
        iconBg: 'bg-green-500',
        text: 'text-green-600 dark:text-green-400',
      },
      REJECT: {
        gradient: darkMode ? 'from-red-900/30 to-rose-900/30' : 'from-red-50 to-rose-50',
        border: darkMode ? 'border-red-700' : 'border-red-300',
        icon: XCircle,
        iconBg: 'bg-red-500',
        text: 'text-red-600 dark:text-red-400',
      },
      REVIEW: {
        gradient: darkMode ? 'from-yellow-900/30 to-orange-900/30' : 'from-yellow-50 to-orange-50',
        border: darkMode ? 'border-yellow-700' : 'border-yellow-300',
        icon: AlertTriangle,
        iconBg: 'bg-yellow-500',
        text: 'text-yellow-600 dark:text-yellow-400',
      },
    };
    return styles[decision] || styles.REVIEW;
  };

  const getRiskStyle = (risk) => {
    const styles = {
      HIGH: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300 dark:border-red-700' },
      MEDIUM: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-700' },
      LOW: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-300 dark:border-green-700' },
    };
    return styles[risk] || styles.MEDIUM;
  };

  const decisionStyle = getDecisionStyle(reasoningResult.decision);
  const riskStyle = getRiskStyle(reasoningResult.risk_level);
  const DecisionIcon = decisionStyle.icon;

  return (
    <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden animate-fade-in`}>
      {/* UPDATED HEADER - Cleaner, no duplication */}
      <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl font-bold ${textClass}`}>Reasoning Analysis</h2>
                {reasoningResult.issues_found > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    {reasoningResult.issues_found}
                  </span>
                )}
              </div>
              <p className={`text-sm ${mutedTextClass}`}>Policy validation and conflict detection</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className={`flex items-center gap-1 p-1 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <button
                onClick={() => setViewMode('visual')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  viewMode === 'visual'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Visual
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  viewMode === 'json'
                    ? 'bg-purple-600 text-white shadow-sm'
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
            {onSave && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {viewMode === 'visual' ? (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              {/* Decision Card */}
              <div className={`p-4 rounded-xl bg-gradient-to-br ${decisionStyle.gradient} border-2 ${decisionStyle.border}`}>
                <div className={`text-xs font-semibold mb-2 ${mutedTextClass}`}>Decision</div>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${decisionStyle.iconBg} flex items-center justify-center shadow-lg`}>
                    <DecisionIcon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-lg font-bold ${decisionStyle.text}`}>
                    {reasoningResult.decision}
                  </span>
                </div>
              </div>

              {/* Confidence Card */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/20 border-2 border-blue-800' : 'bg-blue-50 border-2 border-blue-200'}`}>
                <div className={`text-xs font-semibold mb-2 ${mutedTextClass}`}>Confidence</div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <span className={`text-lg font-bold ${textClass}`}>
                    {reasoningResult.confidence}
                  </span>
                </div>
              </div>

              {/* Risk Level Card */}
              <div className={`p-4 rounded-xl ${riskStyle.bg} border-2 ${riskStyle.border}`}>
                <div className={`text-xs font-semibold mb-2 ${mutedTextClass}`}>Risk Level</div>
                <div className="flex items-center gap-2">
                  <AlertCircle className={`w-5 h-5 ${riskStyle.text}`} />
                  <span className={`text-lg font-bold ${riskStyle.text}`}>
                    {reasoningResult.risk_level}
                  </span>
                </div>
              </div>

              {/* Issues Found Card */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-900/20 border-2 border-purple-800' : 'bg-purple-50 border-2 border-purple-200'}`}>
                <div className={`text-xs font-semibold mb-2 ${mutedTextClass}`}>Issues Found</div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-500" />
                  <span className={`text-lg font-bold ${textClass}`}>
                    {reasoningResult.issues_found} total
                  </span>
                </div>
              </div>
            </div>

            {/* Analysis Summary */}
            <div className={`p-5 rounded-xl ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`text-sm font-semibold mb-2 ${mutedTextClass}`}>Analysis Summary:</div>
              <p className={`text-sm ${textClass} leading-relaxed`}>{reasoningResult.analysis_summary}</p>
            </div>

            {/* High Priority Issues */}
            {reasoningResult.high_priority_issues && reasoningResult.high_priority_issues.length > 0 && (
              <div className={`p-5 rounded-xl border-2 ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <h3 className={`text-lg font-bold ${textClass}`}>
                    High Priority Issues ({reasoningResult.high_priority_issues.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {reasoningResult.high_priority_issues.map((issue, idx) => (
                    <IssueCard
                      key={idx}
                      issue={issue}
                      index={idx}
                      category="high"
                      darkMode={darkMode}
                      textClass={textClass}
                      mutedTextClass={mutedTextClass}
                      expanded={expandedIssues[`high-${idx}`]}
                      onToggle={() => toggleIssue('high', idx)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Medium Priority Issues */}
            {reasoningResult.medium_priority_issues && reasoningResult.medium_priority_issues.length > 0 && (
              <div className={`p-5 rounded-xl border-2 ${darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <h3 className={`text-lg font-bold ${textClass}`}>
                    Medium Priority Issues ({reasoningResult.medium_priority_issues.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {reasoningResult.medium_priority_issues.map((issue, idx) => (
                    <IssueCard
                      key={idx}
                      issue={issue}
                      index={idx}
                      category="medium"
                      darkMode={darkMode}
                      textClass={textClass}
                      mutedTextClass={mutedTextClass}
                      expanded={expandedIssues[`medium-${idx}`]}
                      onToggle={() => toggleIssue('medium', idx)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Low Priority Issues */}
            {reasoningResult.low_priority_issues && reasoningResult.low_priority_issues.length > 0 && (
              <div className={`p-5 rounded-xl border-2 ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-blue-500" />
                  <h3 className={`text-lg font-bold ${textClass}`}>
                    Low Priority Issues ({reasoningResult.low_priority_issues.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {reasoningResult.low_priority_issues.map((issue, idx) => (
                    <IssueCard
                      key={idx}
                      issue={issue}
                      index={idx}
                      category="low"
                      darkMode={darkMode}
                      textClass={textClass}
                      mutedTextClass={mutedTextClass}
                      expanded={expandedIssues[`low-${idx}`]}
                      onToggle={() => toggleIssue('low', idx)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {reasoningResult.recommendations && reasoningResult.recommendations.length > 0 && (
              <div className={`p-5 rounded-xl ${darkMode ? 'bg-indigo-900/20 border-2 border-indigo-800' : 'bg-indigo-50 border-2 border-indigo-200'}`}>
                <div className={`text-sm font-semibold mb-3 ${textClass}`}>Recommendations</div>
                <ul className="space-y-2">
                  {reasoningResult.recommendations.map((rec, idx) => (
                    <li key={idx} className={`flex items-start gap-2 text-sm ${textClass}`}>
                      <span className="text-indigo-500 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4 overflow-auto max-h-96`}>
            <pre className={`text-sm ${textClass}`}>
              {JSON.stringify(reasoningResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* UPDATED FOOTER - Better button labels */}
      <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center gap-3">
          {/* Left side - Back to Edit button */}
          <button
            onClick={onEdit}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600' 
                : 'bg-white hover:bg-gray-50 border-2 border-gray-300'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Edit Policy
          </button>

          {/* Right side - Continue button */}
          <button
            onClick={onContinue}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition shadow-lg ${
              reasoningResult.issues_found > 0
                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white shadow-yellow-500/30'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-green-500/30'
            }`}
          >
            {reasoningResult.issues_found > 0 ? (
              <>
                <AlertTriangle className="w-5 h-5" />
                Continue Anyway
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Proceed to Generate
              </>
            )}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Warning message when there are issues */}
        {reasoningResult.issues_found > 0 && (
          <div className={`mt-3 text-center text-sm ${mutedTextClass}`}>
            <AlertTriangle className="w-4 h-4 inline mr-1 text-yellow-500" />
            Warning: Continuing with unresolved issues may produce invalid ODRL
          </div>
        )}
      </div>
    </div>
  );
};

// Issue Card Component
const IssueCard = ({ issue, index, category, darkMode, textClass, mutedTextClass, expanded, onToggle }) => {
  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800/70 border border-gray-700' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className={`font-semibold text-sm ${textClass}`}>{issue.issue_type}</div>
          <div className={`text-sm ${textClass} mt-1`}>{issue.description}</div>
        </div>
        {issue.suggestion && (
          <button
            onClick={onToggle}
            className={`ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition`}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>
      {expanded && issue.suggestion && (
        <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
          <div className={`text-xs font-semibold mb-1 ${mutedTextClass}`}>Suggestion:</div>
          <div className={`text-sm ${textClass}`}>{issue.suggestion}</div>
        </div>
      )}
    </div>
  );
};