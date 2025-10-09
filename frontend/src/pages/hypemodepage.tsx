import { useState, useEffect } from "react";
import axios from 'axios';
import styled , { keyframes } from 'styled-components';
import { Layout } from "../components";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleProvider } from "./firebase";
import { motion } from "framer-motion";
import Confetti from "react-confetti";


const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 90vh;
  background: linear-gradient(to right, #ffffa1 0%, #ffc800 100%);
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);

  @media (max-width: 768px) {
    padding: 1px;
    height: 120vh;
    justify-content: flex-start;
  }
`;

const SubscriptionContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: stretch;
  width: 90%;
  max-width: 1200px;
  gap: 30px;
  padding: 0 15px;

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: center;
    gap: 25px;
  }

  @media (max-width: 768px) {
    gap: 20px;
    width: 95%;
  }
`;

const SubscriptionBox = styled.div`
  width: 100%;
  max-width: 450px;
  min-height: 500px;
  padding: 30px 25px;
  border-radius: 20px;
  background: linear-gradient(145deg, #ffffff, #f3f3f3);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1), 0 10px 25px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.15), 0 15px 35px rgba(0, 0, 0, 0.12);
  }

  &.selected {
    border: 3px solid #7b5af3;
    background: linear-gradient(135deg, #7b5af3, #6541d7);
    color: white;
    transform: translateY(-5px) scale(1.01);
  }

  @media (max-width: 768px) {
    padding: 20px 15px;
    min-height: 420px;
  }
`;

const Title = styled.h3`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 15px;
  color: #2d3748;
  transition: color 0.3s ease;
  
  ${SubscriptionBox}.selected & {
    color: white;
  }
`;

const Description = styled.p`
  font-size: 16px;
  color: #718096;
  margin-bottom: 20px;
  line-height: 1.5;
  transition: color 0.3s ease;
  
  ${SubscriptionBox}.selected & {
    color: rgba(255, 255, 255, 0.9);
  }
`;

const Price = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #7b5af3;
  margin: 15px 0;
  transition: color 0.3s ease;
  
  ${SubscriptionBox}.selected & {
    color: white;
  }
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 20px 0;
  text-align: left;
  
  li {
    padding: 8px 0;
    font-size: 14px;
    color: #4a5568;
    transition: color 0.3s ease;
    display: flex;
    align-items: center;
    
    &:before {
      content: "✓";
      color: #48bb78;
      font-weight: bold;
      margin-right: 10px;
      font-size: 16px;
    }
    
    ${SubscriptionBox}.selected & {
      color: white;
      
      &:before {
        color: #68d391;
      }
    }
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 12px 20px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: #7b5af3;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(123, 90, 243, 0.3);
  margin: 8px 0;

  &:hover {
    background: #6541d7;
    box-shadow: 0 6px 20px rgba(123, 90, 243, 0.4);
    transform: translateY(-2px);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }
`;

const GoogleButton = styled(Button)`
  background: #db4437;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  &:hover {
    background: #c23321;
  }
`;

const EmailButton = styled(Button)`
  background: #10b981;

  &:hover {
    background: #059669;
  }
`;

const EmailForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-top: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: all 0.3s ease;
  background: white;
  color: #2d3748;

  &:focus {
    outline: none;
    border-color: #7b5af3;
    box-shadow: 0 0 0 3px rgba(123, 90, 243, 0.2);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const ToggleButton = styled.button`
  color: #000;
  border: 2px solid #000;
  padding: 12px 24px;
  margin-bottom: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.8);

  &:hover {
    background: #000;
    color: white;
    transform: scale(1.03);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const Popup = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 25px;
  background: white;
  border: 2px solid #7b5af3;
  z-index: 1000;
  max-width: 90%;
  width: 350px;
  border-radius: 15px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25);
  box-sizing: border-box;
  text-align: center;
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
`;

const UserTypeSelector = styled.div`
  display: flex;
  gap: 15px;
  margin: 15px 0 25px 0;
  width: 100%;
  max-width: 500px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
`;

const UserTypeButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 12px 20px;
  border: 2px solid ${props => props.active ? '#7b5af3' : '#ddd'};
  background: ${props => props.active ? '#7b5af3' : 'white'};
  color: ${props => props.active ? 'white' : '#333'};
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  font-size: 14px;

  &:hover {
    border-color: #7b5af3;
    transform: translateY(-2px);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const slideIn = keyframes`
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const Banner = styled.div`
  width: 100%;
  background: linear-gradient(to right, #ff4e50, #f9d423);
  color: white;
  text-align: center;
  padding: 20px;
  font-size: 22px;
  font-weight: bold;
  position: relative;
  animation: ${slideIn} 1s ease-in-out;
  border-radius: 15px;
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
  margin-bottom: 30px;
`;

const AuthSection = styled.div`
  margin-top: 20px;
  width: 100%;
`;

