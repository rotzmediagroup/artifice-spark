import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface User {
  uid: string;
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  profile?: {
    imageCredits: number;
    videoCredits: number;
    isAdmin: boolean;
    totalCreditsGranted: number;
    totalCreditsUsed: number;
  };
}

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
  handleGoogleCredential: (response: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// API base URL
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

// Token management
const getToken = () => localStorage.getItem('authToken');
const setToken = (token: string) => localStorage.setItem('authToken', token);
const removeToken = () => localStorage.removeItem('authToken');

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMFA, setPendingMFA] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);

  // API call helper
  const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  };

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Decode JWT to get user ID
        const tokenParts = token.split('.');
        const payload = JSON.parse(atob(tokenParts[1]));
        
        // Fetch user profile
        const response = await apiCall(`/users/${payload.userId}/profile`);
        if (response.ok) {
          const profileData = await response.json();
          setUser({
            uid: profileData.id,
            id: profileData.id,
            email: profileData.email,
            displayName: profileData.displayName,
            photoURL: profileData.photoURL,
            profile: {
              imageCredits: profileData.imageCredits,
              videoCredits: profileData.videoCredits,
              isAdmin: profileData.isAdmin,
              totalCreditsGranted: profileData.totalCreditsGranted,
              totalCreditsUsed: profileData.totalCreditsUsed
            }
          });
        } else {
          // Invalid token, remove it
          removeToken();
        }
      } catch (error) {
        console.error('Error loading user:', error);
        removeToken();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleGoogleCredential = async (response: any) => {
    try {
      const authResponse = await apiCall('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential: response.credential })
      });

      if (authResponse.ok) {
        const data = await authResponse.json();
        
        // Store token
        setToken(data.token);
        
        // Set user
        setUser(data.user);
        
        toast.success('Signed in successfully!');
      } else {
        const errorData = await authResponse.json();
        throw new Error(errorData.error || 'Google sign-in failed');
      }
    } catch (error: unknown) {
      console.error('Google sign-in error:', error);
      toast.error(error instanceof Error ? error.message : 'Google sign-in failed');
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Check if Google Identity Services is loaded
      if (typeof window.google === 'undefined') {
        toast.error('Google Sign-In is loading, please try again in a moment');
        throw new Error('Google Identity Services not loaded');
      }

      // Set the callback on window so Google can call it
      (window as any).handleGoogleCredential = handleGoogleCredential;

      // Initialize Google Sign-In with our callback
      window.google.accounts.id.initialize({
        client_id: '1035190682648-p60ao4phea2hbovo087bcao80741u10o.apps.googleusercontent.com',
        callback: handleGoogleCredential
      });

      // Show the Google Sign-In popup
      window.google.accounts.id.prompt();
    } catch (error: unknown) {
      console.error('Google sign-in error:', error);
      toast.error(error instanceof Error ? error.message : 'Google sign-in failed');
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    // Not implemented for PostgreSQL version - using Google Sign-In only
    toast.error('Please use Google Sign-In');
    throw new Error('Email/password sign-in not implemented');
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    // Not implemented for PostgreSQL version - using Google Sign-In only
    toast.error('Please use Google Sign-In');
    throw new Error('Email/password sign-up not implemented');
  };

  const signOut = async () => {
    try {
      removeToken();
      setUser(null);
      
      // Clear MFA state
      setPendingMFA(false);
      setRequiresMFA(false);
      
      toast.success('Signed out successfully');
    } catch (error: unknown) {
      console.error('Sign out error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign out');
      throw error;
    }
  };

  const completeMFASignIn = async () => {
    // MFA not implemented for PostgreSQL version
    setPendingMFA(false);
    setRequiresMFA(false);
    toast.success('MFA not required');
  };

  const cancelMFASignIn = () => {
    setPendingMFA(false);
    setRequiresMFA(false);
    setUser(null);
    removeToken();
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
    handleGoogleCredential,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};