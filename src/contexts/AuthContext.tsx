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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
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
          credits: 0, // Start with 0 credits (admins get unlimited through isAdmin flag)
          isAdmin,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          totalCreditsGranted: 0,
          totalCreditsUsed: 0
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
      if (user) {
        // Create or update user profile when user signs in
        await createOrUpdateUserProfile(user);
      }
      
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
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
      await signInWithPopup(auth, provider);
      toast.success('Welcome!');
    } catch (error: unknown) {
      console.error('Google sign in error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign in with Google');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast.success('Signed out successfully');
    } catch (error: unknown) {
      console.error('Sign out error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign out');
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};