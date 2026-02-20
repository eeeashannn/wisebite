/**
 * Utility functions for date calculations and formatting
 */

export const getDaysRemaining = (expiryDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getStatus = (daysRemaining) => {
  if (daysRemaining < 0) {
    return { label: 'Expired', className: 'expired', urgency: 'high', iconKey: 'clock' };
  } else if (daysRemaining <= 3) {
    return { label: 'Expiring Soon', className: 'expiring-soon', urgency: 'medium', iconKey: 'warning' };
  } else {
    return { label: 'Fresh', className: 'fresh', urgency: 'low', iconKey: 'check' };
  }
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

export const sortItemsByExpiry = (items) => {
  return [...items].sort((a, b) => {
    const daysA = getDaysRemaining(a.expiry);
    const daysB = getDaysRemaining(b.expiry);
    return daysA - daysB;
  });
};

export const getExpiringItems = (items, daysThreshold = 3) => {
  return items
    .filter(item => {
      const daysRemaining = getDaysRemaining(item.expiry);
      return daysRemaining <= daysThreshold;
    })
    .sort((a, b) => {
      const daysA = getDaysRemaining(a.expiry);
      const daysB = getDaysRemaining(b.expiry);
      return daysA - daysB;
    });
};
