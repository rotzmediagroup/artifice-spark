import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Smartphone, 
  Key, 
  Copy, 
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Zap
} from 'lucide-react';
import { useTOTP } from '@/hooks/useTOTP';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const MFASettings: React.FC = () => {
  const { user } = useAuth();
  const { 
    totpSettings, 
    loading, 
    settingsLoading, 
    isEnabled, 
    hasBackupCodes,
    backupCodesCount,
    generateTOTPSetup, 
    enableTOTP, 
    disableTOTP,
    regenerateBackupCodes
  } = useTOTP();

  const [setupMode, setSetupMode] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  if (settingsLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <span className="ml-3 text-muted-foreground">Loading security settings...</span>
        </div>
      </Card>
    );
  }

  const handleStartSetup = async () => {
    const setup = await generateTOTPSetup();
    if (setup) {
      setTotpSetup(setup);
      setSetupMode(true);
    }
  };

  const handleCompleteSetup = async () => {
    if (!totpSetup || !verificationCode) {
      toast.error('Please enter the 6-digit code from your authenticator app');
      return;
    }

    const success = await enableTOTP(totpSetup.secret, verificationCode);
    if (success) {
      setSetupMode(false);
      setTotpSetup(null);
      setVerificationCode('');
      setShowBackupCodes(true); // Show backup codes after successful setup
    }
  };

  const handleDisableMFA = async () => {
    if (!disableCode) {
      toast.error('Please enter your current 6-digit code');
      return;
    }

    const success = await disableTOTP(disableCode);
    if (success) {
      setDisableCode('');
    }
  };

  const handleRegenerateBackupCodes = async () => {
    const token = prompt('Enter your current 6-digit authenticator code to regenerate backup codes:');
    if (!token) return;

    const codes = await regenerateBackupCodes(token);
    if (codes) {
      setNewBackupCodes(codes);
    }
  };

  const copyBackupCodes = (codes: string[]) => {
    const codeText = codes.join('\n');
    navigator.clipboard.writeText(codeText);
    toast.success('Backup codes copied to clipboard');
  };

  const downloadBackupCodes = (codes: string[]) => {
    const codeText = `ROTZ Image Generator - Backup Recovery Codes
Generated: ${new Date().toLocaleDateString()}
User: ${user?.email}

IMPORTANT: Save these codes in a secure location. Each code can only be used once.

${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

Instructions:
- These codes can be used if you lose access to your authenticator app
- Each code works only once
- Keep them secure and private
- Generate new codes if you suspect they've been compromised`;

    const blob = new Blob([codeText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rotz-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground">Manage your account security and two-factor authentication</p>
        </div>
      </div>

      {/* MFA Status Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${isEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              {isEnabled ? (
                <ShieldCheck className="h-6 w-6 text-green-600" />
              ) : (
                <ShieldAlert className="h-6 w-6 text-gray-500" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
              <p className="text-sm text-muted-foreground">
                {isEnabled 
                  ? 'Your account is protected with 2FA' 
                  : 'Add an extra layer of security to your account'
                }
              </p>
            </div>
          </div>
          <Badge variant={isEnabled ? 'default' : 'secondary'}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        
        {isEnabled && totpSettings && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Enabled:</span>
              <span>{totpSettings.enrolledAt?.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last used:</span>
              <span>{totpSettings.lastUsed?.toLocaleDateString() || 'Never'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Backup codes remaining:</span>
              <span className={backupCodesCount < 3 ? 'text-orange-600 font-medium' : ''}>
                {backupCodesCount} codes
              </span>
            </div>
          </div>
        )}
      </Card>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="backup">Backup Codes</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          {!isEnabled ? (
            /* Setup MFA */
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Enable Two-Factor Authentication</h3>
                </div>
                
                {!setupMode ? (
                  <div className="space-y-4">
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        Two-factor authentication adds an extra layer of security to your account. 
                        You'll need an authenticator app like Google Authenticator or Authy.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium">What you'll need:</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          A smartphone with an authenticator app
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Access to your email for account recovery
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          A secure place to store backup codes
                        </li>
                      </ul>
                    </div>
                    
                    <Button onClick={handleStartSetup} disabled={loading} className="w-full">
                      <Zap className="h-4 w-4 mr-2" />
                      Start Setup
                    </Button>
                  </div>
                ) : (
                  /* Setup Process */
                  <div className="space-y-6">
                    <Alert>
                      <Smartphone className="h-4 w-4" />
                      <AlertDescription>
                        Scan the QR code with your authenticator app, then enter the 6-digit code to complete setup.
                      </AlertDescription>
                    </Alert>
                    
                    {totpSetup && (
                      <div className="space-y-4">
                        {/* QR Code */}
                        <div className="text-center">
                          <div className="inline-block p-4 bg-white rounded-lg border">
                            <img 
                              src={totpSetup.qrCodeUrl} 
                              alt="TOTP QR Code" 
                              className="w-48 h-48"
                            />
                          </div>
                        </div>
                        
                        {/* Manual Entry */}
                        <div className="text-center space-y-2">
                          <p className="text-sm text-muted-foreground">Can't scan? Enter this code manually:</p>
                          <div className="flex items-center justify-center gap-2">
                            <code className="px-3 py-1 bg-gray-100 rounded text-sm font-mono">
                              {totpSetup.manualEntryKey}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(totpSetup.manualEntryKey);
                                toast.success('Code copied to clipboard');
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Verification */}
                        <div className="space-y-3">
                          <Label>Enter the 6-digit code from your authenticator app:</Label>
                          <div className="flex justify-center">
                            <InputOTP 
                              maxLength={6} 
                              value={verificationCode}
                              onChange={setVerificationCode}
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <Button 
                            onClick={handleCompleteSetup} 
                            disabled={loading || verificationCode.length !== 6}
                            className="flex-1"
                          >
                            {loading ? 'Verifying...' : 'Complete Setup'}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setSetupMode(false);
                              setTotpSetup(null);
                              setVerificationCode('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            /* Disable MFA */
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-semibold">Disable Two-Factor Authentication</h3>
                </div>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> Disabling 2FA will make your account less secure. 
                    You'll need to enter your current authenticator code to confirm.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-3">
                  <Label>Enter your current 6-digit authenticator code:</Label>
                  <div className="flex justify-center">
                    <InputOTP 
                      maxLength={6} 
                      value={disableCode}
                      onChange={setDisableCode}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                
                <Button 
                  variant="destructive"
                  onClick={handleDisableMFA}
                  disabled={loading || disableCode.length !== 6}
                  className="w-full"
                >
                  {loading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Key className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold">Backup Recovery Codes</h3>
              </div>
              
              {!isEnabled ? (
                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertDescription>
                    Backup codes are only available after you enable two-factor authentication.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertDescription>
                      Backup codes allow you to access your account if you lose your authenticator device. 
                      Each code can only be used once. You have <strong>{backupCodesCount}</strong> codes remaining.
                    </AlertDescription>
                  </Alert>
                  
                  {backupCodesCount < 3 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-orange-600">
                        You're running low on backup codes. Consider regenerating new ones.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex gap-3">
                    <Button onClick={handleRegenerateBackupCodes} disabled={loading}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate New Codes
                    </Button>
                  </div>
                  
                  {/* Show backup codes after generation */}
                  {(newBackupCodes || (showBackupCodes && totpSettings?.backupCodes)) && (
                    <Dialog open={!!(newBackupCodes || showBackupCodes)} onOpenChange={(open) => {
                      if (!open) {
                        setNewBackupCodes(null);
                        setShowBackupCodes(false);
                      }
                    }}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Your Backup Recovery Codes</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Important:</strong> Save these codes in a secure location. 
                              Each code can only be used once.
                            </AlertDescription>
                          </Alert>
                          
                          <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg font-mono text-sm">
                            {(newBackupCodes || totpSettings?.backupCodes || []).map((code, index) => (
                              <div key={index} className="text-center">
                                {index + 1}. {code}
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => copyBackupCodes(newBackupCodes || totpSettings?.backupCodes || [])}
                              className="flex-1"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Codes
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => downloadBackupCodes(newBackupCodes || totpSettings?.backupCodes || [])}
                              className="flex-1"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Help & FAQs</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">What is Two-Factor Authentication?</h4>
                  <p className="text-sm text-muted-foreground">
                    2FA adds an extra layer of security by requiring both your password and a code from your phone 
                    to sign in. Even if someone gets your password, they can't access your account without your phone.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Compatible Authenticator Apps</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Google Authenticator (iOS/Android)</li>
                    <li>• Authy (iOS/Android/Desktop)</li>
                    <li>• Microsoft Authenticator (iOS/Android)</li>
                    <li>• 1Password (with subscription)</li>
                    <li>• Any TOTP-compatible app</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">What if I lose my phone?</h4>
                  <p className="text-sm text-muted-foreground">
                    Use one of your backup recovery codes to sign in, then disable and re-enable 2FA with your new device. 
                    Keep backup codes in a secure location separate from your phone.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Need help?</h4>
                  <p className="text-sm text-muted-foreground">
                    Contact the administrator at{' '}
                    <a 
                      href="mailto:jerome@rotz.host?subject=MFA Support - ROTZ Image Generator" 
                      className="text-blue-600 underline"
                    >
                      jerome@rotz.host
                    </a>
                    {' '}for assistance with MFA issues.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};