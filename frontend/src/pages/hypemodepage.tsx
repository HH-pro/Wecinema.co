import { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { Layout } from "../components";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleProvider } from "../firebase/config";
import { decodeToken } from "../utilities/helperfFunction";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PayPalButtonWrapper from '../components/PaymentComponent/PayPalButtonWrapper';
import PaymentSuccessPopup from '../components/PaymentComponent/SuccessPopup';
import { API_BASE_URL } from "../api";
import "../css/HypeModeProfile.css";

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
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const redirectAttempted = useRef(false);

  // Check if user is already logged in and paid
  useEffect(() => {
    const checkAuthAndPayment = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const tokenData = decodeToken(token);
        const userId = tokenData?.userId || tokenData?.id;
        
        if (!userId) {
          localStorage.removeItem("token");
          return;
        }

        // Check payment status
        const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
        const user = response.data;
        
        if (user.hasPaid) {
          // User has paid, redirect immediately
          console.log('User already paid, redirecting to home...');
          window.location.href = '/';
        } else {
          // User hasn't paid, show payment flow
          setUserId(userId);
          setIsLoggedIn(true);
          setShowPaymentComponent(true);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        localStorage.removeItem("token");
      }
    };

    checkAuthAndPayment();
  }, []);

  // Simplified checkPaymentStatus function
  const checkPaymentStatus = async (userId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
      const user = response.data;
      
      if (user.hasPaid) {
        // User has paid - redirect immediately
        console.log('Payment verified, redirecting to home...');
        window.location.href = '/';
      } else {
        // User hasn't paid, show payment component
        setUserId(userId);
        setIsLoggedIn(true);
        setShowPaymentComponent(true);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
      setPopupMessage('Error checking payment status.');
      setShowPopup(true);
      setIsLoading(false);
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

      if (token && userId) {
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
        setPopupMessage('Registration failed.');
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

      if (backendToken && userId) {
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
        // Check payment status
        await checkPaymentStatus(result.userId);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      setPopupMessage('Authentication failed.');
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
      setPopupMessage('Google login failed.');
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
      setPopupMessage("Please enter all fields.");
      setShowPopup(true);
      return;
    }

    if (password.length < 6) {
      setPopupMessage("Password should be at least 6 characters.");
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
        setPopupMessage('Email already in use. Please login.');
      } else if (error.code === 'auth/weak-password') {
        setPopupMessage('Password should be at least 6 characters.');
      } else {
        setPopupMessage('Signup failed.');
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
      setPopupMessage("Please enter email and password.");
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
        setPopupMessage('No user found. Please sign up.');
      } else if (error.code === 'auth/wrong-password') {
        setPopupMessage('Incorrect password.');
      } else {
        setPopupMessage('Login failed.');
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
    
    // Redirect after 2 seconds
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
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
          window.location.href = '/';
        }}
      />
    );
  }

  // If user is logged in but hasn't paid, show payment component
  if (showPaymentComponent && selectedSubscription && userId) {
    return (
      <Layout expand={false} hasHeader={true}>
        <div className="payment-container">
          <div className="payment-subscription-box">
            <div>
              <h2 className="payment-title">Complete Your Subscription</h2>
              <p className="payment-description">Plan: {selectedSubscription === "user" ? "Basic" : "Pro"}</p>
              <p className="payment-description">User Type: {userType === "buyer" ? "👤 Buyer" : "🏪 Seller"}</p>
              <p className="payment-amount">
                Amount: ${selectedSubscription === 'user' ? 5 : 10}
              </p>
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
              <button 
                className="payment-skip-button"
                onClick={() => {
                  toast.info('You can complete payment later');
                  window.location.href = '/';
                }}
              >
                Skip for Now
              </button>
            </div>
          </div>
        </div>
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
              {/* Basic Plan */}
              <div
                className={`subscription-box-small ${selectedSubscription === "user" ? "selected-small" : ""}`}
                onClick={() => !isLoading && handleSubscriptionClick("user")}
              >
                <div className="premium-badge-small">Popular</div>
                <h3 className="subscription-title-small">Basic Plan</h3>
                <div className="subscription-price-small">$5/month</div>
                <p className="subscription-description-small">For individual users</p>
                
                <ul className="features-list-small">
                  <li>Buy Films & Scripts</li>
                  <li>Sell Your Content</li>
                  <li>Basic Support</li>
                </ul>

                {selectedSubscription === "user" && (
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
                <p className="subscription-description-small">For professionals</p>
                
                <ul className="features-list-small">
                  <li>All Basic Features</li>
                  <li>Priority Support</li>
                  <li>Team Collaboration</li>
                </ul>

                {selectedSubscription === "studio" && (
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
              className="popup-button-small" 
              onClick={closePopup}
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