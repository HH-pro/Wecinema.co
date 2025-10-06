import React, { createContext, useContext, useState, useEffect } from 'react';

// Create context
const AuthContext = createContext();

// Global auth instance
let authInstance = null;

// Auth service class
class AuthService {
  constructor() {
    this.listeners = new Set();
    this.user = null;
    this.loading = true;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;
    
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        this.user = JSON.parse(userData);
        this.token = token;
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
      loading: this.loading,
      isAuthenticated: !!this.user
    };
  }

  login(userData, token) {
    this.user = userData;
    this.token = token;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    this.notifyListeners();
  }

  logout() {
    this.clearAuth();
    this.notifyListeners();
  }

  clearAuth() {
    this.user = null;
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken() {
    return this.token;
  }

  isAuthenticated() {
    return !!this.user;
  }

  getUserId() {
    return this.user?._id || this.user?.id;
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
    authInstance.login(userData, token);
  };

  const logout = () => {
    authInstance.logout();
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

  return {
    ...state,
    login,
    logout,
    getToken,
    isAuthenticated,
    getUserId
  };
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
  // Initialize auth system (call this once at app startup)
  initialize: () => authInstance?.initialize()
};

export default AuthContext;