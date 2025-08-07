import React from "react";

interface TermsAndConditionsPopupProps {
  onAccept: () => void;
  onDecline?: () => void;
}

const TermsAndConditionsPopup: React.FC<TermsAndConditionsPopupProps> = ({
  onAccept,
  onDecline = () => {
    window.location.href = "https://www.google.com";
  },
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gradient-to-r from-gray-100 via-white to-gray-50 w-full max-w-md mx-4 p-8 rounded-2xl shadow-xl border border-gray-300 text-gray-800">
        <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800 tracking-wide">
          Terms and Conditions
        </h2>
        <p className="text-sm mb-6 text-center text-gray-700 leading-relaxed">
          By using this website, you agree to our{" "}
          <a
            href="/terms-and-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-600 underline hover:text-yellow-700 transition-colors"
          >
            Terms and Conditions
          </a>. Please read them carefully.
        </p>
        <div className="flex justify-center gap-6 mt-8">
          <button
            onClick={onDecline}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all transform hover:scale-105 shadow-md"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all transform hover:scale-105 shadow-md"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPopup;
