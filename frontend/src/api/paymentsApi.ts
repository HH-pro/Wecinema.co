// api/marketplaceApi.ts
import paymentsApi from './paymentsApi';

// Your existing API imports
import listingsApi from './listingsApi';
import ordersApi from './ordersApi';
import offersApi from './offersApi';

const marketplaceApi = {
  // Existing APIs
  listings: listingsApi,
  orders: ordersApi,
  offers: offersApi,
  
  // New Payment APIs
  payments: paymentsApi,
  
  // Withdrawal APIs (also available through payments)
  withdrawals: {
    getHistory: paymentsApi.getWithdrawalHistory,
    request: paymentsApi.requestWithdrawal,
    getDetails: paymentsApi.getWithdrawalDetails,
    cancel: paymentsApi.cancelWithdrawal,
    getStats: paymentsApi.getWithdrawalStats
  },
  
  // Earnings APIs
  earnings: {
    getBalance: paymentsApi.getEarningsBalance,
    getMonthlySummary: paymentsApi.getMonthlyEarnings,
    getHistory: paymentsApi.getEarningsHistory,
    withdraw: paymentsApi.requestWithdrawal
  },
  
  // Utility functions
  formatCurrency: paymentsApi.formatCurrency
};

export default marketplaceApi;

// Also export individual APIs for specific imports
export { paymentsApi };