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

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignup, setIsSignup] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const [userId, setUserId] = useState("");
  const [userType, setUserType] = useState("buyer");
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  const [showFireworks, setShowFireworks] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  /* ---------------- UTIL ---------------- */
  const showMessage = (msg) => {
    setPopupMessage(msg);
    setShowPopup(true);
    setIsLoading(false);
  };

  /* ---------------- BACKEND AUTH ---------------- */
  const registerUser = async (username, email, avatar) => {
    const res = await axios.post("https://wecinema.co/api/user/signup", {
      username,
      email,
      avatar,
      userType,
      dob: "--------",
    });

    localStorage.setItem("token", res.data.token);
    setUserId(res.data.id);
    setIsLoggedIn(true);
  };

  const loginUser = async (email) => {
    const res = await axios.post("https://wecinema.co/api/user/signin", { email });
    localStorage.setItem("token", res.data.token);
    setUserId(res.data.id);
    setIsLoggedIn(true);
  };

  /* ---------------- AUTH SUCCESS ---------------- */
  const onAuthSuccess = async (firebaseUser) => {
    const profile = firebaseUser.providerData[0];
    const email = profile.email;
    const name = profile.displayName || email.split("@")[0];
    const avatar =
      profile.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;

    try {
      if (isSignup) {
        await registerUser(name, email, avatar);
        showMessage("Registration successful 🎉");
      } else {
        await loginUser(email);
        showMessage("Login successful ✅");
      }

      setTimeout(() => {
        navigate("/payment", {
          state: {
            subscriptionType: selectedSubscription,
            amount: selectedSubscription === "user" ? 5 : 10,
            userId,
            userType,
          },
        });
      }, 1500);
    } catch (err) {
      showMessage("Authentication failed. Try again.");
    }
  };

  /* ---------------- GOOGLE AUTH ---------------- */
  const handleGoogleLogin = async () => {
    if (!selectedSubscription) {
      return showMessage("Please select a subscription first.");
    }

    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      await onAuthSuccess(result.user);
    } catch {
      showMessage("Google authentication failed.");
    }
  };

  /* ---------------- EMAIL AUTH ---------------- */
  const handleEmailAuth = async () => {
    if (!selectedSubscription) {
      return showMessage("Please select a subscription.");
    }

    if (!email || !password || (isSignup && !username)) {
      return showMessage("Please fill all fields.");
    }

    if (password.length < 6) {
      return showMessage("Password must be at least 6 characters.");
    }

    try {
      setIsLoading(true);
      let userCredential;

      if (isSignup) {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
      } else {
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      }

      await onAuthSuccess(userCredential.user);
    } catch (err) {
      showMessage("Email authentication failed.");
    }
  };

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    showMessage("Logged out successfully.");
  };

  /* ---------------- EFFECTS ---------------- */
  useEffect(() => {
    setShowFireworks(true);
    setTimeout(() => setShowFireworks(false), 1200);

    const resize = () =>
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  /* ---------------- UI ---------------- */
  return (
    <Layout expand={false} hasHeader>
      <div className="banner-small">🔥 HypeMode is Here! 🔥</div>

      {showFireworks && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={200}
          />
        </motion.div>
      )}

      <div className="main-container-small">
        <button
          className="toggle-button-small"
          onClick={() => setIsSignup(!isSignup)}
          disabled={isLoading}
        >
          {isSignup ? "Already have an account? Sign in" : "Create new account"}
        </button>

        {!isLoggedIn && isSignup && (
          <div className="user-type-selector-small">
            {["buyer", "seller"].map((type) => (
              <button
                key={type}
                className={`user-type-button-small ${
                  userType === type ? "active-small" : ""
                }`}
                onClick={() => setUserType(type)}
              >
                {type === "buyer" ? "👤 Buyer" : "🏪 Seller"}
              </button>
            ))}
          </div>
        )}

        <div className="cards-container-small">
          {["user", "studio"].map((plan) => (
            <div
              key={plan}
              className={`subscription-box-small ${
                selectedSubscription === plan ? "selected-small" : ""
              }`}
              onClick={() => setSelectedSubscription(plan)}
            >
              <h3>{plan === "user" ? "Basic Plan" : "Pro Plan"}</h3>
              <div className="subscription-price-small">
                ${plan === "user" ? "5" : "10"}/month
              </div>

              {selectedSubscription === plan && (
                <div className="auth-section-small">
                  <button
                    className="subscription-button-small google-auth-button-small"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : "Google Login"}
                  </button>

                  <div className="auth-divider-small">or</div>

                  {isSignup && (
                    <input
                      className="form-input-small"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  )}

                  <input
                    className="form-input-small"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <input
                    className="form-input-small"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  <button
                    className="subscription-button-small"
                    onClick={handleEmailAuth}
                    disabled={isLoading}
                  >
                    {isSignup ? "Create Account" : "Sign In"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
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
