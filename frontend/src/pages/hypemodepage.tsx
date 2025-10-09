import { useState, useEffect } from "react";
import axios from 'axios';
import { Layout } from "../components";
import { useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import "../css/HypeModeProfile.css";

const API_BASE_URL = 'http://localhost:3000';

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
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Common success handler
  const handleAuthSuccess = (token: string, user: any, message: string) => {
    localStorage.setItem('token', token);
    setIsLoggedIn(true);
    setUserId(user.id);
    setPopupMessage(message);
    setShowPopup(true);

    setTimeout(() => {
      setShowPopup(false);
      navigate('/payment', { 
        state: { 
          subscriptionType: selectedSubscription, 
          amount: selectedSubscription === 'user' ? 5 : 10, 
          userId: user.id,
          userType: user.userType || 'buyer'
        } 
      });
    }, 2000);
  };

  // Email & Password Signup
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
    try {
      const response = await axios.post(`${API_BASE_URL}/user/signup`, {
        username,
        email,
        password,
        userType,
        dob: "--------",
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
        isGoogleAuth: false
      });

      const { token, user } = response.data;
      handleAuthSuccess(token, user, `Registration successful as ${userType}!`);
    } catch (error: any) {
      setIsLoading(false);
      setPopupMessage(error.response?.data?.error || 'Registration failed. Please try again.');
      setShowPopup(true);
    }
  };

  // Email & Password Login
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
    try {
      const response = await axios.post(`${API_BASE_URL}/user/signin`, {
        email,
        password,
        isGoogleAuth: false
      });

      const { token, user } = response.data;
      handleAuthSuccess(token, user, 'Login successful!');
    } catch (error: any) {
      setIsLoading(false);
      setPopupMessage(error.response?.data?.error || 'Login failed. Please check your credentials.');
      setShowPopup(true);
    }
  };

  // Toggle email form visibility
  const toggleEmailForm = () => {
    setShowEmailForm(!showEmailForm);
    // Reset form fields when closing
    if (showEmailForm) {
      setEmail('');
      setPassword('');
      setUsername('');
    }
  };

  // Direct email form submit
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
    // Auto-show email form when subscription is selected
    setShowEmailForm(true);
  };

  const toggleSignupSignin = () => {
    setIsSignup(!isSignup);
    setEmail('');
    setPassword('');
    setUsername('');
    setSelectedSubscription(null);
    setShowEmailForm(false); // Reset form visibility when switching modes
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
              <button className="subscription-button" onClick={() => {
                localStorage.removeItem('token');
                setIsLoggedIn(false);
                setPopupMessage('Logout successful!');
                setShowPopup(true);
              }} disabled={isLoading}>
                Logout
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

                {/* Email Form Section - Always Visible after selection */}
                {selectedSubscription === "user" && (
                  <div className="email-auth-section">
                    {!showEmailForm ? (
                      // Show email button to start
                      <button 
                        className="subscription-button email-toggle-button"
                        onClick={toggleEmailForm}
                        disabled={isLoading}
                      >
                        {isSignup ? "Sign up with Email" : "Sign in with Email"}
                      </button>
                    ) : (
                      // Show email form
                      <div className="email-form">
                        <div className="form-header">
                          <h4>{isSignup ? "Create Your Account" : "Sign In to Your Account"}</h4>
                          <button 
                            className="close-form-button"
                            onClick={toggleEmailForm}
                            disabled={isLoading}
                          >
                            ×
                          </button>
                        </div>
                        
                        {isSignup && (
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                          />
                        )}
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
                          className="subscription-button email-submit-button"
                          onClick={handleEmailSubmit}
                          disabled={isLoading}
                        >
                          {isLoading ? "Processing..." : (isSignup ? "Create Account" : "Sign In")}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Show message if no subscription selected */}
                {!selectedSubscription && (
                  <div className="selection-message">
                    <p>Click on this card to select Basic Plan</p>
                  </div>
                )}
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

                {/* Email Form Section - Always Visible after selection */}
                {selectedSubscription === "studio" && (
                  <div className="email-auth-section">
                    {!showEmailForm ? (
                      // Show email button to start
                      <button 
                        className="subscription-button email-toggle-button"
                        onClick={toggleEmailForm}
                        disabled={isLoading}
                      >
                        {isSignup ? "Sign up with Email" : "Sign in with Email"}
                      </button>
                    ) : (
                      // Show email form
                      <div className="email-form">
                        <div className="form-header">
                          <h4>{isSignup ? "Create Your Account" : "Sign In to Your Account"}</h4>
                          <button 
                            className="close-form-button"
                            onClick={toggleEmailForm}
                            disabled={isLoading}
                          >
                            ×
                          </button>
                        </div>
                        
                        {isSignup && (
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                          />
                        )}
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
                          className="subscription-button email-submit-button"
                          onClick={handleEmailSubmit}
                          disabled={isLoading}
                        >
                          {isLoading ? "Processing..." : (isSignup ? "Create Account" : "Sign In")}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Show message if no subscription selected */}
                {!selectedSubscription && (
                  <div className="selection-message">
                    <p>Click on this card to select Pro Plan</p>
                  </div>
                )}
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
              Close
            </button>
          </div>
        </>
      )}
    </Layout>
  );
};

export default HypeModeProfile;