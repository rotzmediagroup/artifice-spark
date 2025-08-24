export const getDaysUntilExpiration = (expiresAt: Date): number => {
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getExpirationStatus = (expiresAt: Date): {
  daysRemaining: number;
  status: 'expired' | 'critical' | 'warning' | 'safe';
  color: string;
  message: string;
} => {
  const daysRemaining = getDaysUntilExpiration(expiresAt);
  
  if (daysRemaining <= 0) {
    return {
      daysRemaining: 0,
      status: 'expired',
      color: 'text-red-500',
      message: 'Expired - Will be deleted soon',
    };
  } else if (daysRemaining <= 3) {
    return {
      daysRemaining,
      status: 'critical',
      color: 'text-red-500',
      message: `Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
    };
  } else if (daysRemaining <= 7) {
    return {
      daysRemaining,
      status: 'warning',
      color: 'text-amber-500',
      message: `Expires in ${daysRemaining} days`,
    };
  } else {
    return {
      daysRemaining,
      status: 'safe',
      color: 'text-gray-500',
      message: `Expires in ${daysRemaining} days`,
    };
  }
};

export const formatExpirationDate = (expiresAt: Date): string => {
  return expiresAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};