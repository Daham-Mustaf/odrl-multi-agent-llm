import { useState } from 'react';
import { API_URL } from '../config/api';

const API_BASE_URL = `${API_URL}/api`;

export const useBackend = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callAPI = async (endpoint, method = 'GET', body = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : null
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Request failed');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const parse = (text, model, temperature) => 
    callAPI('/parse', 'POST', { text, model, temperature });

  const reason = (parsedData, model, temperature) => 
    callAPI('/reason', 'POST', { parsed_data: parsedData, model, temperature });

  const generate = (reasoningResult, model, temperature) => 
    callAPI('/generate', 'POST', { reasoning_result: reasoningResult, model, temperature });

  const validate = (odrlPolicy, model, temperature) => 
    callAPI('/validate', 'POST', { odrl_policy: odrlPolicy, model, temperature });

  const getProviders = () => 
    callAPI('/available-providers');

  return { parse, reason, generate, validate, getProviders, loading, error };
};