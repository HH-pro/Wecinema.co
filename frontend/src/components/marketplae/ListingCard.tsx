import React, { useState, useEffect } from 'react';
import { Listing } from '../../types/marketplace';
import { FiPlay, FiImage, FiTag, FiDollarSign, FiCheck, FiX } from 'react-icons/fi';
import { decodeToken } from "../../utilities/helperfFunction";
import { toast } from 'react-toastify';
import axios from 'axios';

interface ListingCardProps {
  listing: Listing;
  onViewDetails: (listingId: string) => void;
  onOfferSuccess?: () => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onViewDetails, onOfferSuccess }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Offer form state
  const [offerData, setOfferData] = useState({
    amount: '',
    message: ''
  });

  // Get token and decode user info
  const token = localStorage.getItem("token") || null;
  
  useEffect(() => {
    if (token) {
      try {
        const decodedUser = decodeToken(token);
        setCurrentUser(decodedUser);
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem("token");
      }
    }
  }, [token]);

  // Direct API function for making an offer using Axios
  const makeOffer = async (listingId: string, offerData: { amount: number; message: string }) => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.post(
      "http://localhost:3000/marketplace/offers/create-offer",
      {
        listingId,
        amount: offerData.amount,
        message: offerData.message
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data;
  };

  // Check if media is video or image
  const isVideo = (url: string) => {
    return url.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i);
  };

  // Get first media URL
  const firstMedia = listing.mediaUrls && listing.mediaUrls.length > 0 ? listing.mediaUrls[0] : null;

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price);
  };

  // Get type color
  const getTypeColor = (type: string) => {
    const colors = {
      for_sale: 'from-green-500 to-emerald-600',
      licensing: 'from-blue-500 to-cyan-600',
      adaptation_rights: 'from-purple-500 to-pink-600',
      commission: 'from-orange-500 to-red-600'
    };
    return colors[type as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    const labels = {
      for_sale: 'For Sale',
      licensing: 'Licensing',
      adaptation_rights: 'Adaptation Rights',
      commission: 'Commission'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleMakeOfferClick = () => {
    if (!token || !currentUser) {
      toast.error("Please login to make an offer");
      return;
    }
    
    // Check if user is the seller
    const userId = currentUser.id || currentUser._id;
    const sellerId = listing.sellerId?._id || listing.sellerId;
    
    if (userId === sellerId) {
      toast.error("You cannot make an offer on your own listing");
      return;
    }

    setShowOfferModal(true);
    setOfferError('');
    setOfferSuccess(false);
    // Pre-fill with 80% of listing price as suggested offer
    setOfferData({
      amount: (listing.price * 0.8).toFixed(2),
      message: ''
    });
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfferError('');
    setIsSubmitting(true);

    try {
      const offerAmount = parseFloat(offerData.amount);
      
      // Validation
      if (!offerAmount || offerAmount <= 0) {
        setOfferError('Please enter a valid amount');
        return;
      }

      if (offerAmount > listing.price * 3) {
        setOfferError('Offer amount seems too high. Please enter a reasonable amount.');
        return;
      }

      // Make API call using Axios
      await makeOffer(listing._id, {
        amount: offerAmount,
        message: offerData.message
      });

      setOfferSuccess(true);
      toast.success('Offer submitted successfully!');
      
      setTimeout(() => {
        setShowOfferModal(false);
        setOfferSuccess(false);
        if (onOfferSuccess) {
          onOfferSuccess();
        }
      }, 1500);

    } catch (error: any) {
      console.error('Failed to make offer:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to submit offer. Please try again.';
      setOfferError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setOfferData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const closeModal = () => {
    setShowOfferModal(false);
    setOfferError('');
    setOfferSuccess(false);
    setOfferData({ amount: '', message: '' });
  };

  const isUserLoggedIn = token && currentUser;
  const userId = currentUser?.id || currentUser?._id;
  const sellerId = listing.sellerId?._id || listing.sellerId;
  const isOwnListing = userId === sellerId;

  return (
    <>
      <div className="group relative w-80 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 overflow-hidden">
        
        {/* Media Section */}
        <div className="relative h-48 overflow-hidden">
          {firstMedia ? (
            <>
              {isVideo(firstMedia) ? (
                <div className="relative w-full h-full">
                  <video
                    className="w-full h-full object-cover"
                    controls={false}
                    muted
                    loop
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  >
                    <source src={firstMedia} type="video/mp4" />
                  </video>
                  
                  {/* Video Play Indicator */}
                  <div className="absolute top-3 left-3 bg-black/80 text-white px-2 py-1 rounded-full flex items-center gap-1 text-xs font-medium">
                    <FiPlay size={10} />
                    <span>VIDEO</span>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {!imageLoaded && (
                    <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
                  )}
                  <img
                    src={firstMedia}
                    alt={listing.title}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={handleImageLoad}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <FiImage className="text-gray-400" size={32} />
            </div>
          )}

          {/* Price Tag */}
          <div className={`absolute bottom-3 left-3 bg-gradient-to-r ${getTypeColor(listing.type)} text-white px-3 py-2 rounded-xl font-bold text-lg shadow-lg`}>
            {formatPrice(listing.price)}
          </div>

          {/* Status Indicator */}
          <div className="absolute top-3 right-3 flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              listing.status === 'active' ? 'bg-green-500' : 
              listing.status === 'sold' ? 'bg-red-500' : 'bg-gray-400'
            }`}></div>
            <span className="text-xs font-medium text-white bg-black/50 px-2 py-1 rounded-full capitalize">
              {listing.status}
            </span>
          </div>

          {/* Seller Info */}
          {listing.sellerId && (
            <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs">
              @{listing.sellerId.username || 'Seller'}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5">
          {/* Category and Type Badges */}
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {listing.category}
            </span>
            <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {getTypeLabel(listing.type)}
            </span>
          </div>

          {/* Title with Gradient Hover Effect */}
          <h3 className="font-bold text-gray-900 text-xl mb-2 line-clamp-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all duration-300">
            {listing.title}
          </h3>
          
          {/* Description */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
            {listing.description}
          </p>

          {/* Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {listing.tags.slice(0, 3).map((tag, index) => (
                <span 
                  key={index}
                  className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
              {listing.tags.length > 3 && (
                <span className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200">
                  +{listing.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => onViewDetails(listing._id)}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors duration-200 border border-gray-300 flex items-center justify-center gap-2"
            >
              View Details
            </button>
            <button
              onClick={handleMakeOfferClick}
              disabled={listing.status !== 'active' || !isUserLoggedIn || isOwnListing}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2.5 rounded-lg font-semibold text-sm hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FiTag size={16} />
              Make Offer
            </button>
          </div>

          {/* Status Messages */}
          {listing.status !== 'active' && (
            <div className="mt-3 text-center">
              <span className="text-xs text-red-600 font-medium">
                {listing.status === 'sold' ? 'Sold' : 'Not Available for Offers'}
              </span>
            </div>
          )}
          
          {isOwnListing && (
            <div className="mt-2 text-center">
              <span className="text-xs text-blue-600 font-medium">
                Your Listing
              </span>
            </div>
          )}
          
          {!isUserLoggedIn && (
            <div className="mt-2 text-center">
              <span className="text-xs text-blue-600 font-medium">
                Login to make offers
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Make Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Make an Offer</h2>
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Listing Info */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">{listing.title}</h3>
              <div className="flex justify-between items-center">
                <p className="text-gray-600 text-sm">Listed price:</p>
                <p className="text-lg font-bold text-gray-900">{formatPrice(listing.price)}</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleOfferSubmit} className="p-6">
              {offerError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <FiX className="flex-shrink-0" />
                  <span>{offerError}</span>
                </div>
              )}

              {offerSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <FiCheck className="flex-shrink-0" />
                  <span>Offer submitted successfully!</span>
                </div>
              )}

              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Offer Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiDollarSign className="text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={listing.price * 3}
                    value={offerData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    placeholder="Enter your offer amount"
                    required
                    disabled={isSubmitting || offerSuccess}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Minimum: {formatPrice(0.01)}</span>
                  <span>Maximum: {formatPrice(listing.price * 3)}</span>
                </div>
              </div>

              {/* Message Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message to Seller (Optional)
                </label>
                <textarea
                  value={offerData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  rows={3}
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:opacity-50"
                  placeholder="Tell the seller why you're interested..."
                  disabled={isSubmitting || offerSuccess}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
                >
                  {offerSuccess ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || offerSuccess}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : offerSuccess ? (
                    <>
                      <FiCheck size={16} />
                      Success!
                    </>
                  ) : (
                    'Submit Offer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ListingCard;