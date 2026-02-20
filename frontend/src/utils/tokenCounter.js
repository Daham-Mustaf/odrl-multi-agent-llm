import { encodingForModel } from 'js-tiktoken';

/**
 * Count tokens in text using GPT-4 tokenizer
 * Falls back to approximate counting if encoding fails
 */
export const countTokens = (text) => {
  if (!text) return 0;
  
  try {
    const encoder = encodingForModel('gpt-4');
    const tokens = encoder.encode(text);
    encoder.free();
    return tokens.length;
  } catch (error) {
    // Fallback: approximate 4 chars per token
    return Math.ceil(text.length / 4);
  }
};

/**
 * Format token count for display
 */
export const formatTokenCount = (count) => {
  if (count < 1000) return `${count} tokens`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K tokens`;
  return `${(count / 1000000).toFixed(1)}M tokens`;
};
