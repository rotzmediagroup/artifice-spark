import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from './useAdmin';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  imageCredits: number;
  videoCredits: number;
  // Legacy support
  credits?: number;
  isAdmin: boolean;
  createdAt: Date;
  lastLogin: Date;
  totalCreditsGranted: number;
  totalCreditsUsed: number;
  // Account management fields
  isActive: boolean;
  isSuspended: boolean;
  suspendedAt: Date | null;
  suspendedBy: string | null;
  suspensionReason: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  deleteReason: string | null;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  adminUserId: string;
  type: 'grant' | 'deduct' | 'used' | 'adjustment' | 'suspend' | 'unsuspend' | 'delete' | 'reactivate';
  creditType?: 'image' | 'video'; // Optional for account management actions
  amount: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  timestamp: Date;
}

export const useUserManagement = () => {
  const { user } = useAuth();
  const { isAdmin, verifyAdminAccess } = useAdmin();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<CreditTransaction[]>([]);

  useEffect(() => {
    if (!isAdmin || !user) {
      setUsers([]);
      setRecentTransactions([]);
      setLoading(false);
      return;
    }

    // Subscribe to all user profiles
    const usersQuery = query(
      collection(db, 'userProfiles'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        const userList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Support both new dual credit system and legacy single credit system
            imageCredits: data.imageCredits ?? data.credits ?? 0,
            videoCredits: data.videoCredits ?? 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            lastLogin: data.lastLogin?.toDate() || new Date(),
            // Account management defaults for backwards compatibility
            isActive: data.isActive ?? true,
            isSuspended: data.isSuspended ?? false,
            suspendedAt: data.suspendedAt?.toDate() || null,
            suspendedBy: data.suspendedBy ?? null,
            suspensionReason: data.suspensionReason ?? null,
            deletedAt: data.deletedAt?.toDate() || null,
            deletedBy: data.deletedBy ?? null,
            deleteReason: data.deleteReason ?? null
          } as UserProfile;
        });
        
        setUsers(userList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching users:', error);
        toast.error('Failed to load user data');
        setLoading(false);
      }
    );

    // Subscribe to recent credit transactions
    const transactionsQuery = query(
      collection(db, 'creditTransactions'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribeTransactions = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const transactionList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        } as CreditTransaction));
        
        setRecentTransactions(transactionList);
      },
      (error) => {
        console.error('Error fetching transactions:', error);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeTransactions();
    };
  }, [isAdmin, user]);

  // Grant credits to a specific user
  const grantCredits = async (userId: string, creditType: 'image' | 'video', amount: number, reason: string = 'Admin credit grant'): Promise<boolean> => {
    if (!verifyAdminAccess() || amount <= 0) {
      toast.error('Invalid operation or insufficient permissions');
      return false;
    }

    try {
      const userProfileRef = doc(db, 'userProfiles', userId);
      
      const success = await runTransaction(db, async (transaction) => {
        const profileDoc = await transaction.get(userProfileRef);
        
        if (!profileDoc.exists()) {
          throw new Error('User profile not found');
        }

        const data = profileDoc.data();
        const currentImageCredits = data.imageCredits ?? data.credits ?? 0;
        const currentVideoCredits = data.videoCredits ?? 0;
        const currentCredits = creditType === 'image' ? currentImageCredits : currentVideoCredits;
        const newCredits = currentCredits + amount;
        const newTotalGranted = (data.totalCreditsGranted || 0) + amount;
        
        // Update user profile with new dual credit structure
        const updateData: Record<string, unknown> = {
          totalCreditsGranted: newTotalGranted
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
          userId,
          adminUserId: user!.uid,
          type: 'grant',
          creditType,
          amount,
          previousBalance: currentCredits,
          newBalance: newCredits,
          reason,
          timestamp: new Date()
        });

        return true;
      });

      if (success) {
        toast.success(`Successfully granted ${amount} ${creditType} credits`);
        console.log(`[ADMIN ACTION] Granted ${amount} ${creditType} credits to user ${userId}`);
      }

      return success;
    } catch (error) {
      console.error('Error granting credits:', error);
      toast.error('Failed to grant credits. Please try again.');
      return false;
    }
  };

  // Deduct credits from a specific user
  const deductCredits = async (userId: string, creditType: 'image' | 'video', amount: number, reason: string = 'Admin credit deduction'): Promise<boolean> => {
    if (!verifyAdminAccess() || amount <= 0) {
      toast.error('Invalid operation or insufficient permissions');
      return false;
    }

    try {
      const userProfileRef = doc(db, 'userProfiles', userId);
      
      const success = await runTransaction(db, async (transaction) => {
        const profileDoc = await transaction.get(userProfileRef);
        
        if (!profileDoc.exists()) {
          throw new Error('User profile not found');
        }

        const data = profileDoc.data();
        const currentImageCredits = data.imageCredits ?? data.credits ?? 0;
        const currentVideoCredits = data.videoCredits ?? 0;
        const currentCredits = creditType === 'image' ? currentImageCredits : currentVideoCredits;
        const newCredits = Math.max(0, currentCredits - amount); // Don't allow negative credits
        
        // Update user profile with new dual credit structure
        const updateData: Record<string, unknown> = {};
        
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
          userId,
          adminUserId: user!.uid,
          type: 'deduct',
          creditType,
          amount: -amount,
          previousBalance: currentCredits,
          newBalance: newCredits,
          reason,
          timestamp: new Date()
        });

        return true;
      });

      if (success) {
        toast.success(`Successfully deducted ${amount} ${creditType} credits`);
        console.log(`[ADMIN ACTION] Deducted ${amount} ${creditType} credits from user ${userId}`);
      }

      return success;
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error('Failed to deduct credits. Please try again.');
      return false;
    }
  };

  // Set exact credit amount for a user
  const setCredits = async (userId: string, amount: number, reason: string = 'Admin credit adjustment'): Promise<boolean> => {
    if (!verifyAdminAccess() || amount < 0) {
      toast.error('Invalid operation or insufficient permissions');
      return false;
    }

    try {
      const userProfileRef = doc(db, 'userProfiles', userId);
      
      const success = await runTransaction(db, async (transaction) => {
        const profileDoc = await transaction.get(userProfileRef);
        
        if (!profileDoc.exists()) {
          throw new Error('User profile not found');
        }

        const currentCredits = profileDoc.data().credits || 0;
        
        // Update user profile
        transaction.update(userProfileRef, {
          credits: amount
        });

        // Log the credit transaction
        const transactionRef = doc(collection(db, 'creditTransactions'));
        transaction.set(transactionRef, {
          userId,
          adminUserId: user!.uid,
          type: 'adjustment',
          amount: amount - currentCredits,
          previousBalance: currentCredits,
          newBalance: amount,
          reason,
          timestamp: new Date()
        });

        return true;
      });

      if (success) {
        toast.success(`Successfully set credits to ${amount}`);
        console.log(`[ADMIN ACTION] Set credits to ${amount} for user ${userId}`);
      }

      return success;
    } catch (error) {
      console.error('Error setting credits:', error);
      toast.error('Failed to set credits. Please try again.');
      return false;
    }
  };

  // Suspend user account
  const suspendUser = async (userId: string, reason: string): Promise<boolean> => {
    if (!verifyAdminAccess()) {
      toast.error('Insufficient permissions');
      return false;
    }

    if (userId === user!.uid) {
      toast.error('You cannot suspend your own account');
      return false;
    }

    try {
      const userProfileRef = doc(db, 'userProfiles', userId);
      
      const success = await runTransaction(db, async (transaction) => {
        const profileDoc = await transaction.get(userProfileRef);
        
        if (!profileDoc.exists()) {
          throw new Error('User profile not found');
        }

        const userData = profileDoc.data();
        
        if (userData.isAdmin) {
          throw new Error('Cannot suspend admin accounts');
        }

        if (userData.isSuspended) {
          throw new Error('User is already suspended');
        }

        // Update user profile
        transaction.update(userProfileRef, {
          isSuspended: true,
          suspendedAt: new Date(),
          suspendedBy: user!.uid,
          suspensionReason: reason
        });

        // Log the action
        const transactionRef = doc(collection(db, 'creditTransactions'));
        transaction.set(transactionRef, {
          userId,
          adminUserId: user!.uid,
          type: 'suspend',
          amount: 0,
          previousBalance: 0,
          newBalance: 0,
          reason,
          timestamp: new Date()
        });

        return true;
      });

      if (success) {
        toast.success('User account suspended successfully');
        console.log(`[ADMIN ACTION] Suspended user ${userId} - Reason: ${reason}`);
      }

      return success;
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to suspend user. Please try again.');
      return false;
    }
  };

  // Unsuspend user account
  const unsuspendUser = async (userId: string): Promise<boolean> => {
    if (!verifyAdminAccess()) {
      toast.error('Insufficient permissions');
      return false;
    }

    try {
      const userProfileRef = doc(db, 'userProfiles', userId);
      
      const success = await runTransaction(db, async (transaction) => {
        const profileDoc = await transaction.get(userProfileRef);
        
        if (!profileDoc.exists()) {
          throw new Error('User profile not found');
        }

        const userData = profileDoc.data();
        
        if (!userData.isSuspended) {
          throw new Error('User is not suspended');
        }

        // Update user profile
        transaction.update(userProfileRef, {
          isSuspended: false,
          suspendedAt: null,
          suspendedBy: null,
          suspensionReason: null
        });

        // Log the action
        const transactionRef = doc(collection(db, 'creditTransactions'));
        transaction.set(transactionRef, {
          userId,
          adminUserId: user!.uid,
          type: 'unsuspend',
          amount: 0,
          previousBalance: 0,
          newBalance: 0,
          reason: 'Account unsuspended by admin',
          timestamp: new Date()
        });

        return true;
      });

      if (success) {
        toast.success('User account reactivated successfully');
        console.log(`[ADMIN ACTION] Unsuspended user ${userId} - Reason: ${reason}`);
      }

      return success;
    } catch (error) {
      console.error('Error unsuspending user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate user. Please try again.');
      return false;
    }
  };

  // Delete user account (soft delete)
  const deleteUser = async (userId: string, reason: string): Promise<boolean> => {
    console.log('[DELETE] Starting user deletion process');
    console.log('[DELETE] Admin user:', user?.email);
    console.log('[DELETE] Target user ID:', userId);
    console.log('[DELETE] Delete reason:', reason);
    
    if (!verifyAdminAccess()) {
      console.error('[DELETE] Admin access verification failed');
      toast.error('Insufficient permissions - Admin access required');
      return false;
    }
    console.log('[DELETE] Admin access verified successfully');

    if (userId === user!.uid) {
      console.error('[DELETE] Attempt to delete own account blocked');
      toast.error('You cannot delete your own account');
      return false;
    }

    try {
      const userProfileRef = doc(db, 'userProfiles', userId);
      
      const success = await runTransaction(db, async (transaction) => {
        const profileDoc = await transaction.get(userProfileRef);
        
        if (!profileDoc.exists()) {
          throw new Error('User profile not found');
        }

        const userData = profileDoc.data();
        
        if (userData.isAdmin) {
          throw new Error('Cannot delete admin accounts');
        }

        if (userData.deletedAt) {
          throw new Error('User is already deleted');
        }

        // Update user profile (soft delete)
        transaction.update(userProfileRef, {
          deletedAt: new Date(),
          deletedBy: user!.uid,
          deleteReason: reason,
          isActive: false
        });

        // Log the action
        const transactionRef = doc(collection(db, 'creditTransactions'));
        transaction.set(transactionRef, {
          userId,
          adminUserId: user!.uid,
          type: 'delete',
          amount: 0,
          previousBalance: 0,
          newBalance: 0,
          reason,
          timestamp: new Date()
        });

        return true;
      });

      if (success) {
        toast.success('User account deleted successfully');
        console.log(`[ADMIN ACTION] Deleted user ${userId} - Reason: ${reason}`);
      }

      return success;
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user. Please try again.');
      return false;
    }
  };

  // Reactivate deleted user account
  const reactivateUser = async (userId: string): Promise<boolean> => {
    if (!verifyAdminAccess()) {
      toast.error('Insufficient permissions');
      return false;
    }

    try {
      const userProfileRef = doc(db, 'userProfiles', userId);
      
      const success = await runTransaction(db, async (transaction) => {
        const profileDoc = await transaction.get(userProfileRef);
        
        if (!profileDoc.exists()) {
          throw new Error('User profile not found');
        }

        const userData = profileDoc.data();
        
        if (!userData.deletedAt) {
          throw new Error('User is not deleted');
        }

        // Update user profile
        transaction.update(userProfileRef, {
          deletedAt: null,
          deletedBy: null,
          deleteReason: null,
          isActive: true,
          isSuspended: false
        });

        // Log the action
        const transactionRef = doc(collection(db, 'creditTransactions'));
        transaction.set(transactionRef, {
          userId,
          adminUserId: user!.uid,
          type: 'reactivate',
          amount: 0,
          previousBalance: 0,
          newBalance: 0,
          reason: 'Account reactivated by admin',
          timestamp: new Date()
        });

        return true;
      });

      if (success) {
        toast.success('User account reactivated successfully');
        console.log(`[ADMIN ACTION] Reactivated user ${userId} - Reason: ${reason}`);
      }

      return success;
    } catch (error) {
      console.error('Error reactivating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate user. Please try again.');
      return false;
    }
  };

  // Get user transaction history
  const getUserTransactions = async (userId: string): Promise<CreditTransaction[]> => {
    if (!verifyAdminAccess()) {
      return [];
    }

    try {
      const transactionsQuery = query(
        collection(db, 'creditTransactions'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(transactionsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as CreditTransaction));
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      toast.error('Failed to load transaction history');
      return [];
    }
  };

  // Get system statistics (real-time and comprehensive)
  const getSystemStats = () => {
    // Filter out deleted users for main stats
    const activeUserList = users.filter(user => !user.deletedAt);
    
    const totalUsers = activeUserList.length;
    const totalImageCredits = activeUserList.reduce((sum, user) => sum + (user.imageCredits || 0), 0);
    const totalVideoCredits = activeUserList.reduce((sum, user) => sum + (user.videoCredits || 0), 0);
    const totalCreditsInCirculation = totalImageCredits + totalVideoCredits;
    const totalCreditsGranted = activeUserList.reduce((sum, user) => sum + (user.totalCreditsGranted || 0), 0);
    const totalCreditsUsed = activeUserList.reduce((sum, user) => sum + (user.totalCreditsUsed || 0), 0);
    
    // User status counts
    const activeUsers = activeUserList.filter(user => user.isActive && !user.isSuspended && (user.imageCredits > 0 || user.videoCredits > 0 || user.isAdmin)).length;
    const suspendedUsers = activeUserList.filter(user => user.isSuspended).length;
    const usersWithoutCredits = activeUserList.filter(user => 
      !user.isAdmin && 
      !user.isSuspended && 
      user.imageCredits === 0 && 
      user.videoCredits === 0
    ).length;
    
    // Additional detailed stats
    const deletedUsers = users.filter(user => user.deletedAt).length;
    const adminUsers = activeUserList.filter(user => user.isAdmin).length;
    const usersWithImageCredits = activeUserList.filter(user => user.imageCredits > 0).length;
    const usersWithVideoCredits = activeUserList.filter(user => user.videoCredits > 0).length;

    return {
      // Main stats
      totalUsers,
      totalCreditsInCirculation,
      totalImageCredits,
      totalVideoCredits,
      totalCreditsGranted,
      totalCreditsUsed,
      
      // User status stats
      activeUsers,
      suspendedUsers,
      usersWithoutCredits,
      deletedUsers,
      adminUsers,
      usersWithImageCredits,
      usersWithVideoCredits,
      
      // Legacy compatibility
      usersWithCredits: usersWithImageCredits + usersWithVideoCredits
    };
  };

  // Legacy wrapper functions for backwards compatibility
  const grantCreditsLegacy = async (userId: string, amount: number, reason: string = 'Admin credit grant'): Promise<boolean> => {
    // For legacy support, grant to image credits
    return grantCredits(userId, 'image', amount, reason);
  };

  const deductCreditsLegacy = async (userId: string, amount: number, reason: string = 'Admin credit deduction'): Promise<boolean> => {
    // For legacy support, deduct from image credits
    return deductCredits(userId, 'image', amount, reason);
  };

  return {
    // New dual credit system functions
    users,
    loading,
    recentTransactions,
    grantCreditsForType: grantCredits,
    deductCreditsForType: deductCredits,
    setCredits,
    getUserTransactions,
    getSystemStats,
    isAdminUser: isAdmin,
    
    // Legacy compatibility
    grantCredits: grantCreditsLegacy,
    deductCredits: deductCreditsLegacy
  };
};