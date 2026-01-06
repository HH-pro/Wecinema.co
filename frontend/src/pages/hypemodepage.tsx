import { useState, useEffect } from "react";
import axios from 'axios';
import { Layout } from "../components";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleProvider } from "../firebase/config";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import "../css/HypeModeProfile.css";

// Import payment component dependencies
import styled from 'styled-components';
import { decodeToken } from "../utilities/helperfFunction";
import { getRequest } from "../api";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PayPalButtonWrapper from './PayPalButtonWrapper';
import { API_BASE_URL } from "../api";

// Payment Component Styled Components
const Container = styled.div`
  display: flex;
  justify-content: center;
  padding: 100px 20px;
  background: linear-gradient(to right, #ffffa1 0%, #ffc800 100%);
  color: #333;
`;

const PaymentSubscriptionBox = styled.div`
  padding: 40px;
  border: 2px dashed #000;
  text-align: center;
  width: 100%;
  max-width: 500px;
  background-color: #fff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 10px;
`;

const Title = styled.h2`
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: bold;
`;

const Description = styled.p`
  font-size: 18px;
  margin-bottom: 30px;
`;

const PaymentPopup = styled.div`
  position: fixed;
  top: 50%; 
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 30px;
  background: #fff;
  border: 2px solid #000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  border-radius: 10px;
  max-width: 400px;
  text-align: center;
`;

const PaymentOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
`;

const PaymentButton = styled.button`
  background: #28a745;
  color: #fff;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 16px;
  border-radius: 5px;
  transition: background 0.3s;
  margin-top: 20px;

  &:hover {
    background: #218838;
  }
