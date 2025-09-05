import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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

    // Fetch user profile and subscribe to changes
    const fetchUserProfile = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user credits:', error);
        setImageCredits(0);
        setVideoCredits(0);
        setLoading(false);
        return;
      }

      if (data) {
        setUserProfile(data as any);
        // Support both new dual credit system and legacy single credit system
        setImageCredits(data.image_credits ?? data.credits ?? 0);
        setVideoCredits(data.video_credits ?? 0);
      } else {
        setImageCredits(0);
        setVideoCredits(0);
        setUserProfile(null);
      }
      setLoading(false);
    };

    fetchUserProfile();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`user_profile_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const data = payload.new;
          setUserProfile(data as any);
          setImageCredits(data.image_credits ?? data.credits ?? 0);
          setVideoCredits(data.video_credits ?? 0);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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
      const creditField = creditType === 'image' ? 'image_credits' : 'video_credits';
      const totalUsedField = creditType === 'image' ? 'total_image_credits_used' : 'total_video_credits_used';

      // Update credits in a transaction-like manner
      const { data: currentData, error: fetchError } = await supabase
        .from('user_profiles')
        .select(`${creditField}, ${totalUsedField}`)
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const newCredits = (currentData[creditField] || 0) - amount;
      const newTotalUsed = (currentData[totalUsedField] || 0) + amount;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          [creditField]: newCredits,
          [totalUsedField]: newTotalUsed,
          total_credits_used: newTotalUsed
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Log the transaction
      await logCreditTransaction(creditType, -amount, `${creditType} generation`);

      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error('Failed to deduct credits. Please try again.');
      return false;
    }
  };

  // Add credits to user account
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
      const creditField = creditType === 'image' ? 'image_credits' : 'video_credits';
      const totalGrantedField = creditType === 'image' ? 'total_image_credits_granted' : 'total_video_credits_granted';

      // Get current credits
      const { data: currentData, error: fetchError } = await supabase
        .from('user_profiles')
        .select(`${creditField}, ${totalGrantedField}`)
        .eq('id', targetUserId)
        .single();

      if (fetchError) throw fetchError;

      const newCredits = (currentData[creditField] || 0) + amount;
      const newTotalGranted = (currentData[totalGrantedField] || 0) + amount;

      // Update credits
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          [creditField]: newCredits,
          [totalGrantedField]: newTotalGranted,
          total_credits_granted: newTotalGranted
        })
        .eq('id', targetUserId);

      if (updateError) throw updateError;

      // Log the transaction
      await logCreditTransaction(creditType, amount, reason, targetUserId);

      toast.success(`Successfully added ${amount} ${creditType} credits to user`);
      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      toast.error('Failed to add credits. Please try again.');
      return false;
    }
  };

  // Log credit transaction
  const logCreditTransaction = async (
    creditType: 'image' | 'video',
    amount: number,
    description: string,
    targetUserId?: string
  ) => {
    try {
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: targetUserId || user?.id,
          amount,
          type: amount > 0 ? 'bonus' : 'usage',
          description: `${description} (${creditType})`,
          metadata: { creditType }
        });
    } catch (error) {
      console.error('Error logging credit transaction:', error);
    }
  };

  // Get credit history
  const getCreditHistory = async (targetUserId?: string) => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', targetUserId || user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
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