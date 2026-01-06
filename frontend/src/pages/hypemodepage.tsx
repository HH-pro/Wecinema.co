import { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { Layout } from "../components";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleProvider } from "../firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import styled from 'styled-components';
import { decodeToken } from "../utilities/helperfFunction";
import { getRequest } from "../api";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PayPalButtonWrapper from '../components/PaymentComponent/PayPalButtonWrapper';
import { API_BASE_URL } from "../api";
import "../css/HypeModeProfile.css";

// Professional Success Popup Component - Glassmorphism Design
const ProfessionalSuccessPopup = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 50px 40px;
  border-radius: 30px;
  box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.3);
  z-index: 10000;
  text-align: center;
  color: white;
  min-width: 400px;
  max-width: 450px;
  animation: float 3s ease-in-out infinite;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      rgba(251, 191, 36, 0.3), 
      rgba(180, 83, 9, 0.3)
    );
    z-index: -1;
    border-radius: 30px;
  }
  
  @keyframes float {
    0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
    50% { transform: translate(-50%, -50%) translateY(-15px); }
  }
`;

const SuccessIcon = styled.div`
  font-size: 80px;
  margin-bottom: 25px;
  animation: pulse 1.5s infinite;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
`;

const SuccessTitle = styled.h2`
  font-size: 32px;
  margin-bottom: 20px;
  font-weight: 800;
  text-shadow: 0 4px 8px rgba(0,0,0,0.3);
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, #fbbf24, #b45309);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const SuccessMessage = styled.p`
  font-size: 18px;
  margin-bottom: 30px;
  line-height: 1.6;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
  opacity: 0.95;
`;

const CountdownText = styled.div`
  font-size: 16px;
  opacity: 0.9;
  margin: 25px 0;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  padding: 12px 20px;
  border-radius: 20px;
  display: inline-block;
  backdrop-filter: blur(10px);
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  backdrop-filter: blur(10px);
`;

const CloseButton = styled.button`
  background: linear-gradient(135deg, #fbbf24, #b45309);
  color: white;
  border: none;
  padding: 16px 40px;
  border-radius: 50px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 25px rgba(251, 191, 36, 0.4);
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: 0.5s;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 30px rgba(251, 191, 36, 0.6);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(251, 191, 36, 0.5);
  }
`;

// Payment Component Styled Components
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 40px 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
`;

const PaymentSubscriptionBox = styled.div`
  padding: 50px 40px;
  background: white;
  border-radius: 25px;
  text-align: center;
  width: 100%;
  max-width: 550px;
  box-shadow: 0 25px 50px rgba(251, 191, 36, 0.15);
  position: relative;
  overflow: hidden;
  border: 2px solid #fbbf24;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(to right, #fbbf24, #b45309);
  }
`;

const Title = styled.h2`
  margin-bottom: 25px;
  font-size: 32px;
  font-weight: 800;
  color: #1f2937;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 4px;
    background: linear-gradient(to right, #fbbf24, #b45309);
    border-radius: 2px;
  }
`;

const Description = styled.p`
  font-size: 18px;
  margin-bottom: 12px;
  color: #4b5563;
  line-height: 1.6;
  
  &:last-of-type {
    margin-bottom: 35px;
  }
`;

