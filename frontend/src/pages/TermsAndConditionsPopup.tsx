import React, { useState } from "react";

interface TermsAndConditionsPopupProps {
  onAccept: () => void;
}

const TermsAndConditionsPopup: React.FC<TermsAndConditionsPopupProps> = ({ onAccept }) => {
  const [isChecked, setIsChecked] = useState(false); // State to manage checkbox

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked); // Toggle checkbox state
  };

  const handleAccept = () => {
    if (isChecked) {
      onAccept(); // Only accept if the checkbox is checked
    } else {
      alert("Please agree to the Terms and Conditions to proceed."); // Show alert if checkbox is not checked
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-4 sm:p-6 rounded-lg max-w-md w-full mx-4">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Terms and Conditions</h2>
        <p className="text-sm sm:text-base mb-4">
          By using this website, you agree to our{" "}
          <a
            href="/terms-and-conditions" // Replace with the actual URL of your Terms and Conditions page
            target="_blank" // Opens the link in a new tab
            rel="noopener noreferrer" // Recommended for security when using target="_blank"
            className="text-yellow-500 underline hover:text-yellow-600"
          >
            Terms and Conditions
          </a>
          . Please read them carefully.
        </p>
        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            id="agree-checkbox"
            checked={isChecked}
            onChange={handleCheckboxChange}
            className="mr-2 w-4 h-4 sm:w-5 sm:h-5"
          />
          <label htmlFor="agree-checkbox" className="text-xs sm:text-sm">
            I agree to the Terms and Conditions
          </label>
        </div>
        <button
          onClick={handleAccept}
          className={`w-full bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors ${
            !isChecked ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!isChecked} // Disable the button if the checkbox is not checked
        >
          Accept
        </button>
      </div>
    </div>
  );
};

export default TermsAndConditionsPopup;