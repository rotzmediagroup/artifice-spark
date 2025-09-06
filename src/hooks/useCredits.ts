import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from './useAdmin';
import { toast } from 'sonner';

interface UserProfile {
  email: string;
  displayName: string;
  imageCredits: number;
  videoCredits: number;
  isAdmin: boolean;
  createdAt: Date;
  lastLogin: Date;
  totalCreditsGranted: number;
  totalCreditsUsed: number;
}

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

export const useCredits = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [imageCredits, setImageCredits] = useState(0);
  const [videoCredits, setVideoCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // API call helper with auth token
  const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  };

  useEffect(() => {
    if (!user) {
      setImageCredits(0);
      setVideoCredits(0);
      setUserProfile(null);
      setLoading(false);
      return;
    }

    // Load user profile data (includes credit info from our auth context)
    if (user.profile) {
      setImageCredits(user.profile.imageCredits);
      setVideoCredits(user.profile.videoCredits);
      setUserProfile({
        email: user.email,
        displayName: user.displayName,
        imageCredits: user.profile.imageCredits,
        videoCredits: user.profile.videoCredits,
        isAdmin: user.profile.isAdmin,
        createdAt: new Date(), // We don't have this in our JWT payload
        lastLogin: new Date(),
        totalCreditsGranted: user.profile.totalCreditsGranted,
        totalCreditsUsed: user.profile.totalCreditsUsed
      });
    }
    
    setLoading(false);
  }, [user, isAdmin]);

  // Check if user has sufficient credits for generation
  const hasCredits = (creditType: 'image' | 'video', amount: number = 1): boolean => {
    if (isAdmin) return true; // Admin has unlimited credits
    const currentCredits = creditType === 'image' ? imageCredits : videoCredits;
    return currentCredits >= amount;
  };

  // Legacy function for backwards compatibility - check image credits only
  const hasCreditsLegacy = (requiredCredits: number = 1): boolean => {
    if (isAdmin) return true; // Admin has unlimited credits
    return imageCredits >= requiredCredits;
  };

  // Deduct credits after successful generation
  const deductCredits = async (creditType: 'image' | 'video', amount: number = 1): Promise<boolean> => {
    if (!user) {
      throw new Error('User must be authenticated to deduct credits');
    }

    if (isAdmin) {
      return true; // Admin credits are unlimited, no deduction needed
    }

    const currentCredits = creditType === 'image' ? imageCredits : videoCredits;
    if (currentCredits < amount) {
      throw new Error(`Insufficient ${creditType} credits. Required: ${amount}, Available: ${currentCredits}`);
    }

    try {
      // Call the credit deduction API
      const response = await apiCall(`/users/${user.id}/credits/deduct`, {
        method: 'POST',
        body: JSON.stringify({
          credit_type: creditType,
          amount: amount,
          reason: `${creditType} generation`
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Update local state with new balance
        if (creditType === 'image') {
          setImageCredits(result.new_balance);
        } else {
          setVideoCredits(result.new_balance);
        }
        console.log(`Credits deducted successfully: ${amount} ${creditType} credits used`);
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Credit deduction failed');
      }
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to deduct credits');
      throw error;
    }
  };

  // Legacy deduct function for backwards compatibility
  const deductCreditsLegacy = async (amount: number = 1): Promise<boolean> => {
    // For legacy support, always deduct from image credits
    return deductCredits('image', amount);
  };

  // Get credit status message for UI
  const getCreditStatusMessage = (): string => {
    if (isAdmin) return 'Unlimited credits (Admin)';
    if (loading) return 'Loading...';
    
    const totalCredits = imageCredits + videoCredits;
    if (totalCredits === 0) return 'No credits available - Contact admin';
    
    return `${imageCredits} image, ${videoCredits} video credits`;
  };

  // Check if user can generate images
  const canGenerateImages = (): boolean => {
    return isAdmin || imageCredits > 0;
  };

  // Check if user can generate videos
  const canGenerateVideos = (): boolean => {
    return isAdmin || videoCredits > 0;
  };

  // Get specific credit count
  const getCredits = (type: 'image' | 'video'): number => {
    return type === 'image' ? imageCredits : videoCredits;
  };

  return {
    // New dual credit system
    imageCredits,
    videoCredits,
    hasCreditsForType: hasCredits,
    deductCreditsForType: deductCredits,
    canGenerateImages,
    canGenerateVideos,
    getCredits,
    
    // Legacy compatibility
    credits: imageCredits, // For backwards compatibility
    hasCredits: hasCreditsLegacy,
    deductCredits: deductCreditsLegacy,
    
    // Common functions
    loading,
    userProfile,
    getCreditStatusMessage,
    isUnlimited: isAdmin
  };
};