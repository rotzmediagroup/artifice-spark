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

  // API call helper with auth token
  const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    return fetch(`${process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8888'}/api${endpoint}`, {
      ...options,
      headers,
    });
  };

  // Load users and transactions for admin
  useEffect(() => {
    if (!isAdmin || !user) {
      setUsers([]);
      setRecentTransactions([]);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        // Load all users
        const usersResponse = await apiCall('/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        } else {
          console.error('Failed to load users:', usersResponse.status);
          setUsers([]);
        }

        // Load recent transactions  
        const transactionsResponse = await apiCall('/admin/transactions?limit=50');
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          setRecentTransactions(transactionsData);
        } else {
          console.error('Failed to load transactions:', transactionsResponse.status);
          setRecentTransactions([]);
        }

      } catch (error) {
        console.error('Error loading admin data:', error);
        setUsers([]);
        setRecentTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, user]);

  // Grant credits to a specific user
  const grantCredits = async (userId: string, creditType: 'image' | 'video', amount: number, reason: string = 'Admin credit grant'): Promise<boolean> => {
    if (!verifyAdminAccess() || amount <= 0) {
      toast.error('Invalid operation or insufficient permissions');
      return false;
    }

    try {
      const response = await apiCall(`/admin/users/${userId}/credits`, {
        method: 'POST',
        body: JSON.stringify({
          creditType,
          amount,
          action: 'grant',
          reason
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Successfully granted ${amount} ${creditType} credits`);
        console.log(`[ADMIN ACTION] Granted ${amount} ${creditType} credits to user ${userId}`);
        
        // Refresh users list to show updated credits
        const usersResponse = await apiCall('/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
        
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant credits');
      }
    } catch (error) {
      console.error('Error granting credits:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to grant credits. Please try again.');
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
      const response = await apiCall(`/admin/users/${userId}/credits`, {
        method: 'POST',
        body: JSON.stringify({
          creditType,
          amount,
          action: 'deduct',
          reason
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Successfully deducted ${amount} ${creditType} credits`);
        console.log(`[ADMIN ACTION] Deducted ${amount} ${creditType} credits from user ${userId}`);
        
        // Refresh users list to show updated credits
        const usersResponse = await apiCall('/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
        
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deduct credits');
      }
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to deduct credits. Please try again.');
      return false;
    }
  };

  // Set exact credit amount for a user - legacy function, use grantCredits/deductCredits instead
  const setCredits = async (userId: string, amount: number, reason: string = 'Admin credit adjustment'): Promise<boolean> => {
    if (!verifyAdminAccess() || amount < 0) {
      toast.error('Invalid operation or insufficient permissions');
      return false;
    }

    // For now, redirect to grant/deduct pattern - exact setting not implemented
    toast.info('Please use grant/deduct credits instead of setting exact amounts');
    return false;
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
      const response = await apiCall(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          action: 'suspend',
          reason
        })
      });

      if (response.ok) {
        toast.success('User account suspended successfully');
        console.log(`[ADMIN ACTION] Suspended user ${userId} - Reason: ${reason}`);
        
        // Refresh users list
        const usersResponse = await apiCall('/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
        
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to suspend user');
      }
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
      const response = await apiCall(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          action: 'unsuspend',
          reason: 'Account unsuspended by admin'
        })
      });

      if (response.ok) {
        toast.success('User account reactivated successfully');
        console.log(`[ADMIN ACTION] Unsuspended user ${userId}`);
        
        // Refresh users list
        const usersResponse = await apiCall('/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
        
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reactivate user');
      }
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
      const response = await apiCall(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          action: 'delete',
          reason
        })
      });

      if (response.ok) {
        toast.success('User account deleted successfully');
        console.log(`[ADMIN ACTION] Deleted user ${userId} - Reason: ${reason}`);
        
        // Refresh users list
        const usersResponse = await apiCall('/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
        
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
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
      const response = await apiCall(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          action: 'reactivate',
          reason: 'Account reactivated by admin'
        })
      });

      if (response.ok) {
        toast.success('User account reactivated successfully');
        console.log(`[ADMIN ACTION] Reactivated user ${userId}`);
        
        // Refresh users list
        const usersResponse = await apiCall('/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
        
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reactivate user');
      }
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
      const response = await apiCall(`/admin/transactions?userId=${userId}&limit=100`);
      if (response.ok) {
        const transactions = await response.json();
        return transactions;
      } else {
        console.error('Failed to load user transactions:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      toast.error('Failed to load transaction history');
      return [];
    }
  };

  // Get system statistics (real-time and comprehensive)
  const getSystemStats = async () => {
    if (!verifyAdminAccess()) {
      return null;
    }

    try {
      const response = await apiCall('/admin/stats');
      if (response.ok) {
        const stats = await response.json();
        return {
          // Main stats from API
          totalUsers: stats.users.total,
          totalCreditsInCirculation: stats.credits.totalCreditsInCirculation,
          totalImageCredits: stats.credits.totalImageCredits,
          totalVideoCredits: stats.credits.totalVideoCredits,
          totalCreditsGranted: stats.credits.totalCreditsGranted,
          totalCreditsUsed: stats.credits.totalCreditsUsed,
          
          // User status stats from API
          activeUsers: stats.users.active,
          suspendedUsers: stats.users.suspended,
          adminUsers: stats.users.admins,
          
          // Content stats
          totalGenerations: stats.content.totalGenerations,
          imagesGenerated: stats.content.imagesGenerated,
          videosGenerated: stats.content.videosGenerated,
          
          // Calculated stats
          usersWithoutCredits: stats.users.total - stats.users.active,
          deletedUsers: stats.users.total - stats.users.active - stats.users.suspended,
          usersWithImageCredits: Math.ceil(stats.credits.totalImageCredits / 10), // Estimate
          usersWithVideoCredits: Math.ceil(stats.credits.totalVideoCredits / 10), // Estimate
          
          // Legacy compatibility
          usersWithCredits: stats.users.active
        };
      } else {
        console.error('Failed to load system stats:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
      return null;
    }
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
    // User data
    users,
    loading,
    recentTransactions,
    
    // Credit management functions
    grantCreditsForType: grantCredits,
    deductCreditsForType: deductCredits,
    setCredits,
    
    // User management functions
    suspendUser,
    unsuspendUser,
    deleteUser,
    reactivateUser,
    
    // Data functions
    getUserTransactions,
    getSystemStats,
    isAdminUser: isAdmin,
    
    // Legacy compatibility
    grantCredits: grantCreditsLegacy,
    deductCredits: deductCreditsLegacy
  };
};