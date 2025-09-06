import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

export const useTOTP = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [totpSettings, setTotpSettings] = useState<TOTPSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Load user's TOTP settings from user profile (MFA info is in JWT)
  useEffect(() => {
    if (!user) {
      setTotpSettings(null);
      setSettingsLoading(false);
      return;
    }

    // For now, we'll use the MFA enabled flag from the user profile
    // In a full implementation, we'd fetch TOTP settings from the database
    if (user.profile?.mfaEnabled) {
      setTotpSettings({
        userId: user.id,
        enabled: true,
        secret: '', // We don't expose secrets in JWT
        backupCodes: [],
        enrolledAt: new Date(),
        lastUsed: null,
        recoveryEmail: user.email
      });
    } else {
      setTotpSettings(null);
    }
    
    setSettingsLoading(false);
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

  // Enable TOTP MFA (placeholder - requires API implementation)
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
      console.warn('TOTP enablement not implemented for PostgreSQL yet');
      toast.info('MFA enablement not implemented yet');
      return false;
    } catch (error) {
      console.error('Error enabling TOTP:', error);
      toast.error('Failed to enable two-factor authentication');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Disable TOTP MFA (placeholder - requires API implementation)
  const disableTOTP = async (token: string): Promise<boolean> => {
    if (!user || !totpSettings) {
      toast.error('No MFA settings found');
      return false;
    }

    setLoading(true);
    try {
      console.warn('TOTP disabling not implemented for PostgreSQL yet');
      toast.info('MFA disabling not implemented yet');
      return false;
    } catch (error) {
      console.error('Error disabling TOTP:', error);
      toast.error('Failed to disable two-factor authentication');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Verify backup code (placeholder)
  const verifyBackupCode = async (code: string): Promise<boolean> => {
    console.warn('Backup code verification not implemented for PostgreSQL yet');
    return false;
  };

  // Update last used timestamp (placeholder)
  const updateLastUsed = async (): Promise<void> => {
    console.warn('TOTP last used update not implemented for PostgreSQL yet');
  };

  // Regenerate backup codes (placeholder)
  const regenerateBackupCodes = async (token: string): Promise<string[] | null> => {
    console.warn('Backup code regeneration not implemented for PostgreSQL yet');
    return null;
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