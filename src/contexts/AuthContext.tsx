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

  // Global callback for Google Sign-In (must be accessible from window)
  const handleGoogleCredential = async (response: any) => {
    try {
      // Send the credential to our backend
      const authResponse = await apiCall('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential: response.credential })
      });

      if (authResponse.ok) {
        const { user: userData, token } = await authResponse.json();
        setToken(token);
        
        // Get full user profile
        const profileResponse = await apiCall('/auth/me');
        if (profileResponse.ok) {
          const fullUserData = await profileResponse.json();
          setUser(fullUserData);
          toast.success('Welcome back!');
        } else {
          throw new Error('Failed to load user profile');
        }
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