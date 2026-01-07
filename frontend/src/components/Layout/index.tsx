import React, { ReactNode, useEffect, useState } from "react";
import { Header, Modal, Sidebar } from "..";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "quill/dist/quill.snow.css";
import { Itoken, decodeToken } from "../../utilities/helperfFunction";
import { IoMdHome } from "react-icons/io";
import {
  RiMovie2Line,
  RiHeartLine,
  RiHistoryLine,
  RiFlagLine,
  RiCustomerService2Line,
  RiStoreLine,
  RiAddCircleLine,
  RiListCheck,
  RiShoppingBagLine,
  RiMessageLine,
} from "react-icons/ri";
import { MdChatBubbleOutline, MdOutlinePrivacyTip, MdOutlineDescription } from "react-icons/md";
import { TbVideoPlus } from "react-icons/tb";
import { CgProfile } from "react-icons/cg";
import { FaSignOutAlt, FaMoon, FaSun, FaUser, FaShoppingCart, FaUserTie, FaInfoCircle, FaCheckCircle, FaCrown } from "react-icons/fa";
import { LiaSignInAltSolid } from "react-icons/lia";
import { HiUserAdd } from "react-icons/hi";
import { IoSunnyOutline } from "react-icons/io5";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

export const theme = [
  "Love",
  "Redemption",
  "Family",
  "Oppression",
  "Corruption",
  "Survival",
  "Revenge",
  "Death",
  "Justice",
  "Perseverance",
  "War",
  "Bravery",
  "Freedom",
  "Friendship",
  "Hope",
  "Society",
  "Isolation",
  "Peace",
];

interface LayoutProps {
  hasHeader?: boolean;
  children: ReactNode;
  hideSidebar?: boolean;
}

