// hooks/useChatHistory.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing chat/processing history
 * Handles localStorage persistence and history operations
 * 
 * @param {number} maxItems - Maximum number of history items to keep (default: 50)
 * @returns {Object} History management functions and state
 */
export const useChatHistory = (maxItems = 50) => {
  const [history, setHistory] = useState([]);
  const STORAGE_KEY = 'odrl_processing_history';

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
        console.log(`Loaded ${parsed.length} history items`);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }, [history]);

  /**
   * Add a new history item
   * @param {Object} item - History item to add
   * @returns {string} ID of the added item
   */
  const addToHistory = useCallback((item) => {
    const historyItem = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      status: 'completed',
      ...item
    };

    setHistory(prev => {
      const updated = [historyItem, ...prev];
      // Keep only maxItems
      return updated.slice(0, maxItems);
    });

    console.log('Added to history:', historyItem.id);
    return historyItem.id;
  }, [maxItems]);

  /**
   * Update an existing history item
   * @param {string} id - Item ID
   * @param {Object} updates - Fields to update
   */
  const updateHistoryItem = useCallback((id, updates) => {
    setHistory(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item
      )
    );
    console.log('Updated history item:', id);
  }, []);

  /**
   * Remove a specific history item
   * @param {string} id - Item ID
   */
  const removeFromHistory = useCallback((id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    console.log('Removed from history:', id);
  }, []);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    console.log('Cleared all history');
  }, []);

  /**
   * Get a specific history item by ID
   * @param {string} id - Item ID
   * @returns {Object|null} History item or null
   */
  const getHistoryItem = useCallback((id) => {
    return history.find(item => item.id === id) || null;
  }, [history]);

  /**
   * Search history by query
   * @param {string} query - Search query
   * @returns {Array} Filtered history items
   */
  const searchHistory = useCallback((query) => {
    const lowerQuery = query.toLowerCase();
    return history.filter(item => 
      item.inputText?.toLowerCase().includes(lowerQuery) ||
      item.model?.toLowerCase().includes(lowerQuery) ||
      item.status?.toLowerCase().includes(lowerQuery)
    );
  }, [history]);

  /**
   * Get statistics about history
   * @returns {Object} Stats object
   */
  const getStats = useCallback(() => {
    const total = history.length;
    const completed = history.filter(h => h.status === 'completed').length;
    const failed = history.filter(h => h.status === 'failed').length;
    const cancelled = history.filter(h => h.status === 'cancelled').length;

    // Calculate average processing time if available
    const timings = history
      .filter(h => h.totalTime)
      .map(h => h.totalTime);
    const avgTime = timings.length > 0 
      ? timings.reduce((a, b) => a + b, 0) / timings.length 
      : 0;

    return {
      total,
      completed,
      failed,
      cancelled,
      avgProcessingTime: avgTime,
      successRate: total > 0 ? (completed / total * 100).toFixed(1) : 0
    };
  }, [history]);

  /**
   * Export history as JSON
   * @returns {string} JSON string
   */
  const exportHistory = useCallback(() => {
    return JSON.stringify(history, null, 2);
  }, [history]);

  /**
   * Import history from JSON
   * @param {string} jsonString - JSON string
   * @param {boolean} append - If true, append to existing history. If false, replace.
   */
  const importHistory = useCallback((jsonString, append = false) => {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) {
        throw new Error('Invalid history format');
      }

      if (append) {
        setHistory(prev => [...imported, ...prev].slice(0, maxItems));
      } else {
        setHistory(imported.slice(0, maxItems));
      }

      console.log(`Imported ${imported.length} history items`);
      return true;
    } catch (error) {
      console.error('Failed to import history:', error);
      return false;
    }
  }, [maxItems]);

  return {
    history,
    addToHistory,
    updateHistoryItem,
    removeFromHistory,
    clearHistory,
    getHistoryItem,
    searchHistory,
    getStats,
    exportHistory,
    importHistory
  };
};

/**
 * Helper function to create a history item from processing results
 * @param {Object} data - Processing data
 * @returns {Object} Formatted history item
 */
export const createHistoryItem = (data) => {
  return {
    inputText: data.inputText || '',
    model: data.selectedModel || 'unknown',
    temperature: data.temperature || 0.3,
    status: data.error ? 'failed' : 'completed',
    completedStages: data.completedStages || [],
    parsedData: data.parsedData || null,
    reasoningResult: data.reasoningResult || null,
    generatedODRL: data.generatedODRL || null,
    validationResult: data.validationResult || null,
    error: data.error || null,
    totalTime: data.totalTime || 0,
    metrics: data.metrics || {}
  };
};