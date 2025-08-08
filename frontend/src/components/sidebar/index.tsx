import React, { useEffect, useState } from "react";
import { IoMdHome } from "react-icons/io";
import { RiMovie2Line, RiHeartLine, RiHistoryLine, RiFlagLine } from "react-icons/ri";
import { LiaSignInAltSolid } from "react-icons/lia";
import { HiUserAdd } from "react-icons/hi";
import { FaMoon } from "react-icons/fa";
import { MdOutlineDescription } from "react-icons/md";
import { IoSunnyOutline } from "react-icons/io5";
import { CgProfile } from "react-icons/cg";
import { Link, useNavigate } from "react-router-dom";
import { TbVideoPlus } from "react-icons/tb";
import { FaUser, FaSignOutAlt } from "react-icons/fa";
import { RiCustomerService2Line } from "react-icons/ri";
import { MdOutlinePrivacyTip, MdChatBubbleOutline } from "react-icons/md";
import axios from "axios";
import { toast } from "react-toastify";
import { decodeToken } from "../../utilities/helperfFunction";
import './Sidebar.css';

const Sidebar = ({
  expand,
  darkMode,
  toggleSigninModal,
  toggleSignupModal,
  toggleUploadModal,
  toggleUploadScriptModal,
  setDarkMode,
  setLightMode,
  isLoggedIn,
  toggleSignoutModal
}) => {
  const token = localStorage.getItem("token") || null;
  const tokenData = decodeToken(token);
  const [hasPaid, setHasPaid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (tokenData) {
      fetchPaymentStatus(tokenData.userId);
    }
  }, [tokenData]);

  const fetchPaymentStatus = async (userId) => {
    try {
      const response = await axios.get(
        `https://wecinema.co/api/user/payment-status/${userId}`
      );
      setHasPaid(response.data.hasPaid);
    } catch (error) {
      console.error("Payment status error:", error);
    }
  };

  const handleHypemodeClick = (e) => {
    if (hasPaid) {
      e.preventDefault();
      toast.info("You are already subscribed to Hypemode!");
    }
  };

  const getActiveClass = (path) => {
    return window.location.pathname === path ? "text-active" : "";
  };

  return (
    <section
      className={`sidebar-container ${expand ? "expanded" : "collapsed"} ${
        darkMode ? "dark" : "light"
      }`}
    >
      <nav className="sidebar-nav">
        <ul className="sidebar-section">
          <Link to="/" className={`sidebar-item ${getActiveClass("/")}`}>
            <IoMdHome className="sidebar-icon" />
            <span className="sidebar-text">Home</span>
          </Link>
          <Link
            to="/hypemode"
            onClick={handleHypemodeClick}
            className={`sidebar-item ${getActiveClass("/hypemode")}`}
          >
            <RiMovie2Line className="sidebar-icon" />
            <span className="sidebar-text">Hype mode</span>
          </Link>

          {/* Upload Buttons */}
          <div className="sidebar-item" onClick={toggleUploadModal}>
            <TbVideoPlus className="sidebar-icon" />
            <span className="sidebar-text">Upload Video</span>
          </div>
          <div className="sidebar-item" onClick={toggleUploadScriptModal}>
            <TbVideoPlus className="sidebar-icon" />
            <span className="sidebar-text">Upload Script</span>
          </div>

          {/* Profile */}
          <Link
            to={tokenData ? `/user/${tokenData.userId}` : "#"}
            onClick={(e) => {
              if (!tokenData) {
                toast.error("Please login!!");
                e.preventDefault();
              }
            }}
            className={`sidebar-item ${getActiveClass(`/user/${tokenData?.userId}`)}`}
          >
            <CgProfile className="sidebar-icon" />
            <span className="sidebar-text">Profile</span>
          </Link>
          <Link to="/history" className={`sidebar-item ${getActiveClass("/history")}`}>
            <RiHistoryLine className="sidebar-icon" />
            <span className="sidebar-text">History</span>
          </Link>
          <Link to="/likedvideos" className={`sidebar-item ${getActiveClass("/likedvideos")}`}>
            <RiHeartLine className="sidebar-icon" />
            <span className="sidebar-text">Liked Videos</span>
          </Link>
          <Link to="/chatbot" className={`sidebar-item ${getActiveClass("/chatbot")}`}>
            <MdChatBubbleOutline className="sidebar-icon" />
            <span className="sidebar-text">ChatBot</span>
          </Link>
        </ul>
      </nav>

      {/* Theme + Auth */}
      <nav className="sidebar-section-container">
        <h2 className="sidebar-section-title">Theme</h2>
        <ul className="sidebar-section">
          <div
            className={`sidebar-item ${darkMode ? "text-active" : ""}`}
            onClick={setDarkMode}
          >
            <FaMoon className="sidebar-icon" />
            <span className="sidebar-text">Dark mode</span>
          </div>
          <div
            className={`sidebar-item ${!darkMode ? "text-active" : ""}`}
            onClick={setLightMode}
          >
            <IoSunnyOutline className="sidebar-icon" />
            <span className="sidebar-text">Light mode</span>
          </div>

          {isLoggedIn ? (
            <>
              <div className="sidebar-item">
                <FaUser className="sidebar-icon" />
                <span className="sidebar-text">{isLoggedIn.username}</span>
              </div>
              <div className="sidebar-item" onClick={toggleSignoutModal}>
                <FaSignOutAlt className="sidebar-icon" />
                <span className="sidebar-text">Sign out</span>
              </div>
            </>
          ) : (
            <>
              <div className="sidebar-item" onClick={toggleSigninModal}>
                <LiaSignInAltSolid className="sidebar-icon" />
                <span className="sidebar-text">Sign in</span>
              </div>
              <div className="sidebar-item" onClick={toggleSignupModal}>
                <HiUserAdd className="sidebar-icon" />
                <span className="sidebar-text">Sign up</span>
              </div>
            </>
          )}

          <Link to="/customersupport" className="sidebar-item">
            <RiCustomerService2Line className="sidebar-icon" />
            <span className="sidebar-text">Support</span>
          </Link>
          <Link to="/privacy-policy" className="sidebar-item">
            <MdOutlinePrivacyTip className="sidebar-icon" />
            <span className="sidebar-text">Privacy</span>
          </Link>
          <Link to="/report" className="sidebar-item">
            <RiFlagLine className="sidebar-icon" />
            <span className="sidebar-text">Report</span>
          </Link>
          <Link to="/terms-and-conditions" className="sidebar-item">
            <MdOutlineDescription className="sidebar-icon" />
            <span className="sidebar-text">Terms</span>
          </Link>
        </ul>
      </nav>
    </section>
  );
};

export default Sidebar;
