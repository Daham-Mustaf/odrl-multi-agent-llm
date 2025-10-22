import { useState, useEffect } from 'react';

export const useModels = (api) => {
  const [providers, setProviders] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [temperature, setTemperature] = useState(0.3);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const data = await api.getProviders();
      setProviders(data.providers || []);
      
      // Auto-select first available model
      if (data.default_model) {
        setSelectedModel(data.default_model);
      } else if (data.providers?.length > 0) {
        const firstModel = data.providers[0].models[0];
        if (firstModel) setSelectedModel(firstModel.value);
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
    setLoadingProviders(false);
  };

  return {
    providers,
    selectedModel,
    setSelectedModel,
    temperature,
    setTemperature,
    loadingProviders,
    reloadProviders: loadProviders
  };
};