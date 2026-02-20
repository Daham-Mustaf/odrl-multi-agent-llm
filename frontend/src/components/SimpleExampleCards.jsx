import React from 'react';
import { FileText, Music, Image } from 'lucide-react';

const SimpleExampleCards = ({ onSelectExample, darkMode }) => {
  const examples = [
    {
      id: 1,
      icon: FileText,
      title: 'Document',
      text: 'Users can read and print the document but cannot modify or distribute it. The policy expires on December 31, 2025.',
      color: 'blue'
    },
    {
      id: 2,
      icon: Music,
      title: 'Audio',
      text: 'The audio track can be streamed for personal listening only. Commercial use, downloading, and redistribution are prohibited. License valid for 1 year.',
      color: 'purple'
    },
    {
      id: 3,
      icon: Image,
      title: 'Image',
      text: 'The image can be used for personal, non-commercial purposes. Attribution to the photographer is required. Modifications are not allowed.',
      color: 'green'
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    green: 'bg-green-500 hover:bg-green-600'
  };

  return (
    <div className="flex gap-2 mb-4">
      {examples.map((example) => {
        const Icon = example.icon;
        const colors = colorClasses[example.color];
        
        return (
          <button
            key={example.id}
            onClick={() => onSelectExample(example.text)}
            title={`Load ${example.title} example`}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${colors} text-white transition-all hover:scale-105 font-medium text-sm`}
          >
            <Icon className="w-4 h-4" />
            <span>{example.title}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SimpleExampleCards;
