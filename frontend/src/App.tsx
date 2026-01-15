import { useEffect, useState, useMemo, memo, CSSProperties } from "react";
import Router from "./routes";
import { MarketplaceProvider } from "./context/MarketplaceContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

// Constants
export const CATEGORIES = [
  "Action",
  "Adventure",
  "Comedy",
  "Documentary",
  "Drama",
  "Horror",
  "Mystery",
  "Romance",
  "Thriller",
] as const;

export const THEMES = [
  "Coming-of-age story",
  "Good versus evil",
  "Love",
  "Redemption",
  "Family",
  "Oppression",
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
] as const;

export const RATINGS = ["G", "PG", "PG-13", "R", "X"] as const;

// Export for backward compatibility
export const categories = CATEGORIES;
export const themes = THEMES;
export const ratings = RATINGS;

// 🆕 MODERN LOADING COMPONENT WITH LIGHT THEME
const WeCinemaLoading = () => {
  // Inline CSS for animations to avoid @layer issues
  const styles = `
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    @keyframes slide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(300%); }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 0.4; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.1); }
    }
    
    .animate-shimmer {
      animation: shimmer 2s infinite;
    }
    
    .animate-slide {
      animation: slide 1.5s infinite;
    }
    
    .animate-pulse-custom {
      animation: pulse 1.5s ease-in-out infinite;
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center z-50">
        
        {/* Modern Loading Container */}
        <div className="relative flex flex-col items-center justify-center p-8">
          
          {/* WeCinema Logo/Text with Modern Typography */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                WeCinema
              </span>
            </h1>
            <p className="text-gray-600 text-lg font-medium tracking-wide">
              Loading cinematic experience
            </p>
          </div>
          
          {/* Modern Animated Loading Bar */}
          <div className="w-80 md:w-96 mb-8">
            {/* Outer Bar */}
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              {/* Animated Gradient Bar */}
              <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-full animate-shimmer"></div>
              
              {/* Glowing Effect */}
              <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full blur-sm animate-slide"></div>
            </div>
            
            {/* Percentage Indicator */}
            <div className="flex justify-between mt-2">
              <span className="text-sm font-medium text-gray-500">0%</span>
              <span className="text-sm font-medium text-gray-500">100%</span>
            </div>
          </div>
          
          {/* Loading Status Text */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          </div>
          
          {/* Subtle Dots Animation */}
          <div className="flex space-x-1 mb-8">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
                style={{
                  animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                }}
              ></div>
            ))}
          </div>
          
          {/* Copyright/Footer */}
          <div className="absolute bottom-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2026 WeCinema. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default function App() {
  // 🆕 ADD LOADING STATE
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading for 1.5 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
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

  return (
    <div>
      {/* 🆕 SHOW LOADING SCREEN FIRST */}
      {isLoading && <WeCinemaLoading />}
      
      {/* MAIN APP CONTENT */}
      <div className={isLoading ? "hidden" : "block"}>
        <MarketplaceProvider>
          {/* <AICustomerSupport /> */}
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
    </div>
  );
}