`;

interface TransactionPopupProps {
  message: string;
  onClose: () => void;
  isError: boolean;
}

// Payment Component
const PaymentComponent: React.FC<{ 
  subscriptionType: string; 
  amount: number; 
  userId: string; 
  userType: string 
}> = ({ subscriptionType, amount, userId, userType }) => {
  const navigate = useNavigate();

  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [userHasPaid, setUserHasPaid] = useState(false);
  const [loading, setLoading] = useState<any>({});
  const [user, setUser] = useState<any>({});
  const [redirect, setRedirect] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  
  const token = localStorage.getItem("token") || null;
  let username = null;

  if (token) {
    const tokenData = decodeToken(token);
    username = tokenData?.username || null;
  }

  useEffect(() => {
    if (!userId) {
      console.error('User ID is not defined.');
      return;
    }

    const fetchData = async () => {
      try {
        const result = await getRequest(`/user/${userId}`, setLoading);
        setUser(result);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();

    const checkUserPaymentStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
        const user = response.data;
    
        if (!user.hasPaid) {
          return;
        }
    
        if (user.subscriptionType !== subscriptionType) {
          setPopupMessage(`Your subscription type is '${user.subscriptionType}'. Please log in again.`);
          setShowPopup(true);
          setShowOverlay(true);
          localStorage.removeItem("token");
          setTimeout(() => {
            navigate("/hypemode");
          }, 4000);
          return;
        } else {
          setRedirect(true);
        }
    
        const today: any = new Date();
        const lastPayment: any = new Date(user.lastPayment);
        const diffTime = Math.abs(today - lastPayment);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
        if (diffDays >= 30) {
          await axios.post(`${API_BASE_URL}/user/update-payment-status`, { 
            userId, 
            hasPaid: false 
          });
          setUserHasPaid(false);
          setPopupMessage('Your subscription has expired. Please renew to continue.');
          setIsError(true);
          setShowPopup(true);
        } else if (diffDays > 28) {
          setPopupMessage('It\'s been over 28 days since your last payment. Please update your subscription.');
          setShowPopup(true);
        } else {
          setUserHasPaid(user.hasPaid);
        }
    
      } catch (error) {
        console.error('Error fetching user payment status:', error);
      }
    };

    checkUserPaymentStatus();
  }, [userId]);

  useEffect(() => {
    if (redirect) {
      navigate('/');
    }
  }, [redirect, navigate]);

  const handlePaymentSuccess = async (details: any) => {
    try {
      if (!details.id || !details.payer) {
        throw new Error('Incomplete transaction details');
      }

      const response = await axios.post(`${API_BASE_URL}/user/save-transaction`, {
        userId: userId,
        username: username,
        email: details.payer.email_address,
        orderId: details.id,
        payerId: details.payer.payer_id,
        amount: amount,
        currency: 'USD',
        subscriptionType
      });

      setPopupMessage('Transaction completed successfully!');
      setIsError(false);
      setShowPopup(true);
      setUserHasPaid(false);
      
      toast.success('Transaction successful! Redirecting to profile...');

      setTimeout(() => {
        setRedirect(true);
      }, 2000);

    } catch (error) {
      console.error('Failed to save transaction:', error);
      handlePaymentError('Failed to save transaction. Please try again.');
    }
  };

  const handlePaymentError = (message: any) => {
    setPopupMessage(message);
    setIsError(true);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
  };

  const TransactionPopup: React.FC<TransactionPopupProps> = ({ message, onClose, isError }) => (
    <>
      <PaymentOverlay onClick={onClose} />
      <PaymentPopup>
        <h3>{isError ? 'Error' : 'Success'}!</h3>
        <p>{message}</p>
        <PaymentButton onClick={onClose}>Close</PaymentButton>
      </PaymentPopup>
    </>
  );

  return (
    <Layout expand={false} hasHeader={true}>
      <Container>
        {showOverlay && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <p>{popupMessage}</p>
            </div>
          </div>
        )}

        {!userHasPaid ? (
          <>
            <PaymentSubscriptionBox>
              <div>
                <Title>Proceed to Payment</Title>
                <Description>Your subscription type: {subscriptionType}</Description>
                <Description>User type: {userType}</Description>
                <Description>Amount: ${amount}</Description>
                <Description>Pay with PayPal or Debit Card</Description>
                <PayPalButtonWrapper 
                  amount={amount} 
                  userId={userId} 
                  onSuccess={handlePaymentSuccess} 
                  onError={handlePaymentError} 
                />
              </div>
            </PaymentSubscriptionBox>
            {showPopup && (
              <TransactionPopup 
                message={popupMessage} 
                onClose={() => setShowPopup(false)} 
                isError={isError} 
              />
            )}
          </>
        ) : (
          <PaymentSubscriptionBox>
            <Title>Go back to Home</Title>
            <Description>Congratulations, you successfully subscribed to hypemode.</Description>
          </PaymentSubscriptionBox>
        )}
      </Container>
    </Layout>
  );
};

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
  const [showFireworks, setShowFireworks] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<"user" | "studio" | null>(null);
  const [userType, setUserType] = useState<"buyer" | "seller">("buyer");
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentComponent, setShowPaymentComponent] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Check if user has paid on component mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const tokenData = decodeToken(token);
      const userId = tokenData?.userId || tokenData?.id;
      
      if (userId) {
        checkPaymentStatus(userId);
      }
    }
  }, []);

  // Handle redirect after login success
  useEffect(() => {
    if (loginSuccess) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 3000); // 3 seconds delay
      
      return () => clearTimeout(timer);
    }
  }, [loginSuccess, navigate]);

  const checkPaymentStatus = async (userId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
      const user = response.data;
      
      if (user.hasPaid) {
        // User has paid, set login success
        setUserId(userId);
        setIsLoggedIn(true);
        setLoginSuccess(true);
        setPopupMessage('Login successful! Redirecting to home...');
        setShowPopup(true);
      } else {
        // User hasn't paid, show payment component
        setUserId(userId);
        setIsLoggedIn(true);
        setShowPaymentComponent(true);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  // Register user with backend
  const registerUser = async (username: string, email: string, avatar: string, userType: string) => {
    try {
      const res = await axios.post('https://wecinema-co.onrender.com/user/signup', {
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
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error === 'Email already exists.') {
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
      const res = await axios.post('https://wecinema-co.onrender.com/user/signin', { email });
      const backendToken = res.data.token;
      const userId = res.data.id;

      if (backendToken) {
        localStorage.setItem('token', backendToken);
        setIsLoggedIn(true);
        setUserId(userId);
        return { success: true, userId };
      }
    } catch (error: any) {
      if (error.response) {
        setPopupMessage(error.response.data.message || 'Login failed.');
      } else {
        setPopupMessage('Login failed.');
      }
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
      if (isSignup) {
        const result = await registerUser(username, email, avatar, userType);
        if (result.success && result.userId) {
          // Check payment status after successful registration
          await checkPaymentStatus(result.userId);
        }
      } else {
        const result = await loginUser(email);
        if (result.success && result.userId) {
          // Check payment status after successful login
          await checkPaymentStatus(result.userId);
        }
      }
    } catch (error) {
      setPopupMessage('Authentication failed. Please try again.');
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
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
      setLoginSuccess(false);
      setShowPaymentComponent(false);
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

  // If login is successful and user has paid, show success popup (will auto redirect)
  if (loginSuccess) {
    return (
      <Layout expand={false} hasHeader={true}>
        <div className="main-container-small">
          {showPopup && (
            <>
              <div className="overlay" onClick={closePopup} />
              <div className="popup-small">
                <p className="popup-text-small">{popupMessage}</p>
                <button className="subscription-button-small" onClick={closePopup}>Close</button>
              </div>
            </>
          )}
        </div>
      </Layout>
    );
  }

  // If user is logged in but hasn't paid, show payment component
  if (showPaymentComponent && selectedSubscription && userId) {
    return (
      <PaymentComponent 
        subscriptionType={selectedSubscription} 
        amount={selectedSubscription === 'user' ? 5 : 10} 
        userId={userId}
        userType={userType}
      />
    );
  }

  // Render the main component
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
            {/* Show logout button if logged in but not showing payment component */}
            <button className="subscription-button-small" onClick={handleGoogleLogout}>
              Logout
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

      {showPopup && !loginSuccess && (
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