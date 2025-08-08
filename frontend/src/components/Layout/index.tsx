import React, { ReactNode, useEffect, useState } from "react";
import { Header, Modal, Sidebar } from "..";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "quill/dist/quill.snow.css";
import { Itoken, decodeToken } from "../../utilities/helperfFunction";

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

  // Modal open/close
  const openModal = (str: string) => {
    setType(str);
    setModalShow(true);
  };

  const closeModal = () => {
    setType("");
    setModalShow(false);
  };

  const isMobile = screenWidth <= 420;

  // Special "focus mode" for login/signup
  const isAuthModal = ["login", "register"].includes(type);

  if (isAuthModal && modalShow) {
    // Render only the popup, no header/sidebar/content
    return (
      <div className={darkMode ? "body-dark" : "body-light"}>
        <ToastContainer />
        <Modal type={type} authorized={!!token} show={modalShow} onClose={closeModal} />
      </div>
    );
  }

  // Normal layout
  return (
    <div className={`text-lg md:text-sm sm:text-xs ${darkMode ? "body-dark" : "body-light"}`}>
      <ToastContainer />

      {/* Always visible header */}
      <Header
        expand={expanded}
        isMobile={isMobile}
        toggler={() => setExpanded(!expanded)}
        darkMode={darkMode}
        toggleUploadModal={() => openModal("video")}
        toggleUploadScriptModal={() => openModal("script")}
        toggleSidebar={hideSidebar ? () => setViewPageSidebarVisible(prev => !prev) : undefined}
        className="fixed top-0 left-0 w-full z-50"
      />

      {/* Layout wrapper with padding for header */}
      <div className="flex pt-16">
        {(!hideSidebar || viewPageSidebarVisible) && (
          <Sidebar
            expand={expanded && screenWidth > 1120}
            setLightMode={setLightMode}
            setDarkMode={setDarkiMode}
            toggleSigninModal={() => openModal("login")}
            toggleSignupModal={() => openModal("register")}
            toggleSignoutModal={() => openModal("logout")}
            darkMode={darkMode}
            toggleUploadModal={() => openModal("video")}
            toggleUploadScriptModal={() => openModal("script")}
            isLoggedIn={decodedToken}
          />
        )}

        {/* Page Content */}
        <main
          className={`block main min-h-screen ${
            darkMode ? "body-dark text-dark" : "body-light text-light"
          } bg-gray-200 w-full transition-all duration-300`}
          style={{
            marginLeft:
              hideSidebar || !viewPageSidebarVisible
                ? "0px"
                : expanded && screenWidth > 1120
                ? "16.8%"
                : "150px",
          }}
        >
          {children}
        </main>
      </div>

      {/* Other modals */}
      <Modal type={type} authorized={!!token} show={modalShow} onClose={closeModal} />
    </div>
  );
};

Layout.defaultProps = {
  hasHeader: true,
};

export default Layout;
