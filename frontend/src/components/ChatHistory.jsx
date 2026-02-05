import React, { useState } from 'react';
import { History, Trash2, Download, Search, ChevronDown, ChevronUp, Clock, FileText } from 'lucide-react';

export const ChatHistory = ({ history = [], onLoadHistory, onClearHistory, darkMode = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItem, setExpandedItem] = useState(null);
  const filteredHistory = history.filter(item => item.inputText?.toLowerCase().includes(searchQuery.toLowerCase()) || item.timestamp?.toLowerCase().includes(searchQuery.toLowerCase()));
  const exportHistory = () => { const dataStr = JSON.stringify(history, null, 2); const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr); const exportFileDefaultName = `odrl-history-${Date.now()}.json`; const linkElement = document.createElement('a'); linkElement.setAttribute('href', dataUri); linkElement.setAttribute('download', exportFileDefaultName); linkElement.click(); };
  if (history.length === 0) return null;
  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className={`fixed left-6 bottom-6 z-40 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-all ${darkMode ? 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-700' : 'bg-white border border-gray-200 hover:bg-gray-50'}`} title="View chat history">
        <History className="w-5 h-5" /><span className="font-medium">History ({history.length})</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div className={`fixed left-6 bottom-24 z-40 w-96 max-h-[600px] rounded-lg shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-2 animate-slide-up`}>
          <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}><History className="w-5 h-5" /> Processing History</h3>
              <div className="flex gap-2">
                <button onClick={exportHistory} className={`p-2 rounded transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`} title="Export history"><Download className="w-4 h-4" /></button>
                <button onClick={() => { if (window.confirm(`Clear all ${history.length} history items?`)) { onClearHistory(); setIsOpen(false); } }} className={`p-2 rounded transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`} title="Clear history"><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            </div>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input type="text" placeholder="Search history..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 rounded-lg text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'} border focus:outline-none focus:ring-2 focus:ring-blue-500`} />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[450px]">
            {filteredHistory.length === 0 ? (
              <div className={`p-6 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{searchQuery ? 'No matching history found' : 'No history yet'}</div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredHistory.map((item) => (
                  <HistoryItem key={item.id} item={item} darkMode={darkMode} isExpanded={expandedItem === item.id} onToggleExpand={() => setExpandedItem(expandedItem === item.id ? null : item.id)} onLoad={() => { onLoadHistory(item); setIsOpen(false); }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const HistoryItem = ({ item, darkMode, isExpanded, onToggleExpand, onLoad }) => {
  const formatDate = (timestamp) => new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const getStatusColor = (status) => { switch (status) { case 'completed': return 'text-green-500'; case 'failed': return 'text-red-500'; case 'cancelled': return 'text-yellow-500'; default: return darkMode ? 'text-gray-400' : 'text-gray-500'; } };
  const getStatusIcon = (status) => { switch (status) { case 'completed': return '✓'; case 'failed': return '✗'; case 'cancelled': return '⊗'; default: return '•'; } };
  return (
    <div className={`p-4 hover:bg-opacity-50 transition cursor-pointer ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
      <div onClick={onToggleExpand}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className={`text-sm font-medium mb-1 line-clamp-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.inputText?.substring(0, 80) || 'Untitled policy'}{item.inputText?.length > 80 && '...'}</div>
            <div className={`text-xs flex items-center gap-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(item.timestamp)}</span>
              <span className={`flex items-center gap-1 ${getStatusColor(item.status)}`}>{getStatusIcon(item.status)} {item.status}</span>
            </div>
          </div>
          <div className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
        </div>
        {item.model && <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Model: {item.model}</div>}
      </div>
      {isExpanded && (
        <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="mb-3">
            <div className={`text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Input:</div>
            <div className={`text-xs p-2 rounded ${darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'} max-h-24 overflow-y-auto`}>{item.inputText}</div>
          </div>
          {item.completedStages && (
            <div className="mb-3">
              <div className={`text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completed Stages:</div>
              <div className="flex gap-2 flex-wrap">{item.completedStages.map(stage => <span key={stage} className="text-xs px-2 py-1 rounded bg-green-500 bg-opacity-20 text-green-600 dark:text-green-400">{stage}</span>)}</div>
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); onLoad(); }} className="w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" /> Load This Session
          </button>
        </div>
      )}
    </div>
  );
};