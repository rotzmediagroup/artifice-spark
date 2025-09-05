import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

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
        const imagesResponse = await api.images.getAll();
        const images = imagesResponse.data.images.map((img: any): GeneratedImageData => ({
          id: img.id,
          url: img.url,
          prompt: img.prompt,
          style: img.style || '',
          timestamp: new Date(img.createdAt),
          liked: img.liked,
          contentType: img.contentType || 'image',
          fileExtension: img.fileExtension || '.png',
          settings: img.settings || {
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
          expiresAt: new Date(img.expiresAt),
          extensionCount: img.extensionCount || 0,
          lastExtendedAt: img.lastExtendedAt ? new Date(img.lastExtendedAt) : undefined,
          isExpired: new Date(img.expiresAt) < new Date()
        }));
        setImageHistory(images);

        // Load presets
        const presetsResponse = await api.presets.getAll();
        const presetsFormatted = presetsResponse.data.presets.map((preset: any): PresetData => ({
          id: preset.id,
          name: preset.name,
          positivePrompt: preset.positivePrompt,
          negativePrompt: preset.negativePrompt,
          selectedStyle: preset.selectedStyle,
          aspectRatio: preset.aspectRatio,
          steps: preset.steps,
          cfgScale: preset.cfgScale,
          timestamp: new Date(preset.createdAt),
          customWidth: preset.customWidth,
          customHeight: preset.customHeight,
          useCustomDimensions: preset.useCustomDimensions
        }));
        setPresets(presetsFormatted);
      } catch (error) {
        console.error('Error loading data:', error);
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
      const response = await api.images.create({
        url: imageData.url,
        filePath: imageData.url, // For now, same as URL
        prompt: imageData.prompt,
        style: imageData.style,
        contentType: imageData.contentType,
        fileExtension: imageData.fileExtension,
        settings: imageData.settings,
        expiresAt: imageData.expiresAt.toISOString()
      });

      const newImage: GeneratedImageData = {
        id: response.data.id,
        url: response.data.url,
        prompt: response.data.prompt,
        style: response.data.style,
        timestamp: new Date(response.data.createdAt),
        liked: response.data.liked,
        contentType: response.data.contentType,
        fileExtension: response.data.fileExtension,
        settings: response.data.settings,
        expiresAt: new Date(response.data.expiresAt),
        extensionCount: response.data.extensionCount || 0,
        lastExtendedAt: response.data.lastExtendedAt ? new Date(response.data.lastExtendedAt) : undefined,
        isExpired: false
      };

      setImageHistory(prev => [newImage, ...prev]);
    } catch (error) {
      console.error('Error adding image to history:', error);
      throw error;
    }
  };

  const updateImageInHistory = async (imageId: string, updates: Partial<GeneratedImageData>) => {
    if (!user) return;
    
    try {
      const updateData: { liked?: boolean; extend?: boolean } = {};
      
      if (updates.liked !== undefined) updateData.liked = updates.liked;
      if (updates.extensionCount !== undefined && updates.extensionCount > 0) {
        updateData.extend = true;
      }

      const response = await api.images.update(imageId, updateData);
      
      const updatedImage: GeneratedImageData = {
        id: response.data.id,
        url: response.data.url,
        prompt: response.data.prompt,
        style: response.data.style,
        timestamp: new Date(response.data.createdAt),
        liked: response.data.liked,
        contentType: response.data.contentType,
        fileExtension: response.data.fileExtension,
        settings: response.data.settings,
        expiresAt: new Date(response.data.expiresAt),
        extensionCount: response.data.extensionCount || 0,
        lastExtendedAt: response.data.lastExtendedAt ? new Date(response.data.lastExtendedAt) : undefined,
        isExpired: false
      };

      setImageHistory(prev => prev.map(img => 
        img.id === updatedImage.id ? updatedImage : img
      ));
    } catch (error) {
      console.error('Error updating image in history:', error);
      throw error;
    }
  };

  const deleteImageFromHistory = async (imageId: string) => {
    if (!user) return;
    
    try {
      await api.images.delete(imageId);
      setImageHistory(prev => prev.filter(img => img.id !== imageId));
    } catch (error) {
      console.error('Error deleting image from history:', error);
      throw error;
    }
  };

  // Preset operations
  const addPreset = async (presetData: Omit<PresetData, 'id'>) => {
    if (!user) return;
    
    try {
      const response = await api.presets.create({
        name: presetData.name,
        positivePrompt: presetData.positivePrompt,
        negativePrompt: presetData.negativePrompt,
        selectedStyle: presetData.selectedStyle,
        aspectRatio: presetData.aspectRatio,
        steps: presetData.steps,
        cfgScale: presetData.cfgScale,
        customWidth: presetData.customWidth,
        customHeight: presetData.customHeight,
        useCustomDimensions: presetData.useCustomDimensions
      });

      const newPreset: PresetData = {
        id: response.data.id,
        name: response.data.name,
        positivePrompt: response.data.positivePrompt,
        negativePrompt: response.data.negativePrompt,
        selectedStyle: response.data.selectedStyle,
        aspectRatio: response.data.aspectRatio,
        steps: response.data.steps,
        cfgScale: response.data.cfgScale,
        timestamp: new Date(response.data.createdAt),
        customWidth: response.data.customWidth,
        customHeight: response.data.customHeight,
        useCustomDimensions: response.data.useCustomDimensions
      };

      setPresets(prev => [newPreset, ...prev]);
    } catch (error) {
      console.error('Error adding preset:', error);
      throw error;
    }
  };

  const updatePreset = async (presetId: string, updates: Partial<PresetData>) => {
    // Not implemented in API yet
    console.log('Update preset not implemented');
  };

  const deletePreset = async (presetId: string) => {
    if (!user) return;
    
    try {
      await api.presets.delete(presetId);
      setPresets(prev => prev.filter(preset => preset.id !== presetId));
    } catch (error) {
      console.error('Error deleting preset:', error);
      throw error;
    }
  };

  const migrateFromLocalStorage = async () => {
    // Migration from localStorage no longer needed for API-based system
    console.log('Migration from localStorage not needed for API-based system');
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