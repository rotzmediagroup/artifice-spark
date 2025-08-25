import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Coins, AlertTriangle, Crown, Mail, Info, Image as ImageIcon, Video } from 'lucide-react';
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
  const { imageCredits, videoCredits, loading, getCreditStatusMessage, isUnlimited } = useCredits();
  const { isAdmin } = useAdmin();
  
  const totalCredits = imageCredits + videoCredits;

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
    if (totalCredits === 0) return 'bg-red-100 text-red-800';
    if (totalCredits <= 5) return 'bg-orange-100 text-orange-800';
    if (totalCredits <= 20) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const getIcon = () => {
    if (isUnlimited) return <Crown className="h-3 w-3" />;
    if (totalCredits === 0) return <AlertTriangle className="h-3 w-3" />;
    return <Coins className="h-3 w-3" />;
  };

  // Badge variant (for user menu)
  if (variant === 'badge') {
    return (
      <div className="flex gap-1">
        <Badge className="bg-blue-100 text-blue-800">
          <ImageIcon className="h-3 w-3" />
          <span className="ml-1">
            {isUnlimited ? '∞' : imageCredits} img
          </span>
        </Badge>
        <Badge className="bg-purple-100 text-purple-800">
          <Video className="h-3 w-3" />
          <span className="ml-1">
            {isUnlimited ? '∞' : videoCredits} vid
          </span>
        </Badge>
      </div>
    );
  }

  // Inline variant (for smaller spaces)
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <ImageIcon className="h-3 w-3 text-blue-600" />
          <span className={`font-medium ${imageCredits === 0 ? 'text-red-600' : 'text-green-600'}`}>
            {isUnlimited ? '∞' : imageCredits}
          </span>
          <span className="text-muted-foreground">img</span>
        </div>
        <div className="flex items-center gap-1">
          <Video className="h-3 w-3 text-purple-600" />
          <span className={`font-medium ${videoCredits === 0 ? 'text-red-600' : 'text-green-600'}`}>
            {isUnlimited ? '∞' : videoCredits}
          </span>
          <span className="text-muted-foreground">vid</span>
        </div>
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

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Image Credits */}
          <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <ImageIcon className="h-4 w-4 text-blue-600" />
              <span className="font-bold text-lg text-blue-800">
                {isUnlimited ? '∞' : imageCredits}
              </span>
            </div>
            <p className="text-xs text-blue-600">Image Credits</p>
          </div>
          
          {/* Video Credits */}
          <div className="px-3 py-2 rounded-lg bg-purple-50 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Video className="h-4 w-4 text-purple-600" />
              <span className="font-bold text-lg text-purple-800">
                {isUnlimited ? '∞' : videoCredits}
              </span>
            </div>
            <p className="text-xs text-purple-600">Video Credits</p>
          </div>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">
            {getCreditStatusMessage()}
          </p>
        </div>
        
        {/* Credit alerts */}
        {!isUnlimited && totalCredits === 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">No credits available</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Contact the administrator to get credits for image or video generation.
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

        {!isUnlimited && totalCredits > 0 && totalCredits <= 5 && (
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
            <li>• 1 image credit = 1 image generation</li>
            <li>• 1 video credit = 1 video generation</li>
            <li>• Credits are deducted after successful generation</li>
            <li>• You need sufficient credits before generating</li>
            <li>• New users start with 0 credits</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium mb-2">Getting More Credits:</h4>
          <p className="text-muted-foreground">
            Only the administrator can grant image or video credits. If you need more credits for generation, 
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