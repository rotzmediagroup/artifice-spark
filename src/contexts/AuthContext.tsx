import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMFA, setPendingMFA] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // Function to check if user has MFA enabled
  const checkMFAStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('totp_settings')
        .select('enabled')
        .eq('user_id', userId)
        .single();
      
      return data?.enabled === true;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return false;
    }
  };

  // Function to check account status and block suspended/deleted users
  const checkAccountStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_suspended, is_active, deleted_at')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return true; // Allow login if profile doesn't exist (will be created)
      }
      
      if (data) {
        // Check if user is deleted
        if (data.deleted_at) {
          toast.error('This account has been deleted. Please contact support.');
          await supabase.auth.signOut();
          return false;
        }
        
        // Check if user is suspended
        if (data.is_suspended) {
          toast.error('This account has been suspended. Please contact support.');
          await supabase.auth.signOut();
          return false;
        }
        
        // Check if user is inactive
        if (data.is_active === false) {
          toast.error('This account is inactive. Please contact support.');
          await supabase.auth.signOut();
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking account status:', error);
      return true;
    }
  };

  // Function to create or update user profile
  const createOrUpdateUserProfile = async (user: User) => {
    try {
      const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map((email: string) => email.trim()) || [];
      const isAdmin = adminEmails.includes(user.email);

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
          is_admin: isAdmin,
          is_suspended: false,
          is_active: true,
          credits: 10, // Default credits for new users
          total_images_generated: 0,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error creating/updating user profile:', error);
      }
    } catch (error) {
      console.error('Error in createOrUpdateUserProfile:', error);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        checkAccountStatus(session.user.id).then(isValid => {
          if (isValid) {
            createOrUpdateUserProfile(session.user);
          }
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const isValid = await checkAccountStatus(session.user.id);
        if (isValid) {
          await createOrUpdateUserProfile(session.user);
        }
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if account is valid
        const isValid = await checkAccountStatus(data.user.id);
        if (!isValid) {
          return;
        }

        // Check if MFA is enabled
        const mfaEnabled = await checkMFAStatus(data.user.id);
        if (mfaEnabled) {
          setPendingUser(data.user);
          setPendingMFA(true);
          setRequiresMFA(true);
          // Sign out temporarily until MFA is verified
          await supabase.auth.signOut();
          return;
        }

        await createOrUpdateUserProfile(data.user);
        toast.success('Signed in successfully!');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        await createOrUpdateUserProfile(data.user);
        toast.success('Account created successfully! Please check your email to verify your account.');
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account');
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Google sign in error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      toast.success('Signed out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(error.message || 'Failed to sign out');
    }
  };

  const completeMFASignIn = async () => {
    if (pendingUser) {
      setUser(pendingUser);
      setPendingMFA(false);
      setRequiresMFA(false);
      setPendingUser(null);
      await createOrUpdateUserProfile(pendingUser);
      toast.success('Signed in successfully with MFA!');
    }
  };

  const cancelMFASignIn = () => {
    setPendingMFA(false);
    setRequiresMFA(false);
    setPendingUser(null);
  };

  const value = {
    user,
    session,
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};