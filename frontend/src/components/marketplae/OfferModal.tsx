import React from 'react';
import { FiX, FiCreditCard, FiAlertCircle, FiLoader, FiUser, FiImage } from 'react-icons/fi';
import marketplaceApi from '../../api/marketplaceApi';

interface OfferModalProps {
  show: boolean;
  selectedListing: any;
  offerForm: {
    amount: string;
    message: string;
    requirements: string;
    expectedDelivery: string;
  };
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onOfferFormChange: (field: string, value: string) => void;
  paymentStatus: 'idle' | 'processing' | 'success' | 'failed';
  error: string;
  getThumbnailUrl: (listing: any) => string;
}

const OfferModal: React.FC<OfferModalProps> = ({
  show,
  selectedListing,
  offerForm,
  onClose,
  onSubmit,
  onOfferFormChange,
  paymentStatus,
  error,
  getThumbnailUrl
}) => {
  if (!show || !selectedListing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md sm:max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden scale-95 sm:scale-100 transition-transform duration-200 ease-out">
        
        {/* Header */}
        <div className="sticky top-50 z-10 bg-gradient-to-r from-yellow-50 to-white border-b border-gray-200 p-3 sm:p-4 flex justify-between items-center">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Make an Offer</h3>
            <p className="text-xs text-gray-600">Submit your offer for this listing</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <FiX size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 space-y-4">
          {/* Listing Preview */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm flex items-start gap-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-blue-300 flex-shrink-0 bg-gray-100">
              {getThumbnailUrl(selectedListing) ? (
                <img
                  src={getThumbnailUrl(selectedListing)}
                  alt={selectedListing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <FiImage className="text-gray-400" size={20} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{selectedListing.title}</h4>
              <p className="text-gray-600 text-xs mt-1 line-clamp-2">{selectedListing.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-green-600 text-base sm:text-lg font-bold">
                  {marketplaceApi.utils.formatCurrency(selectedListing.price)}
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-medium px-2 py-0.5 rounded-full">
                  {selectedListing.category}
                </span>
              </div>
              
              {/* Seller Info */}
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                <FiUser size={12} />
                <span>Seller: {selectedListing.sellerId?.username || 'Seller'}</span>
              </div>
            </div>
          </div>

          {/* Offer Form */}
          <form onSubmit={onSubmit} className="space-y-3">
            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1.5">Offer Amount</label>
              <input
                type="number"
                required
                min="0.50"
                step="0.01"
                value={offerForm.amount}
                onChange={(e) => onOfferFormChange('amount', e.target.value)}
                className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-xs sm:text-sm"
                placeholder="Enter your offer amount"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum offer: $0.50</p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1.5">Message to Seller</label>
              <textarea
                value={offerForm.message}
                onChange={(e) => onOfferFormChange('message', e.target.value)}
                className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none outline-none text-xs sm:text-sm"
                rows={3}
                placeholder="Introduce yourself and explain your requirements..."
              />
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1.5">Specific Requirements</label>
              <textarea
                value={offerForm.requirements}
                onChange={(e) => onOfferFormChange('requirements', e.target.value)}
                className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none outline-none text-xs sm:text-sm"
                rows={2}
                placeholder="Any specific modifications or requirements..."
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1.5">Expected Delivery Date</label>
              <input
                type="date"
                required
                value={offerForm.expectedDelivery}
                onChange={(e) => onOfferFormChange('expectedDelivery', e.target.value)}
                className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-xs sm:text-sm"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Info Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-700 flex gap-2 items-start">
              <FiCreditCard className="text-yellow-600 mt-0.5" size={14} />
              <p>
                Payment will be processed immediately and securely held in escrow until the seller accepts your offer.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-xs text-red-700 flex gap-2 items-start">
                <FiAlertCircle className="text-red-600 mt-0.5" size={14} />
                <p>{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 flex flex-col sm:flex-row gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all text-xs sm:text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={paymentStatus === 'processing'}
            className="flex-1 py-2 rounded-md bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white transition-all text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
          >
            {paymentStatus === 'processing' ? (
              <>
                <FiLoader className="animate-spin" size={14} />
                Processing...
              </>
            ) : (
              `Submit Offer & Pay $${offerForm.amount || '0.00'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfferModal;