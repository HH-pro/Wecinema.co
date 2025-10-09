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
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 90%;
  max-width: 800px;
  gap: 20px;
  padding: 25px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  backdrop-filter: blur(12px);
  box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease-in-out;

  @media (min-width: 768px) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

const SubscriptionBox = styled.div`
  width: 100%;
  max-width: 350px;
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(145deg, #ffffff, #f3f3f3);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.1), -4px -4px 10px rgba(255, 255, 255, 0.6);
  position: relative;
  overflow: hidden;

  &:hover {
    transform: scale(1.07);
    box-shadow: 6px 6px 15px rgba(0, 0, 0, 0.15), -6px -6px 15px rgba(255, 255, 255, 0.7);
  }

  &.selected {
    border: 2px solid #ff4500;
    box-shadow: 0px 4px 15px rgba(255, 69, 0, 0.4);
    background: linear-gradient(145deg, #ff6347, #ff4500);
    color: white;
  }
`;

const Title = styled.h3`
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #333;
  transition: color 0.3s ease;
  
  ${SubscriptionBox}.selected & {
    color: white;
  }
`;

const Description = styled.p`
  font-size: 16px;
  color: #777;
  margin-bottom: 12px;
  transition: color 0.3s ease;
  
  ${SubscriptionBox}.selected & {
    color: white;
  }
`;

const RightContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  width: 100%;
  max-width: 400px;
  padding: 25px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease-in-out;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const Button = styled.button`
  width: 100%;
  max-width: 200px;
  padding: 12px 18px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: #7b5af3;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0px 4px 10px rgba(123, 90, 243, 0.3);
  margin: 5px 0;

  &:hover {
    background: #6541d7;
    box-shadow: 0px 6px 15px rgba(123, 90, 243, 0.5);
    transform: scale(1.05);
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
  border: 2px solid #000;
  padding: 10px 18px;
  margin-bottom: 30px;
  cursor: pointer;
  transition: background 0.3s, transform 0.2s;
  border-radius: 5px;
  font-size: 16px;

  &:hover {
    background: #f0f0f0;
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    padding: 8px 14px;
    margin-top: 80px;
    font-size: 14px;
  }
`;

const Popup = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 20px;
  background: #fff;
  border: 2px solid #000;
  z-index: 1000;
  max-width: 90%;
  border-radius: 10px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
  box-sizing: border-box;
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
  margin-top: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    border-color: #7b5af3;
    box-shadow: 0 0 0 2px rgba(123, 90, 243, 0.2);
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
  border-radius: 5px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
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

  const registerUser = async (username: string, email: string, avatar: string, callback: any) => {
    try {
      const res = await axios.post('https://wecinema.co/api/user/signup', {
        username,
        email,
        avatar,
        dob: "--------"
      });

      const token = res.data.token;
      const userId = res.data.id;

      setPopupMessage('Registration successful Go back to logged in!');
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
    const username = profile.displayName || email.split('@')[0]; // Fallback to email username
    const avatar = profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;

    try {
      const callback = () => navigate('/payment', { state: { subscriptionType: selectedSubscription, amount: selectedSubscription === 'user' ? 5 : 10, userId } });

      if (isSignup) {
        await registerUser(username, email, avatar, callback);
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

  const handleLogin = async (method: "google" | "email") => {
    if (!selectedSubscription) {
      setShowPopup(true);
      setPopupMessage("Please select a subscription first.");
      return;
    }

    if (method === "google") {
      await handleGoogleLogin();
    }
    // Email login/signup is handled separately through the form buttons
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
            <SubscriptionContainer>
              {/* User Subscription Box */}
              <SubscriptionBox
                onClick={() => handleSubscriptionClick("user")}
                className={selectedSubscription === "user" ? "selected" : ""}
              >
                <Title>User Subscription</Title>
                <Description>$5/month – Buy & Sell Films & Scripts</Description>
                <Button onClick={() => handleLogin("google")}>
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
                <Title>Studio Subscription</Title>
                <Description>$10/month – Buy, Sell & Get Early Feature Access</Description>
                <Button onClick={() => handleLogin("google")}>
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
            </SubscriptionContainer>
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