const PaymentButton = styled.button`
  background: linear-gradient(135deg, #fbbf24, #b45309);
  color: white;
  border: none;
  padding: 18px 35px;
  border-radius: 50px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 25px;
  width: 100%;
  max-width: 320px;
  box-shadow: 0 10px 25px rgba(251, 191, 36, 0.3);
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: 0.5s;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 15px 30px rgba(251, 191, 36, 0.4);
    
    &::before {
      left: 100%;
    }
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background: linear-gradient(135deg, #d1d5db, #9ca3af);
  }
  
  &:active:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(251, 191, 36, 0.35);
  }
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
  const [hasCheckedInitialAuth, setHasCheckedInitialAuth] = useState(false);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  
  // Use refs to prevent multiple redirects
  const redirectAttempted = useRef(false);

  // Simplified initial auth check - only run once on mount
  useEffect(() => {
    const checkInitialAuth = async () => {
      // Prevent multiple checks
      if (redirectAttempted.current) return;
      
      const token = localStorage.getItem("token");
      if (!token) {
        setHasCheckedInitialAuth(true);
        setAuthCheckComplete(true);
        return;
      }

      try {
        const tokenData = decodeToken(token);
        const userId = tokenData?.userId || tokenData?.id;
        
        if (!userId) {
          localStorage.removeItem("token");
          localStorage.removeItem("shouldRedirect");
          setHasCheckedInitialAuth(true);
          setAuthCheckComplete(true);
          return;
        }

        // Check user payment status
        const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
        const user = response.data;
        
        if (user.hasPaid) {
          // User has paid, redirect immediately
          redirectAttempted.current = true;

          navigate('/');
          return;
        } else {
          // User hasn't paid, show payment flow
          setUserId(userId);
          setIsLoggedIn(true);
          setShowPaymentComponent(true);
        }
      } catch (error) {
        console.error('Error checking initial auth:', error);
        // Clear invalid token
        localStorage.removeItem("token");
        localStorage.removeItem("shouldRedirect");
      } finally {
        setHasCheckedInitialAuth(true);
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
      }, 10);
            window.location.reload();
      
      return () => clearInterval(timer);
    }
  }, [loginSuccess, navigate]);

  const checkPaymentStatus = async (userId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
      const user = response.data;
      
      if (user.hasPaid) {
        // User has paid, set login success
        setUserId(userId);
        setIsLoggedIn(true);
        setLoginSuccess(true);
      } else {
        // User hasn't paid, show payment component
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

  // Register user with backend
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
      if (error.response && error.response.data && error.response.data.error === 'Email already exists.') {
        setPopupMessage('Email already exists. Please sign in.');
      } else {
        setPopupMessage('Registration failed. Please try again.');
      }
      setShowPopup(true);
      return { success: false };
    }
  };

  // Login user with backend
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
      if (error.response) {
        setPopupMessage(error.response.data.message || 'Login failed.');
      } else {
        setPopupMessage('Login failed.');
      }
      setShowPopup(true);
      return { success: false };
    }
  };

  // Handle successful authentication
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
        // Check payment status after successful registration/login
        await checkPaymentStatus(result.userId);
      }
    } catch (error) {
      setPopupMessage('Authentication failed. Please try again.');
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
    const auth = getAuth();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await onLoginSuccess(user);
    } catch (error: any) {
      setIsLoading(false);
      setPopupMessage('Google login failed. Please try again.');
      setShowPopup(true);
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
    const auth = getAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await onLoginSuccess(user, true);
    } catch (error: any) {
      setIsLoading(false);
      if (error.code === 'auth/email-already-in-use') {
        setPopupMessage('Email already in use. Please try logging in.');
      } else if (error.code === 'auth/weak-password') {
        setPopupMessage('Password should be at least 6 characters.');
      } else if (error.code === 'auth/invalid-email') {
        setPopupMessage('Invalid email address.');
      } else {
        setPopupMessage('Email signup failed. Please try again.');
      }
      setShowPopup(true);
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
    const auth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await onLoginSuccess(user, true);
    } catch (error: any) {
      setIsLoading(false);
      if (error.code === 'auth/user-not-found') {
        setPopupMessage('No user found with this email. Please sign up.');
      } else if (error.code === 'auth/wrong-password') {
        setPopupMessage('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        setPopupMessage('Invalid email address.');
      } else {
        setPopupMessage('Email login failed. Please try again.');
      }
      setShowPopup(true);
    }
  };

  const handleEmailSubmit = () => {
    if (isSignup) {
      handleEmailSignup();
    } else {
      handleEmailLogin();
    }
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

  // Fireworks effect on mount
  useEffect(() => {
    setShowFireworks(true);
    const timer = setTimeout(() => setShowFireworks(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // If still checking initial auth, show loading
  if (!authCheckComplete) {
    return (
      <Layout expand={false} hasHeader={true}>
        <div className="main-container-small" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #fbbf24',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <p style={{ color: '#4b5563', fontSize: '16px' }}>Checking authentication status...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      </Layout>
    );
  }

  // Show professional success popup when login is successful
  if (loginSuccess) {
    return (
      <>
        <AnimatePresence>
          {loginSuccess && (
            <>
              <Overlay />
              <ProfessionalSuccessPopup>
                <SuccessIcon>🎉</SuccessIcon>
                <SuccessTitle>Welcome Back!</SuccessTitle>
                <SuccessMessage>
                  Login successful! You're being redirected to your dashboard.
                </SuccessMessage>
                <CountdownText>
                  Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
                </CountdownText>
                <CloseButton onClick={() => navigate('/')}>
                  Go Now
                </CloseButton>
              </ProfessionalSuccessPopup>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // If user is logged in but hasn't paid, show payment component
  if (showPaymentComponent && selectedSubscription && userId) {
    return (
      <Layout expand={false} hasHeader={true}>
        <Container>
          <PaymentSubscriptionBox>
            <div>
              <Title>Complete Your Subscription</Title>
              <Description>Subscription Plan: {selectedSubscription === "user" ? "Basic Plan" : "Pro Plan"}</Description>
              <Description>User Type: {userType === "buyer" ? "👤 Buyer" : "🏪 Seller"}</Description>
              <Description style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: '25px 0' }}>
                Total Amount: ${selectedSubscription === 'user' ? 5 : 10}
              </Description>
              <Description>Secure payment powered by PayPal</Description>
              <PayPalButtonWrapper 
                amount={selectedSubscription === 'user' ? 5 : 10} 
                userId={userId} 
                onSuccess={() => {
                  toast.success('Payment successful! Redirecting to home...');
                  setTimeout(() => navigate('/'), 1500);
                }}
                onError={(msg) => {
                  setPopupMessage(msg);
                  setShowPopup(true);
                }}
              />
              <PaymentButton 
                onClick={() => {
                  toast.info('You can complete payment later');
                  setTimeout(() => navigate('/'), 1000);
                }}
                style={{ marginTop: '15px', background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}
              >
                Skip for Now
              </PaymentButton>
            </div>
          </PaymentSubscriptionBox>
        </Container>
      </Layout>
    );
  }

  // Render the main component
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
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(251, 191, 36, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(251, 191, 36, 0.3)';
            }
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
                  style={{
                    background: userType === "buyer" 
                      ? 'linear-gradient(135deg, #fbbf24, #b45309)' 
                      : '#f3f4f6',
                    color: userType === "buyer" ? 'white' : '#4b5563',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '20px',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: isLoading ? 0.7 : 1
                  }}
                >
                  👤 Buyer
                </button>
                <button 
                  className={`user-type-button-small ${userType === "seller" ? "active-small" : ""}`}
                  onClick={() => setUserType("seller")}
                  disabled={isLoading}
                  style={{
                    background: userType === "seller" 
                      ? 'linear-gradient(135deg, #fbbf24, #b45309)' 
                      : '#f3f4f6',
                    color: userType === "seller" ? 'white' : '#4b5563',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '20px',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: isLoading ? 0.7 : 1
                  }}
                >
                  🏪 Seller
                </button>
              </div>
            )}

            <div className="cards-container-small">
              {/* Basic Plan */}
              <div
                className={`subscription-box-small ${selectedSubscription === "user" ? "selected-small" : ""}`}
                onClick={() => !isLoading && handleSubscriptionClick("user")}
                style={{
                  border: selectedSubscription === "user" 
                    ? '3px solid #fbbf24' 
                    : '2px solid #e5e7eb',
                  boxShadow: selectedSubscription === "user"
                    ? '0 15px 30px rgba(251, 191, 36, 0.2)'
                    : '0 5px 15px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                <div 
                  className="premium-badge-small"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #b45309)',
                    color: 'white',
                    fontWeight: '700'
                  }}
                >
                  Popular
                </div>
                <h3 className="subscription-title-small">Basic Plan</h3>
                <div 
                  className="subscription-price-small"
                  style={{
                    color: '#b45309',
                    fontWeight: '800'
                  }}
                >
                  $5/month
                </div>
                <p className="subscription-description-small">Perfect for individual users</p>
                
                <ul className="features-list-small">
                  <li>Buy Films & Scripts</li>
                  <li>Sell Your Content</li>
                  <li>Basic Support</li>
                  <li>Access to Community</li>
                  <li>5GB Storage</li>
                </ul>

                {selectedSubscription === "user" && (
                  <div className="auth-section-small">
                    <button 
                      className="subscription-button-small google-auth-button-small" 
                      onClick={handleGoogleLogin} 
                      disabled={isLoading}
                      style={{
                        background: 'linear-gradient(135deg, #fbbf24, #b45309)',
                        color: 'white',
                        border: 'none',
                        padding: '14px 20px',
                        borderRadius: '25px',
                        fontWeight: '600',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        opacity: isLoading ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(251, 191, 36, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(251, 191, 36, 0.3)';
                        }
                      }}
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
                          style={{
                            border: '2px solid #fbbf24',
                            borderRadius: '12px',
                            padding: '12px 15px',
                            fontSize: '14px',
                            opacity: isLoading ? 0.7 : 1
                          }}
                        />
                      )}
                      <input
                        type="email"
                        className="form-input-small"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        style={{
                          border: '2px solid #fbbf24',
                          borderRadius: '12px',
                          padding: '12px 15px',
                          fontSize: '14px',
                          opacity: isLoading ? 0.7 : 1
                        }}
                      />
                      <input
                        type="password"
                        className="form-input-small"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        style={{
                          border: '2px solid #fbbf24',
                          borderRadius: '12px',
                          padding: '12px 15px',
                          fontSize: '14px',
                          opacity: isLoading ? 0.7 : 1
                        }}
                      />
                      <button 
                        className="subscription-button-small email-submit-button-small" 
                        onClick={handleEmailSubmit} 
                        disabled={isLoading}
                        style={{
                          background: 'linear-gradient(135deg, #fbbf24, #b45309)',
                          color: 'white',
                          border: 'none',
                          padding: '14px 20px',
                          borderRadius: '25px',
                          fontWeight: '600',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)',
                          opacity: isLoading ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!isLoading) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(251, 191, 36, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isLoading) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(251, 191, 36, 0.3)';
                          }
                        }}
                      >
                        {isLoading ? "Processing..." : (isSignup ? "Create Account" : "Sign In")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pro Plan */}
              <div
                className={`subscription-box-small ${selectedSubscription === "studio" ? "selected-small" : ""}`}
                onClick={() => !isLoading && handleSubscriptionClick("studio")}
                style={{
                  border: selectedSubscription === "studio" 
                    ? '3px solid #fbbf24' 
                    : '2px solid #e5e7eb',
                  boxShadow: selectedSubscription === "studio"
                    ? '0 15px 30px rgba(251, 191, 36, 0.2)'
                    : '0 5px 15px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                <div 
                  className="premium-badge-small"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #b45309)',
                    color: 'white',
                    fontWeight: '700'
                  }}
                >
                  Pro
                </div>
                <h3 className="subscription-title-small">Pro Plan</h3>
                <div 
                  className="subscription-price-small"
                  style={{
                    color: '#b45309',
                    fontWeight: '800'
                  }}
                >
                  $10/month
                </div>
                <p className="subscription-description-small">Advanced features for professionals</p>
                
                <ul className="features-list-small">
                  <li>All Basic Features</li>
                  <li>Early Feature Access</li>
                  <li>Priority Support</li>
                  <li>Team Collaboration</li>
                </ul>

                {selectedSubscription === "studio" && (
                  <div className="auth-section-small">
                    <button 
                      className="subscription-button-small google-auth-button-small" 
                      onClick={handleGoogleLogin} 
                      disabled={isLoading}
                      style={{
                        background: 'linear-gradient(135deg, #fbbf24, #b45309)',
                        color: 'white',
                        border: 'none',
                        padding: '14px 20px',
                        borderRadius: '25px',
                        fontWeight: '600',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        opacity: isLoading ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(251, 191, 36, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(251, 191, 36, 0.3)';
                        }
                      }}
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
                          style={{
                            border: '2px solid #fbbf24',
                            borderRadius: '12px',
                            padding: '12px 15px',
                            fontSize: '14px',
                            opacity: isLoading ? 0.7 : 1
                          }}
                        />
                      )}
                      <input
                        type="email"
                        className="form-input-small"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        style={{
                          border: '2px solid #fbbf24',
                          borderRadius: '12px',
                          padding: '12px 15px',
                          fontSize: '14px',
                          opacity: isLoading ? 0.7 : 1
                        }}
                      />
                      <input
                        type="password"
                        className="form-input-small"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        style={{
                          border: '2px solid #fbbf24',
                          borderRadius: '12px',
                          padding: '12px 15px',
                          fontSize: '14px',
                          opacity: isLoading ? 0.7 : 1
                        }}
                      />
                      <button 
                        className="subscription-button-small email-submit-button-small" 
                        onClick={handleEmailSubmit} 
                        disabled={isLoading}
                        style={{
                          background: 'linear-gradient(135deg, #fbbf24, #b45309)',
                          color: 'white',
                          border: 'none',
                          padding: '14px 20px',
                          borderRadius: '25px',
                          fontWeight: '600',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)',
                          opacity: isLoading ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!isLoading) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(251, 191, 36, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isLoading) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(251, 191, 36, 0.3)';
                          }
                        }}
                      >
                        {isLoading ? "Processing..." : (isSignup ? "Create Account" : "Sign In")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {showPopup && !loginSuccess && (
        <>
          <div className="overlay" onClick={closePopup} />
          <div className="popup-small">
            <p className="popup-text-small">{popupMessage}</p>
            <button 
              className="subscription-button-small" 
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
          </div>
        </>
      )}
    </Layout>
  );
};

export default HypeModeProfile;