import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from './useAdmin';
import { toast } from 'sonner';

interface UserProfile {
  email: string;
  display_name: string;
  image_credits: number;
  video_credits: number;
  is_admin: boolean;
  created_at: Date;
  last_login: Date;
  total_credits_granted: number;
  total_credits_used: number;
  credits?: number; // Legacy field
}

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

export const useCredits = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [imageCredits, setImageCredits] = useState(0);
  const [videoCredits, setVideoCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) {
      setImageCredits(0);
      setVideoCredits(0);
      setUserProfile(null);
      setLoading(false);
      return;
    }

    // Admin users have unlimited credits
    if (isAdmin) {
      setImageCredits(999999);
      setVideoCredits(999999);
      setLoading(false);
      return;
    }

    // Load user profile for credits
    const loadUserProfile = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/users/${user.uid}/profile`);
        if (response.ok) {
          const data = await response.json();
          const profile: UserProfile = {
            email: data.email,
            display_name: data.display_name,
            image_credits: data.image_credits,
            video_credits: data.video_credits,
            is_admin: data.is_admin,
            created_at: new Date(data.created_at),
            last_login: new Date(data.last_login),
            total_credits_granted: data.total_credits_granted,
            total_credits_used: data.total_credits_used,
            credits: data.credits // Legacy field
          };
          setUserProfile(profile);
          // Support both new dual credit system and legacy single credit system
          setImageCredits(profile.image_credits ?? profile.credits ?? 0);
          setVideoCredits(profile.video_credits ?? 0);
        } else {
          // User profile doesn't exist, they have 0 credits
          setImageCredits(0);
          setVideoCredits(0);
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error fetching user credits:', error);
        setImageCredits(0);
        setVideoCredits(0);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
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
      // First get current profile data
      const profileResponse = await fetch(`${API_BASE_URL}/users/${user.uid}/profile`);
      if (!profileResponse.ok) {
        throw new Error('User profile not found');
      }

      const profileData = await profileResponse.json();
      const currentImageCredits = profileData.image_credits ?? profileData.credits ?? 0;
      const currentVideoCredits = profileData.video_credits ?? 0;
      const currentCreditsCheck = creditType === 'image' ? currentImageCredits : currentVideoCredits;
      
      if (currentCreditsCheck < amount) {
        throw new Error(`Insufficient ${creditType} credits. Required: ${amount}, Available: ${currentCreditsCheck}`);
      }

      const newCredits = currentCreditsCheck - amount;
      const newTotalUsed = (profileData.total_credits_used || 0) + amount;
      
      // Update user profile
      const updateData: Record<string, unknown> = {
        total_credits_used: newTotalUsed
      };
      
      if (creditType === 'image') {
        updateData.image_credits = newCredits;
      } else {
        updateData.video_credits = newCredits;
      }
      
      const updateResponse = await fetch(`${API_BASE_URL}/users/${user.uid}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...profileData, ...updateData }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update profile');
      }

      // Log the credit transaction
      await fetch(`${API_BASE_URL}/users/${user.uid}/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'spent',
          amount: amount,
          credit_type: creditType,
          description: `${creditType.charAt(0).toUpperCase() + creditType.slice(1)} generation`,
          source: 'generation'
        }),
      });

      // Update local state
      if (creditType === 'image') {
        setImageCredits(newCredits);
      } else {
        setVideoCredits(newCredits);
      }

      console.log(`Credits deducted successfully: ${amount} credits used`);
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error('Failed to deduct credits. Please try again.');
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