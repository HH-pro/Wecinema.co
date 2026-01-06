import { useState, useEffect } from "react";
import { Layout } from "../components";
import { getAuth, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleProvider } from "../firebase/config";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PayPalButtonWrapper from '../components/PaymentComponent/PayPalButtonWrapper';
import PaymentSuccessPopup from '../components/PaymentComponent/SuccessPopup';
import { checkAuthAndRedirect, completeLoginFlow, getUser, updatePaymentStatus } from "../api";
import "../css/HypeModeProfile.css";

// Main HypeModeProfile Component
const HypeModeProfile = () => {
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

  // Check auth and redirect on initial load
  useEffect(() => {
    const initCheck = async () => {
      const shouldRedirect = await checkAuthAndRedirect();
      if (shouldRedirect) {
        // Already redirected by checkAuthAndRedirect
        return;
      }
    };
    
    initCheck();
  }, []);

  // Handle Google Login
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
      const profile = user.providerData[0];
      const email = profile.email;
      const username = profile.displayName || email.split('@')[0];
      const avatar = profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;

      // Use the new completeLoginFlow function
      const loginResult = await completeLoginFlow(
        email,
        isSignup,
        username,
        avatar,
        userType,
        setIsLoading
      );
      
      if (loginResult.success && loginResult.userId) {
        if (loginResult.shouldRedirect) {
          // Already redirected by completeLoginFlow
          return;
        } else {
          // Not paid, show payment
          setUserId(loginResult.userId);
          setShowPaymentComponent(true);
        }
      } else {
        setPopupMessage('Authentication failed. Please try again.');
        setShowPopup(true);
      }
    } catch (error: any) {
      setIsLoading(false);
      if (error.code === 'auth/popup-closed-by-user') {
        setPopupMessage('Login cancelled.');
      } else {
        setPopupMessage('Google login failed. Please try again.');
      }
      setShowPopup(true);
    }
  };

  // Handle Email Signup/Login
  const handleEmailAuth = async () => {
    if (!selectedSubscription) {
      setPopupMessage("Please select a subscription plan first.");
      setShowPopup(true);
      return;
    }

    if (isSignup && (!email || !password || !username)) {
      setPopupMessage("Please enter username, email and password.");
      setShowPopup(true);
      return;
    }

    if (!isSignup && (!email || !password)) {
      setPopupMessage("Please enter both email and password.");
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
      let user;
      if (isSignup) {
        // Create Firebase account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      } else {
        // Login with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }
      
      const profile = user.providerData[0];
      const emailAddr = profile.email;
      const usernameForAPI = username || emailAddr.split('@')[0];
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(usernameForAPI)}&background=random`;

      // Use the new completeLoginFlow function
      const loginResult = await completeLoginFlow(
        emailAddr,
        isSignup,
        usernameForAPI,
        avatar,
        userType,
        setIsLoading
      );
      
      if (loginResult.success && loginResult.userId) {
        if (loginResult.shouldRedirect) {
          // Already redirected by completeLoginFlow
          return;
        } else {
          // Not paid, show payment
          setUserId(loginResult.userId);
          setShowPaymentComponent(true);
        }
      } else {
        setPopupMessage(isSignup ? 'Registration failed.' : 'Login failed.');
        setShowPopup(true);
      }
    } catch (error: any) {
      setIsLoading(false);
      
      // Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        setPopupMessage('Email already in use. Please login.');
      } else if (error.code === 'auth/user-not-found') {
        setPopupMessage('User not found. Please sign up.');
      } else if (error.code === 'auth/wrong-password') {
        setPopupMessage('Incorrect password.');
      } else if (error.code === 'auth/invalid-email') {
        setPopupMessage('Invalid email address.');
      } else if (error.code === 'auth/weak-password') {
        setPopupMessage('Password should be at least 6 characters.');
      } else {
        setPopupMessage(isSignup ? 'Signup failed.' : 'Login failed.');
      }
      
      setShowPopup(true);
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
      // Update payment status
      if (userId) {
        await updatePaymentStatus(userId, true);
      }
      
      setShowPaymentSuccess(true);
      setShowPaymentComponent(false);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      console.error('Error updating payment status:', error);
      setPopupMessage('Payment successful but status update failed.');
      setShowPopup(true);
    }
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

  // If user needs to pay, show payment component
  if (showPaymentComponent && selectedSubscription && userId) {
    return (
      <Layout expand={false} hasHeader={true}>
        <div className="payment-container">
          <div className="payment-subscription-box">
            <div>
              <h2 className="payment-title">Complete Your Subscription</h2>
              <p className="payment-description">Plan: {selectedSubscription === "user" ? "Basic" : "Pro"}</p>
              <p className="payment-description">User Type: {userType === "buyer" ? "👤 Buyer" : "🏪 Seller"}</p>
              <p className="payment-amount">Amount: ${selectedSubscription === 'user' ? 5 : 10}</p>
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

  // Main render
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

        {!showPaymentComponent && (
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
                        onClick={handleEmailAuth} 
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
                        onClick={handleEmailAuth} 
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