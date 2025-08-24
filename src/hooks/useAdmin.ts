import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const SUPER_ADMIN_EMAIL = 'jerome@rotz.host';

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Check if the current user is the super admin
    const adminStatus = user.email === SUPER_ADMIN_EMAIL;
    setIsAdmin(adminStatus);
    setLoading(false);

    // Log admin access for security monitoring
    if (adminStatus) {
      console.log(`[ADMIN ACCESS] Super admin ${user.email} logged in at ${new Date().toISOString()}`);
    }
  }, [user]);

  // Security helper - always double-check admin status
  const verifyAdminAccess = (): boolean => {
    if (!user || !isAdmin) {
      console.warn('[SECURITY] Unauthorized admin access attempt');
      return false;
    }
    
    if (user.email !== SUPER_ADMIN_EMAIL) {
      console.error(`[SECURITY] Invalid admin access attempt by ${user.email}`);
      return false;
    }
    
    return true;
  };

  return {
    isAdmin,
    loading,
    verifyAdminAccess,
    adminEmail: SUPER_ADMIN_EMAIL,
    currentUserEmail: user?.email || null
  };
};