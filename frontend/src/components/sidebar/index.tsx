import React from "react";
import { IoMdHome } from "react-icons/io";
import {
  RiHeartLine,
  RiHistoryLine,
  RiFlagLine,
  RiStoreLine,
  RiAddCircleLine,
  RiShoppingBagLine,
  RiListCheck,
} from "react-icons/ri";
import { LiaSignInAltSolid } from "react-icons/lia";
import { HiUserAdd } from "react-icons/hi";
import { FaMoon } from "react-icons/fa";
import { MdOutlineDescription, MdChatBubbleOutline } from "react-icons/md";
import { IoSunnyOutline } from "react-icons/io5";
import { CgProfile } from "react-icons/cg";
import { Link } from "react-router-dom";
import { TbVideoPlus } from "react-icons/tb";
import { FaUser, FaSignOutAlt } from "react-icons/fa";
import { RiCustomerService2Line } from "react-icons/ri";
import { MdOutlinePrivacyTip } from "react-icons/md";
import { toast } from "react-toastify";
import { decodeToken } from "../../utilities/helperfFunction";
import "./Sidebar.css";

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
}) => {
  const token = localStorage.getItem("token") || null;
  const tokenData = decodeToken(token);

  const getActiveClass = (path: string) => {
    return window.location.pathname === path ? "text-active" : "";
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
      {tokenData && (
        <nav className="sidebar-section-container">
          <h2 className={`sidebar-section-title ${expand ? "" : "collapsed"}`}>
            Marketplace
          </h2>
          <ul className="sidebar-section">
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
              to="/marketplace/create"
              className={`sidebar-item ${getActiveClass(
                "/marketplace/create"
              )} ${expand ? "" : "collapsed"}`}
            >
              <RiAddCircleLine className="sidebar-icon" />
              <span className="sidebar-text">Create Listing</span>
            </Link>

            <Link
              to="/marketplace/orders"
              className={`sidebar-item ${getActiveClass(
                "/marketplace/orders"
              )} ${expand ? "" : "collapsed"}`}
            >
              <RiShoppingBagLine className="sidebar-icon" />
              <span className="sidebar-text">My Orders</span>
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
          </ul>
        </nav>
      )}

      {/* -------- SETTINGS / ACCOUNT -------- */}
      <nav className="sidebar-section-container">
        <h2 className={`sidebar-section-title ${expand ? "" : "collapsed"}`}>
          Theme
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
