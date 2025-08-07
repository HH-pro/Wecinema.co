import React from "react";

interface TermsAndConditionsPopupProps {
  onAccept: () => void;
}

const TermsAndConditionsPopup: React.FC<TermsAndConditionsPopupProps> = ({ onAccept }) => {
  return (
    <div className="fixed bottom-0 w-full bg-gray-900 text-white px-4 py-4 flex flex-col sm:flex-row items-center justify-between z-50 shadow-lg">
      <p className="text-sm mb-2 sm:mb-0 text-center sm:text-left">
        By using this website, you agree to our{" "}
        <a
          href="/terms-and-conditions"
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-400 underline hover:text-yellow-300 transition"
        >
          Terms and Conditions
        </a>
        .
      </p>
      <button
        onClick={onAccept}
        className="mt-2 sm:mt-0 bg-yellow-500 hover:bg-yellow-600 text-sm font-semibold px-4 py-2 rounded transition-colors"
      >
        Accept
      </button>
    </div>
  );
};

export default TermsAndConditionsPopup;
