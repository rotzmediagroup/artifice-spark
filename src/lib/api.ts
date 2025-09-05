import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setTokens = (tokens: { accessToken: string; refreshToken: string }) => {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
};

export const getTokens = () => {
  if (!accessToken || !refreshToken) {
    accessToken = localStorage.getItem('accessToken');
    refreshToken = localStorage.getItem('refreshToken');
  }
  return { accessToken, refreshToken };
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const { accessToken } = getTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = getTokens();
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const newTokens = response.data.tokens;
          setTokens(newTokens);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API functions
export const api = {
  // Authentication
  auth: {
    register: (data: { email: string; password: string; displayName: string }) =>
      apiClient.post('/auth/register', data),
    
    login: (data: { email: string; password: string }) =>
      apiClient.post('/auth/login', data),
    
    logout: (refreshToken: string) =>
      apiClient.post('/auth/logout', { refreshToken }),
    
    me: () =>
      apiClient.get('/auth/me'),
    
    refresh: (refreshToken: string) =>
      apiClient.post('/auth/refresh', { refreshToken }),
  },

  // User
  user: {
    getProfile: () =>
      apiClient.get('/user/profile'),
    
    getCredits: () =>
      apiClient.get('/user/credits'),
    
    getTransactions: (params?: { page?: number; limit?: number }) =>
      apiClient.get('/user/transactions', { params }),
  },

  // Images
  images: {
    getAll: (params?: { page?: number; limit?: number }) =>
      apiClient.get('/images', { params }),
    
    create: (data: {
      url: string;
      filePath: string;
      prompt: string;
      style?: string;
      contentType?: 'image' | 'video';
      fileExtension?: string;
      settings?: Record<string, any>;
      expiresAt?: string;
    }) =>
      apiClient.post('/images', data),
    
    update: (id: string, data: { liked?: boolean; extend?: boolean }) =>
      apiClient.put(`/images/${id}`, data),
    
    delete: (id: string) =>
      apiClient.delete(`/images/${id}`),
  },

  // Presets
  presets: {
    getAll: () =>
      apiClient.get('/presets'),
    
    create: (data: {
      name: string;
      positivePrompt: string;
      negativePrompt?: string;
      selectedStyle: string;
      aspectRatio: Record<string, any>;
      steps: number;
      cfgScale: number;
      customWidth?: number;
      customHeight?: number;
      useCustomDimensions?: boolean;
    }) =>
      apiClient.post('/presets', data),
    
    delete: (id: string) =>
      apiClient.delete(`/presets/${id}`),
  },

  // File upload
  upload: {
    reference: (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return apiClient.post('/upload/reference', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
  },

  // TOTP (Two-Factor Authentication)
  totp: {
    getSettings: () =>
      apiClient.get('/totp/settings'),
    
    enable: (data: { secret: string; verificationCode: string; backupCodes: string[] }) =>
      apiClient.post('/totp/enable', data),
    
    disable: (data: { verificationCode: string }) =>
      apiClient.post('/totp/disable', data),
    
    verify: (data: { code: string }) =>
      apiClient.post('/totp/verify', data),
    
    verifyBackup: (data: { code: string }) =>
      apiClient.post('/totp/verify-backup', data),
    
    regenerateBackupCodes: () =>
      apiClient.post('/totp/regenerate-backup-codes'),
  },
};

export default apiClient;