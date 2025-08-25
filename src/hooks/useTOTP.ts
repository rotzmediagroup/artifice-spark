import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  runTransaction 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

interface TOTPSettings {
  userId: string;
  enabled: boolean;
  secret: string;
  backupCodes: string[];
  enrolledAt: Date | null;
  lastUsed: Date | null;
  recoveryEmail: string;
}

interface TOTPSetup {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

export const useTOTP = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [totpSettings, setTotpSettings] = useState<TOTPSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Load user's TOTP settings
  useEffect(() => {
    if (!user) {
      setTotpSettings(null);
      setSettingsLoading(false);
      return;
    }

    const loadTOTPSettings = async () => {
      try {
        const settingsRef = doc(db, 'totpSettings', user.uid);
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setTotpSettings({
            ...data,
            enrolledAt: data.enrolledAt?.toDate() || null,
            lastUsed: data.lastUsed?.toDate() || null
          } as TOTPSettings);
        } else {
          setTotpSettings(null);
        }
      } catch (error) {
        console.error('Error loading TOTP settings:', error);
        toast.error('Failed to load MFA settings');
      } finally {
        setSettingsLoading(false);
      }
    };

    loadTOTPSettings();
  }, [user]);

  // Generate TOTP secret and QR code for setup
  const generateTOTPSetup = async (): Promise<TOTPSetup | null> => {
    if (!user) return null;

    try {
      // Generate a random secret
      const secret = new OTPAuth.Secret({ size: 32 });
      
      // Create TOTP object
      const totp = new OTPAuth.TOTP({
        issuer: 'ROTZ Image Generator',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret,
      });

      // Generate the otpauth URL and QR code
      const otpauthURL = totp.toString();
      const qrCodeUrl = await QRCode.toDataURL(otpauthURL);

      return {
        secret: secret.base32,
        qrCodeUrl,
        manualEntryKey: secret.base32
      };
    } catch (error) {
      console.error('Error generating TOTP setup:', error);
      toast.error('Failed to generate authenticator setup');
      return null;
    }
  };

  // Verify TOTP code
  const verifyTOTP = (token: string, secret?: string): boolean => {
    const secretToUse = secret || totpSettings?.secret;
    if (!secretToUse) return false;

    try {
      // Create TOTP object from secret
      const totp = new OTPAuth.TOTP({
        issuer: 'ROTZ Image Generator', 
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secretToUse,
      });

      // Validate token with 2-step drift tolerance (60 seconds total)
      const delta = totp.validate({ token, window: 2 });
      return delta !== null;
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return false;
    }
  };

  // Generate backup codes
  const generateBackupCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-character alphanumeric codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  // Enable TOTP MFA
  const enableTOTP = async (secret: string, token: string): Promise<boolean> => {
    if (!user) {
      toast.error('User not authenticated');
      return false;
    }

    // Verify the token first
    if (!verifyTOTP(token, secret)) {
      toast.error('Invalid verification code. Please try again.');
      return false;
    }

    setLoading(true);
    try {
      const backupCodes = generateBackupCodes();
      const settingsRef = doc(db, 'totpSettings', user.uid);
      
      await runTransaction(db, async (transaction) => {
        const settings: Omit<TOTPSettings, 'enrolledAt' | 'lastUsed'> & { 
          enrolledAt: ReturnType<typeof serverTimestamp>; 
          lastUsed: ReturnType<typeof serverTimestamp> | null; 
        } = {
          userId: user.uid,
          enabled: true,
          secret,
          backupCodes,
          enrolledAt: serverTimestamp(),
          lastUsed: null,
          recoveryEmail: user.email || ''
        };
        
        transaction.set(settingsRef, settings);
        
        // Update user profile to indicate MFA is enabled
        const userProfileRef = doc(db, 'userProfiles', user.uid);
        transaction.update(userProfileRef, {
          mfaEnabled: true,
          mfaEnabledAt: serverTimestamp()
        });
      });

      // Reload settings
      const settingsDoc = await getDoc(settingsRef);
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setTotpSettings({
          ...data,
          enrolledAt: data.enrolledAt?.toDate() || null,
          lastUsed: data.lastUsed?.toDate() || null
        } as TOTPSettings);
      }

      toast.success('Two-factor authentication enabled successfully!');
      console.log(`[MFA] TOTP enabled for user: ${user.email}`);
      return true;
    } catch (error) {
      console.error('Error enabling TOTP:', error);
      toast.error('Failed to enable two-factor authentication');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Disable TOTP MFA
  const disableTOTP = async (token: string): Promise<boolean> => {
    if (!user || !totpSettings) {
      toast.error('No MFA settings found');
      return false;
    }

    // Verify current TOTP code
    if (!verifyTOTP(token)) {
      toast.error('Invalid verification code. Please try again.');
      return false;
    }

    setLoading(true);
    try {
      const settingsRef = doc(db, 'totpSettings', user.uid);
      
      await runTransaction(db, async (transaction) => {
        // Update TOTP settings to disabled
        transaction.update(settingsRef, {
          enabled: false,
          secret: '', // Clear the secret
          backupCodes: [] // Clear backup codes
        });
        
        // Update user profile
        const userProfileRef = doc(db, 'userProfiles', user.uid);
        transaction.update(userProfileRef, {
          mfaEnabled: false
        });
      });

      setTotpSettings(prev => prev ? { ...prev, enabled: false, secret: '', backupCodes: [] } : null);
      toast.success('Two-factor authentication disabled');
      console.log(`[MFA] TOTP disabled for user: ${user.email}`);
      return true;
    } catch (error) {
      console.error('Error disabling TOTP:', error);
      toast.error('Failed to disable two-factor authentication');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Verify backup code
  const verifyBackupCode = async (code: string): Promise<boolean> => {
    if (!user || !totpSettings) return false;

    const upperCode = code.toUpperCase().replace(/\s/g, '');
    if (!totpSettings.backupCodes.includes(upperCode)) {
      return false;
    }

    try {
      // Remove the used backup code
      const settingsRef = doc(db, 'totpSettings', user.uid);
      const updatedCodes = totpSettings.backupCodes.filter(c => c !== upperCode);
      
      await updateDoc(settingsRef, {
        backupCodes: updatedCodes,
        lastUsed: serverTimestamp()
      });

      setTotpSettings(prev => prev ? { 
        ...prev, 
        backupCodes: updatedCodes,
        lastUsed: new Date()
      } : null);

      console.log(`[MFA] Backup code used for user: ${user.email}`);
      return true;
    } catch (error) {
      console.error('Error using backup code:', error);
      return false;
    }
  };

  // Update last used timestamp
  const updateLastUsed = async (): Promise<void> => {
    if (!user || !totpSettings?.enabled) return;

    try {
      const settingsRef = doc(db, 'totpSettings', user.uid);
      await updateDoc(settingsRef, {
        lastUsed: serverTimestamp()
      });

      setTotpSettings(prev => prev ? { ...prev, lastUsed: new Date() } : null);
    } catch (error) {
      console.error('Error updating TOTP last used:', error);
    }
  };

  // Regenerate backup codes
  const regenerateBackupCodes = async (token: string): Promise<string[] | null> => {
    if (!user || !totpSettings?.enabled) return null;

    if (!verifyTOTP(token)) {
      toast.error('Invalid verification code');
      return null;
    }

    setLoading(true);
    try {
      const newBackupCodes = generateBackupCodes();
      const settingsRef = doc(db, 'totpSettings', user.uid);
      
      await updateDoc(settingsRef, {
        backupCodes: newBackupCodes
      });

      setTotpSettings(prev => prev ? { ...prev, backupCodes: newBackupCodes } : null);
      toast.success('New backup codes generated');
      console.log(`[MFA] Backup codes regenerated for user: ${user.email}`);
      return newBackupCodes;
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      toast.error('Failed to generate new backup codes');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    totpSettings,
    loading,
    settingsLoading,
    isEnabled: totpSettings?.enabled || false,
    hasBackupCodes: (totpSettings?.backupCodes?.length || 0) > 0,
    backupCodesCount: totpSettings?.backupCodes?.length || 0,

    // Actions
    generateTOTPSetup,
    verifyTOTP,
    enableTOTP,
    disableTOTP,
    verifyBackupCode,
    updateLastUsed,
    regenerateBackupCodes
  };
};