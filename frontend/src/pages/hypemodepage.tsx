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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  justify-content: center;
  align-items: center;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 10px;
  }
`;

const CardsContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: stretch;
  width: 100%;
  max-width: 1400px;
  gap: 50px;
  padding: 0 20px;

  @media (max-width: 1200px) {
    gap: 40px;
    padding: 0 15px;
  }

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: center;
    gap: 40px;
    padding: 0 10px;
  }

  @media (max-width: 768px) {
    gap: 30px;
    padding: 0 5px;
  }
`;

const SubscriptionBox = styled.div`
  width: 100%;
  max-width: 600px;
  min-height: 700px;
  padding: 50px 40px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.95);
  text-align: center;
  cursor: pointer;
  transition: all 0.4s ease;
  box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.15),
    0 20px 40px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 3px solid transparent;

  &:hover {
    transform: translateY(-15px) scale(1.02);
    box-shadow: 
      0 35px 70px rgba(0, 0, 0, 0.2),
      0 30px 60px rgba(0, 0, 0, 0.15);
    border-color: rgba(123, 90, 243, 0.4);
  }

  &.selected {
    border: 4px solid #7b5af3;
    background: linear-gradient(135deg, #7b5af3, #6541d7);
    color: white;
    transform: translateY(-10px) scale(1.01);
    box-shadow: 
      0 30px 60px rgba(123, 90, 243, 0.4),
      0 25px 50px rgba(123, 90, 243, 0.3);
  }

  @media (max-width: 1200px) {
    max-width: 550px;
    padding: 45px 35px;
    min-height: 650px;
  }

  @media (max-width: 1024px) {
    max-width: 650px;
    width: 90%;
    min-height: auto;
  }

  @media (max-width: 768px) {
    padding: 35px 25px;
    max-width: 500px;
    border-radius: 25px;
  }

  @media (max-width: 480px) {
    padding: 30px 20px;
    max-width: 400px;
    border-radius: 20px;
  }
`;

const Title = styled.h3`
  font-size: 42px;
  font-weight: 900;
  margin-bottom: 25px;
  color: #2d3748;
  transition: color 0.3s ease;
  
  ${SubscriptionBox}.selected & {
    color: white;
  }

  @media (max-width: 768px) {
    font-size: 36px;
    margin-bottom: 20px;
  }

  @media (max-width: 480px) {
    font-size: 32px;
  }
`;

const Description = styled.p`
  font-size: 20px;
  color: #718096;
  margin-bottom: 30px;
  line-height: 1.6;
  transition: color 0.3s ease;
  
  ${SubscriptionBox}.selected & {
    color: rgba(255, 255, 255, 0.9);
  }

  @media (max-width: 768px) {
    font-size: 18px;
    margin-bottom: 25px;
  }

  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

const Price = styled.div`
  font-size: 48px;
  font-weight: 900;
  color: #7b5af3;
  margin: 25px 0;
  transition: color 0.3s ease;
  
  ${SubscriptionBox}.selected & {
    color: white;
  }

  @media (max-width: 768px) {
    font-size: 42px;
  }

  @media (max-width: 480px) {
    font-size: 36px;
  }
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 30px 0;
  text-align: left;
  
  li {
    padding: 12px 0;
    font-size: 18px;
    color: #4a5568;
    transition: color 0.3s ease;
    display: flex;
    align-items: center;
    
    &:before {
      content: "✓";
      color: #48bb78;
      font-weight: bold;
      margin-right: 15px;
      font-size: 20px;
      min-width: 20px;
    }
    
    ${SubscriptionBox}.selected & {
      color: white;
      
      &:before {
        color: #68d391;
      }
    }
  }

  @media (max-width: 768px) {
    margin: 25px 0;
    
    li {
      font-size: 16px;
      padding: 10px 0;
    }
  }

  @media (max-width: 480px) {
    li {
      font-size: 14px;
      padding: 8px 0;
    }
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 20px 30px;
  font-size: 20px;
  font-weight: 700;
  color: white;
  background: #7b5af3;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(123, 90, 243, 0.4);
  margin: 12px 0;

  &:hover {
    background: #6541d7;
    box-shadow: 0 12px 35px rgba(123, 90, 243, 0.6);
    transform: translateY(-3px);
  }

  &:active {
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    padding: 18px 25px;
    font-size: 18px;
    border-radius: 12px;
  }

  @media (max-width: 480px) {
    padding: 16px 20px;
    font-size: 16px;
  }
`;

const EmailButton = styled(Button)`
  background: #4285f4;

  &:hover {
    background: #3367d6;
  }
`;

const ToggleButton = styled.button`
  color: white;
  border: 3px solid white;
  padding: 15px 30px;
  margin-bottom: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
  font-size: 20px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);

  &:hover {
    background: white;
    color: #667eea;
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    padding: 12px 25px;
    margin-top: 20px;
    font-size: 18px;
    margin-bottom: 40px;
  }

  @media (max-width: 480px) {
    padding: 10px 20px;
    font-size: 16px;
  }
