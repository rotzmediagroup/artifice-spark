import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface GeneratedImageData {
  id: string;
  url: string;
  prompt: string;
  style: string;
  timestamp: Date;
  liked: boolean;
  contentType?: 'image' | 'video'; // Media type
  fileExtension?: string;    // File extension (.png, .mp4)
  settings: {
    steps: number;
    cfgScale: number;
    aspectRatio: string;
    negativePrompt: string;
    // Enhanced dimension data
    width?: number;
    height?: number;
    isCustomDimensions?: boolean;
    totalPixels?: number;
    megapixels?: number;
    // Video-specific settings
    videoDuration?: number;
    videoFps?: number;
    videoFormat?: string;
    videoWithAudio?: boolean;
    videoResolution?: string;
  };
  // Auto-deletion fields
  expiresAt: Date;           // Deletion date (14 days from creation)
  extensionCount: number;     // Track extensions (max 3 for users, unlimited for admin)
  lastExtendedAt?: Date;      // Last extension timestamp
  isExpired?: boolean;        // Mark expired images (for UI display before deletion)
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
  // Enhanced dimension data
  customWidth?: number;
  customHeight?: number;
  useCustomDimensions?: boolean;
}

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

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

  // Convert PostgreSQL data to our format
  const convertImageData = (data: any): GeneratedImageData => {
    const timestamp = new Date(data.timestamp || data.created_at);
    const expiresAt = new Date(data.expires_at);
    const isExpired = expiresAt < new Date();
    
    return {
      id: data.id,
      url: data.url,
      prompt: data.prompt,
      style: data.style,
      timestamp,
      liked: data.liked || false,
      contentType: data.content_type || 'image',
      fileExtension: data.file_extension || '.png',
      settings: {
        steps: data.steps || 30,
        cfgScale: data.cfg_scale || 7,
        aspectRatio: data.aspect_ratio || 'Square (1:1)',
        negativePrompt: data.negative_prompt || '',
        width: data.width || 1024,
        height: data.height || 1024,
        isCustomDimensions: data.is_custom_dimensions || false,
        totalPixels: data.total_pixels || 1048576,
        megapixels: data.megapixels || 1.05,
        videoDuration: data.video_duration,
        videoFps: data.video_fps,
        videoFormat: data.video_format,
        videoWithAudio: data.video_with_audio,
        videoResolution: data.video_resolution
      },
      expiresAt,
      extensionCount: data.extension_count || 0,
      lastExtendedAt: data.last_extended_at ? new Date(data.last_extended_at) : undefined,
      isExpired
    };
  };

  const convertPresetData = (data: any): PresetData => ({
    id: data.id,
    name: data.name,
    positivePrompt: data.positive_prompt,
    negativePrompt: data.negative_prompt,
    selectedStyle: data.selected_style,
    aspectRatio: {
      label: data.aspect_ratio_label,
      value: data.aspect_ratio_value,
      width: data.aspect_ratio_width,
      height: data.aspect_ratio_height,
      category: data.aspect_ratio_category
    },
    steps: data.steps,
    cfgScale: data.cfg_scale,
    timestamp: new Date(data.timestamp || data.created_at),
    customWidth: data.custom_width || 1024,
    customHeight: data.custom_height || 1024,
    useCustomDimensions: data.use_custom_dimensions || false,
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
          console.error('Error loading image history:', await imagesResponse.text());
          setImageHistory([]);
        }

        // Load presets
        const presetsResponse = await apiCall(`/users/${user.id}/presets`);
        if (presetsResponse.ok) {
          const presetsData = await presetsResponse.json();
          const presets = presetsData.map(convertPresetData);
          setPresets(presets);
        } else {
          console.error('Error loading presets:', await presetsResponse.text());
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
        body: JSON.stringify({
          url: imageData.url,
          prompt: imageData.prompt,
          style: imageData.style,
          liked: imageData.liked,
          content_type: imageData.contentType,
          file_extension: imageData.fileExtension,
          steps: imageData.settings.steps,
          cfg_scale: imageData.settings.cfgScale,
          aspect_ratio: imageData.settings.aspectRatio,
          negative_prompt: imageData.settings.negativePrompt,
          width: imageData.settings.width,
          height: imageData.settings.height,
          is_custom_dimensions: imageData.settings.isCustomDimensions,
          total_pixels: imageData.settings.totalPixels,
          megapixels: imageData.settings.megapixels,
          video_duration: imageData.settings.videoDuration,
          video_fps: imageData.settings.videoFps,
          video_format: imageData.settings.videoFormat,
          video_with_audio: imageData.settings.videoWithAudio,
          video_resolution: imageData.settings.videoResolution,
          expires_at: imageData.expiresAt.toISOString(),
          extension_count: imageData.extensionCount,
          last_extended_at: imageData.lastExtendedAt?.toISOString(),
          is_expired: imageData.isExpired
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
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
    
    // This would require a PATCH endpoint in our API
    console.warn('updateImageInHistory not implemented for PostgreSQL yet');
  };

  const deleteImageFromHistory = async (imageId: string) => {
    if (!user) return;
    
    // This would require a DELETE endpoint in our API
    console.warn('deleteImageFromHistory not implemented for PostgreSQL yet');
  };

  // Preset operations
  const addPreset = async (presetData: Omit<PresetData, 'id'>) => {
    if (!user) return;
    
    try {
      const response = await apiCall(`/users/${user.id}/presets`, {
        method: 'POST',
        body: JSON.stringify({
          name: presetData.name,
          positive_prompt: presetData.positivePrompt,
          negative_prompt: presetData.negativePrompt,
          selected_style: presetData.selectedStyle,
          aspect_ratio_label: presetData.aspectRatio.label,
          aspect_ratio_value: presetData.aspectRatio.value,
          aspect_ratio_width: presetData.aspectRatio.width,
          aspect_ratio_height: presetData.aspectRatio.height,
          aspect_ratio_category: presetData.aspectRatio.category,
          steps: presetData.steps,
          cfg_scale: presetData.cfgScale,
          custom_width: presetData.customWidth,
          custom_height: presetData.customHeight,
          use_custom_dimensions: presetData.useCustomDimensions
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
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
        body: JSON.stringify({
          name: updates.name,
          positive_prompt: updates.positivePrompt,
          negative_prompt: updates.negativePrompt,
          selected_style: updates.selectedStyle,
          aspect_ratio_label: updates.aspectRatio?.label,
          aspect_ratio_value: updates.aspectRatio?.value,
          aspect_ratio_width: updates.aspectRatio?.width,
          aspect_ratio_height: updates.aspectRatio?.height,
          aspect_ratio_category: updates.aspectRatio?.category,
          steps: updates.steps,
          cfg_scale: updates.cfgScale,
          custom_width: updates.customWidth,
          custom_height: updates.customHeight,
          use_custom_dimensions: updates.useCustomDimensions
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
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
        throw new Error(await response.text());
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
    console.warn('migrateFromLocalStorage not needed for PostgreSQL implementation');
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