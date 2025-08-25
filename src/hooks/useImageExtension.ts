import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';
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
  const functions = getFunctions(app);

  const extendImage = async (imageId: string): Promise<ExtendImageResponse | null> => {
    setExtending(imageId);
    
    try {
      const extendImageExpiration = httpsCallable<
        { imageId: string },
        ExtendImageResponse
      >(functions, 'extendImageExpiration');
      
      const result = await extendImageExpiration({ imageId });
      
      if (result.data.success) {
        const newDate = new Date(result.data.newExpiresAt).toLocaleDateString();
        const remaining = result.data.remainingExtensions;
        
        toast.success(
          `Storage extended until ${newDate}. ${
            remaining === 'unlimited' 
              ? 'Unlimited extensions remaining (Admin)' 
              : `${remaining} extension${remaining === 1 ? '' : 's'} remaining`
          }`
        );
        
        return result.data;
      }
      
      return null;
    } catch (error: unknown) {
      console.error('Failed to extend image:', error);
      
      if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
        toast.error('Maximum extensions reached. Please download your image to keep it permanently.');
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'not-found') {
        toast.error('Image not found.');
      } else {
        toast.error('Failed to extend image storage. Please try again.');
      }
      
      return null;
    } finally {
      setExtending(null);
    }
  };

  const canExtend = (extensionCount: number): boolean => {
    return isAdmin || extensionCount < 3;
  };

  const getRemainingExtensions = (extensionCount: number): number | 'unlimited' => {
    if (isAdmin) return 'unlimited';
    return Math.max(0, 3 - extensionCount);
  };

  const getExtensionButtonText = (extensionCount: number): string => {
    if (isAdmin) return 'Extend (Admin)';
    const remaining = 3 - extensionCount;
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