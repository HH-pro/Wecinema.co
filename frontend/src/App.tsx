import { default as Router } from "./routes";
import "./App.css";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/react";
import AICustomerSupport from "./components/AICustomerSupport";
import { MarketplaceProvider } from "./context/MarketplaceContext";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const categories = [
  "Action ",
  "Adventure ",
  "Comedy ",
  "Documentary ",
  "Drama ",
  "Horror ",
  "Mystery ",
  "Romance ",
  "Thriller ",
];

export const themes = [
  "Coming-of-age story",
  "Good versus evil",
  "Love",
  "Redemption",
  "Family",
  "Opperession",
  "Survival",
  "Revenge",
  "Justice",
  "War",
  "Bravery",
  "Freedom",
  "Friendship",
  "Death",
  "Isolation",
  "Peace",
  "Perseverance",
];

export const ratings = ["g ", "pg ", "pg-13 ", "r ", "x "];

export default function App() {
  const [isCheckingLogin, setIsCheckingLogin] = useState(true);

  // ✅ Handle login redirect on app load
  useEffect(() => {
    const handleLoginRedirect = () => {
      // Check for login marker
      const justLoggedIn = localStorage.getItem('hypeModeJustLoggedIn');
      
      if (justLoggedIn === 'true') {
        console.log('Login marker found, handling redirect...');
        
        // Clear the marker immediately
        localStorage.removeItem('hypeModeJustLoggedIn');
        
        // Check if we're already on home page
        const currentPath = window.location.pathname;
        
        if (currentPath === '/' || currentPath === '/home' || currentPath === '/home/') {
          // Already on home page, just refresh to load auth state
          console.log('Already on home page, refreshing...');
          setTimeout(() => {
            window.location.reload();
          }, 100);
        } else {
          // Not on home page, redirect to home
          console.log('Redirecting to home page...');
          setTimeout(() => {
            window.location.href = '/';
          }, 100);
        }
      }
      
      setIsCheckingLogin(false);
    };

    handleLoginRedirect();
  }, []);

  // ✅ Tawk.to Live Chat Widget Setup
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://embed.tawk.to/6849bde9e7d8d619164a49fe/1itg0ro66";
    script.async = true;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);
  }, []);

  // Show loading while checking login state
  if (isCheckingLogin) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#fffbeb',
        flexDirection: 'column'
      }}>
        <div style={{
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #f59e0b',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
          marginBottom: '15px'
        }}></div>
        <p style={{ color: '#92400e', fontSize: '14px', fontWeight: '500' }}>Loading HypeMode...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <MarketplaceProvider>
        <AICustomerSupport />
        <Router />
        
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </MarketplaceProvider>
    </div>
  );
}