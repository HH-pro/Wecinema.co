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
} from "react-icons/ri";
import { MdChatBubbleOutline, MdOutlinePrivacyTip } from "react-icons/md";
import { TbVideoPlus } from "react-icons/tb";
import { CgProfile } from "react-icons/cg";
import { FaSignOutAlt, FaMoon } from "react-icons/fa";
import { Link } from "react-router-dom";

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
  hideSidebar = false,
  expand,
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

  const isMobile = screenWidth <= 1120;
  const isSidebarVisible = hideSidebar ? viewPageSidebarVisible : true;

  return (
    <div className="text-lg md:text-sm sm:text-xs">
      <ToastContainer />
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

      {/* Mobile Sidebar Modal */}
      {expanded && isMobile && isSidebarVisible && (
        <div className="fixed top-0 left-0 z-40 h-full w-full bg-black bg-opacity-90 backdrop-blur-md transition-opacity ease-in-out duration-300">
          <section
            className={`text-blue bar mt-16 inset-0 sm:w-1/5 overflow-auto fixed border-r border-gray-200 w-4/5 max-w-xs z-50 ${
              darkMode ? "bg-dark" : "bg-light"
            } ${darkMode ? "text-dark" : "text-light"}`}
          >
            {/* Main Nav */}
            <nav className="flex items-center justify-between p-2 my-3 pb-6">
              <ul className="border-b w-full border-gray-200 pb-4">
                <Link to="/" className="flex items-center gap-3 px-4 py-2">
                  <IoMdHome size="20" />
                  <span>Home</span>
                </Link>
                {!decodedToken && (
                  <Link
                    to="/hypemode"
                    className="flex items-center gap-3 px-4 py-2"
                  >
                    <RiMovie2Line size="20" />
                    <span>Hype Mode</span>
                  </Link>
                )}
                <Link
                  to="/videoeditor"
                  className="flex items-center gap-3 px-4 py-2"
                >
                  <TbVideoPlus size="20" />
                  <span>Video Editor</span>
                </Link>
                <Link
                  to={`/user/${decodedToken?.userId}`}
                  className="flex items-center gap-3 px-4 py-2"
                >
                  <CgProfile size="20" />
                  <span>Profile</span>
                </Link>
                <Link
                  to="/likedvideos"
                  className="flex items-center gap-3 px-4 py-2"
                >
                  <RiHeartLine size="20" />
                  <span>Liked Videos</span>
                </Link>
                <Link
                  to="/history"
                  className="flex items-center gap-3 px-4 py-2"
                >
                  <RiHistoryLine size="20" />
                  <span>History</span>
                </Link>
                <Link
                  to="/chatbot"
                  className="flex items-center gap-3 px-4 py-2"
                >
                  <MdChatBubbleOutline size="20" />
                  <span>Chat Bot</span>
                </Link>
                <Link
                  to="/customersupport"
                  className="flex items-center gap-3 px-4 py-2"
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
                className="flex items-center gap-3 py-2 cursor-pointer"
                onClick={setDarkiMode}
              >
                <FaMoon size="20" color={darkMode ? "green" : ""} />
                <span className="text-sm">Dark Mode</span>
              </div>
              <div
                className="flex items-center gap-3 py-2 cursor-pointer"
                onClick={setLightMode}
              >
                <IoMdHome size="20" color={!darkMode ? "green" : ""} />
                <span className="text-sm">Light Mode</span>
              </div>
              <Link to="/report" className="flex items-center gap-3 py-2">
                <RiFlagLine size="20" />
                <span className="text-sm">Report</span>
              </Link>
              <Link to="/privacy-policy" className="flex items-center gap-3 py-2">
                <MdOutlinePrivacyTip size="20" />
                <span className="text-sm">Privacy Policy</span>
              </Link>
            </nav>

            {/* Auth Buttons */}
            <nav className="px-4 py-3">
              {!decodedToken ? (
                <>
                  <li
                    onClick={() => handleType("login")}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:text-green-500"
                  >
                    <FaSignOutAlt size="16" />
                    <span>Sign In</span>
                  </li>
                  <li
                    onClick={() => handleType("register")}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:text-green-500"
                  >
                    <FaSignOutAlt size="16" />
                    <span>Sign Up</span>
                  </li>
                </>
              ) : (
                <li
                  onClick={() => handleType("logout")}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:text-green-500"
                >
                  <FaSignOutAlt size="16" />
                  <span>Log Out</span>
                </li>
              )}
            </nav>
          </section>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="flex">
        {/* Sidebar only on mobile */}
        {isSidebarVisible && isMobile && (
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
          className={`flex flex-col min-h-screen mt-12 ${
            darkMode ? "body-dark text-dark" : "body-light text-light"
          } bg-gray-200 w-full transition-all duration-300`}
          style={{
            marginLeft: isMobile && isSidebarVisible
              ? expanded
                ? "16.8%"
                : "150px"
              : "0px", // ✅ no margin on desktop
          }}
        >
          <Modal type={type} authorized={!!token} show={modalShow} />
          <div className="flex-grow">{children}</div>

          {/* Footer */}
          <footer
            className={`w-full text-center py-4 ${
              darkMode ? "bg-gray-900 text-gray-300" : "bg-gray-100 text-gray-700"
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

Layout.defaultProps = {
  hasHeader: true,
};

export default Layout;
