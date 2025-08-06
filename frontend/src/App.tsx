import { default as Router } from "./routes";
import "./App.css";
import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import AICustomerSupport from "./components/AICustomerSupport"; // Your popup with Chat with Agent button

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
    script.src = "https://embed.tawk.to/6849bde9e7d8d619164a49fe/1itg0ro66"; // Replace with your actual Tawk.to property/widget ID
    script.async = true;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);
  }, []);

  
  // Optional: Web Vitals reporting to Sentry
  // useEffect(() => {
  //   const sendToSentry = (metric: any) => {
  //     Sentry.metrics.distribution(`web_vitals.${metric.name}`, metric.value);
  //   };
  //   import("web-vitals").then((vitals) => {
  //     vitals.getCLS(sendToSentry);
  //     vitals.getFID(sendToSentry);
  //     vitals.getLCP(sendToSentry);
  //   });
  // }, []);

  return (
    <div>
      <AICustomerSupport />
      <Router />
    </div>
  );
}
