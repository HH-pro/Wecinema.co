import { X, Bot, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function AICustomerSupportPopup() {
  const [isOpen, setIsOpen] = useState(false);

  const openTawkChat = () => {
    if (window && (window as any).Tawk_API) {
      (window as any).Tawk_API.maximize();
    } else {
      alert("Live chat is currently unavailable.");
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={openTawkChat}
        className="fixed bottom-6 right-6 z-50 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-all"
        aria-label="Open AI Support"
      >
       
      </button>

      {/* Popup Support Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 right-6 z-50 w-[90%] max-w-md bg-white dark:bg-gray-900 shadow-2xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                AI Customer Support
              </h3>
             

             
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
