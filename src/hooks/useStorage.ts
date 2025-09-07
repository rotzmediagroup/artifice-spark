import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/utils/apiConfig';

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

      const response = await apiCall('/storage/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload reference image');
      }

      const data = await response.json();
      setUploadProgress(100);
      toast.success('Reference image uploaded successfully!');
      
      // Return the full URL
      const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';
      return baseUrl + data.url;
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
      // Convert blob to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          if (reader.result) {
            resolve(reader.result as string);
          } else {
            reject(new Error('Failed to read blob'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Extract filename from path
      const filename = filePath.split('/').pop() || 'generated';
      const contentType = filePath.includes('.mp4') ? 'video' : 'image';

      // Upload to API
      const response = await apiCall('/storage/upload-generated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64Data,
          contentType: contentType,
          imageId: filename
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload generated media');
      }

      const data = await response.json();
      setUploadProgress(100);
      console.log('File uploaded to local storage:', data.url);
      
      // Return the full URL
      const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';
      return baseUrl + data.url;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const uploadMediaToStorage = uploadFile; // Alias for compatibility

  const deleteReferenceImage = async (imageUrl: string): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated to delete images');
    }

    // Not implemented for local storage yet
    console.warn('Image deletion not implemented for local storage');
    toast.info('Image deletion not available in this version');
  };

  const deleteFile = deleteReferenceImage; // Alias for compatibility

  return {
    uploadReferenceImage,
    uploadFile,
    uploadMediaToStorage,
    deleteReferenceImage,
    deleteFile,
    uploading,
    uploadProgress
  };
};