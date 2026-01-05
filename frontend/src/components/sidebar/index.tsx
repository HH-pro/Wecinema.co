import React, { useEffect, useState } from "react";
import { IoMdHome } from "react-icons/io";
import {
  RiHeartLine,
  RiHistoryLine,
  RiFlagLine,
  RiStoreLine,
  RiAddCircleLine,
  RiShoppingBagLine,
  RiListCheck,
  RiMessageLine,
  RiMovie2Line
} from "react-icons/ri";
import { LiaSignInAltSolid } from "react-icons/lia";
import { HiUserAdd } from "react-icons/hi";
import { FaMoon } from "react-icons/fa";
import { MdOutlineDescription, MdChatBubbleOutline } from "react-icons/md";
import { IoSunnyOutline } from "react-icons/io5";
import { CgProfile } from "react-icons/cg";
import { Link } from "react-router-dom";
import { TbVideoPlus } from "react-icons/tb";
import { FaUser, FaSignOutAlt, FaUserTie, FaShoppingCart, FaInfoCircle } from "react-icons/fa";
import { RiCustomerService2Line } from "react-icons/ri";
import { MdOutlinePrivacyTip } from "react-icons/md";
import { toast } from "react-toastify";
import { decodeToken } from "../../utilities/helperfFunction";
import "./Sidebar.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface SidebarProps {
  expand: boolean;
  darkMode: boolean;
  toggleSigninModal?: any;
  toggleSignupModal?: any;
  toggleUploadScriptModal?: any;
  toggleUploadModal?: any;
  setDarkMode: any;
  isLoggedIn: any;
  toggleSignoutModal?: any;
  setLightMode: any;
}

