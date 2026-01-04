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
import { FaSignOutAlt, FaMoon, FaSun, FaUser, FaShoppingCart, FaUserTie, FaInfoCircle } from "react-icons/fa";
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
    setModalShow(!modalShow);
  };

  const handleHypemodeClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasPaid) {
      event.preventDefault();
      toast.info("You are already subscribed to Hypemode!");
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
    return location.pathname === path ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400" : "";
  };

  return (
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
            className={`mt-16 fixed inset-0 w-4/5 max-w-xs border-r border-gray-200 overflow-auto z-50 ${
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
                  className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${getActiveClass("/hypemode")}`}
                >
                  <RiMovie2Line size="20" />
                  <span>Hype mode</span>
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
                      <div className="flex gap-1">
                        <button
                          className={`p-1 rounded ${userType === 'buyer' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}
                          onClick={() => changeUserType('buyer')}
                          title="Switch to Buyer Mode"
                        >
                          <FaShoppingCart size="12" />
                        </button>
                        <button
                          className={`p-1 rounded ${userType === 'seller' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}
                          onClick={() => changeUserType('seller')}
                          title="Switch to Seller Mode"
                        >
                          <FaUserTie size="12" />
                        </button>
                      </div>
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
                      <span className={`text-xs px-2 py-1 rounded-full ${userType === 'seller' ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'}`}>
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
                className={`flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 ${darkMode ? "text-blue-600 dark:text-blue-400" : ""}`}
                onClick={setDarkiMode}
              >
                <FaMoon size="20" />
                <span className="text-sm">Dark Mode</span>
              </div>
              <div
                className={`flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 ${!darkMode ? "text-blue-600 dark:text-blue-400" : ""}`}
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
                    className="flex items-center gap-3 py-2 cursor-pointer hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2"
                  >
                    <LiaSignInAltSolid size="20" />
                    <span>Sign In</span>
                  </div>
                  <div
                    onClick={() => handleType("register")}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2"
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
  );
};

export default Layout;