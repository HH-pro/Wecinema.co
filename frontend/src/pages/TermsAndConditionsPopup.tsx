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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md mx-4 p-6 rounded-lg shadow-lg border border-gray-200 text-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-center">Terms and Conditions</h2>
        <p className="text-sm mb-4 text-center">
          By using this website, you agree to our{" "}
          <a
            href="/terms-and-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-600 underline hover:text-yellow-700"
          >
            Terms and Conditions
          </a>. Please read them carefully.
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={onDecline}
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPopup;
