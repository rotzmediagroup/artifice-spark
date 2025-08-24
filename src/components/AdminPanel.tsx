import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Plus, 
  Minus, 
  Settings, 
  Activity, 
  Crown,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Search,
  History
} from 'lucide-react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';

interface CreditActionDialogProps {
  userId: string;
  userEmail: string;
  currentCredits: number;
  onClose: () => void;
}

const CreditActionDialog: React.FC<CreditActionDialogProps> = ({ 
  userId, 
  userEmail, 
  currentCredits, 
  onClose 
}) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<'grant' | 'deduct' | 'set'>('grant');
  const [loading, setLoading] = useState(false);
  const { grantCredits, deductCredits, setCredits } = useUserManagement();

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    setLoading(true);
    try {
      let success = false;
      const numAmount = Number(amount);

      switch (action) {
        case 'grant':
          success = await grantCredits(userId, numAmount, reason);
          break;
        case 'deduct':
          success = await deductCredits(userId, numAmount, reason);
          break;
        case 'set':
          success = await setCredits(userId, numAmount, reason);
          break;
      }

      if (success) {
        setAmount('');
        setReason('');
        onClose();
      }
    } catch (error) {
      console.error('Credit action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Manage Credits - {userEmail}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Current Credits: {currentCredits}</Label>
        </div>
        
        <div>
          <Label htmlFor="action">Action</Label>
          <div className="flex gap-2 mt-2">
            <Button
              variant={action === 'grant' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAction('grant')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Grant
            </Button>
            <Button
              variant={action === 'deduct' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAction('deduct')}
            >
              <Minus className="h-4 w-4 mr-2" />
              Deduct
            </Button>
            <Button
              variant={action === 'set' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAction('set')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Set
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter credit amount"
          />
        </div>

        <div>
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for credit adjustment"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? 'Processing...' : `${action.charAt(0).toUpperCase() + action.slice(1)} Credits`}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </DialogContent>
  );
};

export const AdminPanel: React.FC = () => {
  const { isAdmin } = useAdmin();
  const { users, loading, recentTransactions, getSystemStats, getUserTransactions } = useUserManagement();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userTransactions, setUserTransactions] = useState<CreditTransaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  const stats = getSystemStats();
  
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewTransactions = async (userId: string) => {
    setSelectedUserId(userId);
    const transactions = await getUserTransactions(userId);
    setUserTransactions(transactions);
    setShowTransactions(true);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'grant': return 'bg-green-100 text-green-800';
      case 'deduct': return 'bg-red-100 text-red-800';
      case 'used': return 'bg-blue-100 text-blue-800';
      case 'adjustment': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Admin Header */}
      <div className="flex items-center gap-3 mb-6">
        <Crown className="h-8 w-8 text-yellow-500" />
        <div>
          <h1 className="text-3xl font-bold">Super Admin Panel</h1>
          <p className="text-muted-foreground">Credit & User Management System</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.totalCreditsInCirculation}</p>
              <p className="text-sm text-muted-foreground">Credits in Circulation</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{stats.activeUsers}</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{stats.usersWithoutCredits}</p>
              <p className="text-sm text-muted-foreground">Users Need Credits</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="stats">System Statistics</TabsTrigger>
          <TabsTrigger value="security">Security & MFA</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Search users by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Users Table */}
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">User Management</h3>
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading users...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">User</th>
                        <th className="text-left p-2">Credits</th>
                        <th className="text-left p-2">Total Used</th>
                        <th className="text-left p-2">MFA Status</th>
                        <th className="text-left p-2">Last Login</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{user.displayName || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              {user.isAdmin && (
                                <Badge variant="secondary" className="mt-1">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge 
                              variant={user.credits > 0 ? "default" : "destructive"}
                            >
                              {user.isAdmin ? "Unlimited" : `${user.credits} credits`}
                            </Badge>
                          </td>
                          <td className="p-2">
                            {user.totalCreditsUsed || 0}
                          </td>
                          <td className="p-2">
                            <Badge variant={user.mfaEnabled ? "default" : "secondary"}>
                              {user.mfaEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {formatDate(user.lastLogin)}
                          </td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              {!user.isAdmin && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Settings className="h-4 w-4 mr-1" />
                                      Manage
                                    </Button>
                                  </DialogTrigger>
                                  <CreditActionDialog
                                    userId={user.id}
                                    userEmail={user.email}
                                    currentCredits={user.credits}
                                    onClose={() => {}}
                                  />
                                </Dialog>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewTransactions(user.id)}
                              >
                                <History className="h-4 w-4 mr-1" />
                                History
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="space-y-2">
              {recentTransactions.slice(0, 20).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Badge className={getActionColor(transaction.type)}>
                      {transaction.type}
                    </Badge>
                    <div>
                      <p className="font-medium">
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.reason}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {formatDate(transaction.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">System Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Credits Granted</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalCreditsGranted}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Credits Used</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalCreditsUsed}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Credits Remaining</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalCreditsGranted - stats.totalCreditsUsed}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Usage Rate</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.totalCreditsGranted > 0 
                    ? Math.round((stats.totalCreditsUsed / stats.totalCreditsGranted) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Multi-Factor Authentication Overview</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-5 w-5 text-blue-500" />
                    <h4 className="font-medium">Total Users</h4>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-5 w-5 text-green-500" />
                    <h4 className="font-medium">MFA Enabled</h4>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {users.filter(u => u.mfaEnabled).length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {Math.round((users.filter(u => u.mfaEnabled).length / stats.totalUsers) * 100)}% of users
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <h4 className="font-medium">MFA Disabled</h4>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {users.filter(u => !u.mfaEnabled && !u.isAdmin).length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Regular users without MFA
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-3">MFA Security Recommendations</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                    <Crown className="h-4 w-4 text-green-600" />
                    <span>Encourage users to enable MFA for enhanced security</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                    <Settings className="h-4 w-4 text-blue-600" />
                    <span>Admins have unlimited access regardless of MFA status</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span>Monitor for unusual login patterns</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Admin Note</h4>
                <p className="text-sm text-yellow-700">
                  As a super admin, you can access all user accounts and manage MFA settings. 
                  Users can enable/disable their own MFA through the Security settings in their user menu. 
                  MFA uses TOTP (Time-based One-Time Password) compatible with Google Authenticator and other authenticator apps.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};