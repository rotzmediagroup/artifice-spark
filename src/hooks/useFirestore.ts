import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/utils/apiConfig';

export interface GeneratedImageData {
  id: string;
  url: string;
  prompt: string;
  style: string;
  timestamp: Date;
  liked: boolean;
  contentType?: 'image' | 'video';
  fileExtension?: string;
  settings: {
    steps: number;
    cfgScale: number;
    aspectRatio: string;
    negativePrompt: string;
    width?: number;
    height?: number;
    isCustomDimensions?: boolean;
    totalPixels?: number;
    megapixels?: number;
    videoDuration?: number;
    videoFps?: number;
    videoFormat?: string;
    videoWithAudio?: boolean;
    videoResolution?: string;
  };
  expiresAt: Date;
  extensionCount: number;
  lastExtendedAt?: Date;
  isExpired?: boolean;
}

export interface PresetData {
  id: string;
  name: string;
  positivePrompt: string;
  negativePrompt: string;
  selectedStyle: string;
  aspectRatio: {
    label: string;
    value: string;
    width: number;
    height: number;
    category: string;
  };
  steps: number;
  cfgScale: number;
  timestamp: Date;
  customWidth?: number;
  customHeight?: number;
  useCustomDimensions?: boolean;
}

export const useFirestore = () => {
  const { user } = useAuth();
  const [imageHistory, setImageHistory] = useState<GeneratedImageData[]>([]);
  const [presets, setPresets] = useState<PresetData[]>([]);
  const [loading, setLoading] = useState(true);

  // API call helper with auth token
  const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  };

  // Convert API data to our format
  const convertImageData = (data: any): GeneratedImageData => {
    return {
      id: data.id,
      url: data.url,
      prompt: data.prompt,
      style: data.style,
      timestamp: new Date(data.timestamp),
      liked: data.liked || false,
      contentType: data.contentType || 'image',
      fileExtension: data.fileExtension || '.png',
      settings: data.settings || {
        steps: 30,
        cfgScale: 7,
        aspectRatio: 'Square (1:1)',
        negativePrompt: '',
        width: 1024,
        height: 1024,
        isCustomDimensions: false,
        totalPixels: 1048576,
        megapixels: 1.05
      },
      expiresAt: new Date(data.expiresAt),
      extensionCount: data.extensionCount || 0,
      lastExtendedAt: data.lastExtendedAt ? new Date(data.lastExtendedAt) : undefined,
      isExpired: data.isExpired
    };
  };

  const convertPresetData = (data: any): PresetData => ({
    id: data.id,
    name: data.name,
    positivePrompt: data.positivePrompt,
    negativePrompt: data.negativePrompt,
    selectedStyle: data.selectedStyle,
    aspectRatio: typeof data.aspectRatio === 'string' ? JSON.parse(data.aspectRatio) : data.aspectRatio,
    steps: data.steps,
    cfgScale: data.cfgScale,
    timestamp: new Date(data.timestamp),
    customWidth: data.customWidth || 1024,
    customHeight: data.customHeight || 1024,
    useCustomDimensions: data.useCustomDimensions || false,
  });

  // Load data when user changes
  useEffect(() => {
    if (!user) {
      setImageHistory([]);
      setPresets([]);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      
      try {
        // Load image history
        const imagesResponse = await apiCall(`/users/${user.id}/images`);
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          const images = imagesData.map(convertImageData);
          setImageHistory(images);
        } else {
          console.error('Error loading image history');
          setImageHistory([]);
        }

        // Load presets
        const presetsResponse = await apiCall(`/users/${user.id}/presets`);
        if (presetsResponse.ok) {
          const presetsData = await presetsResponse.json();
          const presets = presetsData.map(convertPresetData);
          setPresets(presets);
        } else {
          console.error('Error loading presets');
          setPresets([]);
        }

      } catch (error) {
        console.error('Error loading data:', error);
        setImageHistory([]);
        setPresets([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Image history operations
  const addImageToHistory = async (imageData: Omit<GeneratedImageData, 'id'>) => {
    if (!user) return;
    
    try {
      const response = await apiCall(`/users/${user.id}/images`, {
        method: 'POST',
        body: JSON.stringify(imageData)
      });

      if (!response.ok) {
        throw new Error('Failed to save image');
      }

      // Reload data to get the new image
      const imagesResponse = await apiCall(`/users/${user.id}/images`);
      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json();
        const images = imagesData.map(convertImageData);
        setImageHistory(images);
      }
    } catch (error) {
      console.error('Error adding image to history:', error);
      throw error;
    }
  };

  const updateImageInHistory = async (imageId: string, updates: Partial<GeneratedImageData>) => {
    if (!user) return;
    
    try {
      const response = await apiCall(`/users/${user.id}/images/${imageId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update image');
      }

      // Update local state optimistically
      setImageHistory(prev => prev.map(img => 
        img.id === imageId ? { ...img, ...updates } : img
      ));

      console.log('Image updated successfully');
    } catch (error) {
      console.error('Error updating image:', error);
      throw error;
    }
  };

  const deleteImageFromHistory = async (imageId: string) => {
    if (!user) return;
    
    try {
      const response = await apiCall(`/users/${user.id}/images/${imageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      // Remove from local state
      setImageHistory(prev => prev.filter(img => img.id !== imageId));

      console.log('Image deleted successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  };

  // Preset operations
  const addPreset = async (presetData: Omit<PresetData, 'id'>) => {
    if (!user) return;
    
    try {
      const response = await apiCall(`/users/${user.id}/presets`, {
        method: 'POST',
        body: JSON.stringify(presetData)
      });

      if (!response.ok) {
        throw new Error('Failed to save preset');
      }

      // Reload presets to get the new one
      const presetsResponse = await apiCall(`/users/${user.id}/presets`);
      if (presetsResponse.ok) {
        const presetsData = await presetsResponse.json();
        const presets = presetsData.map(convertPresetData);
        setPresets(presets);
      }
    } catch (error) {
      console.error('Error adding preset:', error);
      throw error;
    }
  };

  const updatePreset = async (presetId: string, updates: Partial<PresetData>) => {
    if (!user) return;
    
    try {
      const response = await apiCall(`/users/${user.id}/presets/${presetId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update preset');
      }

      // Reload presets
      const presetsResponse = await apiCall(`/users/${user.id}/presets`);
      if (presetsResponse.ok) {
        const presetsData = await presetsResponse.json();
        const presets = presetsData.map(convertPresetData);
        setPresets(presets);
      }
    } catch (error) {
      console.error('Error updating preset:', error);
      throw error;
    }
  };

  const deletePreset = async (presetId: string) => {
    if (!user) return;
    
    try {
      const response = await apiCall(`/users/${user.id}/presets/${presetId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete preset');
      }

      // Remove from local state
      setPresets(prev => prev.filter(p => p.id !== presetId));
    } catch (error) {
      console.error('Error deleting preset:', error);
      throw error;
    }
  };

  // Migration function from localStorage (keeping for backward compatibility)
  const migrateFromLocalStorage = async () => {
    if (!user) return;
    console.log('Migration from localStorage not needed for PostgreSQL');
  };

  return {
    imageHistory,
    presets,
    loading,
    addImageToHistory,
    updateImageInHistory,
    deleteImageFromHistory,
    addPreset,
    updatePreset,
    deletePreset,
    migrateFromLocalStorage
  };
};