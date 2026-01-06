import { default as Router } from "./routes";
import "./App.css";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/react";
import AICustomerSupport from "./components/AICustomerSupport";
import { MarketplaceProvider } from "./context/MarketplaceContext";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { auth } from "./firebase/config";

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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // ✅ Handle authentication state on app load
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Check for recent login markers
        const justLoggedIn = localStorage.getItem('justLoggedIn');
        const paymentCompleted = localStorage.getItem('paymentCompleted');
        const lastLoginTime = localStorage.getItem('lastLoginTime');
        
        // If user just logged in and completed payment
        if (justLoggedIn === 'true' && paymentCompleted === 'true' && lastLoginTime) {
          const timeDiff = Date.now() - parseInt(lastLoginTime);
          
          // If login was within the last 10 seconds, refresh to ensure proper auth state
          if (timeDiff < 10000) {
            console.log('Recent login detected, ensuring proper authentication state...');
            
            // Clear the markers
            localStorage.removeItem('justLoggedIn');
            localStorage.removeItem('paymentCompleted');
            localStorage.removeItem('lastLoginTime');
            
            // Add a small delay before refresh to allow state to settle
            setTimeout(() => {
              // Check if we're already on home page
              if (window.location.pathname !== '/') {
                // Redirect to home page
                window.location.href = '/';
              } else {
                // Already on home page, just refresh
                window.location.reload();
              }
            }, 500);
          } else {
            // Clear old markers
            localStorage.removeItem('justLoggedIn');
            localStorage.removeItem('paymentCompleted');
            localStorage.removeItem('lastLoginTime');
          }
        }
        
        // Check Firebase auth state
        const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
            console.log('User is authenticated:', user.email);
          } else {
            console.log('No user authenticated');
          }
          setIsCheckingAuth(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error checking auth state:', error);
        setIsCheckingAuth(false);
      }
    };

    checkAuthAndRedirect();
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

  // Show loading screen while checking auth
  if (isCheckingAuth) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#fef3c7',
        flexDirection: 'column'
      }}>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #fbbf24',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <p style={{ color: '#4b5563', fontSize: '16px' }}>Loading Wecinema...</p>
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
      {/* 🆕 WRAP EVERYTHING WITH MARKETPLACE PROVIDER */}
      <MarketplaceProvider>
        {/* 🆕 Touch scroll and custom cursor */}
        {/* <TouchScroll />
        <TouchCursor /> */}

        <AICustomerSupport />
        <Router />

        {/* 🆕 Toast Container for notifications */}
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