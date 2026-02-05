import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { policyExamples } from '../data/policyExamples';

const ExamplePolicies = ({ onSelectExample, darkMode, textClass, mutedTextClass }) => {
  const [showExamples, setShowExamples] = useState(false);
  const [selectedTab, setSelectedTab] = useState('straightforward');
  const currentExamples = policyExamples[selectedTab];
  const handleSelectExample = (example) => { onSelectExample(example.text); setShowExamples(false); };
  return (
    <div className={`rounded-lg border-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
      <button onClick={() => setShowExamples(!showExamples)} aria-label="Toggle example policies" aria-expanded={showExamples}
        className={`w-full px-4 py-3 flex items-center justify-between transition focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
        <span className={`text-sm font-semibold ${textClass}`}>Quick Start Examples</span>
        {showExamples ? <ChevronUp className="w-4 h-4 transition-transform" /> : <ChevronDown className="w-4 h-4 transition-transform" />}
      </button>
      {showExamples && (
        <div className={`border-t-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
          <TabNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} darkMode={darkMode} />
          <div className="px-4 pb-4 pt-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentExamples.map((example, idx) => (
                <ExampleCard key={idx} example={example} onSelect={() => handleSelectExample(example)} darkMode={darkMode} textClass={textClass} mutedTextClass={mutedTextClass} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabNavigation = ({ selectedTab, onTabChange, darkMode }) => {
  const tabs = [{ id: 'straightforward', label: 'Straightforward Examples', icon: null }, { id: 'contradictory', label: 'Contradictory Examples', icon: AlertTriangle }];
  return (
    <div className={`flex border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
      {tabs.map(tab => {
        const isSelected = selectedTab === tab.id;
        const Icon = tab.icon;
        return (
          <button key={tab.id} onClick={() => onTabChange(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center justify-center gap-2 ${isSelected ? darkMode ? `bg-gray-700 text-white border-b-2 ${tab.id === 'contradictory' ? 'border-orange-400' : 'border-blue-400'}` : `bg-white text-gray-900 border-b-2 ${tab.id === 'contradictory' ? 'border-orange-500' : 'border-blue-500'}` : darkMode ? 'text-gray-400 hover:bg-gray-700/50' : 'text-gray-600 hover:bg-gray-50'}`}>
            {Icon && <Icon className="w-4 h-4" />}{tab.label}
          </button>
        );
      })}
    </div>
  );
};

const ExampleCard = ({ example, onSelect, darkMode, textClass, mutedTextClass }) => {
  return (
    <button onClick={onSelect} className={`p-5 rounded-lg border-2 text-left transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 relative ${darkMode ? 'bg-gray-700 border-gray-500 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/20' : 'bg-white border-gray-300 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/20'}`}
      aria-label={`Select ${example.title} example`}>
      {example.hasContradiction && <div className={`absolute top-2 right-2 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`}><AlertTriangle className="w-5 h-5" /></div>}
      <div className="space-y-2">
        <div className={`font-semibold text-base ${textClass} ${example.hasContradiction ? 'pr-8' : ''}`}>{example.title}</div>
        <div className={`text-sm leading-relaxed line-clamp-3 ${mutedTextClass}`}>{example.text}</div>
        {example.hasContradiction && example.contradictionHint && (
          <div className={`text-xs mt-2 pt-2 border-t ${darkMode ? 'border-gray-600 text-orange-400' : 'border-gray-200 text-orange-600'}`}>{example.contradictionHint}</div>
        )}
      </div>
    </button>
  );
};

export default ExamplePolicies;