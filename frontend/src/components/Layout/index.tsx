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
} from "react-icons/ri";
import { MdChatBubbleOutline, MdOutlinePrivacyTip } from "react-icons/md";
import { TbVideoPlus } from "react-icons/tb";
import { CgProfile } from "react-icons/cg";
import { FaSignOutAlt, FaMoon } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";

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
  expand: boolean;
  hideSidebar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  hasHeader = true,  // ✅ Added default value here
  hideSidebar = false,
}) => {
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [token, _] = useState<string | null>(
    localStorage.getItem("token") || null
  );
  const [decodedToken, setDecodedToken] = useState<Itoken | null>(null);
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
    return () => setDecodedToken(null);
  }, [token]);

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

  useEffect(() => {
    setShow(!!type);
  }, [type, modalShow]);

  // ✅ Breakpoints
  const isTabletOrMobile = screenWidth <= 1120;
  const isMobile = screenWidth <= 420;

  const isSidebarVisible = hideSidebar ? viewPageSidebarVisible : true;

  // 🆕 Removed HypeMode check
  const isMarketplaceRoute = location.pathname.startsWith("/marketplace");

  return (
    <div className="text-lg md:text-sm sm:text-xs">
      <ToastContainer />
      {hasHeader && (  // ✅ Only render Header if hasHeader is true
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
          isMarketplaceRoute={isMarketplaceRoute}
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
                  className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                    location.pathname === "/"
                      ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                      : ""
                  }`}
                >
                  <IoMdHome size="20" />
                  <span>Home</span>
                </Link>

                {/* ✅ Marketplace for logged-in users */}
                {decodedToken && (
                  <>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Marketplace
                    </div>

                    <Link
                      to="/marketplace"
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                        location.pathname === "/marketplace"
                          ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                          : ""
                      }`}
                    >
                      <RiStoreLine size="20" />
                      <span>Browse Listings</span>
                    </Link>

                    <Link
                      to="/marketplace/create"
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                        location.pathname === "/marketplace/create"
                          ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                          : ""
                      }`}
                    >
                      <RiAddCircleLine size="20" />
                      <span>Create Listing</span>
                    </Link>

                    <Link
                      to="/marketplace/orders"
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                        location.pathname === "/marketplace/orders"
                          ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                          : ""
                      }`}
                    >
                      <RiShoppingBagLine size="20" />
                      <span>My Orders</span>
                    </Link>

                    <Link
                      to="/marketplace/dashboard"
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                        location.pathname === "/marketplace/dashboard"
                          ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                          : ""
                      }`}
                    >
                      <RiListCheck size="20" />
                      <span>Seller Dashboard</span>
                    </Link>

                    <Link
                      to="/marketplace/messages"
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                        location.pathname.startsWith("/marketplace/messages")
                          ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                          : ""
                      }`}
                    >
                      <MdChatBubbleOutline size="20" />
                      <span>Messages</span>
                    </Link>

                    <div className="border-t border-gray-200 my-2"></div>
                  </>
                )}

                {/* Video Editor */}
                <Link
                  to="/videoeditor"
                  className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                    location.pathname === "/videoeditor"
                      ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                      : ""
                  }`}
                >
                  <TbVideoPlus size="20" />
                  <span>Video Editor</span>
                </Link>

                {/* Profile */}
                {decodedToken && (
                  <Link
                    to={`/user/${decodedToken?.userId}`}
                    className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                      location.pathname === `/user/${decodedToken?.userId}`
                        ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                        : ""
                    }`}
                  >
                    <CgProfile size="20" />
                    <span>Profile</span>
                  </Link>
                )}

                {/* Liked Videos */}
                {decodedToken && (
                  <Link
                    to="/likedvideos"
                    className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                      location.pathname === "/likedvideos"
                        ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                        : ""
                    }`}
                  >
                    <RiHeartLine size="20" />
                    <span>Liked Videos</span>
                  </Link>
                )}

                {/* History */}
                {decodedToken && (
                  <Link
                    to="/history"
                    className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                      location.pathname === "/history"
                        ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                        : ""
                    }`}
                  >
                    <RiHistoryLine size="20" />
                    <span>History</span>
                  </Link>
                )}

                {/* Chat Bot */}
                <Link
                  to="/chatbot"
                  className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                    location.pathname === "/chatbot"
                      ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                      : ""
                  }`}
                >
                  <MdChatBubbleOutline size="20" />
                  <span>Chat Bot</span>
                </Link>

                {/* Support */}
                <Link
                  to="/customersupport"
                  className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                    location.pathname === "/customersupport"
                      ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                      : ""
                  }`}
                >
                  <RiCustomerService2Line size="20" />
                  <span>Support</span>
                </Link>
              </ul>
            </nav>

            {/* Theme Settings */}
            <nav className="px-4 py-2 border-b border-gray-200">
              <h2 className="font-bold mb-2">Theme</h2>
              <div
                className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2"
                onClick={setDarkiMode}
              >
                <FaMoon size="20" color={darkMode ? "green" : ""} />
                <span className="text-sm">Dark Mode</span>
              </div>
              <div
                className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2"
                onClick={setLightMode}
              >
                <IoMdHome size="20" color={!darkMode ? "green" : ""} />
                <span className="text-sm">Light Mode</span>
              </div>
              <Link
                to="/report"
                className={`flex items-center gap-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 ${
                  location.pathname === "/report"
                    ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                    : ""
                }`}
              >
                <RiFlagLine size="20" />
                <span className="text-sm">Report</span>
              </Link>
              <Link
                to="/privacy-policy"
                className={`flex items-center gap-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 ${
                  location.pathname === "/privacy-policy"
                    ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                    : ""
                }`}
              >
                <MdOutlinePrivacyTip size="20" />
              </Link>
            </nav>

            {/* Auth */}
            <nav className="px-4 py-3">
              {!decodedToken ? (
                <>
                  <li
                    onClick={() => handleType("login")}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2"
                  >
                    <FaSignOutAlt size="16" />
                    <span>Sign In</span>
                  </li>
                  <li
                    onClick={() => handleType("register")}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2"
                  >
                    <FaSignOutAlt size="16" />
                    <span>Sign Up</span>
                  </li>
                </>
              ) : (
                <li
                  onClick={() => handleType("logout")}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2"
                >
                  <FaSignOutAlt size="16" />
                  <span>Log Out</span>
                </li>
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
            currentPath={location.pathname}
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

// ✅ REMOVED: Layout.defaultProps = { hasHeader: true };

export default Layout;