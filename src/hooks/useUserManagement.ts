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

  // Stub for PostgreSQL migration - user management not implemented yet
  useEffect(() => {
    if (!isAdmin || !user) {
      setUsers([]);
      setRecentTransactions([]);
      setLoading(false);
      return;
    }

    // TODO: Implement user profile loading with PostgreSQL backend
    setUsers([]);
    setRecentTransactions([]);
    setLoading(false);
  }, [isAdmin, user]);

  // Grant credits to a specific user - stub for PostgreSQL migration
  const grantCredits = async (userId: string, creditType: 'image' | 'video', amount: number, reason: string = 'Admin credit grant'): Promise<boolean> => {
    if (!verifyAdminAccess() || amount <= 0) {
      toast.error('Invalid operation or insufficient permissions');
      return false;
    }

    try {
      // TODO: Implement credit granting with PostgreSQL backend
      toast.info('User credit management will be implemented in a future update.');
      return false;
    } catch (error) {
      console.error('Error granting credits:', error);
      toast.error('Failed to grant credits. Please try again.');
      return false;
    }
  };

  // Deduct credits from a specific user - stub for PostgreSQL migration
  const deductCredits = async (userId: string, creditType: 'image' | 'video', amount: number, reason: string = 'Admin credit deduction'): Promise<boolean> => {
    if (!verifyAdminAccess() || amount <= 0) {
      toast.error('Invalid operation or insufficient permissions');
      return false;
    }

    try {
      // TODO: Implement credit deduction with PostgreSQL backend
      toast.info('User credit management will be implemented in a future update.');
      return false;
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error('Failed to deduct credits. Please try again.');
      return false;
    }
  };

  // Set exact credit amount for a user - stub for PostgreSQL migration
  const setCredits = async (userId: string, amount: number, reason: string = 'Admin credit adjustment'): Promise<boolean> => {
    if (!verifyAdminAccess() || amount < 0) {
      toast.error('Invalid operation or insufficient permissions');
      return false;
    }

    try {
      // TODO: Implement credit setting with PostgreSQL backend
      toast.info('User credit management will be implemented in a future update.');
      return false;
    } catch (error) {
      console.error('Error setting credits:', error);
      toast.error('Failed to set credits. Please try again.');
      return false;
    }
  };

  // Suspend user account - stub for PostgreSQL migration
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
      // TODO: Implement user suspension with PostgreSQL backend
      toast.info('User account management will be implemented in a future update.');
      return false;
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to suspend user. Please try again.');
      return false;
    }
  };

  // Unsuspend user account - stub for PostgreSQL migration
  const unsuspendUser = async (userId: string): Promise<boolean> => {
    if (!verifyAdminAccess()) {
      toast.error('Insufficient permissions');
      return false;
    }

    try {
      // TODO: Implement user unsuspension with PostgreSQL backend
      toast.info('User account management will be implemented in a future update.');
      return false;
    } catch (error) {
      console.error('Error unsuspending user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate user. Please try again.');
      return false;
    }
  };

  // Delete user account (soft delete) - stub for PostgreSQL migration
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
      // TODO: Implement user deletion with PostgreSQL backend
      toast.info('User account management will be implemented in a future update.');
      return false;
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user. Please try again.');
      return false;
    }
  };

  // Reactivate deleted user account - stub for PostgreSQL migration
  const reactivateUser = async (userId: string): Promise<boolean> => {
    if (!verifyAdminAccess()) {
      toast.error('Insufficient permissions');
      return false;
    }

    try {
      // TODO: Implement user reactivation with PostgreSQL backend
      toast.info('User account management will be implemented in a future update.');
      return false;
    } catch (error) {
      console.error('Error reactivating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate user. Please try again.');
      return false;
    }
  };

  // Get user transaction history - stub for PostgreSQL migration
  const getUserTransactions = async (userId: string): Promise<CreditTransaction[]> => {
    if (!verifyAdminAccess()) {
      return [];
    }

    try {
      // TODO: Implement user transaction history with PostgreSQL backend
      return [];
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