import { useState, useEffect } from "react";
import axios from 'axios';
import { Layout } from "../components";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleProvider } from "../firebase/config";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import "../css/HypeModeProfile.css";
import { toast } from "react-toastify";
import PayPalButtonWrapper from './PayPalButtonWrapper';

import { API_BASE_URL } from "../api";


// ✅ Payment Component Styles (inline ya CSS file mein define karein)
const PaymentContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 40px 20px;
  background: linear-gradient(to right, #ffffa1 0%, #ffc800 100%);
  color: #333;
  border-radius: 20px;
  margin: 20px auto;
  max-width: 800px;
`;

const SubscriptionBox = styled.div`
  padding: 30px;
  border: 2px dashed #000;
  text-align: center;
  width: 100%;
  max-width: 500px;
  background-color: #fff;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  border-radius: 15px;
`;

const Title = styled.h2`
  margin-bottom: 20px;
  font-size: 28px;
  font-weight: bold;
  color: #333;
`;

const Description = styled.p`
  font-size: 16px;
  margin-bottom: 20px;
  color: #555;
`;

const Button = styled.button`
  background: #28a745;
  color: #fff;
  border: none;
  padding: 12px 24px;
  cursor: pointer;
  font-size: 16px;
  border-radius: 8px;
  transition: background 0.3s, transform 0.2s;
  margin-top: 20px;

  &:hover {
    background: #218838;
    transform: scale(1.05);
  }
`;

// ✅ Import styled-components
import styled from 'styled-components';

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
  
  // ✅ New state for payment
  const [showPayment, setShowPayment] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);

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

      setPopupMessage(`Registration successful as ${userType}!`);
      setShowPopup(true);

      if (token) {
        localStorage.setItem('token', token);
        setIsLoggedIn(true);
        setUserId(userId);
        return true;
      }
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error === 'Email already exists.') {
        setPopupMessage('Email already exists. Please sign in.');
      } else {
        setPopupMessage('Registration failed. Please try again.');
      }
      setShowPopup(true);
      return false;
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
        setPopupMessage('Login successful!');
        setShowPopup(true);
        return true;
      }
    } catch (error: any) {
      if (error.response) {
        setPopupMessage(error.response.data.message || 'Login failed.');
      } else {
        setPopupMessage('Login failed.');
      }
      setShowPopup(true);
      return false;
    }
  };

  // ✅ Updated onLoginSuccess function
  const onLoginSuccess = async (user: any, isEmailAuth: boolean = false) => {
    const profile = user.providerData[0];
    const email = profile.email;
    const username = profile.displayName || email.split('@')[0];
    const avatar = profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;

    try {
      if (isSignup) {
        const success = await registerUser(username, email, avatar, userType);
        if (success && selectedSubscription) {
          // Set payment amount based on subscription
          const amount = selectedSubscription === 'user' ? 5 : 10;
          setPaymentAmount(amount);
          setShowPayment(true);
        }
      } else {
        const success = await loginUser(email);
        if (success && selectedSubscription) {
          const amount = selectedSubscription === 'user' ? 5 : 10;
          setPaymentAmount(amount);
          setShowPayment(true);
        }
      }
    } catch (error) {
      setPopupMessage('Authentication failed. Please try again.');
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ PayPal payment success handler
  const handlePaymentSuccess = async (details: any) => {
    try {
      if (!details.id || !details.payer) {
        throw new Error('Incomplete transaction details');
      }

      setPaymentProcessing(true);
      
      const response = await axios.post(`${API_BASE_URL}/user/save-transaction`, {
        userId: userId,
        username: username,
        email: details.payer.email_address,
        orderId: details.id,
        payerId: details.payer.payer_id,
        amount: paymentAmount,
        currency: 'USD',
        subscriptionType: selectedSubscription
      });

      toast.success('Payment successful! Welcome to HypeMode! 🎉');
      setShowPayment(false);
      
      // Refresh page after successful payment
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Failed to save transaction:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handlePaymentError = (message: any) => {
    setPopupMessage(message);
    setIsError(true);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
  };

  // Google Signin
  const handleGoogleLogin = async () => {
    if (!selectedSubscription) {
      setPopupMessage("Please select a subscription first.");
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
      setPopupMessage("Please select a subscription first.");
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
      setPopupMessage("Please select a subscription first.");
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

  // ✅ Close payment modal
  const closePayment = () => {
    setShowPayment(false);
    setSelectedSubscription(null);
  };

  useEffect(() => {
    setShowFireworks(true);
    setTimeout(() => setShowFireworks(false), 1000);
  }, []);

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
        <button className="toggle-button-small" onClick={toggleSignupSignin} disabled={isLoading}>
          {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
        </button>

        {isLoggedIn ? (
          <div className="cards-container-small">
            {/* Already logged in content */}
          </div>
        ) : (
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

            {/* ✅ Show subscription plans OR payment component based on state */}
            {!showPayment ? (
              <div className="cards-container-small">
                {/* Basic Plan */}
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
                    <div className="auth-section-small">
                      <button className="subscription-button-small google-auth-button-small" onClick={handleGoogleLogin} disabled={isLoading}>
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
                        <button className="subscription-button-small email-submit-button-small" onClick={handleEmailSubmit} disabled={isLoading}>
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
                    <div className="auth-section-small">
                      <button className="subscription-button-small google-auth-button-small" onClick={handleGoogleLogin} disabled={isLoading}>
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
                        <button className="subscription-button-small email-submit-button-small" onClick={handleEmailSubmit} disabled={isLoading}>
                          {isLoading ? "Processing..." : (isSignup ? "Create Account" : "Sign In")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // ✅ Payment Component (Same page pe show ho rha hai)
              <PaymentContainer>
                <SubscriptionBox>
                  <Title>Complete Your Subscription</Title>
                  <Description>Subscription: {selectedSubscription === 'user' ? 'Basic Plan' : 'Pro Plan'}</Description>
                  <Description>Amount: ${paymentAmount}/month</Description>
                  <Description>Pay with PayPal or Debit Card</Description>
                  
                  <PayPalButtonWrapper 
                    amount={paymentAmount} 
                    userId={userId} 
                    onSuccess={handlePaymentSuccess} 
                    onError={handlePaymentError} 
                  />
                  
                  <Button 
                    onClick={closePayment}
                    style={{ background: '#dc3545', marginLeft: '10px' }}
                    disabled={paymentProcessing}
                  >
                    Cancel
                  </Button>
                  
                  {paymentProcessing && (
                    <p style={{ marginTop: '20px', color: '#28a745' }}>
                      Processing your payment...
                    </p>
                  )}
                </SubscriptionBox>
              </PaymentContainer>
            )}
          </>
        )}
      </div>

      {showPopup && (
        <>
          <div className="overlay" onClick={closePopup} />
          <div className="popup-small">
            <p className="popup-text-small">{popupMessage}</p>
            <button className="subscription-button-small" onClick={closePopup}>Close</button>
          </div>
        </>
      )}
    </Layout>
  );
};

export default HypeModeProfile;