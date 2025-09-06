import { useEffect, useState } from 'react';
import { doc, onSnapshot, addDoc, collection, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

    // Subscribe to user profile for real-time credit updates
    const userProfileRef = doc(db, 'userProfiles', user.uid);
    const unsubscribe = onSnapshot(
      userProfileRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserProfile;
          setUserProfile(data);
          // Support both new dual credit system and legacy single credit system
          setImageCredits(data.imageCredits ?? data.credits ?? 0);
          setVideoCredits(data.videoCredits ?? 0);
        } else {
          // User profile doesn't exist, they have 0 credits
          setImageCredits(0);
          setVideoCredits(0);
          setUserProfile(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching user credits:', error);
        setImageCredits(0);
        setVideoCredits(0);
        setLoading(false);
      }
    );

    return unsubscribe;
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
      const userProfileRef = doc(db, 'userProfiles', user.uid);
      
      // Use a transaction to ensure atomic credit deduction
      const success = await runTransaction(db, async (transaction) => {
        const profileDoc = await transaction.get(userProfileRef);
        
        if (!profileDoc.exists()) {
          throw new Error('User profile not found');
        }

        const data = profileDoc.data();
        const currentImageCredits = data.imageCredits ?? data.credits ?? 0;
        const currentVideoCredits = data.videoCredits ?? 0;
        const currentCredits = creditType === 'image' ? currentImageCredits : currentVideoCredits;
        
        if (currentCredits < amount) {
          throw new Error(`Insufficient ${creditType} credits. Required: ${amount}, Available: ${currentCredits}`);
        }

        const newCredits = currentCredits - amount;
        const newTotalUsed = (data.totalCreditsUsed || 0) + amount;
        
        // Update user profile with new credit structure
        const updateData: Record<string, unknown> = {
          totalCreditsUsed: newTotalUsed,
          lastLogin: new Date()
        };
        
        if (creditType === 'image') {
          updateData.imageCredits = newCredits;
          // Preserve existing videoCredits
          updateData.videoCredits = currentVideoCredits;
        } else {
          updateData.videoCredits = newCredits;
          // Preserve existing imageCredits
          updateData.imageCredits = currentImageCredits;
        }
        
        transaction.update(userProfileRef, updateData);

        // Log the credit transaction
        const transactionRef = doc(collection(db, 'creditTransactions'));
        transaction.set(transactionRef, {
          userId: user.uid,
          adminUserId: null, // This is user-initiated
          type: 'used',
          creditType: creditType,
          amount: -amount,
          previousBalance: currentCredits,
          newBalance: newCredits,
          reason: `${creditType.charAt(0).toUpperCase() + creditType.slice(1)} generation`,
          timestamp: new Date()
        });

        return true;
      });

      if (success) {
        console.log(`Credits deducted successfully: ${amount} credits used`);
      }

      return success;
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