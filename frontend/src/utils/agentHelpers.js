import { FileText, Brain, Code, Shield } from 'lucide-react';

/**
 * Get icon component for agent
 */
export const getAgentIcon = (agent) => {
  const icons = {
    parser: FileText,
    reasoner: Brain,
    generator: Code,
    validator: Shield
  };
  return icons[agent] || FileText;
};

/**
 * Get color configuration for agent
 */
export const getAgentColor = (agent, darkMode = false) => {
  const colors = {
    parser: {
      solid: '#3b82f6',
      light: darkMode ? 'bg-blue-900/30' : 'bg-blue-50',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500'
    },
    reasoner: {
      solid: '#8b5cf6',
      light: darkMode ? 'bg-violet-900/30' : 'bg-violet-50',
      text: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-500'
    },
    generator: {
      solid: '#10b981',
      light: darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500'
    },
    validator: {
      solid: '#f59e0b',
      light: darkMode ? 'bg-amber-900/30' : 'bg-amber-50',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500'
    }
  };
  
  return colors[agent] || colors.parser;
};

/**
 * Get metrics key for agent
 */
export const getMetricsKey = (agent) => {
  const keys = {
    parser: 'parseTime',
    reasoner: 'reasonTime',
    generator: 'generateTime',
    validator: 'validateTime'
  };
  return keys[agent] || 'parseTime';
};

/**
 * Format time in milliseconds to seconds
 */
export const formatTime = (ms) => {
  if (!ms || ms === 0) return '0.00s';
  return `${(ms / 1000).toFixed(2)}s`;
};
