import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { policyExamples } from '../data/policyExamples';

/**
 * ExamplePolicies Component
 * 
 * Displays collapsible section with example policy descriptions.
 * Includes tabs for straightforward and contradictory examples to test
 * the Reasoner Agent's contradiction detection capabilities.
 * 
 * @component
 * @param {Object} props
 * @param {Function} props.onSelectExample - Callback when example is selected
 * @param {boolean} props.darkMode - Dark mode toggle
 * @param {string} props.textClass - CSS class for primary text
 * @param {string} props.mutedTextClass - CSS class for muted text
 */
const ExamplePolicies = ({ onSelectExample, darkMode, textClass, mutedTextClass }) => {
  const [showExamples, setShowExamples] = useState(false);
  const [selectedTab, setSelectedTab] = useState('straightforward');

  const currentExamples = policyExamples[selectedTab];

  const handleSelectExample = (example) => {
    onSelectExample(example.text);
    setShowExamples(false);
  };

  return (
    <div className={`rounded-lg border-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
      {/* Header Toggle Button */}
      <button
        onClick={() => setShowExamples(!showExamples)}
        aria-label="Toggle example policies"
        aria-expanded={showExamples}
        className={`w-full px-4 py-3 flex items-center justify-between transition focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg ${
          darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
        }`}
      >
        <span className={`text-sm font-semibold ${textClass}`}>
          Quick Start Examples
        </span>
        {showExamples ? 
          <ChevronUp className="w-4 h-4 transition-transform" /> : 
          <ChevronDown className="w-4 h-4 transition-transform" />
        }
      </button>

      {/* Expandable Content */}
      {showExamples && (
        <div className={`border-t-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
          {/* Tab Navigation */}
          <TabNavigation
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
            darkMode={darkMode}
          />

          {/* Examples Grid */}
          <div className="px-4 pb-4 pt-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentExamples.map((example, idx) => (
                <ExampleCard
                  key={idx}
                  example={example}
                  onSelect={() => handleSelectExample(example)}
                  darkMode={darkMode}
                  textClass={textClass}
                  mutedTextClass={mutedTextClass}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <Styles />
    </div>
  );
};

/**
 * TabNavigation Component
 * 
 * Renders tabs for switching between straightforward and contradictory examples
 */
const TabNavigation = ({ selectedTab, onTabChange, darkMode }) => {
  const tabs = [
    { id: 'straightforward', label: 'Straightforward Examples', icon: null },
    { id: 'contradictory', label: 'Contradictory Examples', icon: AlertTriangle }
  ];

  return (
    <div className={`flex border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
      {tabs.map(tab => {
        const isSelected = selectedTab === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center justify-center gap-2 ${
              isSelected
                ? darkMode 
                  ? `bg-gray-700 text-white border-b-2 ${tab.id === 'contradictory' ? 'border-orange-400' : 'border-blue-400'}` 
                  : `bg-white text-gray-900 border-b-2 ${tab.id === 'contradictory' ? 'border-orange-500' : 'border-blue-500'}`
                : darkMode
                  ? 'text-gray-400 hover:bg-gray-700/50'
                  : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

/**
 * ExampleCard Component
 * 
 * Renders individual example policy card with optional contradiction warning
 */
const ExampleCard = ({ example, onSelect, darkMode, textClass, mutedTextClass }) => {
  return (
    <button
      onClick={onSelect}
      className={`p-5 rounded-lg border-2 text-left transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 relative ${
        darkMode 
          ? 'bg-gray-700 border-gray-500 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/20' 
          : 'bg-white border-gray-300 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/20'
      }`}
      aria-label={`Select ${example.title} example`}
    >
      {/* Contradiction Warning Icon */}
      {example.hasContradiction && (
        <div className={`absolute top-2 right-2 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
      )}

      <div className="space-y-2">
        {/* Title */}
        <div className={`font-semibold text-base ${textClass} ${example.hasContradiction ? 'pr-8' : ''}`}>
          {example.title}
        </div>

        {/* Description */}
        <div className={`text-sm leading-relaxed line-clamp-3 ${mutedTextClass}`}>
          {example.text}
        </div>

        {/* Contradiction Hint */}
        {example.hasContradiction && example.contradictionHint && (
          <div className={`text-xs mt-2 pt-2 border-t ${
            darkMode ? 'border-gray-600 text-orange-400' : 'border-gray-200 text-orange-600'
          }`}>
            💡 {example.contradictionHint}
          </div>
        )}
      </div>
    </button>
  );
};

/**
 * Styles Component
 * Inline styles for animations and utility classes
 */
const Styles = () => (
  <style jsx>{`
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .animate-fade-in {
      animation: fade-in 0.35s ease-in-out;
    }
    
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `}</style>
);

export default ExamplePolicies;