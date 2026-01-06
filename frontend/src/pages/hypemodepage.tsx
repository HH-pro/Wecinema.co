import { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { Layout } from "../components";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleProvider } from "../firebase/config";
import styled from 'styled-components';
import { decodeToken } from "../utilities/helperfFunction";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PayPalButtonWrapper from '../components/PaymentComponent/PayPalButtonWrapper';
import PaymentSuccessPopup from '../components/PaymentComponent/SuccessPopup';
import { API_BASE_URL } from "../api";
import "../css/HypeModeProfile.css";

// Success Popup Component
const SuccessPopup = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  z-index: 10000;
  text-align: center;
  color: #1f2937;
  min-width: 300px;
  max-width: 400px;
`;

const SuccessIcon = styled.div`
  font-size: 60px;
  margin-bottom: 20px;
`;

const SuccessTitle = styled.h2`
  font-size: 24px;
  margin-bottom: 15px;
  font-weight: 700;
  color: #059669;
`;

const SuccessMessage = styled.p`
  font-size: 16px;
  margin-bottom: 20px;
  line-height: 1.5;
`;

const CountdownText = styled.div`
  font-size: 14px;
  margin: 15px 0;
  font-weight: 600;
  background: #f3f4f6;
  padding: 10px 15px;
  border-radius: 10px;
  display: inline-block;
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
`;

const CloseButton = styled.button`
  background: linear-gradient(135deg, #059669, #047857);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(5, 150, 105, 0.4);
  }
`;

// Payment Component Styled Components
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background: #f8fafc;
`;

const PaymentSubscriptionBox = styled.div`
  padding: 30px;
  background: white;
  border-radius: 15px;
  text-align: center;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
`;

const Title = styled.h2`
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
`;

const Description = styled.p`
  font-size: 16px;
  margin-bottom: 10px;
  color: #4b5563;
  line-height: 1.5;
  
  &:last-of-type {
    margin-bottom: 25px;
  }
`;

