import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  profile: {
    imageCredits: number;
    videoCredits: number;
    isAdmin: boolean;
    totalCreditsGranted: number;
    totalCreditsUsed: number;
    mfaEnabled: boolean;
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

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMFA, setPendingMFA] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);

  // Get token from localStorage
  const getToken = (): string | null => {
    return localStorage.getItem('authToken');
  };

  // Set token in localStorage
  const setToken = (token: string): void => {
    localStorage.setItem('authToken', token);
  };

  // Remove token from localStorage
  const removeToken = (): void => {
    localStorage.removeItem('authToken');
  };

  // API call helper with auth token
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

  // Load user from token on app start
  useEffect(() => {
    const loadUser = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiCall('/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
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

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const { user: userData, token } = await response.json();
        setToken(token);
        
        // Get full user profile
        const profileResponse = await apiCall('/auth/me');
        if (profileResponse.ok) {
          const fullUserData = await profileResponse.json();
          setUser(fullUserData);
          
          // Check if user has MFA enabled (placeholder for future implementation)
          if (fullUserData.profile.mfaEnabled) {
            setPendingMFA(true);
            setRequiresMFA(true);
            // For now, we'll skip MFA implementation
            toast.info('MFA is enabled but not implemented yet');
          } else {
            toast.success('Welcome back!');
          }
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign in');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const response = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });

      if (response.ok) {
        const { user: userData, token } = await response.json();
        setToken(token);
        
        // Get full user profile
        const profileResponse = await apiCall('/auth/me');
        if (profileResponse.ok) {
          const fullUserData = await profileResponse.json();
          setUser(fullUserData);
          toast.success('Account created successfully!');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create account');
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    // Google OAuth not implemented yet - placeholder
    toast.error('Google sign-in not implemented yet. Please use email/password.');
    throw new Error('Google sign-in not implemented');
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
    // MFA completion logic - placeholder
    setPendingMFA(false);
    setRequiresMFA(false);
    toast.success('MFA completed - feature not fully implemented yet');
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};