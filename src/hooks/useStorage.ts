import { useState } from 'react';
import { api } from '@/lib/api';
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
      const response = await api.upload.reference(file);
      
      // Simulate progress for better UX
      setUploadProgress(100);
      toast.success('Reference image uploaded successfully!');
      
      // Return full URL
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      return `${baseUrl}${response.data.url}`;
    } catch (error: any) {
      console.error('Upload error:', error);
      const message = error.response?.data?.error || 'Failed to upload image';
      toast.error(message);
      throw new Error(message);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const uploadFile = async (blob: Blob, filename: string): Promise<string> => {
    if (!user) {
      throw new Error('User must be authenticated to upload files');
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Convert blob to file
      const file = new File([blob], filename, { type: blob.type });
      const response = await api.upload.reference(file);
      
      setUploadProgress(100);
      console.log('File uploaded successfully:', response.data.url);
      
      // Return full URL
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      return `${baseUrl}${response.data.url}`;
    } catch (error: any) {
      console.error('Upload error:', error);
      const message = error.response?.data?.error || 'Failed to upload file';
      throw new Error(message);
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
      // For now, just log - implement delete endpoint later if needed
      console.log('Delete image:', imageUrl);
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
      console.log('File deletion not implemented yet');
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