import { useState, useEffect } from "react";
import axios from 'axios';
import { Layout } from "../components";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleProvider } from "./firebase";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import "../../styles/HypeModeProfile.css";

const HypeModeProfile = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [showFireworks, setShowFireworks] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<"user" | "studio" | null>(null);
  const [userType, setUserType] = useState<"buyer" | "seller">("buyer");
  const [isLoading, setIsLoading] = useState(false);

  const registerUser = async (username: string, email: string, avatar: string, userType: string, callback: any) => {
    try {
      const res = await axios.post('https://wecinema.co/api/user/signup', {
        username,
        email,
        avatar,
        dob: "--------",
        userType
      });

      const token = res.data.token;
      const userId = res.data.id;

      setPopupMessage(`Registration successful as ${userType}! Redirecting...`);
      setShowPopup(true);

      if (token) {
        setIsLoggedIn(true);
        setUserId(userId);

        setTimeout(() => {
          setShowPopup(false);
          if (callback) callback();
        }, 2000);
      }
    } catch (error: any) {
      setIsLoading(false);
      if (error.response && error.response.data && error.response.data.error === 'Email already exists.') {
        setPopupMessage('Email already exists. Please sign in instead.');
      } else {
        setPopupMessage('Registration failed. Please try again.');
      }
      setShowPopup(true);
    }
  };

  const loginUser = async (email: any, callback: any) => {
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
        if (callback) callback();
      }
    } catch (error: any) {
      setIsLoading(false);
      if (error.response) {
        setPopupMessage(error.response.data.message || 'Login failed.');
      } else {
        setPopupMessage('Login failed. Please check your credentials.');
      }
      setShowPopup(true);
    }
  };

  const onLoginSuccess = async (user: any, isEmailAuth: boolean = false) => {
    const profile = user.providerData[0];
    const email = profile.email;
    const username = profile.displayName || email.split('@')[0];
    const avatar = profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;

    try {
      const callback = () => {
        setIsLoading(false);
        navigate('/payment', { 
          state: { 
            subscriptionType: selectedSubscription, 
            amount: selectedSubscription === 'user' ? 5 : 10, 
            userId,
            userType 
          } 
        });
      };

      // For email authentication, we need to check if user exists in backend
      if (isEmailAuth) {
        if (isSignup) {
          await registerUser(username, email, avatar, userType, callback);
        } else {
          await loginUser(email, callback);
        }
      } else {
        // For Google auth, proceed directly
        if (isSignup) {
          await registerUser(username, email, avatar, userType, callback);
        } else {
          await loginUser(email, callback);
        }
      }
    } catch (error) {
      setIsLoading(false);
      setPopupMessage('Authentication failed. Please try again.');
      setShowPopup(true);
    }
  };

  const onLoginFailure = (error: any) => {
    setIsLoading(false);
    console.error('Authentication error:', error);
    
    // More specific error messages
    if (error.code === 'auth/invalid-email') {
      setPopupMessage('Invalid email address format.');
    } else if (error.code === 'auth/user-disabled') {
      setPopupMessage('This account has been disabled.');
    } else if (error.code === 'auth/user-not-found') {
      setPopupMessage('No account found with this email. Please sign up.');
    } else if (error.code === 'auth/wrong-password') {
      setPopupMessage('Incorrect password. Please try again.');
    } else if (error.code === 'auth/network-request-failed') {
      setPopupMessage('Network error. Please check your connection.');
    } else {
      setPopupMessage('Authentication failed. Please try again.');
    }
    setShowPopup(true);
  };

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
      onLoginFailure(error);
    }
  };

  const handleGoogleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setPopupMessage('Logout successful.');
      setShowPopup(true);
    } catch (error) {
      setPopupMessage('Logout failed. Please try again.');
      setShowPopup(true);
    }
  };

  const handleEmailSignup = async () => {
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
      onLoginFailure(error);
    }
  };

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
      onLoginFailure(error);
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
    setSelectedSubscription(null);
  };

  useEffect(() => {
    setShowFireworks(true);
    setTimeout(() => setShowFireworks(false), 1000);
  }, []);

  return (
    <Layout expand={false} hasHeader={true}>
      <div className="banner">
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

      <div className="main-container">
        <button className="toggle-button" onClick={toggleSignupSignin} disabled={isLoading}>
          {isSignup ? "Already have an account? Switch to Sign in" : "Don't have an account? Switch to Sign up"}
        </button>

        {isLoggedIn ? (
          <div className="cards-container">
            <div className="subscription-box">
              <h3 className="subscription-title">Logout</h3>
              <button className="subscription-button" onClick={handleGoogleLogout} disabled={isLoading}>
                {isLoading ? "Processing..." : "Logout"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* User Type Selector - Only show for signup */}
            {isSignup && (
              <div className="user-type-selector">
                <button 
                  className={`user-type-button ${userType === "buyer" ? "active" : ""}`}
                  onClick={() => setUserType("buyer")}
                  disabled={isLoading}
                >
                  👤 Sign up as Buyer
                </button>
                <button 
                  className={`user-type-button ${userType === "seller" ? "active" : ""}`}
                  onClick={() => setUserType("seller")}
                  disabled={isLoading}
                >
                  🏪 Sign up as Seller
                </button>
              </div>
            )}

            <div className="cards-container">
              {/* User Subscription Box */}
              <div
                className={`subscription-box ${selectedSubscription === "user" ? "selected" : ""}`}
                onClick={() => !isLoading && handleSubscriptionClick("user")}
              >
                <div className="premium-badge">Popular</div>
                <h3 className="subscription-title">Basic Plan</h3>
                <div className="subscription-price">$5/month</div>
                <p className="subscription-description">Perfect for individual users and content enthusiasts</p>
                
                <ul className="features-list">
                  <li>Buy Films & Scripts</li>
                  <li>Sell Your Content</li>
                  <li>Basic Support</li>
                  <li>Access to Community</li>
                  <li>5GB Storage</li>
                </ul>

                <button 
                  className="subscription-button" 
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : (isSignup ? "Sign up with Google" : "Sign in with Google")}
                </button>
                
                <div className="email-form">
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button 
                    className="subscription-button email-button"
                    onClick={isSignup ? handleEmailSignup : handleEmailLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : (isSignup ? "Sign up with Email" : "Sign in with Email")}
                  </button>
                </div>
              </div>

              {/* Studio Subscription Box */}
              <div
                className={`subscription-box ${selectedSubscription === "studio" ? "selected" : ""}`}
                onClick={() => !isLoading && handleSubscriptionClick("studio")}
              >
                <div className="premium-badge">Pro</div>
                <h3 className="subscription-title">Pro Plan</h3>
                <div className="subscription-price">$10/month</div>
                <p className="subscription-description">Advanced features for studios and professional creators</p>
                
                <ul className="features-list">
                  <li>All Basic Features</li>
                  <li>Early Feature Access</li>
                  <li>Priority Support</li>
                  <li>Advanced Analytics</li>
                  <li>50GB Storage</li>
                  <li>Team Collaboration</li>
                  <li>Custom Branding</li>
                </ul>

                <button 
                  className="subscription-button" 
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : (isSignup ? "Sign up with Google" : "Sign in with Google")}
                </button>
                
                <div className="email-form">
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button 
                    className="subscription-button email-button"
                    onClick={isSignup ? handleEmailSignup : handleEmailLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : (isSignup ? "Sign up with Email" : "Sign in with Email")}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Popup Message */}
      {showPopup && (
        <>
          <div className="overlay" onClick={closePopup} />
          <div className="popup">
            <p>{popupMessage}</p>
            <button className="subscription-button" onClick={closePopup}>
              {isLoading ? "Processing..." : "Close"}
            </button>
          </div>
        </>
      )}
    </Layout>
  );
};

export default HypeModeProfile;