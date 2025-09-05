import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

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
        const response = await fetch(`${API_BASE_URL}/users/${user.uid}/totp`);
        
        if (response.ok) {
          const data = await response.json();
          setTotpSettings({
            userId: data.user_id,
            enabled: data.enabled,
            secret: data.secret,
            backupCodes: data.backup_codes || [],
            enrolledAt: data.enrolled_at ? new Date(data.enrolled_at) : null,
            lastUsed: data.last_used ? new Date(data.last_used) : null,
            recoveryEmail: data.recovery_email
          });
        } else if (response.status === 404) {
          setTotpSettings(null);
        } else {
          throw new Error('Failed to load TOTP settings');
        }
      } catch (error) {
        console.error('Error loading TOTP settings:', error);
        toast.error('Failed to load MFA settings');
        setTotpSettings(null);
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
      const now = new Date().toISOString();
      
      // Create TOTP settings
      const totpResponse = await fetch(`${API_BASE_URL}/users/${user.uid}/totp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: true,
          secret,
          backup_codes: backupCodes,
          enrolled_at: now,
          last_used: null,
          recovery_email: user.email || ''
        }),
      });

      if (!totpResponse.ok) {
        throw new Error('Failed to enable TOTP');
      }

      // Update user profile to indicate MFA is enabled
      const profileResponse = await fetch(`${API_BASE_URL}/users/${user.uid}/profile`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        await fetch(`${API_BASE_URL}/users/${user.uid}/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...profileData,
            mfa_enabled: true,
            mfa_enabled_at: now
          }),
        });
      }

      // Update local settings
      setTotpSettings({
        userId: user.uid,
        enabled: true,
        secret,
        backupCodes,
        enrolledAt: new Date(now),
        lastUsed: null,
        recoveryEmail: user.email || ''
      });

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
      // Update TOTP settings to disabled
      const totpResponse = await fetch(`${API_BASE_URL}/users/${user.uid}/totp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: false,
          secret: '',
          backup_codes: []
        }),
      });

      if (!totpResponse.ok) {
        throw new Error('Failed to disable TOTP');
      }
        
      // Update user profile
      const profileResponse = await fetch(`${API_BASE_URL}/users/${user.uid}/profile`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        await fetch(`${API_BASE_URL}/users/${user.uid}/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...profileData,
            mfa_enabled: false
          }),
        });
      }

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
      const updatedCodes = totpSettings.backupCodes.filter(c => c !== upperCode);
      const now = new Date().toISOString();
      
      const response = await fetch(`${API_BASE_URL}/users/${user.uid}/totp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backup_codes: updatedCodes,
          last_used: now
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update backup codes');
      }

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
      const now = new Date().toISOString();
      const response = await fetch(`${API_BASE_URL}/users/${user.uid}/totp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          last_used: now
        }),
      });

      if (response.ok) {
        setTotpSettings(prev => prev ? { ...prev, lastUsed: new Date() } : null);
      }
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
      
      const response = await fetch(`${API_BASE_URL}/users/${user.uid}/totp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backup_codes: newBackupCodes
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate backup codes');
      }

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