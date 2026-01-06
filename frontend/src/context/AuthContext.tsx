import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  user: any | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasPaid: boolean;
  userId: string | null;
  login: (userData: any, token: string) => void;
  logout: () => void;
  setPaymentStatus: (hasPaid: boolean) => void;
  verifyTokenAndPayment: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,
    token: null,
    loading: true,
    isAuthenticated: false,
    hasPaid: false,
    userId: null
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const storedHasPaid = localStorage.getItem('hasPaid');

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        const hasPaid = storedHasPaid === 'true';
        
        setAuthState({
          user,
          token,
          loading: false,
          isAuthenticated: true,
          hasPaid,
          userId: user._id || user.id
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
      }
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const login = (userData: any, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('hasPaid', String(userData.hasPaid || false));

    setAuthState({
      user: userData,
      token,
      loading: false,
      isAuthenticated: true,
      hasPaid: userData.hasPaid || false,
      userId: userData._id || userData.id || null
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('hasPaid');
    
    setAuthState({
      user: null,
      token: null,
      loading: false,
      isAuthenticated: false,
      hasPaid: false,
      userId: null
    });
  };

  const setPaymentStatus = (hasPaid: boolean) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, hasPaid };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('hasPaid', String(hasPaid));
      
      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
        hasPaid
      }));
    }
  };

  const verifyTokenAndPayment = async (): Promise<boolean> => {
    // Implementation for token verification
    return true;
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    setPaymentStatus,
    verifyTokenAndPayment
  };

  if (authState.loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;