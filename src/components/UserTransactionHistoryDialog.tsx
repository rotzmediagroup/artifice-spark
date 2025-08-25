import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  History,
  Plus,
  Minus,
  Activity,
  Crown,
  UserX,
  Trash2,
  RefreshCcw,
  Image as ImageIcon,
  Video,
  Calendar
} from 'lucide-react';
import { CreditTransaction } from '../hooks/useUserManagement';

interface UserTransactionHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  transactions: CreditTransaction[];
  loading: boolean;
}

export const UserTransactionHistoryDialog: React.FC<UserTransactionHistoryDialogProps> = ({
  isOpen,
  onClose,
  userEmail,
  transactions,
  loading,
}) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'grant':
        return <Plus className="h-4 w-4" />;
      case 'deduct':
        return <Minus className="h-4 w-4" />;
      case 'used':
        return <Activity className="h-4 w-4" />;
      case 'suspend':
        return <UserX className="h-4 w-4" />;
      case 'unsuspend':
        return <RefreshCcw className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      case 'reactivate':
        return <RefreshCcw className="h-4 w-4" />;
      case 'adjustment':
        return <Crown className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'grant':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'deduct':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'used':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'suspend':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unsuspend':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'reactivate':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'adjustment':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCreditTypeIcon = (creditType?: string) => {
    if (creditType === 'image') {
      return <ImageIcon className="h-3 w-3 text-blue-600" />;
    }
    if (creditType === 'video') {
      return <Video className="h-3 w-3 text-purple-600" />;
    }
    return null;
  };

  const getCreditTypeLabel = (creditType?: string) => {
    if (creditType === 'image') return 'Image';
    if (creditType === 'video') return 'Video';
    return 'Legacy';
  };

  const isAccountAction = (type: string) => {
    return ['suspend', 'unsuspend', 'delete', 'reactivate'].includes(type);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History - {userEmail}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
              <span className="ml-2 text-muted-foreground">Loading transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg mb-2">No Transaction History</h3>
              <p className="text-muted-foreground">
                This user hasn't had any credit transactions yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border rounded-lg p-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={`${getTransactionColor(transaction.type)} border`}>
                        {getTransactionIcon(transaction.type)}
                        <span className="ml-1 font-medium">
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                      </Badge>
                      
                      {transaction.creditType && (
                        <Badge variant="outline" className="text-xs">
                          {getCreditTypeIcon(transaction.creditType)}
                          <span className="ml-1">{getCreditTypeLabel(transaction.creditType)}</span>
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(transaction.timestamp)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {!isAccountAction(transaction.type) && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Credit Change:</span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            {transaction.previousBalance} → {transaction.newBalance}
                          </span>
                          <span className={`font-medium ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="text-sm">
                      <span className="text-muted-foreground">Reason:</span>
                      <span className="ml-2 font-medium">{transaction.reason}</span>
                    </div>

                    {transaction.adminUserId && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Admin:</span>
                        <span className="ml-2 font-medium">{transaction.adminUserId}</span>
                      </div>
                    )}

                    {transaction.type === 'used' && !transaction.adminUserId && (
                      <div className="text-xs text-muted-foreground italic">
                        User-initiated action
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {!loading && transactions.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Showing {transactions.length} most recent transactions</span>
              <span>Total transactions loaded</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};