const AuthDivider = styled.div`
  display: flex;
  align-items: center;
  margin: 15px 0;
  color: #94a3b8;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #e2e8f0;
  }

  span {
    padding: 0 15px;
    font-size: 14px;
    color: #94a3b8;
  }
`;

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
        return true;
      }
    } catch (error: any) {
      if (error.response) {
        setPopupMessage(error.response.data.message || 'Login failed.');
      } else {
        setPopupMessage('Login failed.');
      }
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
        const success = await loginUser(email);
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
      setPopupMessage('Logout successful.');
      setShowPopup(true);
    } catch (error) {
      setPopupMessage('Logout failed. Please try again.');
      setShowPopup(true);
    }
  };

  const toggleEmailForm = () => {
    setShowEmailForm(!showEmailForm);
    if (showEmailForm) {
      setEmail('');
      setPassword('');
      setUsername('');
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
    setShowEmailForm(false);
  };

  useEffect(() => {
    setShowFireworks(true);
    setTimeout(() => setShowFireworks(false), 1000);
  }, []);

  return (
    <Layout expand={false} hasHeader={true}>
      <Banner>🔥 HypeMode is Here! Exclusive Features Await! 🔥</Banner>

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

      <MainContainer>
        <ToggleButton onClick={toggleSignupSignin} disabled={isLoading}>
          {isSignup ? "Already have an account? Switch to Sign in" : "Don't have an account? Switch to Sign up"}
        </ToggleButton>

        {isLoggedIn ? (
          <SubscriptionContainer>
            <SubscriptionBox>
              <Title>Logout</Title>
              <Button onClick={handleGoogleLogout} disabled={isLoading}>
                Logout
              </Button>
            </SubscriptionBox>
          </SubscriptionContainer>
        ) : (
          <>
            {isSignup && (
              <UserTypeSelector>
                <UserTypeButton 
                  active={userType === "buyer"} 
                  onClick={() => setUserType("buyer")}
                  disabled={isLoading}
                >
                  👤 Sign up as Buyer
                </UserTypeButton>
                <UserTypeButton 
                  active={userType === "seller"} 
                  onClick={() => setUserType("seller")}
                  disabled={isLoading}
                >
                  🏪 Sign up as Seller
                </UserTypeButton>
              </UserTypeSelector>
            )}

            <SubscriptionContainer>
              {/* Basic Plan */}
              <SubscriptionBox
                className={selectedSubscription === "user" ? "selected" : ""}
                onClick={() => !isLoading && handleSubscriptionClick("user")}
              >
                <Title>Basic Plan</Title>
                <Price>$5/month</Price>
                <Description>Perfect for individual users and content enthusiasts</Description>
                
                <FeaturesList>
                  <li>Buy Films & Scripts</li>
                  <li>Sell Your Content</li>
                  <li>Basic Support</li>
                  <li>Access to Community</li>
                  <li>5GB Storage</li>
                </FeaturesList>

                {selectedSubscription === "user" && (
                  <AuthSection>
                    <GoogleButton onClick={handleGoogleLogin} disabled={isLoading}>
                      <span>G</span>
                      {isLoading ? "Processing..." : (isSignup ? "Sign up with Google" : "Sign in with Google")}
                    </GoogleButton>

                    <AuthDivider>
                      <span>or</span>
                    </AuthDivider>

                    {!showEmailForm ? (
                      <EmailButton onClick={toggleEmailForm} disabled={isLoading}>
                        {isSignup ? "Sign up with Email" : "Sign in with Email"}
                      </EmailButton>
                    ) : (
                      <EmailForm>
                        {isSignup && (
                          <Input
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                          />
                        )}
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                        />
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoading}
                        />
                        <Button onClick={handleEmailSubmit} disabled={isLoading}>
                          {isLoading ? "Processing..." : (isSignup ? "Create Account" : "Sign In")}
                        </Button>
                      </EmailForm>
                    )}
                  </AuthSection>
                )}
              </SubscriptionBox>

              {/* Pro Plan */}
              <SubscriptionBox
                className={selectedSubscription === "studio" ? "selected" : ""}
                onClick={() => !isLoading && handleSubscriptionClick("studio")}
              >
                <Title>Pro Plan</Title>
                <Price>$10/month</Price>
                <Description>Advanced features for studios and professional creators</Description>
                
                <FeaturesList>
                  <li>All Basic Features</li>
                  <li>Early Feature Access</li>
                  <li>Priority Support</li>
                  <li>Advanced Analytics</li>
                  <li>50GB Storage</li>
                  <li>Team Collaboration</li>
                  <li>Custom Branding</li>
                </FeaturesList>

                {selectedSubscription === "studio" && (
                  <AuthSection>
                    <GoogleButton onClick={handleGoogleLogin} disabled={isLoading}>
                      <span>G</span>
                      {isLoading ? "Processing..." : (isSignup ? "Sign up with Google" : "Sign in with Google")}
                    </GoogleButton>

                    <AuthDivider>
                      <span>or</span>
                    </AuthDivider>

                    {!showEmailForm ? (
                      <EmailButton onClick={toggleEmailForm} disabled={isLoading}>
                        {isSignup ? "Sign up with Email" : "Sign in with Email"}
                      </EmailButton>
                    ) : (
                      <EmailForm>
                        {isSignup && (
                          <Input
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                          />
                        )}
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                        />
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoading}
                        />
                        <Button onClick={handleEmailSubmit} disabled={isLoading}>
                          {isLoading ? "Processing..." : (isSignup ? "Create Account" : "Sign In")}
                        </Button>
                      </EmailForm>
                    )}
                  </AuthSection>
                )}
              </SubscriptionBox>
            </SubscriptionContainer>
          </>
        )}
      </MainContainer>

      {showPopup && (
        <>
          <Overlay onClick={closePopup} />
          <Popup>
            <p>{popupMessage}</p>
            <Button onClick={closePopup}>Close</Button>
          </Popup>
        </>
      )}
    </Layout>
  );
};

export default HypeModeProfile;