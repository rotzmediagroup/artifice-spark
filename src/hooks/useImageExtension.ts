import { useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from './useAdmin';

interface ExtendImageResponse {
  success: boolean;
  newExpiresAt: string;
  extensionCount: number;
  remainingExtensions: number | 'unlimited';
}

// Image extension hook with PostgreSQL backend
export const useImageExtension = () => {
  const [extending, setExtending] = useState<string | null>(null);
  const { isAdmin } = useAdmin();
  const { user } = useAuth();

  // API call helper with auth token
  const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    return fetch(`${process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8888'}/api${endpoint}`, {
      ...options,
      headers,
    });
  };

  const extendImage = async (imageId: string): Promise<ExtendImageResponse | null> => {
    if (!user) {
      toast.error('User must be authenticated to extend images');
      return null;
    }

    setExtending(imageId);
    
    try {
      const response = await apiCall(`/users/${user.id}/images/${imageId}/extend`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Image expiration extended successfully!');
        
        return {
          success: true,
          newExpiresAt: result.newExpiresAt,
          extensionCount: result.extensionCount,
          remainingExtensions: result.remainingExtensions
        };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extend image');
      }
    } catch (error: unknown) {
      console.error('Failed to extend image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to extend image';
      toast.error(errorMessage);
      return null;
    } finally {
      setExtending(null);
    }
  };

  const canExtend = (extensionCount: number, contentType: 'image' | 'video' = 'image'): boolean => {
    const maxExtensions = contentType === 'video' ? 1 : 3;
    return isAdmin || extensionCount < maxExtensions;
  };

  const getRemainingExtensions = (extensionCount: number, contentType: 'image' | 'video' = 'image'): number | 'unlimited' => {
    if (isAdmin) return 'unlimited';
    const maxExtensions = contentType === 'video' ? 1 : 3;
    return Math.max(0, maxExtensions - extensionCount);
  };

  const getExtensionButtonText = (extensionCount: number, contentType: 'image' | 'video' = 'image'): string => {
    if (isAdmin) return 'Extend (Admin)';
    const maxExtensions = contentType === 'video' ? 1 : 3;
    const remaining = maxExtensions - extensionCount;
    if (remaining <= 0) return 'Max Extensions';
    return `Extend (${remaining} left)`;
  };

  return {
    extendImage,
    extending,
    canExtend,
    getRemainingExtensions,
    getExtensionButtonText,
  };
};