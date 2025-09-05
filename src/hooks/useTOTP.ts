import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
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
        const response = await api.totp.getSettings();
        const data = response.data;

        if (data) {
          setTotpSettings({
            userId: data.userId,
            enabled: data.enabled,
            secret: data.secret,
            backupCodes: data.backupCodes || [],
            enrolledAt: data.enrolledAt ? new Date(data.enrolledAt) : null,
            lastUsed: data.lastUsed ? new Date(data.lastUsed) : null,
            recoveryEmail: data.recoveryEmail || user.email || ''
          });
        } else {
          setTotpSettings(null);
        }
      } catch (error) {
        console.error('Error loading TOTP settings:', error);
      } finally {
        setSettingsLoading(false);
      }
    };

    loadTOTPSettings();
  }, [user]);

  // Generate new TOTP setup
  const generateTOTPSetup = async (): Promise<TOTPSetup | null> => {
    if (!user) return null;

    try {
      // Generate a random secret
      const totp = new OTPAuth.TOTP({
        issuer: 'ROTZ Image Generator',
        label: user.email || 'User',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(
          OTPAuth.Secret.fromHex(
            Array.from(crypto.getRandomValues(new Uint8Array(20)))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('')
          ).base32
        )
      });

      const uri = totp.toString();
      const qrCodeUrl = await QRCode.toDataURL(uri);
      const secret = totp.secret.base32;

      return {
        secret,
        qrCodeUrl,
        manualEntryKey: secret
      };
    } catch (error) {
      console.error('Error generating TOTP setup:', error);
      toast.error('Failed to generate authenticator setup');
      return null;
    }
  };

  // Enable TOTP
  const enableTOTP = async (secret: string, verificationCode: string, backupCodes: string[]): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    try {
      // Verify the code first
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(secret),
        digits: 6,
        period: 30
      });

      const isValid = totp.validate({ token: verificationCode, window: 1 }) !== null;

      if (!isValid) {
        toast.error('Invalid verification code. Please try again.');
        return false;
      }

      // Save TOTP settings
      await api.totp.enable({
        secret,
        verificationCode,
        backupCodes
      });

      setTotpSettings({
        userId: user.id,
        enabled: true,
        secret,
        backupCodes,
        enrolledAt: new Date(),
        lastUsed: null,
        recoveryEmail: user.email || ''
      });

      toast.success('Two-factor authentication enabled successfully');
      return true;
    } catch (error) {
      console.error('Error enabling TOTP:', error);
      toast.error('Failed to enable two-factor authentication');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Disable TOTP
  const disableTOTP = async (verificationCode: string): Promise<boolean> => {
    if (!user || !totpSettings) return false;

    setLoading(true);
    try {
      // Verify the code first
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(totpSettings.secret),
        digits: 6,
        period: 30
      });

      const isValid = totp.validate({ token: verificationCode, window: 1 }) !== null;

      if (!isValid) {
        toast.error('Invalid verification code. Please try again.');
        return false;
      }

      // Disable TOTP
      await api.totp.disable({ verificationCode });

      setTotpSettings({
        ...totpSettings,
        enabled: false
      });

      toast.success('Two-factor authentication disabled successfully');
      return true;
    } catch (error) {
      console.error('Error disabling TOTP:', error);
      toast.error('Failed to disable two-factor authentication');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Verify TOTP code
  const verifyTOTPCode = async (code: string): Promise<boolean> => {
    if (!user || !totpSettings) return false;

    try {
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(totpSettings.secret),
        digits: 6,
        period: 30
      });

      const isValid = totp.validate({ token: code, window: 1 }) !== null;

      if (isValid) {
        // Update last used timestamp via API
        await api.totp.verify({ code });
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying TOTP code:', error);
      return false;
    }
  };

  // Generate backup codes
  const generateBackupCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  };

  // Verify backup code
  const verifyBackupCode = async (code: string): Promise<boolean> => {
    if (!user || !totpSettings) return false;

    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const normalizedBackupCodes = totpSettings.backupCodes.map(c => 
      c.toUpperCase().replace(/[^A-Z0-9]/g, '')
    );

    const index = normalizedBackupCodes.indexOf(normalizedCode);
    if (index === -1) return false;

    try {
      // Verify and remove backup code via API
      const response = await api.totp.verifyBackup({ code });
      const updatedSettings = response.data;

      setTotpSettings({
        ...totpSettings,
        backupCodes: updatedSettings.backupCodes,
        lastUsed: new Date()
      });

      if (updatedSettings.backupCodes.length === 0) {
        toast.warning('All backup codes have been used. Please generate new ones.');
      } else if (updatedSettings.backupCodes.length <= 3) {
        toast.warning(`Only ${updatedSettings.backupCodes.length} backup codes remaining.`);
      }

      return true;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  };

  // Regenerate backup codes
  const regenerateBackupCodes = async (): Promise<string[] | null> => {
    if (!user || !totpSettings || !totpSettings.enabled) return null;

    setLoading(true);
    try {
      const response = await api.totp.regenerateBackupCodes();
      const newCodes = response.data.backupCodes;

      setTotpSettings({
        ...totpSettings,
        backupCodes: newCodes
      });

      toast.success('Backup codes regenerated successfully');
      return newCodes;
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      toast.error('Failed to regenerate backup codes');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    totpSettings,
    loading,
    settingsLoading,
    generateTOTPSetup,
    enableTOTP,
    disableTOTP,
    verifyTOTPCode,
    verifyBackupCode,
    generateBackupCodes,
    regenerateBackupCodes
  };
};