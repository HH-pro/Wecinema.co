import React, { ReactNode, useEffect, useState } from "react";
import { Header, Modal, Sidebar } from "..";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "quill/dist/quill.snow.css";
import { Itoken, decodeToken } from "../../utilities/helperfFunction";
import {
  IoMdHome,
} from "react-icons/io";
import {
  RiMovie2Line,
  RiHeartLine,
  RiHistoryLine,
  RiFlagLine,
  RiCustomerService2Line
} from "react-icons/ri";
import { MdChatBubbleOutline, MdOutlinePrivacyTip } from "react-icons/md";
import { TbVideoPlus } from "react-icons/tb";
import { CgProfile } from "react-icons/cg";
import { FaSignOutAlt, FaMoon } from "react-icons/fa";
import { Link } from "react-router-dom";

export const theme = [
  "Love", "Redemption", "Family", "Oppression", "Corruption",
  "Survival", "Revenge", "Death", "Justice", "Perseverance",
  "War", "Bravery", "Freedom", "Friendship", "Hope",
  "Society", "Isolation", "Peace"
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
  const [token] = useState<string | null>(localStorage.getItem("token") || null);
  const [decodedToken, setDecodedToken] = useState<Itoken | null>(null);
  const isDarkMode = localStorage.getItem("isDarkMode") ?? false;
  const [darkMode, setDarkMode] = useState<boolean>(!!isDarkMode);
  const [expanded, setExpanded] = useState<boolean>(false);

  // Modal state
  const [modalShow, setModalShow] = useState(false);
  const [type, setType] = useState("");

  const [viewPageSidebarVisible, setViewPageSidebarVisible] = useState<boolean>(!hideSidebar);

  // Screen resize listener
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Decode token on mount or token change
  useEffect(() => {
    const decoded = decodeToken(token);
    setDecodedToken(decoded);
    return () => setDecodedToken(null);
  }, [token]);

  // Theme toggles
  const setLightMode = () => {
    localStorage.removeItem("isDarkMode");
    setDarkMode(false);
  };

  const setDarkiMode = () => {
    localStorage.setItem("isDarkMode", "dark");
    setDarkMode(true);
  };

  // Modal toggle
  const handleType = (str: string) => {
    setType(str);
    setModalShow(true);
  };

  const closeModal = () => {
    setType("");
    setModalShow(false);
  };

  const isMobile = screenWidth <= 420;
  const isSidebarVisible = hideSidebar ? viewPageSidebarVisible : true;

  return (
    <div className={`text-lg md:text-sm sm:text-xs ${darkMode ? "body-dark" : "body-light"}`}>
      <ToastContainer />

      {/* Fixed Header */}
      <Header
        expand={expanded}
        isMobile={isMobile}
        toggler={() => setExpanded(!expanded)}
        darkMode={darkMode}
        toggleUploadModal={() => handleType("video")}
        toggleUploadScriptModal={() => handleType("script")}
        toggleSidebar={hideSidebar ? () => setViewPageSidebarVisible(prev => !prev) : undefined}
      />

      {/* Main Layout */}
      <div className="flex pt-12">
        {isSidebarVisible && (
          <Sidebar
            expand={expanded && screenWidth > 1120}
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

        {/* Page Content */}
        <main
          className={`min-h-screen w-full transition-all duration-300 ${
            darkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-black"
          }`}
          style={{
            marginLeft: !isSidebarVisible
              ? "0px"
              : expanded && screenWidth > 1120
              ? "16.8%"
              : "150px",
          }}
        >
          {children}
        </main>
      </div>

      {/* Always-mounted modal */}
      <Modal type={type} authorized={!!token} show={modalShow} onClose={closeModal} />
    </div>
  );
};

Layout.defaultProps = {
  hasHeader: true,
};

export default Layout;
