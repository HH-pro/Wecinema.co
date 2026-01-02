import { useState, useEffect } from "react";
import axios from "axios";
import { Layout } from "../components";
import { useNavigate } from "react-router-dom";
import {
  getAuth,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { googleProvider } from "../firebase/config";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import "../css/HypeModeProfile.css";

const HypeModeProfile = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<
    "user" | "studio"
  >("user");
  const [userType, setUserType] = useState<"buyer" | "seller">("buyer");

  useEffect(() => {
    setShowFireworks(true);
    setTimeout(() => setShowFireworks(false), 1000);
  }, []);

  /* ================= BACKEND ================= */

  const registerUser = async (
    username: string,
    email: string,
    avatar: string
  ) => {
    const res = await axios.post("https://wecinema.co/api/user/signup", {
      username,
      email,
      avatar,
      userType,
      dob: "--------",
    });
    localStorage.setItem("token", res.data.token);
    return true;
  };

  const loginUser = async (email: string) => {
    const res = await axios.post("https://wecinema.co/api/user/signin", { email });
    localStorage.setItem("token", res.data.token);
    return true;
  };

  const handleSuccess = async (user: any, isEmail = false) => {
    const profile = user.providerData[0];
    const email = profile?.email || user.email;
    const name =
      profile?.displayName || email.split("@")[0];
    const avatar =
      profile?.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;

    if (isSignup) {
      await registerUser(name, email, avatar);
    } else {
      await loginUser(email);
    }

    setPopupMessage("Authentication successful!");
    setShowPopup(true);

    setTimeout(() => {
      navigate("/payment", {
        state: {
          subscriptionType: selectedSubscription,
          amount: selectedSubscription === "user" ? 5 : 10,
          userType,
        },
      });
    }, 1500);
  };

  /* ================= AUTH ================= */

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      await handleSuccess(result.user);
    } catch {
      setPopupMessage("Google authentication failed");
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    try {
      setIsLoading(true);
      if (isSignup) {
        const res = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await handleSuccess(res.user, true);
      } else {
        const res = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        await handleSuccess(res.user, true);
      }
    } catch (err: any) {
      setPopupMessage(err.message || "Authentication failed");
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout expand={false} hasHeader>
      {showFireworks && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
        />
      )}

      <div className="auth-wrapper">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="auth-title">
            {isSignup ? "Create Account" : "Welcome Back"}
          </h2>

          {isSignup && (
            <>
              <div className="user-type">
                <button
                  className={userType === "buyer" ? "active" : ""}
                  onClick={() => setUserType("buyer")}
                >
                  Buyer
                </button>
                <button
                  className={userType === "seller" ? "active" : ""}
                  onClick={() => setUserType("seller")}
                >
                  Seller
                </button>
              </div>

              <input
                className="auth-input"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </>
          )}

          <input
            className="auth-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="auth-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            className="auth-primary-btn"
            onClick={handleEmailSubmit}
            disabled={isLoading}
          >
            {isLoading
              ? "Processing..."
              : isSignup
              ? "Sign Up"
              : "Sign In"}
          </button>

          <div className="divider">OR</div>

          <button
            className="google-btn"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <span>G</span> Continue with Google
          </button>

          <p className="auth-toggle" onClick={() => setIsSignup(!isSignup)}>
            {isSignup
              ? "Already have an account? Sign in"
              : "Don’t have an account? Sign up"}
          </p>
        </motion.div>
      </div>

      {showPopup && (
        <>
          <div className="overlay" onClick={() => setShowPopup(false)} />
          <div className="popup-small">
            <p>{popupMessage}</p>
            <button onClick={() => setShowPopup(false)}>Close</button>
          </div>
        </>
      )}
    </Layout>
  );
};

export default HypeModeProfile;
