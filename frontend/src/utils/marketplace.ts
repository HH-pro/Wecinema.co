// utils/formatters.ts
export const formatCurrency = (amountInCents: number): string => {
  // Convert cents to dollars
  const dollars = amountInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dollars);
};

// Or for other currencies:
export const formatCurrencyForCurrency = (
  amountInSmallestUnit: number, 
  currency: string = 'USD'
): string => {
  const divisor = currency === 'USD' ? 100 : 1; // Adjust for other currencies
  const amount = amountInSmallestUnit / divisor;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};