import { useState, useEffect } from "react";
import axios from 'axios';
import { Layout } from "../components";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { googleProvider } from "../firebase/config";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import "../css/HypeModeProfile.css";

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
  const [hasPaid, setHasPaid] = useState(false);

  // Check user payment status
  const checkPaymentStatus = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`https://wecinema.co/api/user/payment-status/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data.hasPaid || false;
    } catch (error) {
      console.error("Error checking payment status:", error);
      return false;
    }
  };

  // Component mount pe authentication status check
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = localStorage.getItem('token');
        if (token) {
          setIsLoggedIn(true);
          
          // User ID extract karo Firebase user se ya backend response se
          const userId = user.uid;
          
          // Payment status check karo
          const paidStatus = await checkPaymentStatus(userId);
          setHasPaid(paidStatus);
          
          // Agar user already paid hai, toh home page redirect karo
          if (paidStatus) {
            navigate('/home');
          }
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Register user with backend
  const registerUser = async (username: string, email: string, avatar: string, userType: string) => {
    try {
      const res = await axios.post('https://wecinema.co/api/user/signup', {
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
      const res = await axios.post('https://wecinema.co/api/user/signin', { email });
      const backendToken = res.data.token;
      const userId = res.data.id;

      if (backendToken) {
        localStorage.setItem('token', backendToken);
        setIsLoggedIn(true);
        setUserId(userId);
        setPopupMessage('Login successful!');
        setShowPopup(true);
        
        // Login ke baad payment status check karo
        const paidStatus = await checkPaymentStatus(userId);
        setHasPaid(paidStatus);
        
        return { success: true, hasPaid: paidStatus };
      }
    } catch (error: any) {
      if (error.response) {
        setPopupMessage(error.response.data.message || 'Login failed.');
      } else {
        setPopupMessage('Login failed.');
      }
      setShowPopup(true);
      return { success: false, hasPaid: false };
    }
  };

  // Handle successful authentication
  const onLoginSuccess = async (user: any, isEmailAuth: boolean = false) => {
    const profile = user.providerData[0];
    const email = profile.email;
    const username = profile.displayName || email.split('@')[0];
    const avatar = profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;

    try {
      if (isSignup) {
        const success = await registerUser(username, email, avatar, userType);
        if (success) {
          // New registration hai, toh payment page pe jao
          navigateToPayment();
        }
      } else {
        const result = await loginUser(email);
        if (result.success) {
          // Agar user already paid hai, toh home page redirect
          if (result.hasPaid) {
            navigate('/home');
          } else {
            // Payment pending hai, toh payment page pe jao
            navigateToPayment();
          }
        }
      }
    } catch (error) {
      setPopupMessage('Authentication failed. Please try again.');
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToPayment = () => {
    setTimeout(() => {
      setShowPopup(false);
      navigate('/payment', { 
        state: { 
          subscriptionType: selectedSubscription, 
          amount: selectedSubscription === 'user' ? 5 : 10, 
          userId,
          userType 
        } 
      });
    }, 2000);
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

  // Google Logout
  const handleGoogleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      setHasPaid(false);
      setPopupMessage('Logout successful.');
      setShowPopup(true);
    } catch (error) {
      setPopupMessage('Logout failed. Please try again.');
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

  useEffect(() => {
    setShowFireworks(true);
    setTimeout(() => setShowFireworks(false), 1000);
  }, []);

  // Agar user already logged in hai aur paid bhi hai, toh home page show karo
  if (isLoggedIn && hasPaid) {
    return (
      <Layout expand={false} hasHeader={true}>
        <div className="already-logged-in-container">
          <h2>Welcome Back! 🎉</h2>
          <p>You're already logged in and have an active subscription.</p>
          <button 
            className="subscription-button-small"
            onClick={() => navigate('/home')}
          >
            Go to Home
          </button>
          <button 
            className="subscription-button-small logout-button-small"
            onClick={handleGoogleLogout}
          >
            Logout
          </button>
        </div>
      </Layout>
    );
  }

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

        {isLoggedIn && !hasPaid ? (
          <div className="payment-pending-container">
            <h2>Payment Required</h2>
            <p>Please complete your payment to access HypeMode features.</p>
            <button 
              className="subscription-button-small"
              onClick={() => navigate('/payment', { 
                state: { 
                  subscriptionType: selectedSubscription, 
                  amount: selectedSubscription === 'user' ? 5 : 10, 
                  userId,
                  userType 
                } 
              })}
            >
              Complete Payment
            </button>
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