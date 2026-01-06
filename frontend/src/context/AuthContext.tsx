import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Create context
const AuthContext = createContext();

// Global auth instance
let authInstance = null;

// Auth service class
class AuthService {
  constructor() {
    this.listeners = new Set();
    this.user = null;
    this.token = null;
    this.loading = true;
    this.initialized = false;
    this.hasPaid = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    this.token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const storedHasPaid = localStorage.getItem('hasPaid');
    
    if (this.token && userData) {
      try {
        this.user = JSON.parse(userData);
        this.hasPaid = storedHasPaid === 'true';
        
        // Verify token and payment status with backend
        await this.verifyTokenAndPayment();
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.clearAuth();
      }
    }
    
    this.loading = false;
    this.initialized = true;
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  getState() {
    return {
      user: this.user,
      token: this.token,
      loading: this.loading,
      isAuthenticated: !!this.user,
      hasPaid: this.hasPaid,
      userId: this.user?._id || this.user?.id
    };
  }

  login(userData, token) {
    this.user = userData;
    this.token = token;
    this.hasPaid = userData.hasPaid || false;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('hasPaid', this.hasPaid.toString());
    
    this.notifyListeners();
    return this.user;
  }

  async loginWithToken(token) {
    try {
      // Decode token to get user ID
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      const userId = payload.userId || payload.id;
      
      if (!userId) {
        throw new Error('Invalid token: No user ID found');
      }

      // Get user data from backend
      const response = await axios.get(`${API_BASE_URL}/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        return this.login(response.data, token);
      }
    } catch (error) {
      console.error('Error logging in with token:', error);
      this.clearAuth();
      throw error;
    }
  }

  logout() {
    this.clearAuth();
    this.notifyListeners();
  }

  clearAuth() {
    this.user = null;
    this.token = null;
    this.hasPaid = false;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('hasPaid');
  }

  setPaymentStatus(hasPaid) {
    this.hasPaid = hasPaid;
    localStorage.setItem('hasPaid', hasPaid.toString());
    
    // Update user object
    if (this.user) {
      this.user.hasPaid = hasPaid;
      localStorage.setItem('user', JSON.stringify(this.user));
    }
    
    this.notifyListeners();
  }

  async verifyTokenAndPayment() {
    if (!this.token || !this.user) return false;
    
    try {
      const userId = this.user._id || this.user.id;
      if (!userId) {
        this.clearAuth();
        return false;
      }

      const response = await axios.get(`${API_BASE_URL}/user/${userId}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      if (response.data) {
        this.user = response.data;
        this.hasPaid = response.data.hasPaid || false;
        localStorage.setItem('user', JSON.stringify(this.user));
        localStorage.setItem('hasPaid', this.hasPaid.toString());
        this.notifyListeners();
        return true;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      // If token is invalid, clear auth
      if (error.response?.status === 401) {
        this.clearAuth();
      }
      return false;
    }
  }

  getToken() {
    return this.token;
  }

  isAuthenticated() {
    return !!this.user && !!this.token;
  }

  getUserId() {
    return this.user?._id || this.user?.id;
  }

  getUserType() {
    return this.user?.userType;
  }

  getPaymentStatus() {
    return this.hasPaid;
  }

  async refreshUserData() {
    if (!this.isAuthenticated()) return null;
    
    try {
      const userId = this.getUserId();
      const response = await axios.get(`${API_BASE_URL}/user/${userId}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      if (response.data) {
        this.user = response.data;
        this.hasPaid = response.data.hasPaid || false;
        localStorage.setItem('user', JSON.stringify(this.user));
        localStorage.setItem('hasPaid', this.hasPaid.toString());
        this.notifyListeners();
        return this.user;
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
    }
  }
}

// Create singleton instance
authInstance = new AuthService();

// React Hook
export const useAuth = () => {
  const [state, setState] = useState(authInstance.getState());

  useEffect(() => {
    // Initialize auth on first use
    authInstance.initialize();
    
    // Subscribe to auth changes
    const unsubscribe = authInstance.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const login = (userData, token) => {
    return authInstance.login(userData, token);
  };

  const loginWithToken = async (token) => {
    return await authInstance.loginWithToken(token);
  };

  const logout = () => {
    authInstance.logout();
  };

  const setPaymentStatus = (hasPaid) => {
    authInstance.setPaymentStatus(hasPaid);
  };

  const getToken = () => {
    return authInstance.getToken();
  };

  const isAuthenticated = () => {
    return authInstance.isAuthenticated();
  };

  const getUserId = () => {
    return authInstance.getUserId();
  };

  const getUserType = () => {
    return authInstance.getUserType();
  };

  const getPaymentStatus = () => {
    return authInstance.getPaymentStatus();
  };

  const refreshUserData = async () => {
    return await authInstance.refreshUserData();
  };

  const verifyTokenAndPayment = async () => {
    return await authInstance.verifyTokenAndPayment();
  };

  return {
    ...state,
    login,
    loginWithToken,
    logout,
    setPaymentStatus,
    getToken,
    isAuthenticated,
    getUserId,
    getUserType,
    getPaymentStatus,
    refreshUserData,
    verifyTokenAndPayment
  };
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const auth = useAuth();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

// Higher Order Component (alternative approach)
export const withAuth = (Component) => {
  return function AuthComponent(props) {
    const auth = useAuth();
    return <Component {...props} auth={auth} />;
  };
};

// Export the auth instance for direct use outside React components
export const auth = {
  getToken: () => authInstance?.getToken(),
  isAuthenticated: () => authInstance?.isAuthenticated(),
  getUserId: () => authInstance?.getUserId(),
  getUser: () => authInstance?.user,
  getPaymentStatus: () => authInstance?.getPaymentStatus(),
  setPaymentStatus: (hasPaid) => authInstance?.setPaymentStatus(hasPaid),
  logout: () => authInstance?.logout(),
  
  // Initialize auth system (call this once at app startup)
  initialize: () => authInstance?.initialize(),
  
  // Refresh user data from backend
  refreshUserData: async () => await authInstance?.refreshUserData(),
  
  // Login with token
  loginWithToken: async (token) => await authInstance?.loginWithToken(token)
};

// Custom hook to use auth context
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;