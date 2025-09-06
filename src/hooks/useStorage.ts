import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

export const useStorage = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // API call helper with auth token
  const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('authToken');
    const headers = {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  };

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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadType', 'reference-images');

      const response = await apiCall('/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      
      setUploadProgress(100);
      toast.success('Reference image uploaded successfully!');
      
      return result.url;
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
      const formData = new FormData();
      const file = new File([blob], 'upload.blob', { type: blob.type });
      formData.append('file', file);
      formData.append('uploadType', 'generated-content');

      const response = await apiCall('/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      
      setUploadProgress(100);
      console.log('File uploaded to local storage:', result.url);
      
      return result.url;
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
      console.warn('File deletion not implemented for local storage yet');
      toast.info('File deletion not implemented yet');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete image');
      throw error;
    }
  };

  return {
    uploadReferenceImage,
    uploadFile,
    deleteReferenceImage,
    uploading,
    uploadProgress
  };
};