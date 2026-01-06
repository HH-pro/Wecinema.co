import { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { Layout } from "../components";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleProvider } from "../firebase/config";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import styled from 'styled-components';
import { decodeToken } from "../utilities/helperfFunction";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "../css/HypeModeProfile.css";

// Import new components
import PaymentComponent from "../components/PaymentComponent";
import SuccessPopup from "../components/SuccessPopup";

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
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
`;

// Main HypeModeProfile Component
const HypeModeProfile = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [showFireworks, setShowFireworks] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<"user" | "studio" | null>(null);
  const [userType, setUserType] = useState<"buyer" | "seller">("buyer");
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentComponent, setShowPaymentComponent] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  
  const redirectAttempted = useRef(false);

  // Initial auth check
  useEffect(() => {
    const checkInitialAuth = async () => {
      if (redirectAttempted.current) return;
      
      const token = localStorage.getItem("token");
      if (!token) {
        setAuthCheckComplete(true);
        return;
      }

      try {
        const tokenData = decodeToken(token);
        const userId = tokenData?.userId || tokenData?.id;
        
        if (!userId) {
          localStorage.removeItem("token");
          setAuthCheckComplete(true);
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
        const user = response.data;
        
        if (user.hasPaid) {
          redirectAttempted.current = true;
          navigate('/');
          return;
        } else {
          setUserId(userId);
          setIsLoggedIn(true);
          setShowPaymentComponent(true);
        }
      } catch (error) {
        console.error('Error checking initial auth:', error);
        localStorage.removeItem("token");
      } finally {
        setAuthCheckComplete(true);
      }
    };

    checkInitialAuth();
  }, [navigate]);

  // Handle redirect after login success
  useEffect(() => {
    if (loginSuccess) {
      redirectAttempted.current = true;
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

  const checkPaymentStatus = async (userId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
      const user = response.data;
      
      if (user.hasPaid) {
        setUserId(userId);
        setIsLoggedIn(true);
        setLoginSuccess(true);
      } else {
        setUserId(userId);
        setIsLoggedIn(true);
        setShowPaymentComponent(true);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setPopupMessage('Error checking payment status. Please try again.');
      setShowPopup(true);
    }
  };

  // Auth functions (same as before but cleaner)
  const registerUser = async (username: string, email: string, avatar: string, userType: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/user/signup`, {
        username,
        email,
        avatar,
        userType,
        dob: "--------"
      });

      const token = res.data.token;
      const userId = res.data.id;

      if (token) {
        localStorage.setItem('token', token);
        setIsLoggedIn(true);
        setUserId(userId);
        return { success: true, userId };
      }
    } catch (error: any) {
      if (error.response?.data?.error === 'Email already exists.') {
        setPopupMessage('Email already exists. Please sign in.');
      } else {
        setPopupMessage('Registration failed. Please try again.');
      }
      setShowPopup(true);
      return { success: false };
    }
  };

  const loginUser = async (email: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/user/signin`, { email });
      const backendToken = res.data.token;
      const userId = res.data.id;

      if (backendToken) {
        localStorage.setItem('token', backendToken);
        setIsLoggedIn(true);
        setUserId(userId);
        return { success: true, userId };
      }
    } catch (error: any) {
      setPopupMessage(error.response?.data?.message || 'Login failed.');
      setShowPopup(true);
      return { success: false };
    }
  };

  const onLoginSuccess = async (user: any, isEmailAuth: boolean = false) => {
    const profile = user.providerData[0];
    const email = profile.email;
    const username = profile.displayName || email.split('@')[0];
    const avatar = profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;

    try {
      let result;
      if (isSignup) {
        result = await registerUser(username, email, avatar, userType);
      } else {
        result = await loginUser(email);
      }
      
      if (result.success && result.userId) {
        await checkPaymentStatus(result.userId);
      }
    } catch (error) {
      setPopupMessage('Authentication failed. Please try again.');
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!selectedSubscription) {
      setPopupMessage("Please select a subscription plan first.");
      setShowPopup(true);
      return;
    }

    setIsLoading(true);
    const auth = getAuth();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await onLoginSuccess(result.user);
    } catch (error: any) {
      setIsLoading(false);
      setPopupMessage('Google login failed. Please try again.');
      setShowPopup(true);
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

  const handleEmailSignup = async () => {
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
    const auth = getAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await onLoginSuccess(userCredential.user, true);
    } catch (error: any) {
      setIsLoading(false);
      handleAuthError(error);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setPopupMessage("Please enter both email and password.");
      setShowPopup(true);
      return;
    }

    setIsLoading(true);
    const auth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await onLoginSuccess(userCredential.user, true);
    } catch (error: any) {
      setIsLoading(false);
      handleAuthError(error);
    }
  };

  const handleAuthError = (error: any) => {
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
      default:
        setPopupMessage('Authentication failed. Please try again.');
    }
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setIsLoading(false);
  };

  const handleSubscriptionClick = (subscriptionType: "user" | "studio") => {
    setSelectedSubscription(subscriptionType);
  };

  const toggleSignupSignin = () => {
    setIsSignup(!isSignup);
    setEmail('');
    setPassword('');
    setUsername('');
    setSelectedSubscription(null);
  };

  // Fireworks effect
  useEffect(() => {
    setShowFireworks(true);
    const timer = setTimeout(() => setShowFireworks(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Show loading while checking auth
  if (!authCheckComplete) {
    return (
      <Layout expand={false} hasHeader={true}>
        <LoadingSpinner>
          <div>
            <div className="spinner"></div>
            <p style={{ color: '#4b5563', fontSize: '16px' }}>Checking authentication status...</p>
          </div>
        </LoadingSpinner>
      </Layout>
    );
  }

  // Show success popup
  if (loginSuccess) {
    return <SuccessPopup 
      countdown={countdown} 
      onRedirectNow={() => navigate('/')} 
    />;
  }

  // Show payment component
  if (showPaymentComponent && selectedSubscription && userId) {
    return (
      <Layout expand={false} hasHeader={true}>
        <PaymentComponent
          selectedSubscription={selectedSubscription}
          userType={userType}
          userId={userId}
          onPaymentSuccess={() => {
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

  // Main render
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

        {!isLoggedIn && (
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
              {/* Subscription cards - simplified version */}
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

                {/* Auth section for Basic Plan */}
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

                {/* Auth section for Pro Plan */}
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

      {/* Popup */}
      {showPopup && (
        <PopupOverlay onClick={closePopup}>
          <PopupContent onClick={(e) => e.stopPropagation()}>
            <p style={{ marginBottom: '20px', fontSize: '16px', color: '#4b5563' }}>
              {popupMessage}
            </p>
            <button 
              onClick={closePopup}
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #b45309)',
                color: 'white',
                border: 'none',
                padding: '12px 30px',
                borderRadius: '25px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
              }}
            >
              Close
            </button>
          </PopupContent>
        </PopupOverlay>
      )}
    </Layout>
  );
};

// Auth Section Component (optional - for more modularity)
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