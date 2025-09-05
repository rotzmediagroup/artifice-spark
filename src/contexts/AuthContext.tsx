import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setTokens, clearTokens, getTokens } from '@/lib/api';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  credits: number;
  imageCredits: number;
  videoCredits: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  pendingMFA: boolean;
  requiresMFA: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
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

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { accessToken } = getTokens();
      
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.auth.me();
        setUser(response.data.user);
      } catch (error) {
        console.error('Auth check failed:', error);
        clearTokens();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.auth.login({ email, password });
      const { user, tokens } = response.data;

      setTokens(tokens);
      setUser(user);
      toast.success('Signed in successfully!');
    } catch (error: any) {
      console.error('Sign in error:', error);
      const message = error.response?.data?.error || 'Failed to sign in';
      toast.error(message);
      throw new Error(message);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const response = await api.auth.register({ email, password, displayName });
      const { user, tokens } = response.data;

      setTokens(tokens);
      setUser(user);
      toast.success('Account created successfully!');
    } catch (error: any) {
      console.error('Sign up error:', error);
      const message = error.response?.data?.error || 'Failed to create account';
      toast.error(message);
      throw new Error(message);
    }
  };

  const signOut = async () => {
    try {
      const { refreshToken } = getTokens();
      if (refreshToken) {
        await api.auth.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearTokens();
      setUser(null);
      toast.success('Signed out successfully');
    }
  };

  // MFA functions (not implemented yet)
  const completeMFASignIn = () => {
    setPendingMFA(false);
    setRequiresMFA(false);
  };

  const cancelMFASignIn = () => {
    setPendingMFA(false);
    setRequiresMFA(false);
  };

  const value = {
    user,
    loading,
    pendingMFA,
    requiresMFA,
    signIn,
    signUp,
    signOut,
    completeMFASignIn,
    cancelMFASignIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};