import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onSuccess, onError }) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { user, handleGoogleCredential } = useAuth();

  useEffect(() => {
    // Don't render if user is already logged in
    if (user) return;

    // Wait for Google Identity Services to load
    const initializeGoogleButton = () => {
      if (!window.google || !buttonRef.current) return;

      // Set up the callback using the AuthContext method
      (window as any).handleGoogleSignIn = async (response: any) => {
        try {
          // Use the AuthContext Google credential handler
          await handleGoogleCredential(response);
          toast.success('Signed in successfully!');
          if (onSuccess) onSuccess();
        } catch (error) {
          console.error('Google sign-in error:', error);
          toast.error(error instanceof Error ? error.message : 'Google sign-in failed');
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
    <div className="w-full px-2 py-2">
      <div 
        ref={buttonRef} 
        className="w-full flex justify-center"
        style={{ minHeight: '40px' }}
      />
    </div>
  );
};