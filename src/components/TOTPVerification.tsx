import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Smartphone, 
  Key, 
  AlertTriangle, 
  HelpCircle,
  RefreshCw 
} from 'lucide-react';
import { useTOTP } from '@/hooks/useTOTP';
import { toast } from 'sonner';

interface TOTPVerificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

export const TOTPVerification: React.FC<TOTPVerificationProps> = ({
  open,
  onOpenChange,
  onSuccess,
  onCancel,
  title = "Two-Factor Authentication Required",
  description = "Please enter your authenticator code to continue"
}) => {
  const { verifyTOTP, verifyBackupCode, updateLastUsed, totpSettings } = useTOTP();
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('totp');
  const [attempts, setAttempts] = useState(0);

  const maxAttempts = 5;
  const isLocked = attempts >= maxAttempts;

  const handleTOTPVerification = async () => {
    if (!code || code.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    if (isLocked) {
      toast.error('Too many failed attempts. Please try again later.');
      return;
    }

    setLoading(true);
    try {
      const isValid = verifyTOTP(code);
      
      if (isValid) {
        await updateLastUsed();
        toast.success('Authentication successful');
        onSuccess();
        // Reset state
        setCode('');
        setAttempts(0);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= maxAttempts) {
          toast.error('Too many failed attempts. Please try again later or use a backup code.');
          setCurrentTab('backup');
        } else {
          toast.error(`Invalid code. ${maxAttempts - newAttempts} attempts remaining.`);
        }
        setCode('');
      }
    } catch (error) {
      console.error('TOTP verification error:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupCodeVerification = async () => {
    if (!backupCode || backupCode.length < 8) {
      toast.error('Please enter a valid backup code');
      return;
    }

    setLoading(true);
    try {
      const isValid = await verifyBackupCode(backupCode);
      
      if (isValid) {
        toast.success('Backup code accepted');
        onSuccess();
        // Reset state
        setBackupCode('');
        setAttempts(0);
      } else {
        toast.error('Invalid backup code');
        setBackupCode('');
      }
    } catch (error) {
      console.error('Backup code verification error:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCode('');
    setBackupCode('');
    setAttempts(0);
    setCurrentTab('totp');
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    setCode('');
    setBackupCode('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {description && (
            <p className="text-sm text-muted-foreground text-center">{description}</p>
          )}

          {isLocked && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Too many failed attempts with authenticator codes. Please use a backup code or try again later.
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="totp" disabled={isLocked}>
                <Smartphone className="h-4 w-4 mr-2" />
                Authenticator
              </TabsTrigger>
              <TabsTrigger value="backup">
                <Key className="h-4 w-4 mr-2" />
                Backup Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="totp" className="space-y-4">
              <div className="space-y-3">
                <Label className="text-center block">
                  Enter the 6-digit code from your authenticator app:
                </Label>
                <div className="flex justify-center">
                  <InputOTP 
                    maxLength={6} 
                    value={code}
                    onChange={setCode}
                    disabled={loading || isLocked}
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
                
                {attempts > 0 && !isLocked && (
                  <p className="text-sm text-center text-orange-600">
                    {maxAttempts - attempts} attempts remaining
                  </p>
                )}
                
                <div className="text-center text-xs text-muted-foreground">
                  <p>The code refreshes every 30 seconds</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleTOTPVerification}
                  disabled={loading || code.length !== 6 || isLocked}
                  className="flex-1"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Verifying...
                    </div>
                  ) : (
                    'Verify Code'
                  )}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="backup" className="space-y-4">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  Enter one of your backup recovery codes. Each code can only be used once.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <Label>Backup Recovery Code:</Label>
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="Enter 8-character code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-center font-mono tracking-wider"
                  maxLength={8}
                  disabled={loading}
                />
                
                <div className="text-center text-xs text-muted-foreground">
                  <p>Example: ABC12345</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleBackupCodeVerification}
                  disabled={loading || backupCode.length < 8}
                  className="flex-1"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Verifying...
                    </div>
                  ) : (
                    'Use Backup Code'
                  )}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <HelpCircle className="h-3 w-3" />
              <span>
                Having trouble?{' '}
                <a 
                  href="mailto:jerome@rotz.host?subject=MFA Help - ROTZ Image Generator" 
                  className="text-blue-600 underline"
                >
                  Contact support
                </a>
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};