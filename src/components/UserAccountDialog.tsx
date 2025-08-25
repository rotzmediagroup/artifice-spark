import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import {
  AlertTriangle,
  UserX,
  Trash2,
  RefreshCcw,
  Shield,
  Calendar,
} from 'lucide-react';
import { UserProfile } from '../hooks/useUserManagement';

interface UserAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSuspendUser: (userId: string, reason: string) => Promise<void>;
  onUnsuspendUser: (userId: string) => Promise<void>;
  onDeleteUser: (userId: string, reason: string) => Promise<void>;
  onReactivateUser: (userId: string) => Promise<void>;
  isLoading: boolean;
}

export const UserAccountDialog: React.FC<UserAccountDialogProps> = ({
  isOpen,
  onClose,
  user,
  onSuspendUser,
  onUnsuspendUser,
  onDeleteUser,
  onReactivateUser,
  isLoading,
}) => {
  const [action, setAction] = useState<'suspend' | 'delete' | null>(null);
  const [reason, setReason] = useState('');

  const handleAction = async () => {
    if (!user || !action || !reason.trim()) return;

    try {
      if (action === 'suspend') {
        await onSuspendUser(user.id, reason);
      } else if (action === 'delete') {
        await onDeleteUser(user.id, reason);
      }
      setAction(null);
      setReason('');
      onClose();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    }
  };

  const handleUnsuspend = async () => {
    if (!user) return;
    try {
      await onUnsuspendUser(user.id);
      onClose();
    } catch (error) {
      console.error('Failed to unsuspend user:', error);
    }
  };

  const handleReactivate = async () => {
    if (!user) return;
    try {
      await onReactivateUser(user.id);
      onClose();
    } catch (error) {
      console.error('Failed to reactivate user:', error);
    }
  };

  const getAccountStatusBadge = (user: UserProfile) => {
    if (user.deletedAt) {
      return <Badge variant="destructive">Deleted</Badge>;
    }
    if (user.isSuspended) {
      return <Badge variant="secondary">Suspended</Badge>;
    }
    if (!user.isActive) {
      return <Badge variant="outline">Inactive</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!user) return null;

  const isDeleted = !!user.deletedAt;
  const isSuspended = user.isSuspended;
  const isAdmin = user.role === 'admin';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Account Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Account Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <div>{getAccountStatusBadge(user)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Role:</span>
                <p className="font-medium capitalize">{user.role}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Credits</h4>
            <div className="flex gap-2">
              <Badge variant="outline">
                {user.imageCredits} image credits
              </Badge>
              <Badge variant="outline">
                {user.videoCredits} video credits
              </Badge>
            </div>
          </div>

          {(isSuspended || isDeleted) && (
            <div className="space-y-2">
              <h4 className="font-semibold">
                {isDeleted ? 'Deletion' : 'Suspension'} Details
              </h4>
              <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-muted-foreground">
                    {isDeleted ? 'Deleted' : 'Suspended'} at:
                  </span>
                  <span className="font-medium">
                    {formatDate(isDeleted ? user.deletedAt : user.suspendedAt)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">By:</span>
                  <span className="font-medium ml-1">
                    {isDeleted ? user.deletedBy : user.suspendedBy}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Reason:</span>
                  <p className="mt-1 font-medium">
                    {isDeleted ? user.deleteReason : user.suspensionReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {action && (
            <div className="space-y-2">
              <h4 className="font-semibold text-destructive">
                {action === 'suspend' ? 'Suspend' : 'Delete'} User
              </h4>
              <Textarea
                placeholder={`Enter reason for ${action}ing this user...`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleAction}
                  disabled={!reason.trim() || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    'Processing...'
                  ) : (
                    <>
                      {action === 'suspend' ? (
                        <UserX className="mr-2 h-4 w-4" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Confirm {action === 'suspend' ? 'Suspend' : 'Delete'}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setAction(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!action && (
            <div className="space-y-2">
              <h4 className="font-semibold">Actions</h4>
              
              {isAdmin && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Admin account - actions disabled for security
                    </span>
                  </div>
                </div>
              )}

              {!isAdmin && (
                <div className="grid gap-2">
                  {isDeleted ? (
                    <Button
                      variant="default"
                      onClick={handleReactivate}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Reactivate Account
                    </Button>
                  ) : isSuspended ? (
                    <Button
                      variant="default"
                      onClick={handleUnsuspend}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Unsuspend User
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setAction('suspend')}
                      className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Suspend User
                    </Button>
                  )}

                  {!isDeleted && (
                    <Button
                      variant="outline"
                      onClick={() => setAction('delete')}
                      className="w-full border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete User
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};