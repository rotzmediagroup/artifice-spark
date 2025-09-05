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

  // Convert API data to our format
  const convertImageData = (data: any): GeneratedImageData => {
    const timestamp = new Date(data.timestamp);
    const expiresAt = new Date(data.expires_at);
    const lastExtendedAt = data.last_extended_at ? new Date(data.last_extended_at) : undefined;
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
        width: data.width,
        height: data.height,
        isCustomDimensions: data.is_custom_dimensions || false,
        totalPixels: data.total_pixels,
        megapixels: data.megapixels,
        videoDuration: data.video_duration,
        videoFps: data.video_fps,
        videoFormat: data.video_format,
        videoWithAudio: data.video_with_audio,
        videoResolution: data.video_resolution
      },
      expiresAt,
      extensionCount: data.extension_count || 0,
      lastExtendedAt,
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
    timestamp: new Date(data.timestamp),
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
        // Load image history and presets in parallel
        const [imagesResponse, presetsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/users/${user.uid}/images`),
          fetch(`${API_BASE_URL}/users/${user.uid}/presets`)
        ]);

        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          setImageHistory(imagesData.map(convertImageData));
        } else {
          console.error('Failed to load image history');
          setImageHistory([]);
        }

        if (presetsResponse.ok) {
          const presetsData = await presetsResponse.json();
          setPresets(presetsData.map(convertPresetData));
        } else {
          console.error('Failed to load presets');
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
      const payload = {
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
      };

      const response = await fetch(`${API_BASE_URL}/users/${user.uid}/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const newImage = await response.json();
        setImageHistory(prev => [convertImageData(newImage), ...prev]);
      } else {
        throw new Error('Failed to add image to history');
      }
    } catch (error) {
      console.error('Error adding image to history:', error);
      throw error;
    }
  };

  const updateImageInHistory = async (imageId: string, updates: Partial<GeneratedImageData>) => {
    if (!user) return;
    
    try {
      const payload: any = {};
      
      if (updates.liked !== undefined) payload.liked = updates.liked;
      if (updates.extensionCount !== undefined) payload.extension_count = updates.extensionCount;
      if (updates.lastExtendedAt !== undefined) payload.last_extended_at = updates.lastExtendedAt.toISOString();
      if (updates.expiresAt !== undefined) payload.expires_at = updates.expiresAt.toISOString();
      if (updates.isExpired !== undefined) payload.is_expired = updates.isExpired;

      const response = await fetch(`${API_BASE_URL}/users/${user.uid}/images/${imageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedImage = await response.json();
        setImageHistory(prev => prev.map(img => 
          img.id === imageId ? convertImageData(updatedImage) : img
        ));
      } else {
        throw new Error('Failed to update image');
      }
    } catch (error) {
      console.error('Error updating image in history:', error);
      throw error;
    }
  };

  const deleteImageFromHistory = async (imageId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.uid}/images/${imageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setImageHistory(prev => prev.filter(img => img.id !== imageId));
      } else {
        throw new Error('Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image from history:', error);
      throw error;
    }
  };

  // Preset operations
  const addPreset = async (presetData: Omit<PresetData, 'id'>) => {
    if (!user) return;
    
    try {
      const payload = {
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
      };

      const response = await fetch(`${API_BASE_URL}/users/${user.uid}/presets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const newPreset = await response.json();
        setPresets(prev => [convertPresetData(newPreset), ...prev]);
      } else {
        throw new Error('Failed to add preset');
      }
    } catch (error) {
      console.error('Error adding preset:', error);
      throw error;
    }
  };

  const updatePreset = async (presetId: string, updates: Partial<PresetData>) => {
    if (!user) return;
    
    try {
      const payload: any = {};
      
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.positivePrompt !== undefined) payload.positive_prompt = updates.positivePrompt;
      if (updates.negativePrompt !== undefined) payload.negative_prompt = updates.negativePrompt;
      if (updates.selectedStyle !== undefined) payload.selected_style = updates.selectedStyle;
      if (updates.aspectRatio !== undefined) {
        payload.aspect_ratio_label = updates.aspectRatio.label;
        payload.aspect_ratio_value = updates.aspectRatio.value;
        payload.aspect_ratio_width = updates.aspectRatio.width;
        payload.aspect_ratio_height = updates.aspectRatio.height;
        payload.aspect_ratio_category = updates.aspectRatio.category;
      }
      if (updates.steps !== undefined) payload.steps = updates.steps;
      if (updates.cfgScale !== undefined) payload.cfg_scale = updates.cfgScale;
      if (updates.customWidth !== undefined) payload.custom_width = updates.customWidth;
      if (updates.customHeight !== undefined) payload.custom_height = updates.customHeight;
      if (updates.useCustomDimensions !== undefined) payload.use_custom_dimensions = updates.useCustomDimensions;

      const response = await fetch(`${API_BASE_URL}/users/${user.uid}/presets/${presetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedPreset = await response.json();
        setPresets(prev => prev.map(preset => 
          preset.id === presetId ? convertPresetData(updatedPreset) : preset
        ));
      } else {
        throw new Error('Failed to update preset');
      }
    } catch (error) {
      console.error('Error updating preset:', error);
      throw error;
    }
  };

  const deletePreset = async (presetId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.uid}/presets/${presetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPresets(prev => prev.filter(preset => preset.id !== presetId));
      } else {
        throw new Error('Failed to delete preset');
      }
    } catch (error) {
      console.error('Error deleting preset:', error);
      throw error;
    }
  };

  // Migration function from localStorage (optional for existing users)
  const migrateFromLocalStorage = async () => {
    if (!user) return;
    
    try {
      // Check if migration is needed
      const savedHistory = localStorage.getItem('imageHistory');
      const savedPresets = localStorage.getItem('savedPresets');
      
      if (!savedHistory && !savedPresets) {
        return; // No data to migrate
      }
      
      // Migrate image history
      if (savedHistory) {
        const historyData = JSON.parse(savedHistory);
        for (const item of historyData) {
          await addImageToHistory({
            ...item,
            timestamp: new Date(item.timestamp),
            expiresAt: new Date(item.expiresAt || Date.now() + 14 * 24 * 60 * 60 * 1000),
            extensionCount: item.extensionCount || 0,
            lastExtendedAt: item.lastExtendedAt ? new Date(item.lastExtendedAt) : undefined
          });
        }
      }
      
      // Migrate presets
      if (savedPresets) {
        const presetsData = JSON.parse(savedPresets);
        for (const item of presetsData) {
          await addPreset({
            ...item,
            timestamp: new Date(item.timestamp)
          });
        }
      }
      
      // Clear localStorage after successful migration
      localStorage.removeItem('imageHistory');
      localStorage.removeItem('savedPresets');
      
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }
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