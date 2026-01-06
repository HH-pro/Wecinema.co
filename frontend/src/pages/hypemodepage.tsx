import { useState, useEffect, useRef } from "react";
import { Layout } from "../components";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleProvider } from "../firebase/config";
import { decodeToken } from "../utilities/helperfFunction";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PayPalButtonWrapper from '../components/PaymentComponent/PayPalButtonWrapper';
import PaymentSuccessPopup from '../components/PaymentComponent/SuccessPopup';
import { signup, signin, getUser, updatePaymentStatus } from "../api";
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
      
      const justLoggedIn = localStorage.getItem('hypeModeJustLoggedIn');
      if (justLoggedIn === 'true') {
        console.log('Detected recent login, redirecting to home...');
        localStorage.removeItem('hypeModeJustLoggedIn');
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
        return;
      }
      
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

        // Check user payment status using API function
        const user = await getUser(userId);
        
        if (user.hasPaid) {
          // User has paid, redirect to home
          console.log('User already paid, redirecting...');
          window.location.href = '/';
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
            // Set localStorage marker and redirect
            localStorage.setItem('hypeModeJustLoggedIn', 'true');
            window.location.href = '/';
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [loginSuccess, navigate]);

  // Check payment status using API function
  const checkPaymentStatus = async (userId: string) => {
    try {
      const user = await getUser(userId);
      
      if (user.hasPaid) {
        // User has paid - set success state
        setUserId(userId);
        setIsLoggedIn(true);
        setLoginSuccess(true);
        
        // Store marker for immediate redirect
        localStorage.setItem('hypeModeJustLoggedIn', 'true');
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
      setIsLoading(false);
    }
  };

  // Register user using API function
  const registerUser = async (username: string, email: string, avatar: string, userType: string) => {
    try {
      const response = await signup(username, email, avatar, userType, setIsLoading);
      
      const token = response.token;
      const userId = response.id;

      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('hypeModeJustLoggedIn', 'true');
        setIsLoggedIn(true);
        setUserId(userId);
        return { success: true, userId };
      }
      return { success: false };
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.message?.includes('Email already exists')) {
        setPopupMessage('Email already exists. Please sign in.');
      } else {
        setPopupMessage('Registration failed. Please try again.');
      }
      setShowPopup(true);
      return { success: false };
    }
  };

  // Login user using API function
  const loginUser = async (email: string) => {
    try {
      const response = await signin(email, setIsLoading);
      const backendToken = response.token;
      const userId = response.id;

      if (backendToken) {
        localStorage.setItem('token', backendToken);
        localStorage.setItem('hypeModeJustLoggedIn', 'true');
        setIsLoggedIn(true);
        setUserId(userId);
        return { success: true, userId };
      }
      return { success: false };
    } catch (error: any) {
      setPopupMessage(error.message || 'Login failed.');
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

  const handlePaymentSuccess = async () => {
    try {
      // Update payment status in backend
      if (userId) {
        await updatePaymentStatus(userId, true);
      }
      
      setShowPaymentSuccess(true);
      setShowPaymentComponent(false);
      
      // Auto redirect after payment success
      setTimeout(() => {
        localStorage.setItem('hypeModeJustLoggedIn', 'true');
        window.location.href = '/';
      }, 3000);
    } catch (error) {
      console.error('Error updating payment status:', error);
      setPopupMessage('Payment successful but status update failed.');
      setShowPopup(true);
    }
  };

  const handleForceRedirect = () => {
    localStorage.setItem('hypeModeJustLoggedIn', 'true');
    window.location.href = '/';
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
          localStorage.setItem('hypeModeJustLoggedIn', 'true');
          window.location.href = '/';
        }}
      />
    );
  }

  // Show success popup when login is successful
  if (loginSuccess) {
    return (
      <>
        <div className="overlay" />
        <div className="success-popup">
          <div className="success-icon">✅</div>
          <h2 className="success-title">Login Successful!</h2>
          <p className="success-message">
            You're being redirected to the home page.
          </p>
          <div className="countdown-text">
            Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
          </div>
          <button className="close-button" onClick={handleForceRedirect}>
            Go Now
          </button>
        </div>
      </>
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
              <p className="payment-description">Subscription Plan: {selectedSubscription === "user" ? "Basic Plan" : "Pro Plan"}</p>
              <p className="payment-description">User Type: {userType === "buyer" ? "👤 Buyer" : "🏪 Seller"}</p>
              <p className="payment-amount">
                Total Amount: ${selectedSubscription === 'user' ? 5 : 10}
              </p>
              <p className="payment-description">Secure payment powered by PayPal</p>
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
                  setTimeout(() => {
                    localStorage.setItem('hypeModeJustLoggedIn', 'true');
                    window.location.href = '/';
                  }, 1000);
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