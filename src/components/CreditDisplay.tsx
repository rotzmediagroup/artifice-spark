import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Coins, AlertTriangle, Crown, Mail, Info } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { useAdmin } from '@/hooks/useAdmin';

interface CreditDisplayProps {
  showDetails?: boolean;
  variant?: 'badge' | 'card' | 'inline';
}

export const CreditDisplay: React.FC<CreditDisplayProps> = ({ 
  showDetails = false, 
  variant = 'badge' 
}) => {
  const { credits, loading, getCreditStatusMessage, isUnlimited } = useCredits();
  const { isAdmin } = useAdmin();

  if (loading) {
    return (
      <Badge variant="secondary">
        <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin mr-1"></div>
        Loading...
      </Badge>
    );
  }

  const getCreditColor = () => {
    if (isUnlimited) return 'bg-yellow-100 text-yellow-800';
    if (credits === 0) return 'bg-red-100 text-red-800';
    if (credits <= 5) return 'bg-orange-100 text-orange-800';
    if (credits <= 20) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const getIcon = () => {
    if (isUnlimited) return <Crown className="h-3 w-3" />;
    if (credits === 0) return <AlertTriangle className="h-3 w-3" />;
    return <Coins className="h-3 w-3" />;
  };

  // Badge variant (for user menu)
  if (variant === 'badge') {
    return (
      <Badge className={getCreditColor()}>
        {getIcon()}
        <span className="ml-1">
          {isUnlimited ? 'Unlimited' : `${credits} credits`}
        </span>
      </Badge>
    );
  }

  // Inline variant (for smaller spaces)
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-1 text-sm">
        {getIcon()}
        <span className={`font-medium ${credits === 0 ? 'text-red-600' : 'text-green-600'}`}>
          {isUnlimited ? 'Unlimited' : credits}
        </span>
        <span className="text-muted-foreground">
          {!isUnlimited && (credits === 1 ? 'credit' : 'credits')}
        </span>
      </div>
    );
  }

  // Card variant (detailed display)
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <Coins className="h-4 w-4" />
          Credit Balance
        </h4>
        {showDetails && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <CreditInfoDialog />
          </Dialog>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-2 rounded-lg ${getCreditColor()}`}>
            <div className="flex items-center gap-2">
              {getIcon()}
              <span className="font-bold text-lg">
                {isUnlimited ? 'Unlimited' : credits}
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {getCreditStatusMessage()}
            </p>
          </div>
        </div>

        {!isUnlimited && credits === 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">No credits available</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Contact the administrator to get credits for image generation.
            </p>
            <Button
              size="sm"
              className="mt-2 bg-red-600 hover:bg-red-700"
              onClick={() => window.open('mailto:jerome@rotz.host?subject=Credit Request - ROTZ Image Generator')}
            >
              <Mail className="h-3 w-3 mr-1" />
              Request Credits
            </Button>
          </div>
        )}

        {!isUnlimited && credits > 0 && credits <= 5 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Low credit balance</span>
            </div>
            <p className="text-sm text-orange-700 mt-1">
              You're running low on credits. Consider requesting more.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

const CreditInfoDialog: React.FC = () => {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>About Credits</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div>
          <h4 className="font-medium mb-2">How Credits Work:</h4>
          <ul className="space-y-1 text-muted-foreground">
            <li>• 1 credit = 1 image generation</li>
            <li>• Credits are deducted after successful generation</li>
            <li>• You need sufficient credits before generating</li>
            <li>• New users start with 0 credits</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium mb-2">Getting More Credits:</h4>
          <p className="text-muted-foreground">
            Only the administrator can grant credits. If you need more credits for image generation, 
            contact the admin team.
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-2">Credit Policy:</h4>
          <p className="text-muted-foreground">
            This service uses a credit system to manage usage responsibly and ensure fair access for all users.
          </p>
        </div>
      </div>
    </DialogContent>
  );
};