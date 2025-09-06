import React, { useEffect, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Modal from "./Modal";

interface LayoutProps {
  children: React.ReactNode;
  token: string | null;
  decodedToken: any;
  hideSidebar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  token,
  decodedToken,
  hideSidebar = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [viewPageSidebarVisible, setViewPageSidebarVisible] = useState(false);
  const [darkMode, setDarkiMode] = useState(false);
  const [lightMode, setLightMode] = useState(true);
  const [screenWidth, setScreenWidth] = useState<number>(window.innerWidth);
  const [modalShow, setModalShow] = useState(false);
  const [type, setType] = useState<string>("");

  const isMobile = screenWidth <= 1120;

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarVisible(false); // Sidebar closed by default on mobile
    }
  }, [isMobile]);

  const handleType = (modalType: string) => {
    setType(modalType);
    setModalShow(true);
  };

  return (
    <div
      className={`${
        darkMode ? "body-dark text-dark" : "body-light text-light"
      }`}
    >
      {/* ✅ Header only visible on mobile */}
      {isMobile && (
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

      {/* ✅ Sidebar Modal only visible on mobile */}
      {isMobile && viewPageSidebarVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
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
        </div>
      )}

      {/* ✅ Desktop Layout (no navbar at all on desktop) */}
      <div className="flex">
        {/* Sidebar only for mobile */}
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

        {/* Main Content */}
        <main
          className={`flex flex-col min-h-screen mt-12 ${
            darkMode ? "body-dark text-dark" : "body-light text-light"
          } bg-gray-200 w-full transition-all duration-300`}
          style={{
            marginLeft:
              isMobile && isSidebarVisible
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

export default Layout;