`;

const Popup = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 40px;
  background: white;
  border: 3px solid #7b5af3;
  z-index: 1000;
  max-width: 90%;
  width: 450px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  box-sizing: border-box;
  text-align: center;

  @media (max-width: 768px) {
    width: 90%;
    padding: 30px;
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  z-index: 999;
`;

const EmailForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  margin-top: 30px;
  padding: 30px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  border: 2px solid #e2e8f0;

  @media (max-width: 768px) {
    padding: 25px;
    gap: 15px;
    margin-top: 25px;
  }

  @media (max-width: 480px) {
    padding: 20px;
    gap: 12px;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 18px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 18px;
  box-sizing: border-box;
  transition: all 0.3s ease;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #7b5af3;
    box-shadow: 0 0 0 4px rgba(123, 90, 243, 0.2);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    padding: 16px 18px;
    font-size: 16px;
  }

  @media (max-width: 480px) {
    padding: 14px 16px;
    font-size: 14px;
  }
`;

const UserTypeSelector = styled.div`
  display: flex;
  gap: 20px;
  margin: 20px 0 40px 0;
  width: 100%;
  max-width: 600px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
    margin: 15px 0 30px 0;
  }
`;

const UserTypeButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 18px 25px;
  border: 3px solid ${props => props.active ? '#7b5af3' : 'rgba(255, 255, 255, 0.3)'};
  background: ${props => props.active ? '#7b5af3' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.active ? 'white' : 'white'};
  border-radius: 15px;
  cursor: pointer;
  font-weight: 700;
  transition: all 0.3s ease;
  font-size: 18px;
  backdrop-filter: blur(10px);

  &:hover {
    border-color: #7b5af3;
    background: rgba(123, 90, 243, 0.2);
    transform: translateY(-3px);
  }

  @media (max-width: 768px) {
    padding: 16px 20px;
    font-size: 16px;
  }

  @media (max-width: 480px) {
    padding: 14px 18px;
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
  max-width: 1400px;
  background: linear-gradient(135deg, #ff6b6b, #ffd93d);
  color: white;
  text-align: center;
  padding: 30px;
  font-size: 28px;
  font-weight: 800;
  position: relative;
  animation: ${slideIn} 1s ease-in-out;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  margin-bottom: 50px;

  @media (max-width: 768px) {
    font-size: 24px;
    padding: 25px;
    margin-bottom: 40px;
    border-radius: 15px;
  }

  @media (max-width: 480px) {
    font-size: 20px;
    padding: 20px;
    margin-bottom: 30px;
  }
`;

// Rest of the component remains the same...
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

        {isLoggedIn ? (
          <CardsContainer>
            <SubscriptionBox>
              <Title>Logout</Title>
              <Button onClick={handleGoogleLogout}>Logout</Button>
            </SubscriptionBox>
          </CardsContainer>
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

            <CardsContainer>
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
            </CardsContainer>
          </>
        )}
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