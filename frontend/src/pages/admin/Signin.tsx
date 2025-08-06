import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { postRequest } from "../../api";
import logo from "../../assets/wecinema.png";
import { motion, AnimatePresence } from "framer-motion";
import "./AdminLogin.css";

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showBot, setShowBot] = useState<boolean>(true);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically open doors after component mounts
    const timer = setTimeout(() => {
      setDoorsOpen(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleAdminLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await postRequest(
        "/user/admin/login",
        { email, password },
        setLoading,
        "Logged in successfully!"
      );
      localStorage.setItem("token", response.token);
      localStorage.setItem("loggedIn", "true");
      navigate("/admin/dashboard");
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      setError("Security verification failed");
      console.error("Auth Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <AnimatePresence>
        {showBot && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="ai-assistant"
          >
            <div className="ai-avatar">
              <span className="text-white text-2xl">🤖</span>
            </div>
            <div className="text-[#00f3ff] font-mono text-sm">
               Secure access protocol initialized
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="door-animation">
        <motion.div
          className="door door-left"
          initial={{ x: 0 }}
          animate={{ x: "-100%" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        <motion.div
          className="door door-right"
          initial={{ x: 0 }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="login-box"
        >
          <div className="login-header">
            <motion.img
              src={logo}
              alt="Admin Portal"
              className="logo"
              whileHover={{ rotate: 15, scale: 1.1 }}
            />
            <h1 className="text-gradient">ADMIN PORTAL</h1>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="error-message"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <div className="form-group">
            <label className="form-label">ADMIN IDENTITY</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="admin@wecinema.co"
            />
          </div>

          <div className="form-group">
            <label className="form-label">ACCESS KEY</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={handleAdminLogin}
            disabled={loading}
            className="auth-button"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="loading-spinner"></div>
                INITIALIZING ACCESS...
              </div>
            ) : (
              "AUTHENTICATE"
            )}
          </button>

          <div className="return-link">
            <span onClick={() => navigate("/")}>
              RETURN TO PUBLIC INTERFACE
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;