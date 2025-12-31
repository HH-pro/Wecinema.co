// src/config/environment.ts
export interface EnvironmentConfig {
  // API Configuration
  apiBaseUrl: string;
  
  // Stripe Configuration
  stripePublicKey: string;
  
  // App Configuration
  appName: string;
  appVersion: string;
  
  // Feature Flags
  features: {
    withdrawals: boolean;
    earningsDashboard: boolean;
    stripeConnect: boolean;
    realTimeUpdates: boolean;
  };
}

const environment: EnvironmentConfig = {
  // API Configuration
  apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:5173/api',
  
  // Stripe Configuration
  stripePublicKey: process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_51SKw7ZHYamYyPYbD45GeDrE3kWXpHl9roFeUAb3D5XajIMEnCh0z0GZ8zN6vw3U7J17tqsnC5V7NDC2w8PGX3pGE00qjfNJw26',
  
  // App Configuration
  appName: 'Marketplace',
  appVersion: '1.0.0',
  
  // Feature Flags
  features: {
    withdrawals: true,
    earningsDashboard: true,
    stripeConnect: true,
    realTimeUpdates: false
  }
};

export default environment;