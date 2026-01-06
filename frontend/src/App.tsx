import { default as Router } from "./routes";
import "./App.css";
import { useEffect, useState } from "react"; // 🆕 ADD useState FOR LOADING STATE
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

// 🆕 ADD BEAUTIFUL LOADING COMPONENT
const WeCinemaLoading = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center z-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-20 w-60 h-60 bg-yellow-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Main Loading Container */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Film Reel Animation */}
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full border-4 border-yellow-400/30 flex items-center justify-center">
            {/* Film Reel Holes */}
            <div className="absolute w-24 h-24 rounded-full border-2 border-yellow-400/20"></div>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-4 h-4 bg-yellow-500/40 rounded-full"
                style={{
                  transform: `rotate(${i * 45}deg) translateX(44px)`,
                }}
              />
            ))}
            
            {/* Spinning Center */}
            <div className="w-16 h-16 rounded-full border-4 border-yellow-500 animate-spin border-t-transparent border-r-transparent"></div>
            
            {/* Outer Ring Animation */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-yellow-500 animate-spin"></div>
          </div>
          
          {/* Film Strip Effects */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-40 h-2 bg-gradient-to-r from-transparent via-yellow-500 to-transparent rounded-full"></div>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-40 h-2 bg-gradient-to-r from-transparent via-yellow-500 to-transparent rounded-full"></div>
        </div>
        
        {/* WeCinema Logo/Text */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold mb-2">
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 bg-clip-text text-transparent animate-pulse">
              WeCinema
            </span>
          </h1>
          <p className="text-yellow-400/70 text-lg font-medium tracking-wider">
            Your Ultimate Movie Experience
          </p>
        </div>
        
        {/* Progress Bar */}
        <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-full animate-[loading_2s_ease-in-out_infinite]"></div>
        </div>
        
        {/* Loading Dots */}
        <div className="flex space-x-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            ></div>
          ))}
        </div>
        
        {/* Subtle Loading Text */}
        <p className="mt-6 text-yellow-500/60 text-sm font-light tracking-wider animate-pulse">
          Loading cinematic experience...
        </p>
      </div>
      
      {/* Footer Note */}
      <div className="absolute bottom-8 text-center">
        <p className="text-yellow-500/30 text-xs font-light">
          Experience movies like never before
        </p>
      </div>
    </div>
  );
};

export default function App() {
  // 🆕 ADD LOADING STATE
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading for 2 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
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
    </div>
  );
}