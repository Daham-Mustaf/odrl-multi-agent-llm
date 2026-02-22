import { useState } from 'react';

/**
 * Custom hook for managing toast notifications
 * 
 * Usage:
 *   const { toasts, showToast, removeToast } = useToast();
 *   showToast('Success!', 'success');
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type: 'success' | 'error' | 'warning' | 'info'
   */
  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  /**
   * Manually remove a toast
   * @param {number} id - Toast ID to remove
   */
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  /**
   * Clear all toasts
   */
  const clearToasts = () => {
    setToasts([]);
  };

  return { 
    toasts, 
    showToast, 
    removeToast,
    clearToasts
  };
};
