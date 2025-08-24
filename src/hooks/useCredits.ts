import { useEffect, useState } from 'react';
import { doc, onSnapshot, addDoc, collection, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from './useAdmin';
import { toast } from 'sonner';

interface UserProfile {
  email: string;
  displayName: string;
  credits: number;
  isAdmin: boolean;
  createdAt: Date;
  lastLogin: Date;
  totalCreditsGranted: number;
  totalCreditsUsed: number;
}

export const useCredits = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) {
      setCredits(0);
      setUserProfile(null);
      setLoading(false);
      return;
    }

    // Admin users have unlimited credits
    if (isAdmin) {
      setCredits(999999);
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
          setCredits(data.credits || 0);
        } else {
          // User profile doesn't exist, they have 0 credits
          setCredits(0);
          setUserProfile(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching user credits:', error);
        setCredits(0);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, isAdmin]);

  // Check if user has sufficient credits for generation
  const hasCredits = (requiredCredits: number = 1): boolean => {
    if (isAdmin) return true; // Admin has unlimited credits
    return credits >= requiredCredits;
  };

  // Deduct credits after successful image generation
  const deductCredits = async (amount: number = 1): Promise<boolean> => {
    if (!user) {
      throw new Error('User must be authenticated to deduct credits');
    }

    if (isAdmin) {
      return true; // Admin credits are unlimited, no deduction needed
    }

    if (credits < amount) {
      throw new Error(`Insufficient credits. Required: ${amount}, Available: ${credits}`);
    }

    try {
      const userProfileRef = doc(db, 'userProfiles', user.uid);
      
      // Use a transaction to ensure atomic credit deduction
      const success = await runTransaction(db, async (transaction) => {
        const profileDoc = await transaction.get(userProfileRef);
        
        if (!profileDoc.exists()) {
          throw new Error('User profile not found');
        }

        const currentCredits = profileDoc.data().credits || 0;
        
        if (currentCredits < amount) {
          throw new Error(`Insufficient credits. Required: ${amount}, Available: ${currentCredits}`);
        }

        const newCredits = currentCredits - amount;
        const newTotalUsed = (profileDoc.data().totalCreditsUsed || 0) + amount;
        
        // Update user profile
        transaction.update(userProfileRef, {
          credits: newCredits,
          totalCreditsUsed: newTotalUsed,
          lastLogin: new Date()
        });

        // Log the credit transaction
        const transactionRef = doc(collection(db, 'creditTransactions'));
        transaction.set(transactionRef, {
          userId: user.uid,
          adminUserId: null, // This is user-initiated
          type: 'used',
          amount: -amount,
          previousBalance: currentCredits,
          newBalance: newCredits,
          reason: 'Image generation',
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

  // Get credit status message for UI
  const getCreditStatusMessage = (): string => {
    if (isAdmin) return 'Unlimited credits (Admin)';
    if (loading) return 'Loading...';
    if (credits === 0) return 'No credits available - Contact admin';
    if (credits === 1) return '1 credit remaining';
    return `${credits} credits remaining`;
  };

  // Check if user can generate images
  const canGenerateImages = (): boolean => {
    return isAdmin || credits > 0;
  };

  return {
    credits,
    loading,
    userProfile,
    hasCredits,
    deductCredits,
    getCreditStatusMessage,
    canGenerateImages,
    isUnlimited: isAdmin
  };
};