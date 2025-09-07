// Dynamic API configuration utility
const getApiBaseUrl = (): string => {
  // In production, use relative paths
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  
  // In development, try to read the dynamic port from backend
  try {
    // This would be populated by the backend at runtime
    const portInfo = {
      port: 3001,
      apiUrl: 'http://localhost:3001/api'
    };
    
    // Try to get port info from backend file if available
    // Note: In actual dev, this would be handled by a build process or service discovery
    return `http://localhost:3001/api`;
  } catch (error) {
    // Fallback to default port
    console.warn('Could not read backend port info, using default 3001');
    return 'http://localhost:3001/api';
  }
};

export const API_BASE_URL = getApiBaseUrl();