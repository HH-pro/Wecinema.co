import React, { ReactNode, useEffect, useState } from "react";
import { Header, Modal, Sidebar } from "..";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "quill/dist/quill.snow.css";
import { Itoken, decodeToken } from "../../utilities/helperfFunction";

interface LayoutProps {
  hasHeader?: boolean;
  children: ReactNode;
  hideSidebar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, hideSidebar = false }) => {
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [token] = useState<string | null>(
    localStorage.getItem("token") || null
  );
  const [decodedToken, setDecodedToken] = useState<Itoken | null>(null);
  const isDarkMode = localStorage.getItem("isDarkMode") ?? false;
  const [darkMode, setDarkMode] = useState<boolean>(!!isDarkMode);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [modalShow, setModalShow] = useState(false);
  const [type, setType] = useState("");

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

  const isMobile = screenWidth <= 420;

  return (
    <div className="text-lg md:text-sm sm:text-xs">
      <ToastContainer />

      {/* ✅ Header Always visible */}
      <Header
        expand={expanded}
        isMobile={isMobile}
        toggler={() => setExpanded(!expanded)}
        darkMode={darkMode}
        toggleUploadModal={() => handleType("video")}
        toggleUploadScriptModal={() => handleType("script")}
      />

      {/* ✅ Sidebar Modal for BOTH Mobile & Desktop */}
      {expanded && (
        <div
          className="fixed top-0 left-0 z-40 h-full w-full bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setExpanded(false)} // backdrop close
        >
          <section
            className={`absolute top-0 left-0 h-full w-64 max-w-xs transform transition-transform duration-300 ${
              darkMode ? "bg-dark text-dark" : "bg-light text-light"
            }`}
            onClick={(e) => e.stopPropagation()} // prevent backdrop close
          >
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
          </section>
        </div>
      )}

      {/* ✅ Main Content */}
      <main
        className={`flex flex-col min-h-screen mt-12 ${
          darkMode ? "body-dark text-dark" : "body-light text-light"
        }
        bg-gray-200 w-full transition-all duration-300`}
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
  );
};

Layout.defaultProps = {
  hasHeader: true,
};

export default Layout;
