import React from 'react';
import { FileText, Music, Image, AlertTriangle } from 'lucide-react';

const ModernExampleCards = ({ onSelectExample, darkMode }) => {
  const examples = [
    {
      id: 1,
      icon: FileText,
      title: 'Document Access',
      description: 'Read and print allowed, modifications prohibited',
      text: 'Users can read and print the document but cannot modify or distribute it. The policy expires on December 31, 2025.',
      color: 'blue'
    },
    {
      id: 2,
      icon: Music,
      title: 'Music Streaming',
      description: 'Stream only, no downloads or commercial use',
      text: 'The audio track can be streamed for personal listening only. Commercial use, downloading, and redistribution are prohibited. License valid for 1 year.',
      color: 'purple'
    },
    {
      id: 3,
      icon: Image,
      title: 'Image License',
      description: 'Personal use with attribution required',
      text: 'The image can be used for personal, non-commercial purposes. Attribution to the photographer is required. Modifications are not allowed.',
      color: 'green'
    },
  ];

  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-indigo-500',
      icon: 'bg-blue-500',
      border: 'border-blue-500',
      hover: 'hover:border-blue-500 hover:shadow-blue-500/20'
    },
    purple: {
      gradient: 'from-purple-500 to-pink-500',
      icon: 'bg-purple-500',
      border: 'border-purple-500',
      hover: 'hover:border-purple-500 hover:shadow-purple-500/20'
    },
    green: {
      gradient: 'from-green-500 to-emerald-500',
      icon: 'bg-green-500',
      border: 'border-green-500',
      hover: 'hover:border-green-500 hover:shadow-green-500/20'
    }
  };

  return (
    <div className="mb-6">
      {/* <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Quick Start Examples
        </h3>
        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Click to load
        </span>
      </div> */}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {examples.map((example) => {
          const Icon = example.icon;
          const colors = colorClasses[example.color];
          
          return (
            <button
              key={example.id}
              onClick={() => onSelectExample(example.text)}
              className={`group relative p-5 rounded-xl border-2 text-left transition-all duration-300 ${
                darkMode
                  ? `bg-gray-800 border-gray-700 ${colors.hover}`
                  : `bg-white border-gray-200 ${colors.hover}`
              } hover:scale-[1.02] hover:shadow-xl`}
            >
              {/* Top gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
              
              {/* Icon */}
              <div className={`w-12 h-12 rounded-lg ${colors.icon} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              
              {/* Content */}
              <h4 className={`font-bold text-base mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {example.title}
              </h4>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {example.description}
              </p>
              
              {/* Arrow indicator */}
              <div className={`mt-3 flex items-center gap-2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                <span>Load example</span>
                <span>→</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ModernExampleCards;
