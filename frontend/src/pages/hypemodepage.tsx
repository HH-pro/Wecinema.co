import { useState, useEffect } from "react";
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

const HypeModeProfile = () => {
  const navigate = useNavigate();
  const [popupMessage, setPopupMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState<"user" | "studio" | null>(null);
  const [userType, setUserType] = useState<"buyer" | "seller">("buyer");
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentComponent, setShowPaymentComponent] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [userId, setUserId] = useState('');

  // SIMPLE: Check on load if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Already logged in, go to home immediately
      window.location.href = '/';
    }
  }, []);

  // SIMPLE: Register user
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

  // SIMPLE: Login user
  const loginUser = async (email: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/user/signin`, { email });
      const backendToken = res.data.token;
      const userId = res.data.id;

      if (backendToken) {
        localStorage.setItem('token', backendToken);
        return { success: true, userId };
      }
      return { success: false };
    } catch (error: any) {
      setPopupMessage(error.response?.data?.message || 'Login failed.');
      setShowPopup(true);
      return { success: false };
    }
  };

  // SIMPLE: Check payment status and redirect
  const checkPaymentAndRedirect = async (userId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
      const user = response.data;
      
      if (user.hasPaid) {
        // User has paid - REDIRECT IMMEDIATELY
        sessionStorage.setItem('redirectAfterLogin', 'true');
        window.location.href = '/';
      } else {
        // User hasn't paid, show payment
        setUserId(userId);
        setShowPaymentComponent(true);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
      setPopupMessage('Error checking payment status.');
      setShowPopup(true);
    }
  };

  // SIMPLE: Handle login success
  const handleLoginSuccess = async (email: string, displayName?: string, photoURL?: string, isGoogle = false) => {
    try {
      let result;
      
      if (isSignup) {
        const avatar = photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || email.split('@')[0])}&background=random`;
        result = await registerUser(displayName || email.split('@')[0], email, avatar, userType);
      } else {
        result = await loginUser(email);
      }
      
      if (result.success && result.userId) {
        await checkPaymentAndRedirect(result.userId);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      setPopupMessage('Authentication failed.');
      setShowPopup(true);
      setIsLoading(false);
    }
  };

  // SIMPLE: Google Login
  const handleGoogleLogin = async () => {
    if (!selectedSubscription) {
      setPopupMessage("Please select a subscription plan.");
      setShowPopup(true);
      return;
    }

    setIsLoading(true);
    const auth = getAuth();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await handleLoginSuccess(user.email!, user.displayName, user.photoURL, true);
    } catch (error: any) {
      setIsLoading(false);
      setPopupMessage('Google login failed.');
      setShowPopup(true);
    }
  };

  // SIMPLE: Email Signup/Login
  const handleEmailAuth = async () => {
    if (!selectedSubscription) {
      setPopupMessage("Please select a subscription plan.");
      setShowPopup(true);
      return;
    }

    if (isSignup && !username) {
      setPopupMessage("Please enter username.");
      setShowPopup(true);
      return;
    }

    if (!email || !password) {
      setPopupMessage("Please enter email and password.");
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
      if (isSignup) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await handleLoginSuccess(user.email!, username, user.photoURL);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await handleLoginSuccess(user.email!);
      }
    } catch (error: any) {
      setIsLoading(false);
      
      let message = 'Authentication failed.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Email already in use. Please login.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/user-not-found') {
        message = 'No user found with this email. Please sign up.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      }
      
      setPopupMessage(message);
      setShowPopup(true);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    setIsLoading(false);
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
    
    // SIMPLE: Redirect after payment
    setTimeout(() => {
      sessionStorage.setItem('redirectAfterLogin', 'true');
      window.location.href = '/';
    }, 2000);
  };

  const handleSkipPayment = () => {
    toast.info('You can complete payment later');
    setTimeout(() => {
      sessionStorage.setItem('redirectAfterLogin', 'true');
      window.location.href = '/';
    }, 1000);
  };

  // Show payment success
  if (showPaymentSuccess && selectedSubscription) {
    return (
      <PaymentSuccessPopup
        isVisible={showPaymentSuccess}
        subscriptionType={selectedSubscription}
        userType={userType}
        amount={selectedSubscription === 'user' ? 5 : 10}
        onClose={() => {
          setShowPaymentSuccess(false);
          sessionStorage.setItem('redirectAfterLogin', 'true');
          window.location.href = '/';
        }}
      />
    );
  }

  // Show payment component
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
                Total: ${selectedSubscription === 'user' ? 5 : 10}
              </p>
              <p className="payment-description">Secure PayPal payment</p>
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
                onClick={handleSkipPayment}
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
            onClick={() => !isLoading && setSelectedSubscription("user")}
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
            onClick={() => !isLoading && setSelectedSubscription("studio")}
          >
            <div className="premium-badge-small">Pro</div>
            <h3 className="subscription-title-small">Pro Plan</h3>
            <div className="subscription-price-small">$10/month</div>
            <p className="subscription-description-small">Advanced features</p>
            
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