// Fixed Hypemode Subscription Modal Component with proper positioning
const HypemodeSubscriptionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}> = ({ isOpen, onClose, darkMode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div 
        className={`relative w-full max-w-sm rounded-lg shadow-xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
                <FaCrown className="text-white" />
              </div>
              <h2 className="text-xl font-bold">Already Subscribed!</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="text-center mb-6">
            <FaCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">You're All Set! 🎉</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You already have an active <strong>HypeMode Premium</strong> subscription.
            </p>
          </div>

          {/* Benefits List */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Unlimited Video Processing</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Priority Support</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Advanced AI Features</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>No Watermarks</span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="space-y-3">
            <button 
              onClick={() => {
                onClose();
                window.location.href = "/hypemode";
              }}
              className="w-full py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded transition-colors"
            >
              Go to HypeMode
            </button>
            <button 
              onClick={onClose}
              className={`w-full py-2 px-4 border rounded transition-colors ${darkMode ? 'border-yellow-500 text-yellow-500 hover:bg-yellow-900' : 'border-yellow-500 text-yellow-600 hover:bg-yellow-50'}`}
            >
              Continue Browsing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Login/Register Modal Component
const AuthModal: React.FC<{
  type: 'login' | 'register';
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  onSwitchType: () => void;
}> = ({ type, isOpen, onClose, darkMode, onSwitchType }) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: type === 'register' ? "" : undefined,
    confirmPassword: type === 'register' ? "" : undefined,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Add your auth logic here
    onClose();
    toast.success(type === 'login' ? 'Logged in successfully!' : 'Registered successfully!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div 
        className={`relative w-full max-w-md rounded-lg shadow-xl overflow-y-auto max-h-[90vh] ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-inherit">
          <h2 className="text-xl font-semibold">
            {type === 'login' ? 'Sign In' : 'Sign Up'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {type === 'register' && (
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="Enter username"
                  required
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Enter email"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Enter password"
                required
              />
            </div>
            
            {type === 'register' && (
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="Confirm password"
                  required
                />
              </div>
            )}
            
            <button
              type="submit"
              className="w-full py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded transition-colors"
            >
              {type === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm">
              {type === 'login' ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={onSwitchType}
                className="ml-2 text-yellow-500 hover:text-yellow-600 font-medium"
              >
                {type === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
            
            {type === 'login' && (
              <button type="button" className="mt-2 text-sm text-blue-500 hover:text-blue-600">
                Forgot Password?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({
  children,
  hasHeader = true,
  hideSidebar = false,
}) => {
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token") || null
  );
  const [decodedToken, setDecodedToken] = useState<Itoken | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [userType, setUserType] = useState<'buyer' | 'seller'>('buyer');
  const [hasPaid, setHasPaid] = useState(false);
  const isDarkMode = localStorage.getItem("isDarkMode") ?? false;
  const [darkMode, setDarkMode] = useState<boolean>(!!isDarkMode);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [modalShow, setModalShow] = useState(false);
  const [type, setType] = useState("");
  const [show, setShow] = useState<boolean>(false);
  const [showHypemodeModal, setShowHypemodeModal] = useState(false);
  const [viewPageSidebarVisible, setViewPageSidebarVisible] =
    useState<boolean>(!hideSidebar);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalType, setAuthModalType] = useState<'login' | 'register'>('login');

  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const decoded = decodeToken(token);
    setDecodedToken(decoded);
    if (decoded) {
      fetchUserData(decoded.userId);
      fetchPaymentStatus(decoded.userId);
    }
    return () => {
      setDecodedToken(null);
      setUserData(null);
    };
  }, [token]);

  const fetchUserData = async (userId: string) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/user/${userId}`
      );
      setUserData(response.data);
      if (response.data.userType) {
        setUserType(response.data.userType);
        localStorage.setItem('marketplaceMode', response.data.userType);
      }
    } catch (error) {
      console.error("User data fetch error:", error);
    }
  };

  const fetchPaymentStatus = async (userId: string) => {
    try {
      const response = await axios.get(
        `https://wecinema.co/api/user/payment-status/${userId}`
      );
      setHasPaid(response.data.hasPaid);
    } catch (error) {
      console.error("Payment status error:", error);
    }
  };

  const changeUserType = async (newType: 'buyer' | 'seller') => {
    if (!decodedToken) {
      toast.error("Please login first");
      return;
    }

    try {
      const response = await axios.put(
        `http://localhost:3000/user/change-type/${decodedToken.userId}`,
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

  const setLightMode = () => {
    localStorage.removeItem("isDarkMode");
    setDarkMode(false);
  };

  const setDarkiMode = () => {
    localStorage.setItem("isDarkMode", "dark");
    setDarkMode(true);
  };

  const handleType = (str: string) => {
    setType(str);
    setModalShow(!modalShow);
  };

  const handleAuthModal = (authType: 'login' | 'register') => {
    setAuthModalType(authType);
    setAuthModalOpen(true);
  };

  const handleHypemodeClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasPaid) {
      event.preventDefault();
      setShowHypemodeModal(true);
    }
  };

  useEffect(() => {
    setShow(!!type);
  }, [type, modalShow]);

  const isTabletOrMobile = screenWidth <= 1120;
  const isMobile = screenWidth <= 420;
  const isSidebarVisible = hideSidebar ? viewPageSidebarVisible : true;

  // Get active class for sidebar items
  const getActiveClass = (path: string) => {
    return location.pathname === path ? "bg-yellow-50 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400" : "";
  };

  return (
    <>
      <div className="text-lg md:text-sm sm:text-xs">
        <ToastContainer />
        {hasHeader && (
          <Header
            expand={expanded}
            isMobile={isMobile}
            toggler={() => setExpanded(!expanded)}
            darkMode={darkMode}
            toggleUploadModal={() => handleType("video")}
            toggleUploadScriptModal={() => handleType("script")}
            toggleSidebar={
              hideSidebar
                ? () => setViewPageSidebarVisible((prev) => !prev)
                : undefined
            }
          />
        )}

        {/* ✅ Sidebar Overlay for Tablet + Mobile */}
        {expanded && isTabletOrMobile && isSidebarVisible && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-90 backdrop-blur-md transition-opacity duration-300">
            <section
              className={`fixed inset-y-0 left-0 w-4/5 max-w-xs border-r border-gray-200 overflow-y-auto z-50 ${darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}
            >
              {/* Close Button for Mobile */}
              <button
                onClick={() => setExpanded(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Main Nav */}
              <nav className="pt-16 p-4">
                <ul className="space-y-1">
                  {/* Home */}
                  <li>
                    <Link
                      to="/"
                      onClick={() => setExpanded(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg ${getActiveClass("/")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      <IoMdHome size="20" />
                      <span>Home</span>
                    </Link>
                  </li>

                  {/* Hype mode */}
                  <li>
                    <Link
                      to="/hypemode"
                      onClick={(e) => {
                        setExpanded(false);
                        handleHypemodeClick(e);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg relative ${getActiveClass("/hypemode")} ${hasPaid ? 'bg-yellow-50 dark:bg-yellow-900' : ''} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      <div className="relative">
                        <RiMovie2Line size="20" className={hasPaid ? "text-yellow-500" : ""} />
                        {hasPaid && (
                          <FaCrown className="absolute -top-1 -right-1 text-yellow-500 text-xs bg-gray-800 rounded-full p-0.5" />
                        )}
                      </div>
                      <span className={hasPaid ? "text-yellow-600 dark:text-yellow-400" : ""}>Hype mode</span>
                      {hasPaid && (
                        <span className="ml-auto text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-600 dark:text-yellow-300 rounded-full">
                          Premium
                        </span>
                      )}
                    </Link>
                  </li>

                  {/* Video Editor */}
                  <li>
                    <Link
                      to="/videoeditor"
                      onClick={() => setExpanded(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg ${getActiveClass("/videoeditor")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      <TbVideoPlus size="20" />
                      <span>Video Editor</span>
                    </Link>
                  </li>

                  {/* Profile */}
                  {decodedToken && (
                    <li>
                      <Link
                        to={`/user/${decodedToken?.userId}`}
                        onClick={() => setExpanded(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg ${getActiveClass(`/user/${decodedToken?.userId}`)} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      >
                        <CgProfile size="20" />
                        <span>Profile</span>
                      </Link>
                    </li>
                  )}

                  {/* History */}
                  {decodedToken && (
                    <li>
                      <Link
                        to="/history"
                        onClick={() => setExpanded(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg ${getActiveClass("/history")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      >
                        <RiHistoryLine size="20" />
                        <span>History</span>
                      </Link>
                    </li>
                  )}

                  {/* Liked Videos */}
                  {decodedToken && (
                    <li>
                      <Link
                        to="/likedvideos"
                        onClick={() => setExpanded(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg ${getActiveClass("/likedvideos")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      >
                        <RiHeartLine size="20" />
                        <span>Liked Videos</span>
                      </Link>
                    </li>
                  )}

                  {/* Chat Bot */}
                  <li>
                    <Link
                      to="/chatbot"
                      onClick={() => setExpanded(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg ${getActiveClass("/chatbot")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      <MdChatBubbleOutline size="20" />
                      <span>Chat Bot</span>
                    </Link>
                  </li>

                  {/* ✅ Marketplace for logged-in users */}
                  {decodedToken && (
                    <>
                      <li className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <span>Marketplace</span>
                      </li>

                      <li>
                        <Link
                          to="/marketplace"
                          onClick={() => setExpanded(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg ${getActiveClass("/marketplace")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                          <RiStoreLine size="20" />
                          <span>Browse Listings</span>
                        </Link>
                      </li>

                      <li>
                        <Link
                          to="/marketplace/messages"
                          onClick={() => setExpanded(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg ${getActiveClass("/marketplace/messages")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                          <RiMessageLine size="20" />
                          <span>Messages</span>
                        </Link>
                      </li>

                      {userType === 'seller' && (
                        <li>
                          <Link
                            to="/marketplace/create"
                            onClick={() => setExpanded(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg ${getActiveClass("/marketplace/create")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          >
                            <RiAddCircleLine size="20" />
                            <span>Create Listing</span>
                          </Link>
                        </li>
                      )}

                      <li>
                        <Link
                          to={userType === 'seller' ? "/marketplace/dashboard" : "/marketplace/buyer-dashboard"}
                          onClick={() => setExpanded(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg ${getActiveClass(userType === 'seller' ? "/marketplace/dashboard" : "/marketplace/buyer-dashboard")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                          <RiListCheck size="20" />
                          <span>{userType === 'seller' ? 'Seller' : 'Buyer'} Dashboard</span>
                        </Link>
                      </li>

                      {userType === 'buyer' && (
                        <li>
                          <Link
                            to="/marketplace/my-orders"
                            onClick={() => setExpanded(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg ${getActiveClass("/marketplace/my-orders")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          >
                            <RiShoppingBagLine size="20" />
                            <span>My Orders</span>
                          </Link>
                        </li>
                      )}

                      {/* User Type Badge */}
                      <li className="px-4 py-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${userType === 'seller' ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300'}`}>
                          {userType === 'seller' ? (
                            <>
                              <FaUserTie className="inline mr-1" size="10" />
                              Seller Mode
                            </>
                          ) : (
                            <>
                              <FaShoppingCart className="inline mr-1" size="10" />
                              Buyer Mode
                            </>
                          )}
                        </span>
                      </li>

                      <div className="border-t border-gray-200 my-2"></div>
                    </>
                  )}

                  {/* Support */}
                  <li>
                    <Link
                      to="/customersupport"
                      onClick={() => setExpanded(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg ${getActiveClass("/customersupport")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      <RiCustomerService2Line size="20" />
                      <span>Support</span>
                    </Link>
                  </li>
                </ul>
              </nav>

              {/* Settings */}
              <nav className="px-4 py-2 border-t border-gray-200">
                <h2 className="font-bold mb-2">Settings</h2>
                <div
                  className={`flex items-center gap-3 py-2 cursor-pointer rounded px-2 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${darkMode ? "text-yellow-400" : "text-yellow-600"}`}
                  onClick={setDarkiMode}
                >
                  <FaMoon size="20" />
                  <span className="text-sm">Dark Mode</span>
                </div>
                <div
                  className={`flex items-center gap-3 py-2 cursor-pointer rounded px-2 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${!darkMode ? "text-yellow-400" : "text-yellow-600"}`}
                  onClick={setLightMode}
                >
                  <IoSunnyOutline size="20" />
                  <span className="text-sm">Light Mode</span>
                </div>
                
                <Link
                  to="/about"
                  onClick={() => setExpanded(false)}
                  className={`flex items-center gap-3 py-2 rounded px-2 ${getActiveClass("/about")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <FaInfoCircle size="20" />
                  <span className="text-sm">About</span>
                </Link>
                
                <Link
                  to="/report"
                  onClick={() => setExpanded(false)}
                  className={`flex items-center gap-3 py-2 rounded px-2 ${getActiveClass("/report")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <RiFlagLine size="20" />
                  <span className="text-sm">Report</span>
                </Link>
                
                <Link
                  to="/privacy-policy"
                  onClick={() => setExpanded(false)}
                  className={`flex items-center gap-3 py-2 rounded px-2 ${getActiveClass("/privacy-policy")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <MdOutlinePrivacyTip size="20" />
                  <span className="text-sm">Privacy Policy</span>
                </Link>
                
                <Link
                  to="/terms-and-conditions"
                  onClick={() => setExpanded(false)}
                  className={`flex items-center gap-3 py-2 rounded px-2 ${getActiveClass("/terms-and-conditions")} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <MdOutlineDescription size="20" />
                  <span className="text-sm">Terms & Conditions</span>
                </Link>
              </nav>

              {/* Auth */}
              <nav className="px-4 py-3 border-t border-gray-200">
                {!decodedToken ? (
                  <>
                    <div
                      onClick={() => {
                        setExpanded(false);
                        handleAuthModal("login");
                      }}
                      className="flex items-center gap-3 py-2 cursor-pointer rounded px-2 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900"
                    >
                      <LiaSignInAltSolid size="20" />
                      <span>Sign In</span>
                    </div>
                    <div
                      onClick={() => {
                        setExpanded(false);
                        handleAuthModal("register");
                      }}
                      className="flex items-center gap-3 py-2 cursor-pointer rounded px-2 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900"
                    >
                      <HiUserAdd size="20" />
                      <span>Sign Up</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 py-2 px-2">
                      <FaUser size="16" />
                      <span className="text-sm">{userData?.username || decodedToken?.username}</span>
                    </div>
                    <div
                      onClick={() => {
                        setExpanded(false);
                        handleType("logout");
                      }}
                      className="flex items-center gap-3 py-2 cursor-pointer rounded px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900"
                    >
                      <FaSignOutAlt size="16" />
                      <span>Log Out</span>
                    </div>
                  </>
                )}
              </nav>
            </section>
          </div>
        )}

        {/* ✅ Desktop Layout */}
        <div className="flex">
          {!isTabletOrMobile && isSidebarVisible && (
            <Sidebar
              expand={expanded}
              setLightMode={setLightMode}
              setDarkMode={setDarkiMode}
              toggleSigninModal={() => handleAuthModal("login")}
              toggleSignupModal={() => handleAuthModal("register")}
              toggleSignoutModal={() => handleType("logout")}
              darkMode={darkMode}
              toggleUploadModal={() => handleType("video")}
              toggleUploadScriptModal={() => handleType("script")}
              isLoggedIn={decodedToken}
            />
          )}

          <main
            className={`flex flex-col min-h-screen ${hasHeader ? 'mt-16' : 'mt-0'} ${
              darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
            } w-full transition-all duration-300`}
            style={{
              marginLeft: !isSidebarVisible
                ? "0px"
                : !isTabletOrMobile
                ? expanded
                  ? "250px"
                  : "80px"
                : "0px",
              transition: "margin-left 0.3s ease",
            }}
          >
            <Modal type={type} authorized={!!token} show={modalShow} />
            <div className="flex-grow p-4 md:p-6">{children}</div>

            {/* Footer */}
            <footer
              className={`w-full text-center py-4 mt-auto ${
                darkMode
                  ? "bg-gray-800 text-gray-300"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              © {new Date().getFullYear()} All rights reserved by{" "}
              <a
                href="https://wecinema.co"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline text-yellow-500"
              >
                wecinema.co
              </a>
            </footer>
          </main>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        type={authModalType}
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        darkMode={darkMode}
        onSwitchType={() => setAuthModalType(authModalType === 'login' ? 'register' : 'login')}
      />

      {/* Hypemode Subscription Modal */}
      <HypemodeSubscriptionModal
        isOpen={showHypemodeModal}
        onClose={() => setShowHypemodeModal(false)}
        darkMode={darkMode}
      />
    </>
  );
};

export default Layout;