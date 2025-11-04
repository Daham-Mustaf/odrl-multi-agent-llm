// hooks/useAbortController.js
import { useRef, useCallback } from 'react';

/**
 * Custom hook for managing AbortController
 * Provides cancellation support for async operations (API calls, LLM processing)
 * 
 * @returns {Object} Controller management functions and signal
 */
export const useAbortController = () => {
  const abortControllerRef = useRef(null);

  /**
   * Create a new AbortController and return its signal
   * @returns {AbortSignal} Signal for fetch/async operations
   */
  const getSignal = useCallback(() => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new controller
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);

  /**
   * Abort the current operation
   * @param {string} reason - Optional reason for abortion
   */
  const abort = useCallback((reason = 'User cancelled') => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(reason);
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Check if there's an active controller
   * @returns {boolean}
   */
  const isActive = useCallback(() => {
    return abortControllerRef.current !== null;
  }, []);

  /**
   * Cleanup function to abort on unmount
   */
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('Component unmounted');
      abortControllerRef.current = null;
    }
  }, []);

  return {
    getSignal,
    abort,
    isActive,
    cleanup
  };
};

/**
 * Example usage:
 * 
 * const { getSignal, abort } = useAbortController();
 * 
 * // In your API call:
 * const fetchData = async () => {
 *   const signal = getSignal();
 *   try {
 *     const response = await fetch(url, { signal });
 *     // ... handle response
 *   } catch (error) {
 *     if (error.name === 'AbortError') {
 *       console.log('Request was cancelled');
 *     }
 *   }
 * };
 * 
 * // To cancel:
 * abort('User clicked stop');
 */