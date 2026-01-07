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
import ReactDOM from "react-dom";

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

// Compact Modal Component with reduced height
const FixedModal: React.FC<{
  type: string;
  authorized: boolean;
  show: boolean;
  onClose: () => void;
}> = ({ type, authorized, show, onClose }) => {
  if (!show) return null;

  return ReactDOM.createPortal(
    <div className="compact-modal-overlay" onClick={onClose}>
      <div className="compact-modal-wrapper">
        <div className="compact-modal-container" onClick={(e) => e.stopPropagation()}>
          <Modal 
            type={type} 
            authorized={authorized} 
            show={show} 
            onClose={onClose}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

// Hypemode Subscription Modal Component
const HypemodeSubscriptionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}> = ({ isOpen, onClose, darkMode }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="subscription-modal-overlay" onClick={onClose}>
      <div className="subscription-modal-wrapper">
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
    </div>,
    document.body
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
  const [type, setType] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showHypemodeModal, setShowHypemodeModal] = useState(false);
  const [viewPageSidebarVisible, setViewPageSidebarVisible] =
    useState<boolean>(!hideSidebar);

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
    setShowModal(true);
  };

  const handleHypemodeClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasPaid) {
      event.preventDefault();
      setShowHypemodeModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setType("");
  };

  const isTabletOrMobile = screenWidth <= 1120;
  const isMobile = screenWidth <= 420;
  const isSidebarVisible = hideSidebar ? viewPageSidebarVisible : true;

  const getActiveClass = (path: string) => {
    return location.pathname === path ? "bg-yellow-50 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400" : "";
  };

  // Compact Modal Styles with Reduced Height
  const modalStyles = `
    /* Compact Modal Overlay - for Login/Register/Logout */
    .compact-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      overflow-y: auto;
      padding: 20px;
      backdrop-filter: blur(5px);
    }

    .compact-modal-wrapper {
      width: 100%;
      max-width: 450px; /* Reduced from 520px */
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .compact-modal-container {
      width: 100%;
      max-height: 650px; /* Fixed maximum height */
      overflow: hidden;
      border-radius: 12px; /* Smaller border radius */
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease-out;
      background: white;
    }

    /* Dark mode support for modal container */
    .dark .compact-modal-container {
      background: #1f2937;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Register/Login Modal Specific */
    .compact-modal-container .modal-dialog {
      max-width: 100% !important;
      width: 100% !important;
      margin: 0 !important;
    }

    .compact-modal-container .modal-content {
      width: 100% !important;
      max-width: 100% !important;
    }

    /* Compact Modal Content */
    .compact-modal-content {
      max-height: 650px;
      overflow-y: auto;
      padding: 25px 30px; /* Reduced padding */
    }

    /* Compact Form Container */
    .compact-modal-content form {
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
    }

    .compact-modal-content .form-group {
      width: 100% !important;
      margin-bottom: 16px !important; /* Reduced margin */
    }

    /* Compact Input Fields */
    .compact-input-field {
      width: 100% !important;
      padding: 10px 14px !important; /* Reduced padding */
      border: 1.5px solid #e5e7eb !important; /* Thinner border */
      border-radius: 8px !important; /* Smaller radius */
      font-size: 14px !important; /* Smaller font */
      transition: all 0.2s !important;
      margin-bottom: 12px !important; /* Reduced margin */
      box-sizing: border-box !important;
      height: 44px !important; /* Fixed height */
    }

    .compact-input-field:focus {
      outline: none !important;
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
    }

    .dark .compact-input-field {
      background: #374151 !important;
      border-color: #4b5563 !important;
      color: white !important;
    }

    .dark .compact-input-field:focus {
      border-color: #60a5fa !important;
      box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2) !important;
    }

    /* Compact Labels */
    .compact-label {
      display: block !important;
      width: 100% !important;
      margin-bottom: 6px !important; /* Reduced margin */
      font-weight: 500 !important;
      font-size: 13px !important; /* Smaller font */
      color: #4b5563;
    }

    .dark .compact-label {
      color: #d1d5db;
    }

    /* Compact Buttons */
    .compact-submit-btn {
      width: 100% !important;
      padding: 12px !important; /* Reduced padding */
      background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
      color: white !important;
      border: none !important;
      border-radius: 8px !important; /* Smaller radius */
      font-size: 14px !important; /* Smaller font */
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
      margin-top: 8px !important; /* Reduced margin */
      box-sizing: border-box !important;
      height: 44px !important; /* Fixed height */
    }

    .compact-submit-btn:hover {
      background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2) !important;
    }

    .compact-submit-btn:active {
      transform: translateY(0) !important;
    }

    /* Modal Header Compact */
    .compact-modal-header {
      padding: 15px 30px 10px !important; /* Reduced padding */
      border-bottom: 1px solid #e5e7eb !important;
      margin-bottom: 15px !important; /* Reduced margin */
    }

    .dark .compact-modal-header {
      border-bottom-color: #374151 !important;
    }

    .compact-modal-title {
      font-size: 18px !important; /* Smaller title */
      font-weight: 600 !important;
      margin: 0 !important;
      text-align: center !important;
    }

    /* Modal Footer Compact */
    .compact-modal-footer {
      padding: 15px 30px 20px !important; /* Reduced padding */
      border-top: 1px solid #e5e7eb !important;
      margin-top: 15px !important; /* Reduced margin */
      text-align: center !important;
    }

    .dark .compact-modal-footer {
      border-top-color: #374151 !important;
    }

    /* Close Button Compact */
    .compact-close-btn {
      position: absolute !important;
      top: 12px !important;
      right: 12px !important;
      background: none !important;
      border: none !important;
      font-size: 22px !important; /* Smaller */
      cursor: pointer !important;
      color: #9ca3af !important;
      width: 32px !important;
      height: 32px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 50% !important;
      transition: all 0.2s !important;
      z-index: 100 !important;
    }

    .compact-close-btn:hover {
      background: #f3f4f6 !important;
      color: #374151 !important;
    }

    .dark .compact-close-btn:hover {
      background: #374151 !important;
      color: #f3f4f6 !important;
    }

    /* Scrollbar Compact */
    .compact-modal-content::-webkit-scrollbar {
      width: 6px; /* Thinner */
    }

    .compact-modal-content::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 8px; /* Smaller radius */
      margin: 5px 0;
    }

    .compact-modal-content::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 8px; /* Smaller radius */
    }

    .compact-modal-content::-webkit-scrollbar-thumb:hover {
      background: #a1a1a1;
    }

    .dark .compact-modal-content::-webkit-scrollbar-track {
      background: #374151;
    }

    .dark .compact-modal-content::-webkit-scrollbar-thumb {
      background: #6b7280;
    }

    .dark .compact-modal-content::-webkit-scrollbar-thumb:hover {
      background: #4b5563;
    }

    /* Form Row - for better spacing */
    .form-row-compact {
      display: flex !important;
      gap: 12px !important; /* Reduced gap */
      margin-bottom: 12px !important; /* Reduced margin */
    }

    .form-row-compact .form-group {
      flex: 1 !important;
      margin-bottom: 0 !important;
    }

    /* Checkbox and Radio Compact */
    .compact-checkbox {
      transform: scale(0.9) !important; /* Smaller checkbox */
      margin-right: 6px !important; /* Reduced margin */
    }

    /* Link Styling */
    .compact-link {
      font-size: 13px !important; /* Smaller font */
      color: #3b82f6 !important;
      text-decoration: none !important;
    }

    .compact-link:hover {
      text-decoration: underline !important;
    }

    /* Responsive Styles */
    @media (max-width: 640px) {
      .compact-modal-wrapper {
        max-width: 95% !important;
      }
      
      .compact-modal-container {
        max-height: 580px !important; /* Even smaller on mobile */
      }
      
      .compact-modal-content {
        padding: 20px !important; /* Even less padding on mobile */
        max-height: 580px !important;
      }
      
      .compact-input-field {
        padding: 9px 12px !important; /* Even smaller padding */
        height: 42px !important;
      }
      
      .compact-submit-btn {
        padding: 11px !important;
        height: 42px !important;
      }
    }

    @media (max-height: 700px) {
      .compact-modal-container {
        max-height: 500px !important;
      }
      
      .compact-modal-content {
        max-height: 500px !important;
      }
    }

    @media (max-height: 600px) {
      .compact-modal-container {
        max-height: 450px !important;
      }
      
      .compact-modal-content {
        max-height: 450px !important;
      }
      
      .compact-input-field {
        padding: 8px 12px !important;
        height: 40px !important;
      }
      
      .compact-submit-btn {
        padding: 10px !important;
        height: 40px !important;
      }
    }

    /* Compact Select Styling */
    .compact-select {
      width: 100% !important;
      padding: 10px 14px !important;
      border: 1.5px solid #e5e7eb !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      height: 44px !important;
      background-color: white !important;
      cursor: pointer !important;
    }

    .dark .compact-select {
      background: #374151 !important;
      border-color: #4b5563 !important;
      color: white !important;
    }

    /* Compact Textarea */
    .compact-textarea {
      width: 100% !important;
      padding: 10px 14px !important;
      border: 1.5px solid #e5e7eb !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      min-height: 80px !important; /* Reduced height */
      resize: vertical !important;
      font-family: inherit !important;
    }

    .dark .compact-textarea {
      background: #374151 !important;
      border-color: #4b5563 !important;
      color: white !important;
    }

    /* Error Messages Compact */
    .compact-error {
      color: #ef4444 !important;
      font-size: 12px !important; /* Smaller */
      margin-top: 4px !important; /* Reduced margin */
      display: block !important;
    }

    /* Success Messages Compact */
    .compact-success {
      color: #10b981 !important;
      font-size: 12px !important; /* Smaller */
      margin-top: 4px !important; /* Reduced margin */
      display: block !important;
    }

    /* Subscription Modal Styles (unchanged but included for completeness) */
    .subscription-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10050;
      padding: 20px;
      backdrop-filter: blur(5px);
    }

    .subscription-modal-wrapper {
      width: 100%;
      max-width: 450px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .subscription-modal {
      width: 100%;
      max-height: 90vh;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      animation: modalSlideIn 0.3s ease-out;
      position: relative;
      overflow: hidden;
    }

    .subscription-modal.dark-mode {
      background: linear-gradient(145deg, #1e293b, #0f172a);
      color: #f1f5f9;
      border: 1px solid #475569;
    }

    .subscription-modal.light-mode {
      background: white;
      color: #334155;
      border: 1px solid #e2e8f0;
    }

    .modal-header {
      display: flex;
      align-items: center;
      margin-bottom: 25px;
      position: relative;
    }

    .modal-icon {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
      flex-shrink: 0;
    }

    .subscription-modal.dark-mode .modal-icon {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    .subscription-modal.light-mode .modal-icon {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
    }

    .crown-icon {
      font-size: 22px;
      color: #1f2937;
    }

    .modal-title {
      font-size: 22px;
      font-weight: 700;
      flex: 1;
      margin: 0;
    }

    .modal-close-btn {
      position: absolute;
      top: -15px;
      right: -15px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      z-index: 10;
    }

    .subscription-modal.dark-mode .modal-close-btn {
      background: #475569;
      color: #fbbf24;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .subscription-modal.light-mode .modal-close-btn {
      background: #fef3c7;
      color: #92400e;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .modal-close-btn:hover {
      transform: scale(1.1);
    }

    .modal-body {
      text-align: center;
      margin-bottom: 25px;
      max-height: calc(90vh - 200px);
      overflow-y: auto;
      padding-right: 10px;
    }

    .modal-body::-webkit-scrollbar {
      width: 6px;
    }

    .modal-body::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }

    .modal-body::-webkit-scrollbar-thumb {
      background: #f59e0b;
      border-radius: 10px;
    }

    .subscription-modal.light-mode .modal-body::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
    }

    .success-animation {
      margin-bottom: 20px;
    }

    .success-icon {
      font-size: 60px;
      color: #10b981;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }

    .subscription-details h3 {
      font-size: 20px;
      margin-bottom: 15px;
      color: #f59e0b;
      font-weight: 600;
    }

    .modal-description {
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 25px;
      opacity: 0.9;
      padding: 0 10px;
    }

    .benefits-list {
      text-align: left;
      margin-top: 20px;
      max-height: 200px;
      overflow-y: auto;
      padding-right: 10px;
    }

    .benefits-list::-webkit-scrollbar {
      width: 6px;
    }

    .benefits-list::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }

    .benefits-list::-webkit-scrollbar-thumb {
      background: #f59e0b;
      border-radius: 10px;
    }

    .benefit-item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid;
    }

    .subscription-modal.dark-mode .benefit-item {
      border-bottom-color: rgba(255, 255, 255, 0.1);
    }

    .subscription-modal.light-mode .benefit-item {
      border-bottom-color: rgba(0, 0, 0, 0.08);
    }

    .benefit-item:last-child {
      border-bottom: none;
    }

    .benefit-icon {
      color: #f59e0b;
      font-weight: bold;
      margin-right: 12px;
      font-size: 18px;
      flex-shrink: 0;
    }

    .benefit-text {
      font-size: 15px;
      font-weight: 500;
    }

    .modal-footer {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      margin-top: 20px;
    }

    @media (max-width: 480px) {
      .modal-footer {
        flex-direction: column;
      }
    }

    .modal-primary-btn {
      padding: 14px 28px;
      border-radius: 12px;
      border: none;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      flex: 1;
      min-width: 140px;
    }

    .modal-primary-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(245, 158, 11, 0.4);
      background: linear-gradient(135deg, #d97706, #b45309);
    }

    .modal-secondary-btn {
      padding: 14px 28px;
      border-radius: 12px;
      border: 2px solid;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      background: transparent;
      flex: 1;
      min-width: 140px;
    }

    .subscription-modal.dark-mode .modal-secondary-btn {
      border-color: #f59e0b;
      color: #f59e0b;
    }

    .subscription-modal.light-mode .modal-secondary-btn {
      border-color: #f59e0b;
      color: #92400e;
    }

    .modal-secondary-btn:hover {
      transform: translateY(-2px);
      background: rgba(245, 158, 11, 0.1);
    }
  `;

  return (
    <>
      <style>{modalStyles}</style>
      
      {/* Compact Modal for Login/Register/Logout */}
      <FixedModal 
        show={showModal} 
        type={type} 
        authorized={!!token}
        onClose={handleCloseModal}
      />

      {/* Hypemode Subscription Modal */}
      <HypemodeSubscriptionModal
        isOpen={showHypemodeModal}
        onClose={() => setShowHypemodeModal(false)}
        darkMode={darkMode}
      />

      <div className={`text-lg md:text-sm sm:text-xs min-h-screen ${darkMode ? 'dark' : ''}`}>
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

        {/* Rest of your Layout code remains exactly the same */}
        {/* ... */}
        
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

                  {/* ✅ Marketplace for logged-in users */}
                  {decodedToken && (
                    <>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between items-center">
                        <span>Marketplace</span>
                      </div>

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

                      {userType === 'seller' && (
                        <Link
                          to="/marketplace/create"
                          className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/marketplace/create")}`}
                        >
                          <RiAddCircleLine size="20" />
                          <span>Create Listing</span>
                        </Link>
                      )}

                      <Link
                        to={userType === 'seller' ? "/marketplace/dashboard" : "/marketplace/buyer-dashboard"}
                        className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass(userType === 'seller' ? "/marketplace/dashboard" : "/marketplace/buyer-dashboard")}`}
                      >
                        <RiListCheck size="20" />
                        <span>{userType === 'seller' ? 'Seller' : 'Buyer'} Dashboard</span>
                      </Link>

                      {userType === 'buyer' && (
                        <Link
                          to="/marketplace/my-orders"
                          className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/marketplace/my-orders")}`}
                        >
                          <RiShoppingBagLine size="20" />
                          <span>My Orders</span>
                        </Link>
                      )}

                      {/* User Type Badge */}
                      <div className="px-4 py-2">
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
                      </div>

                      <div className="border-t border-gray-200 my-2"></div>
                    </>
                  )}

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
    </>
  );
};

export default Layout;