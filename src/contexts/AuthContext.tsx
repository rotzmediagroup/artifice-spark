import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  pendingMFA: boolean;
  requiresMFA: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  completeMFASignIn: () => void;
  cancelMFASignIn: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMFA, setPendingMFA] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // Function to check if user has MFA enabled
  const checkMFAStatus = async (user: User): Promise<boolean> => {
    try {
      const totpSettingsRef = doc(db, 'totpSettings', user.uid);
      const totpSettingsDoc = await getDoc(totpSettingsRef);
      return totpSettingsDoc.exists() && totpSettingsDoc.data().enabled === true;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return false;
    }
  };

  // Function to check account status and block suspended/deleted users
  const checkAccountStatus = async (user: User): Promise<boolean> => {
    try {
      const userProfileRef = doc(db, 'userProfiles', user.uid);
      const userProfileDoc = await getDoc(userProfileRef);
      
      if (userProfileDoc.exists()) {
        const userData = userProfileDoc.data();
        
        // Check if user is deleted
        if (userData.deletedAt) {
          toast.error('This account has been deleted. Please contact support.');
          await firebaseSignOut(auth);
          return false;
        }
        
        // Check if user is suspended
        if (userData.isSuspended) {
          toast.error('This account has been suspended. Please contact support.');
          await firebaseSignOut(auth);
          return false;
        }
        
        // Check if user is inactive
        if (userData.isActive === false) {
          toast.error('This account is inactive. Please contact support.');
          await firebaseSignOut(auth);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking account status:', error);
      return true; // Allow sign-in if check fails to avoid blocking legitimate users
    }
  };

  // Function to create or update user profile
  const createOrUpdateUserProfile = async (user: User) => {
    try {
      const userProfileRef = doc(db, 'userProfiles', user.uid);
      const userProfileDoc = await getDoc(userProfileRef);
      
      const isAdmin = user.email === 'jerome@rotz.host';
      const now = new Date();
      
      if (!userProfileDoc.exists()) {
        // Create new user profile
        console.log(`Creating new user profile for: ${user.email}`);
        await setDoc(userProfileRef, {
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          credits: 0, // Legacy field for backwards compatibility
          imageCredits: 0,
          videoCredits: 0,
          isAdmin,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          totalCreditsGranted: 0,
          totalCreditsUsed: 0,
          // MFA fields
          mfaEnabled: false,
          mfaEnabledAt: null,
          // Account status fields
          isActive: true,
          isSuspended: false,
          suspendedAt: null,
          suspendedBy: null,
          suspensionReason: null,
          deletedAt: null,
          deletedBy: null,
          deleteReason: null
        });
        
        if (isAdmin) {
          console.log(`[ADMIN PROFILE] Created super admin profile for: ${user.email}`);
        } else {
          console.log(`[USER PROFILE] Created standard user profile for: ${user.email}`);
        }
      } else {
        // Update existing user profile
        const existingData = userProfileDoc.data();
        await runTransaction(db, async (transaction) => {
          transaction.update(userProfileRef, {
            email: user.email,
            displayName: user.displayName || existingData.displayName || '',
            photoURL: user.photoURL || existingData.photoURL || '',
            isAdmin, // Update admin status in case it changed
            lastLogin: serverTimestamp()
          });
        });
        
        console.log(`Updated user profile for: ${user.email}`);
      }
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      // Don't toast error to user as this is background functionality
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Handle pending MFA state - don't update user until MFA is complete
      if (pendingMFA && user) {
        return; // Wait for MFA completion
      }

      if (user) {
        // Check account status before allowing sign-in
        const accountStatusOk = await checkAccountStatus(user);
        if (!accountStatusOk) {
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Create or update user profile when user signs in
        await createOrUpdateUserProfile(user);
      }
      
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [pendingMFA]);

  const signIn = async (email: string, password: string) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user has MFA enabled
      const hasMFA = await checkMFAStatus(user);
      
      if (hasMFA) {
        // Set pending MFA state and sign out temporarily
        setPendingUser(user);
        setPendingMFA(true);
        setRequiresMFA(true);
        await firebaseSignOut(auth);
        console.log(`[MFA] User ${user.email} requires MFA verification`);
      } else {
        toast.success('Welcome back!');
      }
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign in');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName });
      toast.success('Account created successfully!');
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create account');
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      
      // Check if user has MFA enabled
      const hasMFA = await checkMFAStatus(user);
      
      if (hasMFA) {
        // Set pending MFA state and sign out temporarily
        setPendingUser(user);
        setPendingMFA(true);
        setRequiresMFA(true);
        await firebaseSignOut(auth);
        console.log(`[MFA] User ${user.email} requires MFA verification`);
      } else {
        toast.success('Welcome!');
      }
    } catch (error: unknown) {
      console.error('Google sign in error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign in with Google');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      
      // Clear MFA state
      setPendingMFA(false);
      setRequiresMFA(false);
      setPendingUser(null);
      
      toast.success('Signed out successfully');
    } catch (error: unknown) {
      console.error('Sign out error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign out');
      throw error;
    }
  };

  const completeMFASignIn = async () => {
    if (!pendingUser) {
      console.error('No pending user for MFA completion');
      return;
    }

    try {
      // Check account status before completing MFA
      const accountStatusOk = await checkAccountStatus(pendingUser);
      if (!accountStatusOk) {
        cancelMFASignIn();
        return;
      }
      
      // Create or update user profile
      await createOrUpdateUserProfile(pendingUser);
      
      // Set the user as authenticated
      setUser(pendingUser);
      
      // Clear MFA state
      setPendingMFA(false);
      setRequiresMFA(false);
      setPendingUser(null);
      
      toast.success('Welcome back!');
      console.log(`[MFA] User ${pendingUser.email} successfully completed MFA`);
    } catch (error) {
      console.error('MFA completion error:', error);
      toast.error('Failed to complete sign-in');
      cancelMFASignIn();
    }
  };

  const cancelMFASignIn = () => {
    setPendingMFA(false);
    setRequiresMFA(false);
    setPendingUser(null);
    toast.info('Sign-in cancelled');
  };

  const value = {
    user,
    loading,
    pendingMFA,
    requiresMFA,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    completeMFASignIn,
    cancelMFASignIn,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};