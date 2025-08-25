import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  runTransaction, 
  doc, 
  addDoc,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from './useAdmin';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  credits: number;
  isAdmin: boolean;
  createdAt: Date;
  lastLogin: Date;
  totalCreditsGranted: number;
  totalCreditsUsed: number;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  adminUserId: string;
  type: 'grant' | 'deduct' | 'used' | 'adjustment';
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
        const userList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          lastLogin: doc.data().lastLogin?.toDate() || new Date()
        } as UserProfile));
        
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
  const grantCredits = async (userId: string, amount: number, reason: string = 'Admin credit grant'): Promise<boolean> => {
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

        const currentCredits = profileDoc.data().credits || 0;
        const newCredits = currentCredits + amount;
        const newTotalGranted = (profileDoc.data().totalCreditsGranted || 0) + amount;
        
        // Update user profile
        transaction.update(userProfileRef, {
          credits: newCredits,
          totalCreditsGranted: newTotalGranted
        });

        // Log the credit transaction
        const transactionRef = doc(collection(db, 'creditTransactions'));
        transaction.set(transactionRef, {
          userId,
          adminUserId: user!.uid,
          type: 'grant',
          amount,
          previousBalance: currentCredits,
          newBalance: newCredits,
          reason,
          timestamp: new Date()
        });

        return true;
      });

      if (success) {
        toast.success(`Successfully granted ${amount} credits`);
        console.log(`[ADMIN ACTION] Granted ${amount} credits to user ${userId}`);
      }

      return success;
    } catch (error) {
      console.error('Error granting credits:', error);
      toast.error('Failed to grant credits. Please try again.');
      return false;
    }
  };

  // Deduct credits from a specific user
  const deductCredits = async (userId: string, amount: number, reason: string = 'Admin credit deduction'): Promise<boolean> => {
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

        const currentCredits = profileDoc.data().credits || 0;
        const newCredits = Math.max(0, currentCredits - amount); // Don't allow negative credits
        
        // Update user profile
        transaction.update(userProfileRef, {
          credits: newCredits
        });

        // Log the credit transaction
        const transactionRef = doc(collection(db, 'creditTransactions'));
        transaction.set(transactionRef, {
          userId,
          adminUserId: user!.uid,
          type: 'deduct',
          amount: -amount,
          previousBalance: currentCredits,
          newBalance: newCredits,
          reason,
          timestamp: new Date()
        });

        return true;
      });

      if (success) {
        toast.success(`Successfully deducted ${amount} credits`);
        console.log(`[ADMIN ACTION] Deducted ${amount} credits from user ${userId}`);
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

  // Get system statistics
  const getSystemStats = () => {
    const totalUsers = users.length;
    const totalCreditsInCirculation = users.reduce((sum, user) => sum + user.credits, 0);
    const totalCreditsGranted = users.reduce((sum, user) => sum + (user.totalCreditsGranted || 0), 0);
    const totalCreditsUsed = users.reduce((sum, user) => sum + (user.totalCreditsUsed || 0), 0);
    const activeUsers = users.filter(user => user.credits > 0).length;
    const usersWithoutCredits = users.filter(user => user.credits === 0 && !user.isAdmin).length;

    return {
      totalUsers,
      totalCreditsInCirculation,
      totalCreditsGranted,
      totalCreditsUsed,
      activeUsers,
      usersWithoutCredits
    };
  };

  return {
    users,
    loading,
    recentTransactions,
    grantCredits,
    deductCredits,
    setCredits,
    getUserTransactions,
    getSystemStats,
    isAdminUser: isAdmin
  };
};