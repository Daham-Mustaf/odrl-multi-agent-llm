import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ExamplePolicies = ({ onSelectExample, darkMode, textClass, mutedTextClass }) => {
  const [showExamples, setShowExamples] = useState(false);

  const examples = [
    { 
      title: "Document Policy",
      text: "Users can read and print the document but cannot modify or distribute it. However, users are allowed to share modified versions with attribution. The policy expires on December 31, 2025.",
    },
    { 
      title: "Academic Dataset",
      text: "Researchers can download and analyze the dataset for non-commercial research purposes. Attribution is required. Commercial use is prohibited.",
    },
    { 
      title: "Software License",
      text: "Users can use, copy, and modify the software. Distribution requires attribution and must use the same license.",
    },
    { 
      title: "Photo Rights",
      text: "The photographer grants rights to use the photo on social media with attribution. Print publication requires additional permission.",
    }
  ];

  const handleSelectExample = (example) => {
    onSelectExample(example.text);
    setShowExamples(false);
  };

  return (
    <div className={`rounded-lg border-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
      <button
        onClick={() => setShowExamples(!showExamples)}
        aria-label="Toggle example policies"
        aria-expanded={showExamples}
        className={`w-full px-4 py-3 flex items-center justify-between transition focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg ${
          darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center">
          <span className={`text-sm font-semibold ${textClass}`}>Quick Start Examples</span>
        </div>
        {showExamples ? 
          <ChevronUp className="w-4 h-4 transition-transform" /> : 
          <ChevronDown className="w-4 h-4 transition-transform" />
        }
      </button>

      {showExamples && (
        <div className={`px-4 pb-4 pt-2 border-t-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'} animate-fade-in`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {examples.map((example, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectExample(example)}
                className={`p-5 rounded-lg border-2 text-left transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-500 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/20' 
                    : 'bg-white border-gray-300 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/20'
                }`}
                aria-label={`Select ${example.title} example`}
              >
                <div className="space-y-2">
                  <div className={`font-semibold text-base ${textClass}`}>
                    {example.title}
                  </div>
                  <div className={`text-sm leading-relaxed line-clamp-2 ${mutedTextClass}`}>
                    {example.text}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default ExamplePolicies;