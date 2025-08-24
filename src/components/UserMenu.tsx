import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { User, LogOut, Upload, Settings, Crown, Coins, Shield } from "lucide-react";
import AuthModal from "./AuthModal";
import { CreditDisplay } from "./CreditDisplay";
import { AdminPanel } from "./AdminPanel";
import { MFASettings } from "./MFASettings";
import { useAdmin } from "@/hooks/useAdmin";
import { useCredits } from "@/hooks/useCredits";
import { useTOTP } from "@/hooks/useTOTP";

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { credits } = useCredits();
  const { isEnabled: mfaEnabled } = useTOTP();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [securityPanelOpen, setSecurityPanelOpen] = useState(false);

  if (!user) {
    return (
      <>
        <Button 
          onClick={() => setAuthModalOpen(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <User className="h-4 w-4 mr-2" />
          Sign In
        </Button>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL || ""} alt={user.displayName || ""} />
              <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                {getInitials(user.displayName || user.email || "U")}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.displayName || "User"}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Credit Display */}
          <div className="px-2 py-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Credits</span>
              <CreditDisplay variant="badge" />
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Admin Panel Access */}
          {isAdmin && (
            <>
              <DropdownMenuItem onClick={() => setAdminPanelOpen(true)}>
                <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                <span>Admin Panel</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          <DropdownMenuItem onClick={() => setSecurityPanelOpen(true)}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Security</span>
            {mfaEnabled && (
              <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                2FA
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Upload className="mr-2 h-4 w-4" />
            <span>Export Data</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Admin Panel Dialog */}
      <Dialog open={adminPanelOpen} onOpenChange={setAdminPanelOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              Super Admin Panel
            </DialogTitle>
          </DialogHeader>
          <AdminPanel />
        </DialogContent>
      </Dialog>

      {/* Security Settings Dialog */}
      <Dialog open={securityPanelOpen} onOpenChange={setSecurityPanelOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <MFASettings />
        </DialogContent>
      </Dialog>
    </>
  );
}