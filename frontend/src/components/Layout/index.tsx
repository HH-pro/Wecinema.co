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
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../../api";

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

// Hypemode Subscription Modal Component
const HypemodeSubscriptionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}> = ({ isOpen, onClose, darkMode }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`subscription-modal ${darkMode ? 'dark-mode' : 'light-mode'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-icon">
            <FaCrown className="crown-icon" />
          </div>
          <h2 className="modal-title">Already Subscribed!</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="success-animation">
            <FaCheckCircle className="success-icon" />
          </div>
          
          <div className="subscription-details">
            <h3>You're All Set! 🎉</h3>
            <p className="modal-description">
              You already have an active <strong>HypeMode Premium</strong> subscription.
              Enjoy uninterrupted access to all premium features!
            </p>
            
            <div className="benefits-list">
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">Unlimited Video Processing</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">Priority Support</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">Advanced AI Features</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">No Watermarks</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="modal-primary-btn"
            onClick={() => {
              onClose();
              window.location.href = "/hypemode";
            }}
          >
            Go to HypeMode
          </button>
          <button 
            className="modal-secondary-btn"
            onClick={onClose}
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
};

// Marketplace Setup Prompt Component for Mobile Sidebar
const MarketplaceSetupPrompt: React.FC<{
  darkMode: boolean;
  onClick: () => void;
}> = ({ darkMode, onClick }) => {
  return (
    <div 
      className={`mb-4 p-3 rounded-lg cursor-pointer ${darkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <RiStoreLine className="text-yellow-500" size="18" />
        <span className={`font-semibold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Setup Marketplace</span>
        <span className="ml-auto text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-600 dark:text-yellow-300 rounded-full">
          New
        </span>
      </div>
      <p className={`text-xs ${darkMode ? 'text-yellow-300/70' : 'text-yellow-700/70'}`}>
        Complete your profile to start buying or selling
      </p>
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
  const [userType, setUserType] = useState<string>(''); // Can be 'buyer', 'seller', or empty for normal user
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

  const location = useLocation();
  const navigate = useNavigate();

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
        `${API_BASE_URL}/user/${userId}`
      );
      setUserData(response.data);
      if (response.data.userType) {
        setUserType(response.data.userType);
        localStorage.setItem('marketplaceMode', response.data.userType);
      } else {
        setUserType('');
        localStorage.removeItem('marketplaceMode');
      }
    } catch (error) {
      console.error("User data fetch error:", error);
      setUserType('');
    }
  };

  const fetchPaymentStatus = async (userId: string) => {
    try {
      const response = await axios.get(
         `${API_BASE_URL}/user/payment-status/${userId}`
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
        `${API_BASE_URL}/user/change-type/${decodedToken.userId}`,
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

  const handleMarketplaceSetup = () => {
    if (!decodedToken) {
      toast.error("Please login first");
      setType("login");
      setModalShow(true);
      return;
    }
    navigate(`/user/${decodedToken.userId}`);
    setExpanded(false);
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

  const handleHypemodeClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasPaid) {
      event.preventDefault();
      setShowHypemodeModal(true);
    } else if (!hasPaid) {
      // Navigate will be handled by Link
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

  // Render marketplace section for mobile sidebar
  const renderMarketplaceSection = () => {
    if (!decodedToken) return null;

    // Normal users (no userType set) - Show setup prompt ONLY
    if (!userType || userType === '') {
      return (
        <>
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Marketplace</span>
          </div>
          <MarketplaceSetupPrompt 
            darkMode={darkMode} 
            onClick={handleMarketplaceSetup}
          />
          {/* NO OTHER MARKETPLACE ITEMS FOR NORMAL USERS */}
          <div className="border-t border-gray-200 my-2"></div>
        </>
      );
    }

    // ONLY for Buyer/Seller users - Show full marketplace options
    return (
      <>
        <div className="px-4 py-2">
  <span className={`text-xs px-2 py-1 rounded-full ${userType === 'seller' ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300'}`}>
    {userType === 'seller' ? (
      <>
        <FaUserTie className="inline mr-1" size="10" />
        Marketplace · Seller
      </>
    ) : userType === 'buyer' ? (
      <>
        <FaShoppingCart className="inline mr-1" size="10" />
        Marketplace · Buyer
      </>
    ) : null}
  </span>
</div>
       {/* Common items for both buyer and seller - Show for ALL marketplace users */}
{(userType === 'seller' || userType === 'buyer') && (
  <>
    <Link
      to="/marketplace"
      className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/marketplace")}`}
    >
      <RiStoreLine size="20" />
      <span>Browse Listings</span>
    </Link>

    <Link
      to="/marketplace/messages"
      className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/marketplace/messages")}`}
    >
      <RiMessageLine size="20" />
      <span>Messages</span>
    </Link>
  </>
)}
        {/* Seller-only items */}
        {userType === 'seller' && (
          <>
            <Link
              to="/marketplace/create"
              className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/marketplace/create")}`}
            >
              <RiAddCircleLine size="20" />
              <span>Create Listing</span>
            </Link>

            <Link
              to="/marketplace/seller-dashboard"
              className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/marketplace/seller-dashboard")}`}
            >
              <RiListCheck size="20" />
              <span>Seller Dashboard</span>
            </Link>
          </>
        )}

        {/* Buyer-only items */}
        {userType === 'buyer' && (
          <>
            <Link
              to="/marketplace/buyer-dashboard"
              className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/marketplace/buyer-dashboard")}`}
            >
              <RiListCheck size="20" />
              <span>Buyer Dashboard</span>
            </Link>

            <Link
              to="/marketplace/my-orders"
              className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/marketplace/my-orders")}`}
            >
              <RiShoppingBagLine size="20" />
              <span>My Orders</span>
            </Link>
          </>
        )}

        {/* User Type Badge */}
       {userType && (
  <div className="px-4 py-2">
    <span className={`text-xs px-2 py-1 rounded-full ${userType === 'seller' ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300'}`}>
      {userType === 'seller' ? (
        <>
          <FaUserTie className="inline mr-1" size="10" />
          Seller Mode
        </>
      ) : userType === 'buyer' ? (
        <>
          <FaShoppingCart className="inline mr-1" size="10" />
          Buyer Mode
        </>
      ) : null}
    </span>
  </div>
)}

        <div className="border-t border-gray-200 my-2"></div>
      </>
    );
  };

  // Add CSS styles inline or you can add them in your main CSS file
  const modalStyles = `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    }

    .subscription-modal {
      width: 90%;
      max-width: 380px;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25);
      animation: modalSlideIn 0.3s ease-out;
      position: relative;
    }

    .subscription-modal.dark-mode {
      background: linear-gradient(145deg, #2d3748, #1a202c);
      color: white;
      border: 1px solid #4a5568;
    }

    .subscription-modal.light-mode {
      background: white;
      color: #2d3748;
      border: 1px solid #e2e8f0;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-15px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      position: relative;
    }

    .modal-icon {
      width: 45px;
      height: 45px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
    }

    .subscription-modal.dark-mode .modal-icon {
      background: linear-gradient(135deg, #eab308, #fbbf24);
    }

    .subscription-modal.light-mode .modal-icon {
      background: linear-gradient(135deg, #eab308, #f59e0b);
    }

    .crown-icon {
      font-size: 20px;
      color: #1f2937;
    }

    .modal-title {
      font-size: 20px;
      font-weight: bold;
      flex: 1;
    }

    .modal-close-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: none;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .subscription-modal.dark-mode .modal-close-btn {
      background: #4a5568;
      color: #fbbf24;
    }

    .subscription-modal.light-mode .modal-close-btn {
      background: #fef3c7;
      color: #92400e;
    }

    .modal-close-btn:hover {
      transform: scale(1.1);
    }

    .modal-body {
      text-align: center;
      margin-bottom: 20px;
    }

    .success-animation {
      margin-bottom: 15px;
    }

    .success-icon {
      font-size: 52px;
      color: #22c55e;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
      100% {
        transform: scale(1);
      }
    }

    .subscription-details h3 {
      font-size: 18px;
      margin-bottom: 12px;
      color: #fbbf24;
    }

    .modal-description {
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 20px;
      opacity: 0.9;
    }

    .benefits-list {
      text-align: left;
      margin-top: 15px;
    }

    .benefit-item {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .subscription-modal.light-mode .benefit-item {
      border-bottom-color: rgba(0, 0, 0, 0.08);
    }

    .benefit-icon {
      color: #fbbf24;
      font-weight: bold;
      margin-right: 10px;
      font-size: 16px;
    }

    .benefit-text {
      font-size: 14px;
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .modal-primary-btn {
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      background: linear-gradient(135deg, #eab308, #f59e0b);
      color: #1f2937;
      flex: 1;
    }

    .modal-primary-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(234, 179, 8, 0.3);
      background: linear-gradient(135deg, #f59e0b, #eab308);
    }

    .modal-secondary-btn {
      padding: 12px 24px;
      border-radius: 8px;
      border: 2px solid;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      background: transparent;
      flex: 1;
    }

    .subscription-modal.dark-mode .modal-secondary-btn {
      border-color: #fbbf24;
      color: #fbbf24;
    }

    .subscription-modal.light-mode .modal-secondary-btn {
      border-color: #f59e0b;
      color: #92400e;
    }

    .modal-secondary-btn:hover {
      transform: translateY(-2px);
      background: rgba(251, 191, 36, 0.1);
    }
  `;

  return (
    <>
      <style>{modalStyles}</style>
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
          <div className="fixed top-0 left-0 z-40 h-full w-full bg-black bg-opacity-90 backdrop-blur-md transition-opacity ease-in-out duration-300">
            <section
              className={`fixed inset-0 w-4/5 max-w-xs border-r border-gray-200 overflow-auto z-50 ${
                darkMode ? "bg-dark text-light" : "bg-light text-dark"
              }`}
            >
              {/* Main Nav */}
              <nav className="flex items-center justify-between p-2 my-3 pb-6">
                <ul className="border-b w-full border-gray-200 pb-4">
                  {/* Home */}
                  <Link
                    to="/"
                    className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/")}`}
                  >
                    <IoMdHome size="20" />
                    <span>Home</span>
                  </Link>

                  {/* Hype mode */}
                  <Link
                    to="/hypemode"
                    onClick={handleHypemodeClick}
                    className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded relative ${getActiveClass("/hypemode")} ${hasPaid ? 'bg-yellow-50 dark:bg-yellow-900' : ''}`}
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

                  {/* Video Editor */}
                  <Link
                    to="/videoeditor"
                    className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/videoeditor")}`}
                  >
                    <TbVideoPlus size="20" />
                    <span>Video Editor</span>
                  </Link>

                  {/* Profile */}
                  {decodedToken && (
                    <Link
                      to={`/user/${decodedToken?.userId}`}
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass(`/user/${decodedToken?.userId}`)}`}
                    >
                      <CgProfile size="20" />
                      <span>Profile</span>
                    </Link>
                  )}

                  {/* History */}
                  {decodedToken && (
                    <Link
                      to="/history"
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/history")}`}
                    >
                      <RiHistoryLine size="20" />
                      <span>History</span>
                    </Link>
                  )}

                  {/* Liked Videos */}
                  {decodedToken && (
                    <Link
                      to="/likedvideos"
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/likedvideos")}`}
                    >
                      <RiHeartLine size="20" />
                      <span>Liked Videos</span>
                    </Link>
                  )}

                  {/* Chat Bot */}
                  <Link
                    to="/chatbot"
                    className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/chatbot")}`}
                  >
                    <MdChatBubbleOutline size="20" />
                    <span>Chat Bot</span>
                  </Link>

                  {/* ✅ Marketplace Section - Conditionally Rendered */}
                  {decodedToken && renderMarketplaceSection()}

                  {/* Support */}
                  <Link
                    to="/customersupport"
                    className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/customersupport")}`}
                  >
                    <RiCustomerService2Line size="20" />
                    <span>Support</span>
                  </Link>
                </ul>
              </nav>

              {/* Settings */}
              <nav className="px-4 py-2 border-b border-gray-200">
                <h2 className="font-bold mb-2">Settings</h2>
                <div
                  className={`flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 ${darkMode ? "text-yellow-600 dark:text-yellow-400" : ""}`}
                  onClick={setDarkiMode}
                >
                  <FaMoon size="20" />
                  <span className="text-sm">Dark Mode</span>
                </div>
                <div
                  className={`flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 ${!darkMode ? "text-yellow-600 dark:text-yellow-400" : ""}`}
                  onClick={setLightMode}
                >
                  <IoSunnyOutline size="20" />
                  <span className="text-sm">Light Mode</span>
                </div>
                
                <Link
                  to="/about"
                  className={`flex items-center gap-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 ${getActiveClass("/about")}`}
                >
                  <FaInfoCircle size="20" />
                  <span className="text-sm">About</span>
                </Link>
                
                <Link
                  to="/report"
                  className={`flex items-center gap-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 ${getActiveClass("/report")}`}
                >
                  <RiFlagLine size="20" />
                  <span className="text-sm">Report</span>
                </Link>
                
                <Link
                  to="/privacy-policy"
                  className={`flex items-center gap-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 ${getActiveClass("/privacy-policy")}`}
                >
                  <MdOutlinePrivacyTip size="20" />
                  <span className="text-sm">Privacy Policy</span>
                </Link>
                
                <Link
                  to="/terms-and-conditions"
                  className={`flex items-center gap-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 ${getActiveClass("/terms-and-conditions")}`}
                >
                  <MdOutlineDescription size="20" />
                  <span className="text-sm">Terms & Conditions</span>
                </Link>
              </nav>

              {/* Auth */}
              <nav className="px-4 py-3">
                {!decodedToken ? (
                  <>
                    <div
                      onClick={() => handleType("login")}
                      className="flex items-center gap-3 py-2 cursor-pointer hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2"
                    >
                      <LiaSignInAltSolid size="20" />
                      <span>Sign In</span>
                    </div>
                    <div
                      onClick={() => handleType("register")}
                      className="flex items-center gap-3 py-2 cursor-pointer hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2"
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
                      onClick={() => handleType("logout")}
                      className="flex items-center gap-3 py-2 cursor-pointer hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2"
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
              toggleSigninModal={() => handleType("login")}
              toggleSignupModal={() => handleType("register")}
              toggleSignoutModal={() => handleType("logout")}
              darkMode={darkMode}
              toggleUploadModal={() => handleType("video")}
              toggleUploadScriptModal={() => handleType("script")}
              isLoggedIn={decodedToken}
            />
          )}

          <main
            className={`flex flex-col min-h-screen ${hasHeader ? 'mt-12' : 'mt-0'} ${
              darkMode ? "body-dark text-dark" : "body-light text-light"
            } bg-gray-200 w-full transition-all duration-300`}
            style={{
              marginLeft: !isSidebarVisible
                ? "0px"
                : !isTabletOrMobile
                ? expanded
                  ? "16.8%"
                  : "150px"
                : "0px",
            }}
          >
            <Modal type={type} authorized={!!token} show={modalShow} />
            <div className="flex-grow">{children}</div>

            {/* Footer */}
            <footer
              className={`w-full text-center py-4 ${
                darkMode
                  ? "bg-gray-900 text-gray-300"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              © {new Date().getFullYear()} All rights reserved by{" "}
              <a
                href="https://wecinema.co"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline"
              >
                wecinema.co
              </a>
            </footer>
          </main>
        </div>
      </div>

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