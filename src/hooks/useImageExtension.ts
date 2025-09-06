import { useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from './useAdmin';

interface ExtendImageResponse {
  success: boolean;
  newExpiresAt: string;
  extensionCount: number;
  remainingExtensions: number | 'unlimited';
}

export const useImageExtension = () => {
  const [extending, setExtending] = useState<string | null>(null);
  const { isAdmin } = useAdmin();

  const extendImage = async (imageId: string): Promise<ExtendImageResponse | null> => {
    setExtending(imageId);
    
    try {
      console.warn('Image extension not implemented for PostgreSQL yet');
      toast.info('Image extension not implemented yet');
      return null;
    } catch (error: unknown) {
      console.error('Failed to extend image:', error);
      toast.error('Image extension not available');
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