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
  
  // Check initial auth
  useEffect(() => {
    const checkExistingUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      try {
        const decoded = decodeToken(token);
        if (!decoded?.userId && !decoded?.id) {
          localStorage.removeItem("token");
          return;
        }
        
        const userId = decoded.userId || decoded.id;
        const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
        
        if (response.data.hasPaid) {
          // Already paid, go to home
          window.location.href = '/';
        } else {
          // Not paid, show payment
          setUserId(userId);
          setIsLoggedIn(true);
          setShowPaymentComponent(true);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        localStorage.removeItem("token");
      }
    };
    
    checkExistingUser();
  }, []);

  // SIMPLIFIED: Check payment status directly
  const checkUserPaymentStatus = async (userId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
      const userData = response.data;
      
      if (userData.hasPaid) {
        // Already paid, redirect
        window.location.href = '/';
        return true;
      } else {
        // Not paid, show payment
        setUserId(userId);
        setShowPaymentComponent(true);
        return false;
      }
    } catch (error) {
      console.error("Payment check error:", error);
      return false;
    }
  };

  // Register user with backend (Updated)
  const registerUserWithBackend = async (username: string, email: string, avatar: string, userType: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/user/signup`, {
        username,
        email,
        avatar,
        userType,
        dob: "01-01-2000"
      });

      if (response.data.token && response.data.id) {
        localStorage.setItem('token', response.data.token);
        return {
          success: true,
          userId: response.data.id,
          token: response.data.token
        };
      }
      return { success: false };
    } catch (error: any) {
      console.error("Registration error:", error.response?.data);
      
      // If email exists, try to login instead
      if (error.response?.data?.error?.includes('already exists') || 
          error.response?.data?.error === 'Email already exists.') {
        return { 
          success: false, 
          error: 'EMAIL_EXISTS' 
        };
      }
      return { success: false, error: 'REGISTRATION_FAILED' };
    }
  };

  // Login user with backend (Updated)
  const loginUserWithBackend = async (email: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/user/signin`, { 
        email 
      });

      if (response.data.token && response.data.id) {
        localStorage.setItem('token', response.data.token);
        return {
          success: true,
          userId: response.data.id,
          token: response.data.token
        };
      }
      return { success: false };
    } catch (error: any) {
      console.error("Login error:", error.response?.data);
      
      // If user not found, suggest signup
      if (error.response?.data?.error?.includes('not found') || 
          error.response?.status === 404) {
        return { 
          success: false, 
          error: 'USER_NOT_FOUND' 
        };
      }
      return { success: false, error: 'LOGIN_FAILED' };
    }
  };

  // Handle Google login
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

      // First try to login
      let backendResult = await loginUserWithBackend(email);
      
      // If user not found and is signup mode, register
      if (!backendResult.success && backendResult.error === 'USER_NOT_FOUND' && isSignup) {
        backendResult = await registerUserWithBackend(username, email, avatar, userType);
      }
      
      if (backendResult.success && backendResult.userId) {
        // Check payment status
        await checkUserPaymentStatus(backendResult.userId);
      } else {
        // Show appropriate message
        if (backendResult.error === 'EMAIL_EXISTS') {
          setPopupMessage("Email already exists. Please sign in.");
        } else if (backendResult.error === 'USER_NOT_FOUND') {
          setPopupMessage("User not found. Please sign up first.");
        } else {
          setPopupMessage("Authentication failed. Please try again.");
        }
        setShowPopup(true);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      setIsLoading(false);
      
      if (error.code === 'auth/popup-closed-by-user') {
        setPopupMessage("Login cancelled.");
      } else {
        setPopupMessage("Google login failed. Please try again.");
      }
      setShowPopup(true);
    }
  };

  // Handle Email Signup
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
      setPopupMessage("Password should be at least 6 characters.");
      setShowPopup(true);
      return;
    }

    setIsLoading(true);
    const auth = getAuth();
    
    try {
      // 1. Create Firebase account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;

      // 2. Register with backend
      const backendResult = await registerUserWithBackend(username, email, avatar, userType);
      
      if (backendResult.success && backendResult.userId) {
        // Check payment status
        await checkUserPaymentStatus(backendResult.userId);
      } else {
        // Handle errors
        if (backendResult.error === 'EMAIL_EXISTS') {
          setPopupMessage("Email already exists. Please sign in instead.");
        } else {
          setPopupMessage("Registration failed. Please try again.");
        }
        setShowPopup(true);
        setIsLoading(false);
        
        // Delete Firebase user if backend failed
        try {
          await user.delete();
        } catch (deleteError) {
          console.error("Error cleaning up Firebase user:", deleteError);
        }
      }
    } catch (error: any) {
      console.error("Email signup error:", error);
      setIsLoading(false);
      
      if (error.code === 'auth/email-already-in-use') {
        setPopupMessage("Email already in use. Please login.");
      } else if (error.code === 'auth/weak-password') {
        setPopupMessage("Password should be at least 6 characters.");
      } else if (error.code === 'auth/invalid-email') {
        setPopupMessage("Invalid email address.");
      } else {
        setPopupMessage("Signup failed. Please try again.");
      }
      setShowPopup(true);
    }
  };

  // Handle Email Login
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
      // 1. Login with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. Login with backend
      const backendResult = await loginUserWithBackend(email);
      
      if (backendResult.success && backendResult.userId) {
        // Check payment status
        await checkUserPaymentStatus(backendResult.userId);
      } else {
        if (backendResult.error === 'USER_NOT_FOUND') {
          setPopupMessage("User not found. Please sign up first.");
        } else {
          setPopupMessage("Login failed. Please check your credentials.");
        }
        setShowPopup(true);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Email login error:", error);
      setIsLoading(false);
      
      if (error.code === 'auth/user-not-found') {
        setPopupMessage("No user found with this email.");
      } else if (error.code === 'auth/wrong-password') {
        setPopupMessage("Incorrect password.");
      } else if (error.code === 'auth/invalid-email') {
        setPopupMessage("Invalid email address.");
      } else {
        setPopupMessage("Login failed. Please try again.");
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
    
    // Redirect after success
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

  // If user is logged in but hasn't paid, show payment
  if (showPaymentComponent && selectedSubscription && userId) {
    return (
      <Layout expand={false} hasHeader={true}>
        <div className="payment-container">
          <div className="payment-subscription-box">
            <div>
              <h2 className="payment-title">Complete Payment</h2>
              <p className="payment-description">
                {selectedSubscription === "user" ? "Basic Plan ($5/month)" : "Pro Plan ($10/month)"}
              </p>
              <p className="payment-description">
                User Type: {userType === "buyer" ? "👤 Buyer" : "🏪 Seller"}
              </p>
              
              <div style={{ margin: "20px 0" }}>
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
              </div>
              
              <button 
                className="payment-skip-button"
                onClick={() => {
                  toast.info('Payment skipped. You can pay later.');
                  setTimeout(() => {
                    window.location.href = '/';
                  }, 1000);
                }}
                style={{
                  marginTop: "15px",
                  padding: "10px 20px",
                  background: "transparent",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  cursor: "pointer"
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

  // Render main UI
  return (
    <Layout expand={false} hasHeader={true}>
      <div className="main-container-small">
        <button 
          className="toggle-button-small"
          onClick={toggleSignupSignin} 
          disabled={isLoading}
          style={{
            marginBottom: "20px",
            padding: "10px 20px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          {isLoading ? "Processing..." : 
           (isSignup ? "Already have an account? Sign in" : 
           "Don't have an account? Sign up")}
        </button>

        {!isLoggedIn && (
          <>
            {isSignup && (
              <div className="user-type-selector-small" style={{ 
                display: "flex", 
                gap: "10px", 
                marginBottom: "20px" 
              }}>
                <button 
                  className={`user-type-button-small ${userType === "buyer" ? "active-small" : ""}`}
                  onClick={() => setUserType("buyer")}
                  disabled={isLoading}
                  style={{
                    padding: "10px 20px",
                    background: userType === "buyer" ? "#007bff" : "#e0e0e0",
                    color: userType === "buyer" ? "white" : "black",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer"
                  }}
                >
                  👤 Buyer
                </button>
                <button 
                  className={`user-type-button-small ${userType === "seller" ? "active-small" : ""}`}
                  onClick={() => setUserType("seller")}
                  disabled={isLoading}
                  style={{
                    padding: "10px 20px",
                    background: userType === "seller" ? "#007bff" : "#e0e0e0",
                    color: userType === "seller" ? "white" : "black",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer"
                  }}
                >
                  🏪 Seller
                </button>
              </div>
            )}

            <div className="cards-container-small" style={{ 
              display: "flex", 
              gap: "20px", 
              justifyContent: "center" 
            }}>
              {/* Basic Plan */}
              <div
                className={`subscription-box-small ${selectedSubscription === "user" ? "selected-small" : ""}`}
                onClick={() => !isLoading && handleSubscriptionClick("user")}
                style={{
                  border: selectedSubscription === "user" ? "2px solid #007bff" : "1px solid #ddd",
                  borderRadius: "10px",
                  padding: "20px",
                  width: "300px",
                  cursor: "pointer",
                  background: "white",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                }}
              >
                <div style={{
                  background: "#ff6b6b",
                  color: "white",
                  padding: "5px 10px",
                  borderRadius: "15px",
                  fontSize: "12px",
                  display: "inline-block",
                  marginBottom: "10px"
                }}>
                  Popular
                </div>
                <h3 style={{ margin: "10px 0" }}>Basic Plan</h3>
                <div style={{ fontSize: "24px", fontWeight: "bold", margin: "10px 0" }}>$5/month</div>
                <p style={{ color: "#666", marginBottom: "15px" }}>Perfect for individual users</p>
                
                <ul style={{ textAlign: "left", marginBottom: "20px", paddingLeft: "20px" }}>
                  <li>Buy Films & Scripts</li>
                  <li>Sell Your Content</li>
                  <li>Basic Support</li>
                </ul>

                {selectedSubscription === "user" && (
                  <div>
                    <button 
                      onClick={handleGoogleLogin} 
                      disabled={isLoading}
                      style={{
                        width: "100%",
                        padding: "12px",
                        marginBottom: "10px",
                        background: "#db4437",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer"
                      }}
                    >
                      {isLoading ? "Processing..." : 
                     (isSignup ? "Sign up with Google" : "Sign in with Google")}
                    </button>

                    <div style={{ 
                      textAlign: "center", 
                      margin: "15px 0", 
                      color: "#666" 
                    }}>
                      or
                    </div>

                    <div>
                      {isSignup && (
                        <input
                          type="text"
                          placeholder="Username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={isLoading}
                          style={{
                            width: "100%",
                            padding: "10px",
                            marginBottom: "10px",
                            border: "1px solid #ddd",
                            borderRadius: "5px"
                          }}
                        />
                      )}
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        style={{
                          width: "100%",
                          padding: "10px",
                          marginBottom: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "5px"
                        }}
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        style={{
                          width: "100%",
                          padding: "10px",
                          marginBottom: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "5px"
                        }}
                      />
                      <button 
                        onClick={handleEmailSubmit} 
                        disabled={isLoading}
                        style={{
                          width: "100%",
                          padding: "12px",
                          background: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer"
                        }}
                      >
                        {isLoading ? "Processing..." : 
                       (isSignup ? "Create Account" : "Sign In")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pro Plan */}
              <div
                className={`subscription-box-small ${selectedSubscription === "studio" ? "selected-small" : ""}`}
                onClick={() => !isLoading && handleSubscriptionClick("studio")}
                style={{
                  border: selectedSubscription === "studio" ? "2px solid #007bff" : "1px solid #ddd",
                  borderRadius: "10px",
                  padding: "20px",
                  width: "300px",
                  cursor: "pointer",
                  background: "white",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                }}
              >
                <div style={{
                  background: "#ffd700",
                  color: "black",
                  padding: "5px 10px",
                  borderRadius: "15px",
                  fontSize: "12px",
                  display: "inline-block",
                  marginBottom: "10px"
                }}>
                  Pro
                </div>
                <h3 style={{ margin: "10px 0" }}>Pro Plan</h3>
                <div style={{ fontSize: "24px", fontWeight: "bold", margin: "10px 0" }}>$10/month</div>
                <p style={{ color: "#666", marginBottom: "15px" }}>Advanced features for professionals</p>
                
                <ul style={{ textAlign: "left", marginBottom: "20px", paddingLeft: "20px" }}>
                  <li>All Basic Features</li>
                  <li>Priority Support</li>
                  <li>Team Collaboration</li>
                </ul>

                {selectedSubscription === "studio" && (
                  <div>
                    <button 
                      onClick={handleGoogleLogin} 
                      disabled={isLoading}
                      style={{
                        width: "100%",
                        padding: "12px",
                        marginBottom: "10px",
                        background: "#db4437",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer"
                      }}
                    >
                      {isLoading ? "Processing..." : 
                     (isSignup ? "Sign up with Google" : "Sign in with Google")}
                    </button>

                    <div style={{ 
                      textAlign: "center", 
                      margin: "15px 0", 
                      color: "#666" 
                    }}>
                      or
                    </div>

                    <div>
                      {isSignup && (
                        <input
                          type="text"
                          placeholder="Username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={isLoading}
                          style={{
                            width: "100%",
                            padding: "10px",
                            marginBottom: "10px",
                            border: "1px solid #ddd",
                            borderRadius: "5px"
                          }}
                        />
                      )}
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        style={{
                          width: "100%",
                          padding: "10px",
                          marginBottom: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "5px"
                        }}
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        style={{
                          width: "100%",
                          padding: "10px",
                          marginBottom: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "5px"
                        }}
                      />
                      <button 
                        onClick={handleEmailSubmit} 
                        disabled={isLoading}
                        style={{
                          width: "100%",
                          padding: "12px",
                          background: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer"
                        }}
                      >
                        {isLoading ? "Processing..." : 
                       (isSignup ? "Create Account" : "Sign In")}
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
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999
          }} onClick={closePopup} />
          <div style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "30px",
            borderRadius: "10px",
            zIndex: 1000,
            textAlign: "center",
            minWidth: "300px"
          }}>
            <p style={{ marginBottom: "20px" }}>{popupMessage}</p>
            <button 
              onClick={closePopup}
              style={{
                padding: "10px 20px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer"
              }}
            >
              OK
            </button>
          </div>
        </>
      )}
    </Layout>
  );
};

export default HypeModeProfile;