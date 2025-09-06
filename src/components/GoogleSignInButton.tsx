import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onSuccess, onError }) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Don't render if user is already logged in
    if (user) return;

    // Wait for Google Identity Services to load
    const initializeGoogleButton = () => {
      if (!window.google || !buttonRef.current) return;

      // Set up the callback
      (window as any).handleGoogleSignIn = async (response: any) => {
        try {
          // Get the credential token
          const credential = response.credential;
          
          // Send to our backend API
          const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';
          const token = localStorage.getItem('authToken');
          
          const authResponse = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify({ credential })
          });

          if (authResponse.ok) {
            const { user: userData, token: newToken } = await authResponse.json();
            localStorage.setItem('authToken', newToken);
            
            // Reload the page to refresh the auth context
            window.location.reload();
            
            if (onSuccess) onSuccess();
          } else {
            const errorData = await authResponse.json();
            throw new Error(errorData.error || 'Google sign-in failed');
          }
        } catch (error) {
          console.error('Google sign-in error:', error);
          if (onError) onError(error as Error);
        }
      };

      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: '1035190682648-p60ao4phea2hbovo087bcao80741u10o.apps.googleusercontent.com',
        callback: (window as any).handleGoogleSignIn
      });

      // Render the Google Sign-In button
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'continue_with',
        width: '100%'
      });
    };

    // Check if Google is already loaded
    if (window.google) {
      initializeGoogleButton();
    } else {
      // Wait for Google to load
      const checkGoogleLoaded = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogleLoaded);
          initializeGoogleButton();
        }
      }, 100);

      // Clean up interval after 10 seconds
      setTimeout(() => clearInterval(checkGoogleLoaded), 10000);
    }
  }, [user, onSuccess, onError]);

  if (user) return null;

  return (
    <div 
      ref={buttonRef} 
      className="w-full flex justify-center"
      style={{ minHeight: '40px' }}
    />
  );
};