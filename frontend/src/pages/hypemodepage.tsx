import { useState, useEffect } from "react";
import axios from 'axios';
import styled, { keyframes } from 'styled-components';
import { Layout } from "../components";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleProvider } from "./firebase";
import { motion } from "framer-motion";
import Confetti from "react-confetti";

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(to right, #ffffa1 0%, #ffc800 100%);
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);

  @media (max-width: 768px) {
    padding: 10px;
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
  padding: 30px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(12px);
  box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease-in-out;

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 20px;
  }

  @media (max-width: 768px) {
    width: 95%;
    padding: 15px;
    gap: 15px;
  }
`;

const SubscriptionBox = styled.div`
  flex: 1;
  min-width: 300px;
  max-width: 450px;
  padding: 30px 25px;
  border-radius: 20px;
  background: linear-gradient(145deg, #ffffff, #f3f3f3);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 8px 8px 20px rgba(0, 0, 0, 0.1), -8px -8px 20px rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 12px 12px 30px rgba(0, 0, 0, 0.15), -12px -12px 30px rgba(255, 255, 255, 0.9);
  }

  &.selected {
    border: 3px solid #ff4500;
    box-shadow: 0px 8px 25px rgba(255, 69, 0, 0.4);
    background: linear-gradient(145deg, #ff6347, #ff4500);
    color: white;
    transform: translateY(-5px);
  }

  @media (max-width: 1024px) {
    width: 100%;
    max-width: 500px;
    min-width: auto;
  }

  @media (max-width: 768px) {
    padding: 20px 15px;
    min-width: 280px;
  }
`;

const Title = styled.h3`
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 15px;
  color: #333;
  transition: color 0.3s ease;
  
  ${SubscriptionBox}.selected & {
    color: white;
  }

  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

const Description = styled.p`
  font-size: 18px;
  color: #777;
  margin-bottom: 20px;
  line-height: 1.5;
  transition: color 0.3s ease;
  
  ${SubscriptionBox}.selected & {
    color: white;
  }

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const Price = styled.div`
  font-size: 32px;
  font-weight: 900;
  color: #ff4500;
  margin: 15px 0;
  transition: color 0.3s ease;
  
  ${SubscriptionBox}.selected & {
    color: white;
  }

  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 20px 0;
  text-align: left;
  
  li {
    padding: 8px 0;
    font-size: 16px;
    color: #555;
    transition: color 0.3s ease;
    
    &:before {
      content: "✓ ";
      color: #4CAF50;
      font-weight: bold;
      margin-right: 10px;
    }
    
    ${SubscriptionBox}.selected & {
      color: white;
      
      &:before {
        color: #90EE90;
      }
    }
  }

  @media (max-width: 768px) {
    li {
      font-size: 14px;
      padding: 6px 0;
    }
  }
`;

const RightContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom: 30px;
  width: 100%;
  max-width: 500px;
  padding: 30px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  backdrop-filter: blur(10px);
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease-in-out;

  @media (max-width: 768px) {
    width: 95%;
    padding: 20px;
    margin-bottom: 20px;
  }
`;

const Button = styled.button`
  width: 100%;
  max-width: 250px;
  padding: 15px 25px;
  font-size: 18px;
  font-weight: 700;
  color: white;
  background: #7b5af3;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0px 6px 15px rgba(123, 90, 243, 0.4);
  margin: 8px 0;

  &:hover {
    background: #6541d7;
    box-shadow: 0px 8px 20px rgba(123, 90, 243, 0.6);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 12px 20px;
    font-size: 16px;
    max-width: 220px;
  }
`;

const EmailButton = styled(Button)`
  background: #4285f4;

  &:hover {
    background: #3367d6;
  }
`;

const ToggleButton = styled.button`
  color: #000;
  border: 3px solid #000;
  padding: 12px 24px;
  margin-bottom: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #000;
    color: white;
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    padding: 10px 20px;
    margin-top: 20px;
    font-size: 16px;
    margin-bottom: 20px;
  }
`;

const Popup = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 30px;
  background: #fff;
  border: 3px solid #000;
  z-index: 1000;
  max-width: 90%;
  width: 400px;
  border-radius: 15px;
  box-shadow: 0px 8px 25px rgba(0, 0, 0, 0.3);
  box-sizing: border-box;
  text-align: center;

  @media (max-width: 768px) {
    width: 90%;
    padding: 20px;
  }
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

const EmailForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  margin-top: 25px;
  padding: 25px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.1);
  border: 2px solid #e0e0e0;

  @media (max-width: 768px) {
    padding: 20px;
    gap: 12px;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 15px;
  border: 2px solid #ddd;
  border-radius: 10px;
  font-size: 16px;
  box-sizing: border-box;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #7b5af3;
    box-shadow: 0 0 0 3px rgba(123, 90, 243, 0.2);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    padding: 12px;
    font-size: 14px;
  }
