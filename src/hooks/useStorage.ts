import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useStorage = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadReferenceImage = async (file: File): Promise<string> => {
    if (!user) {
      throw new Error('User must be authenticated to upload images');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Image size must be less than 10MB');
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `${user.id}/${timestamp}_${file.name}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('reference-images')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reference-images')
        .getPublicUrl(data.path);
      
      setUploadProgress(100);
      toast.success('Reference image uploaded successfully!');
      
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      throw error;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const uploadFile = async (blob: Blob, filePath: string): Promise<string> => {
    if (!user) {
      throw new Error('User must be authenticated to upload files');
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('generated-images')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('generated-images')
        .getPublicUrl(data.path);
      
      setUploadProgress(100);
      console.log('File uploaded to Supabase Storage:', publicUrl);
      
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const deleteReferenceImage = async (imageUrl: string): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated to delete images');
    }

    try {
      // Extract the path from the URL
      const urlParts = imageUrl.split('/');
      const bucket = 'reference-images';
      const path = urlParts.slice(urlParts.indexOf(bucket) + 1).join('/');

      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;

      toast.success('Reference image deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete image');
      throw error;
    }
  };

  const deleteFile = async (fileUrl: string): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated to delete files');
    }

    try {
      // Extract the path from the URL
      const urlParts = fileUrl.split('/');
      const bucket = 'generated-images';
      const path = urlParts.slice(urlParts.indexOf(bucket) + 1).join('/');

      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;

      console.log('File deleted from Supabase Storage');
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  };

  return {
    uploadReferenceImage,
    uploadFile,
    deleteReferenceImage,
    deleteFile,
    uploading,
    uploadProgress
  };
};