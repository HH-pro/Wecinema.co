// src/components/marketplae/seller/DeleteListingModal.tsx
import React from 'react';

interface Listing {
  _id: string;
  title: string;
  price: number;
  status: string;
}

interface DeleteListingModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

const DeleteListingModal: React.FC<DeleteListingModalProps> = ({
  listing,
  isOpen,
  onClose,
  onConfirm,
  loading
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.714-.833-2.484 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-semibold leading-6 text-gray-900">
                  Delete Listing
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="px-6 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.714-.833-2.484 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Warning: This action cannot be undone</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>You are about to permanently delete this listing.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">{listing.title}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p className="font-medium">Status</p>
                  <p className="capitalize">{listing.status}</p>
                </div>
                <div>
                  <p className="font-medium">Price</p>
                  <p className="text-green-600 font-medium">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    }).format(listing.price || 0)}
                  </p>
                </div>
              </div>
            </div>
            
            <p className="mt-4 text-sm text-gray-500">
              Are you sure you want to delete this listing? All associated data will be permanently removed.
            </p>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                'Delete Listing'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteListingModal;