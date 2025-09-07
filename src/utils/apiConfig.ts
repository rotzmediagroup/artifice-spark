// API configuration for unified server architecture
const getApiBaseUrl = (): string => {
  // In production, always use relative paths since API is served from same server
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  
  // In development, check if we have a custom backend URL
  // Otherwise default to localhost:8888 for unified server
  const devBackendUrl = import.meta.env.VITE_API_URL;
  if (devBackendUrl) {
    return devBackendUrl;
  }
  
  // Default development URL for unified server
  return 'http://localhost:8888/api';
};

export const API_BASE_URL = getApiBaseUrl();