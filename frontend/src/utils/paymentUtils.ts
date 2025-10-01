// Payment utility functions

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const calculatePlatformFee = (amount: number, feePercentage: number = 0.15): {
  platformFee: number;
  sellerAmount: number;
  total: number;
} => {
  const platformFee = Math.round(amount * feePercentage * 100) / 100;
  const sellerAmount = Math.round((amount - platformFee) * 100) / 100;
  
  return {
    platformFee,
    sellerAmount,
    total: amount
  };
};

export const validatePaymentAmount = (amount: number): { valid: boolean; message?: string } => {
  if (amount <= 0) {
    return { valid: false, message: 'Amount must be greater than 0' };
  }
  
  if (amount > 100000) { // $10,000 limit
    return { valid: false, message: 'Amount exceeds maximum limit' };
  }
  
  if (!Number.isFinite(amount)) {
    return { valid: false, message: 'Invalid amount' };
  }
  
  return { valid: true };
};

export const getPaymentStatusDescription = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    pending_payment: 'Waiting for payment confirmation',
    paid: 'Payment received - funds in escrow',
    in_progress: 'Seller working on your order',
    delivered: 'Work delivered - review and accept',
    completed: 'Order completed - funds released to seller',
    cancelled: 'Order cancelled',
    disputed: 'Dispute raised - under review'
  };
  
  return statusMap[status] || 'Unknown status';
};

export const getExpectedPayoutDate = (deliveryDate: string): Date => {
  const delivery = new Date(deliveryDate);
  // Payout 3 days after delivery for buyer review period
  const payoutDate = new Date(delivery);
  payoutDate.setDate(payoutDate.getDate() + 3);
  return payoutDate;
};

export const isRefundable = (status: string, orderDate: string): boolean => {
  const nonRefundableStatuses = ['completed', 'cancelled', 'disputed'];
  if (nonRefundableStatuses.includes(status)) return false;
  
  // Check if order is within refund period (7 days)
  const order = new Date(orderDate);
  const now = new Date();
  const daysDiff = (now.getTime() - order.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysDiff <= 7;
};

// Card validation
export const validateCardNumber = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  return /^\d{13,19}$/.test(cleanNumber);
};

export const validateExpiryDate = (expiry: string): boolean => {
  const [month, year] = expiry.split('/');
  if (!month || !year) return false;
  
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  
  const expMonth = parseInt(month, 10);
  const expYear = parseInt(year, 10);
  
  if (expMonth < 1 || expMonth > 12) return false;
  if (expYear < currentYear) return false;
  if (expYear === currentYear && expMonth < currentMonth) return false;
  
  return true;
};

export const validateCVV = (cvv: string): boolean => {
  return /^\d{3,4}$/.test(cvv);
};

// Security functions
export const maskCardNumber = (cardNumber: string): string => {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  const lastFour = cleanNumber.slice(-4);
  return `•••• •••• •••• ${lastFour}`;
};

export const generateTransactionId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `txn_${timestamp}_${random}`.toUpperCase();
};

// Currency conversion (simplified)
export const convertCurrency = async (
  amount: number, 
  fromCurrency: string, 
  toCurrency: string
): Promise<number> => {
  // In a real app, you'd call a currency conversion API
  // For now, return the same amount (assuming same currency)
  return amount;
};