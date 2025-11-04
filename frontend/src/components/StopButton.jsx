// components/StopButton.jsx
import React, { useEffect } from 'react';
import { StopCircle, Loader2 } from 'lucide-react';

/**
 * Stop Button Component
 * Allows users to cancel ongoing LLM processing
 * Keyboard shortcut: Ctrl+S
 * 
 * @param {Object} props
 * @param {boolean} props.isProcessing - Whether LLM is currently processing
 * @param {function} props.onStop - Stop handler callback
 * @param {string} props.currentStage - Current processing stage (e.g., "Parsing", "Reasoning")
 * @param {boolean} props.darkMode - Dark mode state
 */
export const StopButton = ({ 
  isProcessing, 
  onStop, 
  currentStage = 'Processing',
  darkMode = false 
}) => {
  // ✅ Keyboard shortcut: Ctrl+S to stop
  useEffect(() => {
    if (!isProcessing) return;

    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault(); // Prevent browser's "Save Page" dialog
        onStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, onStop]);

  if (!isProcessing) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border-2 rounded-lg shadow-2xl px-6 py-4 animate-slide-up`}>
      
      {/* Processing Indicator */}
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        <div className="flex flex-col">
          <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {currentStage}
          </span>
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Press Ctrl+S to stop
          </span>
        </div>
      </div>

      {/* Stop Button with Hover Tooltip */}
      <div className="relative group">
        <button
          onClick={onStop}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-rose-700 transition shadow-lg transform hover:scale-105"
          aria-label="Stop processing (Ctrl+S)"
        >
          <StopCircle className="w-5 h-5" />
          Stop
        </button>
        
        {/* ✅ Tooltip (shows on button hover) */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
          Click or press <kbd className="px-1.5 py-0.5 bg-white/20 rounded font-mono mx-0.5">Ctrl+S</kbd>
          {/* Arrow pointer */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact Stop Button (for header/toolbar)
 */
export const CompactStopButton = ({ 
  isProcessing, 
  onStop,
  darkMode = false 
}) => {
  // ✅ Same keyboard shortcut for compact version
  useEffect(() => {
    if (!isProcessing) return;

    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, onStop]);

  if (!isProcessing) return null;

  return (
    <div className="relative group">
      <button
        onClick={onStop}
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg text-sm font-semibold hover:from-red-600 hover:to-rose-700 transition shadow-lg animate-pulse-gentle"
        aria-label="Stop processing (Ctrl+S)"
      >
        <StopCircle className="w-4 h-4" />
        Stop
      </button>
      
      {/* Tooltip */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Ctrl+S
      </div>
    </div>
  );
};

// CSS animations
const styles = `
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse-gentle {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

.animate-pulse-gentle {
  animation: pulse-gentle 2s ease-in-out infinite;
}
`;

// Inject styles (if not using Tailwind for custom animations)
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}