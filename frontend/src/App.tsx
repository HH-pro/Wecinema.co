import { default as Router } from "./routes";
import "./App.css";
import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import AICustomerSupport from "./components/AICustomerSupport";
import { MarketplaceProvider } from "./context/MarketplaceContext"; // 🆕 ADD MARKETPLACE PROVIDER
import { ToastContainer } from 'react-toastify'; // 🆕 ADD TOAST CONTAINER
import 'react-toastify/dist/ReactToastify.css'; // 🆕 ADD TOAST STYLES

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
      {/* 🆕 WRAP EVERYTHING WITH MARKETPLACE PROVIDER */}
      <MarketplaceProvider>
        <AICustomerSupport />
        <Router />
        
        {/* 🆕 ADD TOAST CONTAINER FOR NOTIFICATIONS */}
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