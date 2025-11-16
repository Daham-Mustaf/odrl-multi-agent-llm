// src/utils/storageApi.js

const API_BASE = 'http://localhost:8000';

/* ---------------------------------------------
   SAVE REASONING ANALYSIS
---------------------------------------------- */
export const saveReasoningAnalysis = async (metadata) => {
  try {
    const response = await fetch(`${API_BASE}/api/storage/reasoning/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: metadata.name,
        description: metadata.description,
        reasoning_result: metadata.reasoning_result
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to save reasoning analysis');
    }

    return await response.json();
  } catch (error) {
    console.error('Save Reasoning Analysis error:', error);
    throw error;
  }
};


/* ---------------------------------------------
   SAVE GENERATED POLICY
---------------------------------------------- */
export const saveGeneratedPolicy = async (metadata) => {
  try {
    const response = await fetch(`${API_BASE}/api/storage/generator/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: metadata.name,
        description: metadata.description,
        odrl_turtle: metadata.odrl_turtle,
        metadata: metadata.metadata
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to save generated policy');
    }

    return await response.json();
  } catch (error) {
    console.error(' Save Generated Policy error:', error);
    throw error;
  }
};
