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

export const useTOTP = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [totpSettings, setTotpSettings] = useState<TOTPSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Load user's TOTP settings - stub for PostgreSQL migration
  useEffect(() => {
    if (!user) {
      setTotpSettings(null);
      setSettingsLoading(false);
      return;
    }

    // TODO: Implement TOTP settings loading with PostgreSQL backend
    setTotpSettings(null);
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

  // Enable TOTP MFA - stub for PostgreSQL migration
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
      // TODO: Implement TOTP enablement with PostgreSQL backend
      toast.info('Two-factor authentication setup will be implemented in a future update.');
      return false;
    } catch (error) {
      console.error('Error enabling TOTP:', error);
      toast.error('Failed to enable two-factor authentication');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Disable TOTP MFA - stub for PostgreSQL migration
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
      // TODO: Implement TOTP disabling with PostgreSQL backend
      toast.info('Two-factor authentication management will be implemented in a future update.');
      return false;
    } catch (error) {
      console.error('Error disabling TOTP:', error);
      toast.error('Failed to disable two-factor authentication');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Verify backup code - stub for PostgreSQL migration
  const verifyBackupCode = async (code: string): Promise<boolean> => {
    if (!user || !totpSettings) return false;

    // TODO: Implement backup code verification with PostgreSQL backend
    return false;
  };

  // Update last used timestamp - stub for PostgreSQL migration
  const updateLastUsed = async (): Promise<void> => {
    if (!user || !totpSettings?.enabled) return;
    // TODO: Implement last used timestamp update with PostgreSQL backend
  };

  // Regenerate backup codes - stub for PostgreSQL migration
  const regenerateBackupCodes = async (token: string): Promise<string[] | null> => {
    if (!user || !totpSettings?.enabled) return null;

    if (!verifyTOTP(token)) {
      toast.error('Invalid verification code');
      return null;
    }

    setLoading(true);
    try {
      // TODO: Implement backup code regeneration with PostgreSQL backend
      toast.info('Backup code regeneration will be implemented in a future update.');
      return null;
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