const Sidebar: React.FC<SidebarProps> = ({
  expand,
  toggleSigninModal,
  toggleSignupModal,
  toggleSignoutModal,
  setLightMode,
  setDarkMode,
  darkMode,
  isLoggedIn,
  toggleUploadScriptModal,
  toggleUploadModal,
}) => {
  const token = localStorage.getItem("token") || null;
  const tokenData = decodeToken(token);
  const [hasPaid, setHasPaid] = useState(false);
  const [userType, setUserType] = useState<'buyer' | 'seller'>('buyer');
  const [userData, setUserData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (tokenData) {
      fetchPaymentStatus(tokenData.userId);
      fetchUserData(tokenData.userId);
    }
  }, [tokenData]);

  const fetchPaymentStatus = async (userId: any) => {
    try {
      const response = await axios.get(
        `https://wecinema.co/api/user/payment-status/${userId}`
      );
      setHasPaid(response.data.hasPaid);
    } catch (error) {
      console.error("Payment status error:", error);
    }
  };

  const fetchUserData = async (userId: any) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/user/${userId}`
      );
      setUserData(response.data);
      if (response.data.userType) {
        setUserType(response.data.userType);
      }
    } catch (error) {
      console.error("User data fetch error:", error);
    }
  };

  const handleHypemodeClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasPaid) {
      event.preventDefault();
      toast.info("You are already subscribed to Hypemode!");
    } else if (!hasPaid) {
      navigate("/hypemode");
    }
  };

  const getActiveClass = (path: string) => {
    return window.location.pathname === path ? "text-active" : "";
  };

  // Function to change user type
  const changeUserType = async (newType: 'buyer' | 'seller') => {
    if (!tokenData) {
      toast.error("Please login first");
      return;
    }

    try {
      const response = await axios.put(
        `http://localhost:3000/user/change-type/${tokenData.userId}`,
        { userType: newType },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data) {
        setUserType(newType);
        setUserData((prev: any) => ({ ...prev, userType: newType }));
        localStorage.setItem('marketplaceMode', newType);
        toast.success(`Switched to ${newType} mode successfully!`);
      }
    } catch (error: any) {
      console.error("Error changing user type:", error);
      toast.error(error.response?.data?.error || "Failed to switch mode");
    }
  };

  // Render marketplace section based on user type
  const renderMarketplaceSection = () => {
    if (!tokenData) return null;

    return (
      <nav className="sidebar-section-container">
        <div className="sidebar-section-header">
          <h2 className={`sidebar-section-title ${expand ? "" : "collapsed"}`}>
            Marketplace
          </h2>
          {expand && (
            <div className="user-type-switcher">
<<<<<<< HEAD
              <button
                className={`type-btn ${userType === 'buyer' ? 'active' : ''}`}
                onClick={() => changeUserType('buyer')}
                title="Switch to Buyer Mode"
              >
                <FaShoppingCart size={12} />
              </button>
              <button
                className={`type-btn ${userType === 'seller' ? 'active' : ''}`}
                onClick={() => changeUserType('seller')}
                title="Switch to Seller Mode"
              >
                <FaUserTie size={12} />
              </button>
=======
              
              
>>>>>>> 70c98a51 (yes)
            </div>
          )}
        </div>
        
        <ul className="sidebar-section">
          {/* Common Links for Both */}
          <Link
            to="/marketplace"
            className={`sidebar-item ${getActiveClass("/marketplace")} ${
              expand ? "" : "collapsed"
            }`}
          >
            <RiStoreLine className="sidebar-icon" />
            <span className="sidebar-text">Browse Listings</span>
          </Link>

          <Link
            to="/marketplace/messages"
            className={`sidebar-item ${getActiveClass(
              "/marketplace/messages"
            )} ${expand ? "" : "collapsed"}`}
          >
            <RiMessageLine className="sidebar-icon" />
            <span className="sidebar-text">Messages</span>
          </Link>

          {/* Buyer Specific Links */}
          {userType === 'buyer' && (
            <>
              <Link
                to="/marketplace/buyer-dashboard"
                className={`sidebar-item ${getActiveClass(
                  "/marketplace/dashboard"
                )} ${expand ? "" : "collapsed"}`}
              >
                <RiListCheck className="sidebar-icon" />
                <span className="sidebar-text">Buyer Dashboard</span>
              </Link>
              <Link
                to="/marketplace/my-orders"
                className={`sidebar-item ${getActiveClass(
                  "/marketplace/my-orders"
                )} ${expand ? "" : "collapsed"}`}
              >
                <RiShoppingBagLine className="sidebar-icon" />
                <span className="sidebar-text">My Orders</span>
              </Link>
            </>
          )}

          {/* Seller Specific Links */}
          {userType === 'seller' && (
            <>
              <Link
                to="/marketplace/create"
                className={`sidebar-item ${getActiveClass(
                  "/marketplace/create"
                )} ${expand ? "" : "collapsed"}`}
              >
                <RiAddCircleLine className="sidebar-icon" />
                <span className="sidebar-text">Create Listing</span>
              </Link>

              <Link
                to="/marketplace/dashboard"
                className={`sidebar-item ${getActiveClass(
                  "/marketplace/dashboard"
                )} ${expand ? "" : "collapsed"}`}
              >
                <RiListCheck className="sidebar-icon" />
                <span className="sidebar-text">Seller Dashboard</span>
              </Link>
            </>
          )}
        </ul>

        {/* User Type Badge */}
        {expand && (
          <div className="user-type-badge">
            <span className={`badge ${userType}`}>
              {userType === 'seller' ? (
                <>
                  <FaUserTie className="badge-icon" />
                  Seller Mode
                </>
              ) : (
                <>
                  <FaShoppingCart className="badge-icon" />
                  Buyer Mode
                </>
              )}
            </span>
          </div>
        )}
      </nav>
    );
  };

  return (
    <section
      className={`sidebar-container ${expand ? "expanded" : "collapsed"} ${
        darkMode ? "dark" : "light"
      }`}
    >
      {/* -------- MAIN NAV -------- */}
      <nav className="sidebar-nav">
        <ul className="sidebar-section">
          <Link
            to="/"
            className={`sidebar-item ${getActiveClass("/")} ${
              expand ? "" : "collapsed"
            }`}
          >
            <IoMdHome className="sidebar-icon" />
            <span className="sidebar-text">Home</span>
          </Link>
          <Link
            to="/hypemode"
            onClick={handleHypemodeClick}
            className={`sidebar-item ${getActiveClass("/hypemode")} ${
              expand ? "" : "collapsed"
            }`}
          >
            <RiMovie2Line className="sidebar-icon" />
            <span className="sidebar-text">Hype mode</span>
          </Link>
          <Link
            to="/videoeditor"
            className={`sidebar-item ${getActiveClass("/videoeditor")} ${
              expand ? "" : "collapsed"
            }`}
          >
            <TbVideoPlus className="sidebar-icon" />
            <span className="sidebar-text">Video Editor</span>
          </Link>

          <Link
            to={tokenData ? `/user/${tokenData.userId}` : "#"}
            onClick={(event) => {
              if (!tokenData) {
                toast.error("Please login!!");
                event.preventDefault();
              }
            }}
            className={`sidebar-item ${getActiveClass(
              `/user/${tokenData?.userId}`
            )} ${expand ? "" : "collapsed"}`}
          >
            <CgProfile className="sidebar-icon" />
            <span className="sidebar-text">Profile</span>
          </Link>

          <Link
            to="/history"
            className={`sidebar-item ${getActiveClass("/history")} ${
              expand ? "" : "collapsed"
            }`}
          >
            <RiHistoryLine className="sidebar-icon" />
            <span className="sidebar-text">History</span>
          </Link>

          <Link
            to="/likedvideos"
            className={`sidebar-item ${getActiveClass("/likedvideos")} ${
              expand ? "" : "collapsed"
            }`}
          >
            <RiHeartLine className="sidebar-icon" />
            <span className="sidebar-text">Liked Videos</span>
          </Link>

          <Link
            to="/chatbot"
            className={`sidebar-item ${getActiveClass("/chatbot")} ${
              expand ? "" : "collapsed"
            }`}
          >
            <MdChatBubbleOutline className="sidebar-icon" />
            <span className="sidebar-text">ChatBot</span>
          </Link>
        </ul>
      </nav>

      {/* -------- MARKETPLACE -------- */}
      {renderMarketplaceSection()}

      {/* -------- SETTINGS / ACCOUNT -------- */}
      <nav className="sidebar-section-container">
        <h2 className={`sidebar-section-title ${expand ? "" : "collapsed"}`}>
          Settings
        </h2>
        <ul className="sidebar-section">
          <div
            className={`sidebar-item ${darkMode ? "text-active" : ""} ${
              expand ? "" : "collapsed"
            }`}
            onClick={setDarkMode}
          >
            <FaMoon className="sidebar-icon" />
            <span className="sidebar-text">Dark mode</span>
          </div>
          <div
            className={`sidebar-item ${!darkMode ? "text-active" : ""} ${
              expand ? "" : "collapsed"
            }`}
            onClick={setLightMode}
          >
            <IoSunnyOutline className="sidebar-icon" />
            <span className="sidebar-text">Light mode</span>
          </div>

          {isLoggedIn ? (
            <>
              <Link
                to="/"
                className={`sidebar-item ${getActiveClass("/user")} ${
                  expand ? "" : "collapsed"
                }`}
              >
                <FaUser className="sidebar-icon" />
                <span className="sidebar-text">{isLoggedIn.username}</span>
              </Link>
              <div
                className={`sidebar-item ${getActiveClass("/signout")} ${
                  expand ? "" : "collapsed"
                }`}
                onClick={toggleSignoutModal}
              >
                <FaSignOutAlt className="sidebar-icon" />
                <span className="sidebar-text">Sign out</span>
              </div>
            </>
          ) : (
            <>
              <div
                className={`sidebar-item ${getActiveClass("/signin")} ${
                  expand ? "" : "collapsed"
                }`}
                onClick={toggleSigninModal}
              >
                <LiaSignInAltSolid className="sidebar-icon" />
                <span className="sidebar-text">Sign in</span>
              </div>
              <div
                className={`sidebar-item ${getActiveClass("/signup")} ${
                  expand ? "" : "collapsed"
                }`}
                onClick={toggleSignupModal}
              >
                <HiUserAdd className="sidebar-icon" />
                <span className="sidebar-text">Sign up</span>
              </div>
            </>
          )}

          <Link
            to="/customersupport"
            className={`sidebar-item ${getActiveClass("/customersupport")} ${
              expand ? "" : "collapsed"
            }`}
          >
            <RiCustomerService2Line className="sidebar-icon" />
            <span className="sidebar-text">Support</span>
          </Link>

          <Link
            to="/privacy-policy"
            className={`sidebar-item ${getActiveClass("/privacy-policy")} ${
              expand ? "" : "collapsed"
            }`}
          >
            <MdOutlinePrivacyTip className="sidebar-icon" />
            <span className="sidebar-text">Privacy</span>
          </Link>

          <Link
            to="/about"
            className={`sidebar-item ${getActiveClass("/about")} ${
              expand ? "" : "collapsed"
            }`}
          >
            <FaInfoCircle className="sidebar-icon" />
            <span className="sidebar-text">About</span>
          </Link>

          <Link
            to="/report"
            className={`sidebar-item ${getActiveClass("/report")} ${
              expand ? "" : "collapsed"
            }`}
          >
            <RiFlagLine className="sidebar-icon" />
            <span className="sidebar-text">Report</span>
          </Link>

          <Link
            to="/terms-and-conditions"
            className={`sidebar-item ${getActiveClass(
              "/terms-and-conditions"
            )} ${expand ? "" : "collapsed"}`}
          >
            <MdOutlineDescription className="sidebar-icon" />
            <span className="sidebar-text">Terms</span>
          </Link>
        </ul>
      </nav>
    </section>
  );
};

export default Sidebar;