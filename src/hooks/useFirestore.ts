import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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

  // Convert database data to our format
  const convertImageData = (data: any): GeneratedImageData => {
    const timestamp = new Date(data.timestamp || data.created_at);
    
    // Calculate expiration for existing images (14 days from creation if not set)
    let expiresAt = data.expires_at ? new Date(data.expires_at) : null;
    if (!expiresAt) {
      expiresAt = new Date(timestamp);
      expiresAt.setDate(expiresAt.getDate() + 14);
    }
    
    // Check if image is expired
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
    aspectRatio: data.aspect_ratio,
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
        const { data: imagesData, error: imagesError } = await supabase
          .from('image_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (imagesError) {
          console.error('Error loading image history:', imagesError);
        } else {
          const images = (imagesData || []).map(convertImageData);
          setImageHistory(images);
        }

        // Load presets
        const { data: presetsData, error: presetsError } = await supabase
          .from('presets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (presetsError) {
          console.error('Error loading presets:', presetsError);
        } else {
          const presetsFormatted = (presetsData || []).map(convertPresetData);
          setPresets(presetsFormatted);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time changes for image history
    const imageSubscription = supabase
      .channel(`image_history_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'image_history',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newImage = convertImageData(payload.new);
            setImageHistory(prev => [newImage, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedImage = convertImageData(payload.new);
            setImageHistory(prev => prev.map(img => 
              img.id === updatedImage.id ? updatedImage : img
            ));
          } else if (payload.eventType === 'DELETE') {
            setImageHistory(prev => prev.filter(img => img.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to real-time changes for presets
    const presetSubscription = supabase
      .channel(`presets_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presets',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPreset = convertPresetData(payload.new);
            setPresets(prev => [newPreset, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedPreset = convertPresetData(payload.new);
            setPresets(prev => prev.map(preset => 
              preset.id === updatedPreset.id ? updatedPreset : preset
            ));
          } else if (payload.eventType === 'DELETE') {
            setPresets(prev => prev.filter(preset => preset.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      imageSubscription.unsubscribe();
      presetSubscription.unsubscribe();
    };
  }, [user]);

  // Image history operations
  const addImageToHistory = async (imageData: Omit<GeneratedImageData, 'id'>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('image_history')
        .insert({
          user_id: user.id,
          url: imageData.url,
          prompt: imageData.prompt,
          style: imageData.style,
          timestamp: imageData.timestamp.toISOString(),
          liked: imageData.liked,
          content_type: imageData.contentType,
          file_extension: imageData.fileExtension,
          settings: imageData.settings,
          expires_at: imageData.expiresAt.toISOString(),
          extension_count: imageData.extensionCount,
          last_extended_at: imageData.lastExtendedAt?.toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding image to history:', error);
      throw error;
    }
  };

  const updateImageInHistory = async (imageId: string, updates: Partial<GeneratedImageData>) => {
    if (!user) return;
    
    try {
      const updateData: any = {};
      
      if (updates.liked !== undefined) updateData.liked = updates.liked;
      if (updates.expiresAt) updateData.expires_at = updates.expiresAt.toISOString();
      if (updates.extensionCount !== undefined) updateData.extension_count = updates.extensionCount;
      if (updates.lastExtendedAt) updateData.last_extended_at = updates.lastExtendedAt.toISOString();
      if (updates.settings) updateData.settings = updates.settings;

      const { error } = await supabase
        .from('image_history')
        .update(updateData)
        .eq('id', imageId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating image in history:', error);
      throw error;
    }
  };

  const deleteImageFromHistory = async (imageId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('image_history')
        .delete()
        .eq('id', imageId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting image from history:', error);
      throw error;
    }
  };

  // Preset operations
  const addPreset = async (presetData: Omit<PresetData, 'id'>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('presets')
        .insert({
          user_id: user.id,
          name: presetData.name,
          positive_prompt: presetData.positivePrompt,
          negative_prompt: presetData.negativePrompt,
          selected_style: presetData.selectedStyle,
          aspect_ratio: presetData.aspectRatio,
          steps: presetData.steps,
          cfg_scale: presetData.cfgScale,
          timestamp: presetData.timestamp.toISOString(),
          custom_width: presetData.customWidth,
          custom_height: presetData.customHeight,
          use_custom_dimensions: presetData.useCustomDimensions
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding preset:', error);
      throw error;
    }
  };

  const updatePreset = async (presetId: string, updates: Partial<PresetData>) => {
    if (!user) return;
    
    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.positivePrompt) updateData.positive_prompt = updates.positivePrompt;
      if (updates.negativePrompt) updateData.negative_prompt = updates.negativePrompt;
      if (updates.selectedStyle) updateData.selected_style = updates.selectedStyle;
      if (updates.aspectRatio) updateData.aspect_ratio = updates.aspectRatio;
      if (updates.steps !== undefined) updateData.steps = updates.steps;
      if (updates.cfgScale !== undefined) updateData.cfg_scale = updates.cfgScale;
      if (updates.customWidth !== undefined) updateData.custom_width = updates.customWidth;
      if (updates.customHeight !== undefined) updateData.custom_height = updates.customHeight;
      if (updates.useCustomDimensions !== undefined) updateData.use_custom_dimensions = updates.useCustomDimensions;

      const { error } = await supabase
        .from('presets')
        .update(updateData)
        .eq('id', presetId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating preset:', error);
      throw error;
    }
  };

  const deletePreset = async (presetId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('presets')
        .delete()
        .eq('id', presetId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting preset:', error);
      throw error;
    }
  };

  // Migration function from localStorage
  const migrateFromLocalStorage = async () => {
    if (!user) return;
    
    try {
      // Migrate image history
      const savedHistory = localStorage.getItem('imageHistory');
      if (savedHistory) {
        const historyData = JSON.parse(savedHistory);
        
        for (const item of historyData) {
          await addImageToHistory(item);
        }
        
        localStorage.removeItem('imageHistory');
      }
      
      // Migrate presets
      const savedPresets = localStorage.getItem('savedPresets');
      if (savedPresets) {
        const presetsData = JSON.parse(savedPresets);
        
        for (const item of presetsData) {
          await addPreset(item);
        }
        
        localStorage.removeItem('savedPresets');
      }
      
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