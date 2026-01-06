import { useState, useEffect } from "react";
import axios from 'axios';
import { Layout } from "../components";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleProvider } from "../firebase/config";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import styled from 'styled-components';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "../css/HypeModeProfile.css";
import { API_BASE_URL } from "../api";

// Import new components
import PaymentComponent from "../../src/components/PaymentComponent/Payment";
import SuccessPopup from "../../src/components/PaymentComponent/SuccessPopup";

// Import AuthContext
import { useAuthContext } from "../../src/context/AuthContext";

// Loading Spinner Component
const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  text-align: center;

  .spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #fbbf24;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Popup Styled Components
const PopupOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const PopupContent = styled.div`
  background: white;
  padding: 30px;
  border-radius: 20px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
`;

const DebugInfo = styled.div`
  margin-top: 20px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
  text-align: left;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
  
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
`;

// User interface
interface User {
  _id?: string;
  id?: string;
  username: string;
  email: string;
  userType: string;
  hasPaid: boolean;
  avatar?: string;
}

// Main HypeModeProfile Component
const HypeModeProfile = () => {
  const navigate = useNavigate();
  const auth = useAuthContext();
  
  const [popupMessage, setPopupMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showFireworks, setShowFireworks] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<"user" | "studio" | null>(null);
  const [userType, setUserType] = useState<"buyer" | "seller">("buyer");
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentComponent, setShowPaymentComponent] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Debug logging function
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setDebugInfo(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]);
    console.log(message);
  };

  // Check if user is already authenticated and paid
  useEffect(() => {
    if (auth.isAuthenticated && auth.hasPaid && !auth.loading) {
      addDebugLog('User already authenticated and paid, redirecting...');
      setLoginSuccess(true);
    } else if (auth.isAuthenticated && !auth.hasPaid && auth.userId && !auth.loading) {
      addDebugLog('User authenticated but not paid, showing payment...');
      setShowPaymentComponent(true);
    }
  }, [auth.isAuthenticated, auth.hasPaid, auth.userId, auth.loading]);

  // Handle redirect after login success
  useEffect(() => {
    if (loginSuccess) {
      addDebugLog('Login success, starting countdown...');
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [loginSuccess, navigate]);

  // Register user with backend
  const registerUser = async (username: string, email: string, avatar: string, userType: string) => {
    addDebugLog(`Attempting to register user: ${email} (${userType})`);
    
    try {
      const res = await axios.post(`${API_BASE_URL}/user/signup`, {
        username,
        email,
        avatar,
        userType,
        dob: "--------"
      });

      addDebugLog(`Backend registration response received: ${res.status}`);
      
      const token = res.data.token;
      const userId = res.data.id;

      if (token && userId) {
        addDebugLog(`Registration successful! Token: ${token.substring(0, 20)}..., UserID: ${userId}`);
        
        // Use AuthContext to login
        const userData: User = {
          id: userId,
          username,
          email,
          userType,
          hasPaid: res.data.hasPaid || false,
          avatar
        };
        
        auth.login(userData, token);
        return { success: true, userId, hasPaid: res.data.hasPaid || false };
      } else {
        addDebugLog('Registration failed: No token or user ID in response');
        return { success: false };
      }
    } catch (error: any) {
      addDebugLog(`Registration error: ${error.message}`);
      
      if (error.response?.data?.error === 'Email already exists.') {
        setPopupMessage('Email already exists. Please sign in.');
      } else if (error.response?.status === 0) {
        setPopupMessage('Cannot connect to server. Please check if backend is running.');
      } else {
        setPopupMessage(`Registration failed: ${error.response?.data?.message || 'Please try again.'}`);
      }
      setShowPopup(true);
      return { success: false };
    }
  };

  // Login user with backend
const loginUser = async (email: string) => {
  addDebugLog(`Attempting to login user: ${email}`);
  
  try {
    const res = await axios.post(`${API_BASE_URL}/user/signin`, { email });
    
    addDebugLog(`Backend login response received: ${res.status}`);
    addDebugLog(`Response data: ${JSON.stringify(res.data)}`);
    
    const token = res.data.token;
    const userId = res.data.id || res.data.userId || res.data._id;
    const userData = res.data.user || res.data;

    if (token && userId) {
      addDebugLog(`Login successful! Token: ${token.substring(0, 20)}..., UserID: ${userId}`);
      
      // Check if we need to fetch user data separately
      if (!userData || !userData.username) {
        addDebugLog('Fetching user data separately...');
        try {
          const userResponse = await axios.get(`${API_BASE_URL}/user/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          addDebugLog(`User data fetched: ${userResponse.data?.username || 'No username'}`);
          
          if (userResponse.data) {
            auth.login(userResponse.data, token);
            return { success: true, userId, hasPaid: userResponse.data.hasPaid || false };
          }
        } catch (fetchError: any) {
          addDebugLog(`Error fetching user data: ${fetchError.message}`);
        }
      }
      
      // Use the data from initial response
      const loginData = {
        id: userId,
        username: userData?.username || email.split('@')[0],
        email: email,
        userType: userData?.userType || 'buyer',
        hasPaid: userData?.hasPaid || false,
        avatar: userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&background=random`
      };
      
      auth.login(loginData, token);
      return { success: true, userId, hasPaid: loginData.hasPaid };
    } else {
      addDebugLog(`Login failed - Response structure:`);
      addDebugLog(`- Token exists: ${!!token}`);
      addDebugLog(`- User ID exists: ${!!userId}`);
      addDebugLog(`- Full response: ${JSON.stringify(res.data, null, 2)}`);
      
      // Try alternative response formats
      if (res.data.data) {
        addDebugLog('Checking nested data property...');
        const nestedToken = res.data.data.token;
        const nestedUserId = res.data.data.id || res.data.data.userId;
        
        if (nestedToken && nestedUserId) {
          addDebugLog(`Found token and ID in nested data property`);
          const loginData = {
            id: nestedUserId,
            username: res.data.data.username || email.split('@')[0],
            email: email,
            userType: res.data.data.userType || 'buyer',
            hasPaid: res.data.data.hasPaid || false,
            avatar: res.data.data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&background=random`
          };
          
          auth.login(loginData, nestedToken);
          return { success: true, userId: nestedUserId, hasPaid: loginData.hasPaid };
        }
      }
      
      return { success: false };
    }
    
  } catch (error: any) {
    addDebugLog(`Login error: ${error.message}`);
    addDebugLog(`Error response: ${JSON.stringify(error.response?.data, null, 2)}`);
    
    if (error.response?.status === 0) {
      setPopupMessage('Cannot connect to server. Please check if backend is running.');
    } else if (error.response?.status === 404) {
      setPopupMessage('User not found. Please sign up first.');
    } else if (error.response?.data?.message) {
      setPopupMessage(error.response.data.message);
    } else {
      setPopupMessage('Login failed. Please try again.');
    }
    setShowPopup(true);
    return { success: false };
  }
};

  // Check payment status
  const checkPaymentStatus = async (userId: string) => {
    addDebugLog(`Checking payment status for user: ${userId}`);
    
    try {
      await auth.verifyTokenAndPayment();
      
      if (auth.hasPaid) {
        addDebugLog('User has paid, showing success screen');
        setLoginSuccess(true);
      } else {
        addDebugLog('User has not paid, showing payment component');
        setShowPaymentComponent(true);
      }
    } catch (error) {
      addDebugLog(`Error checking payment status: ${error}`);
      setPopupMessage('Error checking payment status. Please try again.');
      setShowPopup(true);
    }
  };

  // Handle successful authentication
  const onLoginSuccess = async (user: any, isEmailAuth: boolean = false) => {
    addDebugLog(`Firebase authentication successful: ${user.email}`);
    addDebugLog(`Firebase UID: ${user.uid}`);
    
    try {
      const profile = user.providerData[0];
      const email = profile.email;
      const username = profile.displayName || email.split('@')[0];
      const avatar = profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;

      addDebugLog(`Profile data: ${username}, ${email}`);

      let result;
      if (isSignup) {
        addDebugLog('Processing signup...');
        result = await registerUser(username, email, avatar, userType);
      } else {
        addDebugLog('Processing login...');
        result = await loginUser(email);
      }
      
      addDebugLog(`Backend result: ${result?.success ? 'Success' : 'Failed'}`);
      
      if (result?.success && result.userId) {
        // Check if user has paid
        await checkPaymentStatus(result.userId);
      } else {
        addDebugLog('Backend authentication failed');
        setPopupMessage('Authentication failed. Please try again.');
        setShowPopup(true);
      }
    } catch (error: any) {
      addDebugLog(`Error in onLoginSuccess: ${error.message}`);
      setPopupMessage(`Authentication failed: ${error.message || 'Please try again.'}`);
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Google Signin
  const handleGoogleLogin = async () => {
    if (!selectedSubscription) {
      setPopupMessage("Please select a subscription plan first.");
      setShowPopup(true);
      return;
    }

    setIsLoading(true);
    addDebugLog('Starting Google login...');
    
    const firebaseAuth = getAuth();
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      addDebugLog('Google login successful via Firebase');
      await onLoginSuccess(result.user);
    } catch (error: any) {
      addDebugLog(`Google login error: ${error.code} - ${error.message}`);
      setIsLoading(false);
      handleAuthError(error);
    }
  };

  // Email Signup
  const handleEmailSignup = async () => {
    if (!selectedSubscription) {
      setPopupMessage("Please select a subscription plan first.");
      setShowPopup(true);
      return;
    }

    if (!email || !password || !username) {
      setPopupMessage("Please enter username, email and password.");
      setShowPopup(true);
      return;
    }

    if (password.length < 6) {
      setPopupMessage("Password should be at least 6 characters long.");
      setShowPopup(true);
      return;
    }

    setIsLoading(true);
    addDebugLog(`Starting email signup: ${email}`);
    
    const firebaseAuth = getAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      addDebugLog('Firebase email signup successful');
      await onLoginSuccess(userCredential.user, true);
    } catch (error: any) {
      addDebugLog(`Email signup error: ${error.code} - ${error.message}`);
      setIsLoading(false);
      handleAuthError(error);
    }
  };

  // Email Login
  const handleEmailLogin = async () => {
    if (!selectedSubscription) {
      setPopupMessage("Please select a subscription plan first.");
      setShowPopup(true);
      return;
    }

    if (!email || !password) {
      setPopupMessage("Please enter both email and password.");
      setShowPopup(true);
      return;
    }

    setIsLoading(true);
    addDebugLog(`Starting email login: ${email}`);
    
    const firebaseAuth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      addDebugLog('Firebase email login successful');
      await onLoginSuccess(userCredential.user, true);
    } catch (error: any) {
      addDebugLog(`Email login error: ${error.code} - ${error.message}`);
      setIsLoading(false);
      handleAuthError(error);
    }
  };

  const handleEmailSubmit = () => {
    if (!selectedSubscription) {
      setPopupMessage("Please select a subscription plan first.");
      setShowPopup(true);
      return;
    }

    if (isSignup) {
      handleEmailSignup();
    } else {
      handleEmailLogin();
    }
  };

  const handleAuthError = (error: any) => {
    addDebugLog(`Authentication Error Details:`);
    addDebugLog(`- Code: ${error.code}`);
    addDebugLog(`- Message: ${error.message}`);
    addDebugLog(`- Full Error: ${JSON.stringify(error)}`);
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        setPopupMessage('Email already in use. Please try logging in.');
        break;
      case 'auth/weak-password':
        setPopupMessage('Password should be at least 6 characters.');
        break;
      case 'auth/invalid-email':
        setPopupMessage('Invalid email address.');
        break;
      case 'auth/user-not-found':
        setPopupMessage('No user found with this email. Please sign up.');
        break;
      case 'auth/wrong-password':
        setPopupMessage('Incorrect password. Please try again.');
        break;
      case 'auth/network-request-failed':
        setPopupMessage('Network error. Please check your internet connection.');
        break;
      case 'auth/too-many-requests':
        setPopupMessage('Too many attempts. Please try again later.');
        break;
      case 'auth/user-disabled':
        setPopupMessage('This account has been disabled.');
        break;
      case 'auth/operation-not-allowed':
        setPopupMessage('Email/password accounts are not enabled. Please contact support.');
        break;
      default:
        setPopupMessage(`Authentication failed: ${error.message || 'Please try again.'}`);
    }
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setIsLoading(false);
  };

  const handleSubscriptionClick = (subscriptionType: "user" | "studio") => {
    setSelectedSubscription(subscriptionType);
    addDebugLog(`Selected subscription: ${subscriptionType}`);
  };

  const toggleSignupSignin = () => {
    setIsSignup(!isSignup);
    setEmail('');
    setPassword('');
    setUsername('');
    setSelectedSubscription(null);
    addDebugLog(`Toggled to ${!isSignup ? 'Sign Up' : 'Sign In'} mode`);
  };

  // Test backend connection
  const testBackendConnection = async () => {
    addDebugLog('Testing backend connection...');
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      addDebugLog(`Backend health check: ${response.status} - ${response.data?.message || 'OK'}`);
      toast.success('Backend is connected!');
    } catch (error) {
      addDebugLog(`Backend connection failed: ${error}`);
      toast.error('Cannot connect to backend server');
    }
  };

  // Fireworks effect
  useEffect(() => {
    setShowFireworks(true);
    const timer = setTimeout(() => setShowFireworks(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Test backend on component mount
  useEffect(() => {
    testBackendConnection();
  }, []);

  // If auth is still loading
  if (auth.loading) {
    return (
      <Layout expand={false} hasHeader={true}>
        <LoadingSpinner>
          <div>
            <div className="spinner"></div>
            <p style={{ color: '#4b5563', fontSize: '16px' }}>Loading authentication...</p>
          </div>
        </LoadingSpinner>
      </Layout>
    );
  }

  // If user is already logged in and paid, show success
  if (loginSuccess) {
    return <SuccessPopup 
      countdown={countdown} 
      onRedirectNow={() => navigate('/')} 
    />;
  }

  // If user needs to pay
  if (showPaymentComponent && selectedSubscription && auth.userId) {
    return (
      <Layout expand={false} hasHeader={true}>
        <PaymentComponent
          selectedSubscription={selectedSubscription}
          userType={userType}
          userId={auth.userId}
          onPaymentSuccess={() => {
            auth.setPaymentStatus(true);
            setLoginSuccess(true);
          }}
          onPaymentError={(msg) => {
            setPopupMessage(msg);
            setShowPopup(true);
          }}
          onSkipPayment={() => {
            navigate('/');
          }}
        />
      </Layout>
    );
  }

  // If user is already authenticated and paid but still on this page
  if (auth.isAuthenticated && auth.hasPaid) {
    return (
      <Layout expand={false} hasHeader={true}>
        <LoadingSpinner>
          <div>
            <div className="spinner"></div>
            <p style={{ color: '#4b5563', fontSize: '16px' }}>Redirecting to home...</p>
          </div>
        </LoadingSpinner>
      </Layout>
    );
  }

  // Main render - show login/signup
  return (
    <Layout expand={false} hasHeader={true}>
      <div className="banner-small">
        🔥 HypeMode is Here! Exclusive Features Await! 🔥
      </div>

      {showFireworks && (
        <motion.div
          className="absolute inset-0 flex justify-center items-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <div className="relative w-full h-full pointer-events-none">
            <Confetti width={window.innerWidth} height={window.innerHeight} numberOfPieces={200} recycle={false} />
          </div>
        </motion.div>
      )}

      <div className="main-container-small">
        {/* Debug Info Button */}
        <button 
          onClick={testBackendConnection}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '5px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Test Backend
        </button>

        {/* Toggle Button */}
        <button 
          className="toggle-button-small"
          onClick={toggleSignupSignin} 
          disabled={isLoading}
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #b45309)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '25px',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? "Processing..." : (isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up")}
        </button>

        {!auth.isAuthenticated && (
          <>
            {isSignup && (
              <div className="user-type-selector-small">
                <button 
                  className={`user-type-button-small ${userType === "buyer" ? "active-small" : ""}`}
                  onClick={() => setUserType("buyer")}
                  disabled={isLoading}
                >
                  👤 Buyer
                </button>
                <button 
                  className={`user-type-button-small ${userType === "seller" ? "active-small" : ""}`}
                  onClick={() => setUserType("seller")}
                  disabled={isLoading}
                >
                  🏪 Seller
                </button>
              </div>
            )}

            <div className="cards-container-small">
              {/* Basic Plan Card */}
              <div
                className={`subscription-box-small ${selectedSubscription === "user" ? "selected-small" : ""}`}
                onClick={() => !isLoading && handleSubscriptionClick("user")}
              >
                <div className="premium-badge-small">Popular</div>
                <h3 className="subscription-title-small">Basic Plan</h3>
                <div className="subscription-price-small">$5/month</div>
                <p className="subscription-description-small">Perfect for individual users</p>
                
                <ul className="features-list-small">
                  <li>Buy Films & Scripts</li>
                  <li>Sell Your Content</li>
                  <li>Basic Support</li>
                  <li>Access to Community</li>
                  <li>5GB Storage</li>
                </ul>

                {selectedSubscription === "user" && (
                  <AuthSection
                    isLoading={isLoading}
                    isSignup={isSignup}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    username={username}
                    setUsername={setUsername}
                    handleGoogleLogin={handleGoogleLogin}
                    handleEmailSubmit={handleEmailSubmit}
                  />
                )}
              </div>

              {/* Pro Plan Card */}
              <div
                className={`subscription-box-small ${selectedSubscription === "studio" ? "selected-small" : ""}`}
                onClick={() => !isLoading && handleSubscriptionClick("studio")}
              >
                <div className="premium-badge-small">Pro</div>
                <h3 className="subscription-title-small">Pro Plan</h3>
                <div className="subscription-price-small">$10/month</div>
                <p className="subscription-description-small">Advanced features for professionals</p>
                
                <ul className="features-list-small">
                  <li>All Basic Features</li>
                  <li>Early Feature Access</li>
                  <li>Priority Support</li>
                  <li>Team Collaboration</li>
                </ul>

                {selectedSubscription === "studio" && (
                  <AuthSection
                    isLoading={isLoading}
                    isSignup={isSignup}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    username={username}
                    setUsername={setUsername}
                    handleGoogleLogin={handleGoogleLogin}
                    handleEmailSubmit={handleEmailSubmit}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Popup with Debug Info */}
      {showPopup && (
        <PopupOverlay onClick={closePopup}>
          <PopupContent onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#b45309', marginBottom: '15px' }}>Authentication Error</h3>
            <p style={{ marginBottom: '20px', fontSize: '16px', color: '#4b5563' }}>
              {popupMessage}
            </p>
            
            {/* Debug Info */}
            {debugInfo.length > 0 && (
              <DebugInfo>
                <strong>Debug Info:</strong>
                <pre>{debugInfo.join('\n')}</pre>
              </DebugInfo>
            )}
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={closePopup}
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #b45309)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
                }}
              >
                Close
              </button>
              <button 
                onClick={() => {
                  addDebugLog('User requested retry...');
                  closePopup();
                }}
                style={{
                  background: '#4b5563',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          </PopupContent>
        </PopupOverlay>
      )}
    </Layout>
  );
};

// Auth Section Component
interface AuthSectionProps {
  isLoading: boolean;
  isSignup: boolean;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  username: string;
  setUsername: (username: string) => void;
  handleGoogleLogin: () => void;
  handleEmailSubmit: () => void;
}

const AuthSection: React.FC<AuthSectionProps> = ({
  isLoading,
  isSignup,
  email,
  setEmail,
  password,
  setPassword,
  username,
  setUsername,
  handleGoogleLogin,
  handleEmailSubmit
}) => {
  return (
    <div className="auth-section-small">
      <button 
        className="subscription-button-small google-auth-button-small" 
        onClick={handleGoogleLogin} 
        disabled={isLoading}
      >
        <span className="google-icon-small">G</span>
        {isLoading ? "Processing..." : (isSignup ? "Google Sign up" : "Google Sign in")}
      </button>

      <div className="auth-divider-small">
        <span>or</span>
      </div>

      <div className="email-form-small">
        {isSignup && (
          <input
            type="text"
            className="form-input-small"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
          />
        )}
        <input
          type="email"
          className="form-input-small"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
        <input
          type="password"
          className="form-input-small"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
        <button 
          className="subscription-button-small email-submit-button-small" 
          onClick={handleEmailSubmit} 
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : (isSignup ? "Create Account" : "Sign In")}
        </button>
      </div>
    </div>
  );
};

export default HypeModeProfile;