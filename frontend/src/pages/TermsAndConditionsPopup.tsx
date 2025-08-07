import React from "react";

interface TermsAndConditionsPopupProps {
  onAccept: () => void;
  onDecline?: () => void; // Optional prop to handle decline
}

const TermsAndConditionsPopup: React.FC<TermsAndConditionsPopupProps> = ({
  onAccept,
  onDecline = () => {
    // Default decline behavior: redirect or close tab
    window.location.href = "https://www.google.com"; // Change this to your homepage or a "goodbye" page
  },
}) => {
  return (
    <div className="fixed bottom-0 w-full bg-gray-900 text-white px-4 py-4 flex flex-col sm:flex-row items-center justify-between z-50 shadow-lg">
      <p className="text-sm mb-3 sm:mb-0 text-center sm:text-left">
        By using this website, you agree to our{" "}
        <a
          href="/terms-and-conditions"
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-400 underline hover:text-yellow-300 transition"
        >
          Terms and Conditions
        </a>.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onDecline}
          className="bg-red-500 hover:bg-red-600 text-sm font-semibold px-4 py-2 rounded transition-colors"
        >
          Decline
        </button>
        <button
          onClick={onAccept}
          className="bg-yellow-500 hover:bg-yellow-600 text-sm font-semibold px-4 py-2 rounded transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  );
};

export default TermsAndConditionsPopup;
