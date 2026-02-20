import React from 'react';
import { FileText, Brain, Code, Shield, ArrowRight } from 'lucide-react';

const CompactAgentNav = ({
  activeTab,
  setActiveTab,
  agentStates,
  parsedData,
  reasoningResult,
  generatedODRL,
  validationResult,
  darkMode,
}) => {
  const agents = [
    { id: 'parser', icon: FileText, label: 'Parse', color: '#3b82f6' },
    { id: 'reasoner', icon: Brain, label: 'Reason', color: '#8b5cf6' },
    { id: 'generator', icon: Code, label: 'Generate', color: '#10b981' },
    { id: 'validator', icon: Shield, label: 'Validate', color: '#f59e0b' },
  ];

  // Determine which agents to show based on progress
  const getVisibleAgents = () => {
    const visible = ['parser']; // Always show parser
    
    if (parsedData || agentStates.parser === 'completed') {
      visible.push('reasoner');
    }
    
    if (reasoningResult || agentStates.reasoner === 'completed') {
      visible.push('generator');
    }
    
    if (generatedODRL || agentStates.generator === 'completed') {
      visible.push('validator');
    }
    
    return visible;
  };

  const visibleAgentIds = getVisibleAgents();

  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
      <div className="max-w-7xl mx-auto px-6 py-2">
        <div className="flex items-center gap-2">
          {agents
            .filter(agent => visibleAgentIds.includes(agent.id))
            .map((agent, idx, visibleAgents) => {
              const Icon = agent.icon;
              const isActive = activeTab === agent.id;
              const state = agentStates[agent.id];
              
              return (
                <React.Fragment key={agent.id}>
                  <button
                    onClick={() => setActiveTab(agent.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                      isActive 
                        ? darkMode 
                          ? 'bg-gray-700 text-white' 
                          : 'bg-gray-100 text-gray-900'
                        : darkMode 
                          ? 'hover:bg-gray-700/50 text-gray-400' 
                          : 'hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {/* Icon with status */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                        state === 'completed' 
                          ? 'text-white' 
                          : state === 'processing'
                            ? 'text-white animate-pulse'
                            : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                      }`}
                      style={
                        state === 'completed' || state === 'processing'
                          ? { background: agent.color }
                          : {}
                      }
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    {/* Label */}
                    <span className="text-sm font-medium">{agent.label}</span>
                    
                    {/* Status indicator */}
                    {state === 'completed' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    )}
                    {state === 'processing' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </button>
                  
                  {idx < visibleAgents.length - 1 && (
                    <ArrowRight className={`w-3 h-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  )}
                </React.Fragment>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default CompactAgentNav;