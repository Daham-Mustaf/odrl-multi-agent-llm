// // frontend/src/config/api.js

// // Detect environment
// const isDevelopment = process.env.NODE_ENV === 'development';
// const isProduction = process.env.NODE_ENV === 'production';

// // Backend URL configuration
// export const API_URL = process.env.REACT_APP_API_URL || 
//   (isProduction ? 'http://10.33.42.87:8000' : 'http://localhost:8000');

// // SSE Configuration
// export const SSE_CONFIG = {
//   reconnectInterval: 5000,  // 5 seconds
//   maxReconnectAttempts: 5,
//   timeout: 15000           // 15 seconds keepalive
// };

// // Model Configuration
// export const MODEL_CONFIG = {
//   defaultTemperature: 0.3,
//   minTemperature: 0.0,
//   maxTemperature: 1.0,
//   temperatureStep: 0.1
// };

// console.log('[Config] API URL:', API_URL);
// console.log('[Config] Environment:', process.env.NODE_ENV);

// frontend/src/config/api.js

// Backend URL - uses .env variable
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// SSE Configuration
export const SSE_CONFIG = {
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  timeout: 15000
};

// Model Configuration
export const MODEL_CONFIG = {
  defaultTemperature: 0.3,
  minTemperature: 0.0,
  maxTemperature: 1.0,
  temperatureStep: 0.1
};

console.log('[Config] API URL:', API_URL);
console.log('[Config] Environment:', process.env.NODE_ENV);