`;

const UserTypeSelector = styled.div`
  display: flex;
  gap: 15px;
  margin: 15px 0;
  width: 100%;

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
  font-size: 16px;

  &:hover {
    border-color: #7b5af3;
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    padding: 10px 15px;
    font-size: 14px;
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
  padding: 25px;
  font-size: 24px;
  font-weight: bold;
  position: relative;
  animation: ${slideIn} 1s ease-in-out;
  border-radius: 10px;
  box-shadow: 0px 6px 15px rgba(0, 0, 0, 0.2);
  margin-bottom: 30px;

  @media (max-width: 768px) {
    font-size: 20px;
    padding: 20px;
    margin-bottom: 20px;
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
  const [userId, setUserId] = useState('');
  const [showFireworks, setShowFireworks] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<"user" | "studio" | null>(null);
  const [userType, setUserType] = useState<"buyer" | "seller">("buyer");

  const registerUser = async (username: string, email: string, avatar: string, userType: string, callback: any) => {
    try {
      const res = await axios.post('https://wecinema.co/api/user/signup', {
        username,
        email,
        avatar,
        dob: "--------",
        userType // Add userType to the registration
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
      if (error.response && error.response.data && error.response.data.error === 'Email already exists.') {
        setPopupMessage('Email already exists.');
      } else {
        setPopupMessage('Email already exists. Please sign in.');
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
      if (error.response) {
        setPopupMessage(error.response.data.message || 'Login failed.');
      } else {
        setPopupMessage('Login failed.');
      }
      setShowPopup(true);
    }
  };

  const onLoginSuccess = async (user: any) => {
    const profile = user.providerData[0];
    const email = profile.email;
    const username = profile.displayName || email.split('@')[0];
    const avatar = profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;

    try {
      const callback = () => navigate('/payment', { 
        state: { 
          subscriptionType: selectedSubscription, 
          amount: selectedSubscription === 'user' ? 5 : 10, 
          userId,
          userType 
        } 
      });

      if (isSignup) {
        await registerUser(username, email, avatar, userType, callback);
      } else {
        await loginUser(email, callback);
      }
    } catch (error) {
      setPopupMessage('Failed to get Firebase token. Please try again.');
      setShowPopup(true);
    }
  };

  const onLoginFailure = (error: any) => {
    setPopupMessage('Login failed. Please try again.');
    setShowPopup(true);
  };

  const handleGoogleLogin = async () => {
    if (!selectedSubscription) {
      setPopupMessage("Please select a subscription first.");
      setShowPopup(true);
      return;
    }

    const auth = getAuth();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await onLoginSuccess(user);
    } catch (error) {
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

    const auth = getAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await onLoginSuccess(user);
    } catch (error: any) {
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

    const auth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await onLoginSuccess(user);
    } catch (error: any) {
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

  const closePopup = () => {
    setShowPopup(false);
  };

  const handleSubscriptionClick = (subscriptionType: "user" | "studio") => {
    setSelectedSubscription(subscriptionType);
  };

  const toggleSignupSignin = () => {
    setIsSignup(!isSignup);
    setEmail('');
    setPassword('');
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
        <ToggleButton onClick={toggleSignupSignin}>
          {isSignup ? "Already have an account? Switch to Sign in" : "Don't have an account? Switch to Sign up"}
        </ToggleButton>

        <RightContainer>
          {isLoggedIn ? (
            <SubscriptionContainer>
              <SubscriptionBox>
                <Title>Logout</Title>
                <Button onClick={handleGoogleLogout}>Logout</Button>
              </SubscriptionBox>
            </SubscriptionContainer>
          ) : (
            <>
              {/* User Type Selector - Only show for signup */}
              {isSignup && (
                <UserTypeSelector>
                  <UserTypeButton 
                    active={userType === "buyer"} 
                    onClick={() => setUserType("buyer")}
                  >
                    👤 Sign up as Buyer
                  </UserTypeButton>
                  <UserTypeButton 
                    active={userType === "seller"} 
                    onClick={() => setUserType("seller")}
                  >
                    🏪 Sign up as Seller
                  </UserTypeButton>
                </UserTypeSelector>
              )}

                {/* User Subscription Box */}
                <SubscriptionBox
                  onClick={() => handleSubscriptionClick("user")}
                  className={selectedSubscription === "user" ? "selected" : ""}
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

                  <Button onClick={() => handleGoogleLogin()}>
                    {isSignup ? "Sign up with Google" : "Sign in with Google"}
                  </Button>
                  
                  {/* Email Form */}
                  <EmailForm>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <EmailButton onClick={isSignup ? handleEmailSignup : handleEmailLogin}>
                      {isSignup ? "Sign up with Email" : "Sign in with Email"}
                    </EmailButton>
                  </EmailForm>
                </SubscriptionBox>

                {/* Studio Subscription Box */}
                <SubscriptionBox
                  onClick={() => handleSubscriptionClick("studio")}
                  className={selectedSubscription === "studio" ? "selected" : ""}
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

                  <Button onClick={() => handleGoogleLogin()}>
                    {isSignup ? "Sign up with Google" : "Sign in with Google"}
                  </Button>
                  
                  {/* Email Form */}
                  <EmailForm>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <EmailButton onClick={isSignup ? handleEmailSignup : handleEmailLogin}>
                      {isSignup ? "Sign up with Email" : "Sign in with Email"}
                    </EmailButton>
                  </EmailForm>
                </SubscriptionBox>
            </>
          )}
        </RightContainer>
      </MainContainer>

      {/* Popup Message */}
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