const PaymentButton = styled.button`
  background: linear-gradient(135deg, #059669, #047857);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 20px;
  width: 100%;
  max-width: 300px;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(5, 150, 105, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
  const [selectedSubscription, setSelectedSubscription] = useState<"user" | "studio" | null>(null);
  const [userType, setUserType] = useState<"buyer" | "seller">("buyer");
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentComponent, setShowPaymentComponent] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  const redirectAttempted = useRef(false);
  const authCheckedRef = useRef(false);

  // Check if user is already logged in on initial load
  useEffect(() => {
    const checkInitialAuth = async () => {
      if (authCheckedRef.current) return;
      authCheckedRef.current = true;
      
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      try {
        const tokenData = decodeToken(token);
        const userId = tokenData?.userId || tokenData?.id;
        
        if (!userId) {
          localStorage.removeItem("token");
          return;
        }

        // Check user payment status
        const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
        const user = response.data;
        
        if (user.hasPaid) {
          // User has paid, redirect to home
          navigate('/', { replace: true });
        } else {
          // User hasn't paid, show payment flow
          setUserId(userId);
          setIsLoggedIn(true);
          setShowPaymentComponent(true);
        }
      } catch (error) {
        console.error('Error checking initial auth:', error);
        localStorage.removeItem("token");
      }
    };

    checkInitialAuth();
  }, [navigate]);

  // Handle redirect after login success
  useEffect(() => {
    if (loginSuccess && !redirectAttempted.current) {
      redirectAttempted.current = true;
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Redirect to home
            navigate('/', { replace: true });
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
        // User has paid, redirect to home
        navigate('/', { replace: true });
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
      return { success: false };
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
      return { success: false };
    } catch (error: any) {
      setPopupMessage(error.response?.data?.message || 'Login failed.');
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
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      setPopupMessage('Authentication failed. Please try again.');
      setShowPopup(true);
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

  const handlePaymentSuccess = () => {
    setShowPaymentSuccess(true);
    setShowPaymentComponent(false);
    
    // Auto redirect after payment success
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 3000);
  };

  const handleForceRedirect = () => {
    navigate('/', { replace: true });
  };

  // Show payment success popup
  if (showPaymentSuccess && selectedSubscription) {
    return (
      <PaymentSuccessPopup
        isVisible={showPaymentSuccess}
        subscriptionType={selectedSubscription}
        userType={userType}
        amount={selectedSubscription === 'user' ? 5 : 10}
        onClose={() => {
          setShowPaymentSuccess(false);
          navigate('/', { replace: true });
        }}
      />
    );
  }

  // Show success popup when login is successful
  if (loginSuccess) {
    return (
      <>
        <Overlay />
        <SuccessPopup>
          <SuccessIcon>✅</SuccessIcon>
          <SuccessTitle>Login Successful!</SuccessTitle>
          <SuccessMessage>
            You're being redirected to the home page.
          </SuccessMessage>
          <CountdownText>
            Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
          </CountdownText>
          <CloseButton onClick={handleForceRedirect}>
            Go Now
          </CloseButton>
        </SuccessPopup>
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
              <Description style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: '20px 0' }}>
                Total Amount: ${selectedSubscription === 'user' ? 5 : 10}
              </Description>
              <Description>Secure payment powered by PayPal</Description>
              <PayPalButtonWrapper 
                amount={selectedSubscription === 'user' ? 5 : 10} 
                userId={userId}
                subscriptionType={selectedSubscription}
                userType={userType}
                onSuccess={handlePaymentSuccess}
                onError={(msg) => {
                  setPopupMessage(msg);
                  setShowPopup(true);
                }}
              />
              <PaymentButton 
                onClick={() => {
                  toast.info('You can complete payment later');
                  setTimeout(() => {
                    navigate('/', { replace: true });
                  }, 1000);
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
      <div className="main-container-small">
        <button 
          className="toggle-button-small"
          onClick={toggleSignupSignin} 
          disabled={isLoading}
          style={{
            background: 'linear-gradient(135deg, #059669, #047857)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '25px',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '20px',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? "Processing..." : (isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up")}
        </button>

        {!isLoggedIn && (
          <>
            {isSignup && (
              <div className="user-type-selector-small" style={{ marginBottom: '20px' }}>
                <button 
                  className={`user-type-button-small ${userType === "buyer" ? "active-small" : ""}`}
                  onClick={() => setUserType("buyer")}
                  disabled={isLoading}
                  style={{
                    background: userType === "buyer" 
                      ? 'linear-gradient(135deg, #059669, #047857)' 
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
                      ? 'linear-gradient(135deg, #059669, #047857)' 
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
                    ? '2px solid #059669' 
                    : '1px solid #e5e7eb',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                <div 
                  className="premium-badge-small"
                  style={{
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    color: 'white',
                    fontWeight: '600'
                  }}
                >
                  Popular
                </div>
                <h3 className="subscription-title-small">Basic Plan</h3>
                <div 
                  className="subscription-price-small"
                  style={{
                    color: '#047857',
                    fontWeight: '700'
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
                        background: 'linear-gradient(135deg, #059669, #047857)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '25px',
                        fontWeight: '600',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        marginBottom: '10px',
                        opacity: isLoading ? 0.7 : 1
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
                            border: '1px solid #059669',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            fontSize: '14px',
                            marginBottom: '10px',
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
                          border: '1px solid #059669',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          fontSize: '14px',
                          marginBottom: '10px',
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
                          border: '1px solid #059669',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          fontSize: '14px',
                          marginBottom: '15px',
                          opacity: isLoading ? 0.7 : 1
                        }}
                      />
                      <button 
                        className="subscription-button-small email-submit-button-small" 
                        onClick={handleEmailSubmit} 
                        disabled={isLoading}
                        style={{
                          background: 'linear-gradient(135deg, #059669, #047857)',
                          color: 'white',
                          border: 'none',
                          padding: '12px 20px',
                          borderRadius: '25px',
                          fontWeight: '600',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.3s ease',
                          opacity: isLoading ? 0.7 : 1
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
                    ? '2px solid #059669' 
                    : '1px solid #e5e7eb',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                <div 
                  className="premium-badge-small"
                  style={{
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    color: 'white',
                    fontWeight: '600'
                  }}
                >
                  Pro
                </div>
                <h3 className="subscription-title-small">Pro Plan</h3>
                <div 
                  className="subscription-price-small"
                  style={{
                    color: '#047857',
                    fontWeight: '700'
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
                        background: 'linear-gradient(135deg, #059669, #047857)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '25px',
                        fontWeight: '600',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        marginBottom: '10px',
                        opacity: isLoading ? 0.7 : 1
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
                            border: '1px solid #059669',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            fontSize: '14px',
                            marginBottom: '10px',
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
                          border: '1px solid #059669',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          fontSize: '14px',
                          marginBottom: '10px',
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
                          border: '1px solid #059669',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          fontSize: '14px',
                          marginBottom: '15px',
                          opacity: isLoading ? 0.7 : 1
                        }}
                      />
                      <button 
                        className="subscription-button-small email-submit-button-small" 
                        onClick={handleEmailSubmit} 
                        disabled={isLoading}
                        style={{
                          background: 'linear-gradient(135deg, #059669, #047857)',
                          color: 'white',
                          border: 'none',
                          padding: '12px 20px',
                          borderRadius: '25px',
                          fontWeight: '600',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.3s ease',
                          opacity: isLoading ? 0.7 : 1
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

      {showPopup && (
        <>
          <div className="overlay" onClick={closePopup} />
          <div className="popup-small">
            <p className="popup-text-small">{popupMessage}</p>
            <button 
              className="subscription-button-small" 
              onClick={closePopup}
              style={{
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: 'white',
                border: 'none',
                padding: '10px 25px',
                borderRadius: '20px',
                fontWeight: '600',
                cursor: 'pointer'
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