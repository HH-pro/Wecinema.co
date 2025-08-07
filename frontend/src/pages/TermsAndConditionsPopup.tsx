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
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-6 sm:px-6 animate-fade-in">
      <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-t-2xl shadow-lg max-w-4xl mx-auto px-6 py-4 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-8">
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-semibold text-gray-800">Terms & Conditions</h2>
          <p className="text-sm text-gray-600 mt-1">
            By using this site, you agree to our{" "}
            <a
              href="/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-600 underline hover:text-yellow-700 transition-colors"
            >
              Terms and Conditions
            </a>. Please review them.
          </p>
        </div>
        <div className="flex gap-3 sm:gap-4">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-sm font-medium text-red-700 border border-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-all"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPopup;
