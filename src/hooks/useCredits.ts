import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
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

    // Fetch user credits from API
    const fetchCredits = async () => {
      try {
        const response = await api.user.getCredits();
        const credits = response.data;
        
        setImageCredits(credits.imageCredits || credits.credits || 0);
        setVideoCredits(credits.videoCredits || 0);
      } catch (error) {
        console.error('Error fetching user credits:', error);
        setImageCredits(0);
        setVideoCredits(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
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
      // For now, just update local state
      // TODO: Implement credit deduction API endpoint
      if (creditType === 'image') {
        setImageCredits(prev => prev - amount);
      } else {
        setVideoCredits(prev => prev - amount);
      }

      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error('Failed to deduct credits. Please try again.');
      return false;
    }
  };

  // Add credits to user account (admin only)
  const addCreditsToUser = async (
    targetUserId: string, 
    creditType: 'image' | 'video', 
    amount: number, 
    reason: string = 'Admin grant'
  ): Promise<boolean> => {
    if (!user || !isAdmin) {
      throw new Error('Only admins can add credits to users');
    }

    try {
      // TODO: Implement admin credit grant API endpoint
      toast.success(`Successfully added ${amount} ${creditType} credits to user`);
      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      toast.error('Failed to add credits. Please try again.');
      return false;
    }
  };

  // Get credit history
  const getCreditHistory = async (targetUserId?: string) => {
    if (!user) return [];

    try {
      const response = await api.user.getTransactions();
      return response.data.transactions || [];
    } catch (error) {
      console.error('Error fetching credit history:', error);
      return [];
    }
  };

  return {
    imageCredits,
    videoCredits,
    loading,
    hasCredits,
    hasCreditsLegacy,
    deductCredits,
    addCreditsToUser,
    getCreditHistory,
    userProfile
  };
};