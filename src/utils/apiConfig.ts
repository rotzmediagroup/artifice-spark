// API configuration for unified server architecture
const getApiBaseUrl = (): string => {
  // In production, use relative paths since API is served from same server
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  
  // In development, check if we're running the unified server or separate backend
  // For development with unified server, use same port as frontend
  const isDevelopmentUnified = window.location.port === '5173' || window.location.port === '3000';
  
  if (isDevelopmentUnified) {
    // Check if backend is running on 3001 (separate backend for dev)
    return 'http://localhost:3001/api';
  }
  
  // If running unified server in development, use relative path
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();