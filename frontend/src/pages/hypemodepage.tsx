import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleProvider } from "../firebase/config";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import { Layout } from "../components";
import { authAPI } from "../api"; // Import from your api file
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

  // Register user with backend using api.ts
  const registerUser = async (username: string, email: string, avatar: string, userType: string) => {
    setIsLoading(true);
    try {
      const res = await authAPI.signup(
        {
          username,
          email,
          avatar,
          userType,
          dob: "--------"
        },
        setIsLoading
      );

      const token = res.token;
      const userId = res.user?.id;

      setPopupMessage(`Registration successful as ${userType}!`);
      setShowPopup(true);

      if (token) {
        localStorage.setItem('token', token);
        setIsLoggedIn(true);
        if (userId) setUserId(userId);
        return true;
      }
      return false;
    } catch (error: any) {
      setPopupMessage(error.message || 'Registration failed. Please try again.');
      setShowPopup(true);
      return false;
    }
  };

  // Login user with backend using api.ts
  const loginUser = async (email: string, isGoogleAuth?: boolean, password?: string) => {
    setIsLoading(true);
    try {
      const res = await authAPI.signin(
        { 
          email, 
          password: isGoogleAuth ? undefined : password,
          isGoogleAuth 
        },
        setIsLoading
      );

      const token = res.token;
      const userId = res.user?.id;

      if (token) {
        localStorage.setItem('token', token);
        setIsLoggedIn(true);
        if (userId) setUserId(userId);
        setPopupMessage('Login successful!');
        setShowPopup(true);
        return true;
      }
      return false;
    } catch (error: any) {
      setPopupMessage(error.message || 'Login failed.');
      setShowPopup(true);
      return false;
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
          navigateToPayment();
        }
      } else {
        const success = await loginUser(email, !isEmailAuth);
        if (success) {
          navigateToPayment();
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
      
      // Call backend signup through API
      const success = await registerUser(username, email, 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`, 
        userType
      );
      
      if (success) {
        navigateToPayment();
      }
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
      
      // Call backend login through API
      const success = await loginUser(email, false, password);
      
      if (success) {
        navigateToPayment();
      }
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
      authAPI.logout(); // Use API logout function
      setIsLoggedIn(false);
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
            <div className="subscription-box-small">
              <h3 className="subscription-title-small">Welcome Back!</h3>
              <p className="subscription-description-small">You are already logged in.</p>
              <button 
                className="subscription-button-small" 
                onClick={handleGoogleLogout}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Logout"}
              </button>
            </div>
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
            <button className="subscription-button-small" onClick={closePopup}>Close</button>
          </div>
        </>
      )}
    </Layout>
  );
};

export default HypeModeProfile;