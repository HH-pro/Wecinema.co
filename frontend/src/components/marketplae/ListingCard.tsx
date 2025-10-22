import React, { useState, useEffect } from 'react';
import { Listing } from '../../types/marketplace';
import { FiPlay, FiImage, FiTag, FiDollarSign, FiCheck, FiX, FiShoppingCart, FiCreditCard } from 'react-icons/fi';
import { decodeToken } from "../../utilities/helperfFunction";
import { toast } from 'react-toastify';
import axios from 'axios';

interface ListingCardProps {
  listing: Listing;
  onViewDetails: (listingId: string) => void;
  onOfferSuccess?: () => void;
  onMakeOffer: (listing: Listing) => void;
  onDirectPayment: (listing: Listing) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ 
  listing, 
  onViewDetails, 
  onOfferSuccess, 
  onMakeOffer,
  onDirectPayment 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

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
    
    console.log('🚀 Making offer with:', {
      token: token ? `${token.substring(0, 20)}...` : 'No token',
      listingId,
      offerData
    });

    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await axios.post(
        "http://localhost:3000/marketplace/offers/make-offer",
        {
          listingId,
          amount: offerData.amount,
          message: offerData.message
        },
        {
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
        }
      );

      console.log('✅ Offer successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Offer failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  };

  // Check if media is video or image
  const isVideo = (url: string) => {
    return url?.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i);
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
    console.log('🔐 Auth Debug:', {
      hasToken: !!token,
      token: token ? `${token.substring(0, 20)}...` : 'No token',
      currentUser: currentUser,
      localStorageToken: localStorage.getItem("token")
    });

    if (!token || !currentUser) {
      toast.error("Please login to make an offer");
      return;
    }
    
    // Check if user is the seller
    const userId = currentUser.id;
    const sellerId = listing.sellerId?.id || listing.sellerId?._id || listing.sellerId;
    
    console.log('👤 User Comparison:', {
      userId,
      sellerId,
      isOwnListing: userId === sellerId
    });

    if (userId === sellerId) {
      toast.error("You cannot make an offer on your own listing");
      return;
    }

    setShowOfferModal(true);
    setOfferError('');
    setOfferSuccess(false);
    setOfferData({
      amount: (listing.price * 0.8).toFixed(2),
      message: ''
    });
  };

  const handleBuyNowClick = () => {
    console.log('🛒 Buy Now clicked:', {
      hasToken: !!token,
      currentUser: currentUser,
      listingId: listing._id
    });

    if (!token || !currentUser) {
      toast.error("Please login to purchase this item");
      return;
    }

    // Check if user is the seller
    const userId = currentUser.id;
    const sellerId = listing.sellerId?.id || listing.sellerId?._id || listing.sellerId;

    if (userId === sellerId) {
      toast.error("You cannot purchase your own listing");
      return;
    }

    if (listing.status !== 'active') {
      toast.error("This listing is not available for purchase");
      return;
    }

    // Call the parent handler for direct payment
    onDirectPayment(listing);
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
        setIsSubmitting(false);
        return;
      }

      if (offerAmount > listing.price * 3) {
        setOfferError('Offer amount seems too high. Please enter a reasonable amount.');
        setIsSubmitting(false);
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
    if (!isSubmitting) {
      setShowOfferModal(false);
      setOfferError('');
      setOfferSuccess(false);
      setOfferData({ amount: '', message: '' });
    }
  };

  const isUserLoggedIn = token && currentUser;
  const userId = currentUser?.id || currentUser?._id;
  const sellerId = listing.sellerId?._id || listing.sellerId;
  const isOwnListing = userId === sellerId;
  const canMakeOffer = isUserLoggedIn && !isOwnListing && listing.status === 'active';
  const canBuyNow = isUserLoggedIn && !isOwnListing && listing.status === 'active';

  return (
    <>
      <div className="group relative w-80 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 overflow-hidden">
        
        {/* Media Section */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {firstMedia ? (
            <>
              {isVideo(firstMedia) ? (
                <div className="relative w-full h-full cursor-pointer" onClick={() => setShowVideoModal(true)}>
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
                  <div className="absolute top-3 left-3 bg-black/80 text-white px-2 py-1 rounded-full flex items-center gap-1 text-xs font-medium backdrop-blur-sm">
                    <FiPlay size={10} />
                    <span>VIDEO</span>
                  </div>

                  {/* Click to Zoom Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-2 shadow-lg">
                      <FiPlay className="text-gray-900" size={16} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {!imageLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
                      <FiImage className="text-gray-400" size={24} />
                    </div>
                  )}
                  <img
                    src={firstMedia}
                    alt={listing.title}
                    className={`w-full h-full object-cover transition-all duration-500 ${
                      imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                    } group-hover:scale-110`}
                    onLoad={handleImageLoad}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="text-center">
                <FiImage className="text-gray-400 mx-auto mb-2" size={32} />
                <p className="text-gray-500 text-sm">No media</p>
              </div>
            </div>
          )}

          {/* Price Tag - Red Color */}
          <div className="absolute bottom-3 left-3 bg-red-600 text-white px-3 py-2 rounded-xl font-bold text-lg shadow-lg">
            {formatPrice(listing.price)}
          </div>

          {/* Status Indicator */}
          <div className="absolute top-3 right-3 flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              listing.status === 'active' ? 'bg-green-500' : 
              listing.status === 'sold' ? 'bg-red-500' : 'bg-gray-400'
            }`}></div>
            <span className="text-xs font-medium text-white bg-black/70 px-2 py-1 rounded-full capitalize backdrop-blur-sm">
              {listing.status}
            </span>
          </div>

          {/* Seller Info */}
          {listing.sellerId && (
            <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">
              @{listing.sellerId.username || 'Seller'}
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 pointer-events-none" />
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

          {/* Title */}
          <h3 className="font-bold text-gray-900 text-xl mb-2 line-clamp-2 leading-tight">
            {listing.title}
          </h3>
          
          {/* Description */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
            {listing.description}
          </p>

          {/* Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {listing.tags.slice(0, 4).map((tag, index) => (
                <span 
                  key={index}
                  className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200"
                >
                  #{tag}
                </span>
              ))}
              {listing.tags.length > 4 && (
                <span className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200">
                  +{listing.tags.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Dual Action Buttons */}
          <div className="flex gap-2">
            {/* Buy Now Button - Primary */}
            <button
              onClick={handleBuyNowClick}
              disabled={!canBuyNow}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-red-600 flex items-center justify-center gap-2"
            >
              <FiShoppingCart size={16} />
              <span>Buy Now</span>
            </button>
            
            {/* Make Offer Button - Secondary */}
            <button
              onClick={handleMakeOfferClick}
              disabled={!canMakeOffer}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-yellow-500 flex items-center justify-center gap-2"
            >
              <FiTag size={16} />
              <span>Offer</span>
            </button>
          </div>

          {/* Status Messages */}
          <div className="mt-3 space-y-1">
            {listing.status !== 'active' && (
              <div className="text-center">
                <span className="text-xs font-medium text-red-600">
                  {listing.status === 'sold' ? 'Sold Out' : 'Not Available'}
                </span>
              </div>
            )}
            
            {isOwnListing && (
              <div className="text-center">
                <span className="text-xs font-medium text-blue-600">
                  Your Listing
                </span>
              </div>
            )}
            
            {!isUserLoggedIn && (
              <div className="text-center">
                <span className="text-xs font-medium text-blue-600">
                  Login to purchase or make offers
                </span>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <span>⭐ {listing.sellerId?.sellerRating || 'New'}</span>
            <span>🕒 {new Date(listing.createdAt).toLocaleDateString()}</span>
            {listing.viewCount !== undefined && (
              <span>👁️ {listing.viewCount} views</span>
            )}
          </div>
        </div>
      </div>

      {/* Video Zoom Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors duration-200 bg-black/50 rounded-full p-2"
            >
              <FiX size={24} />
            </button>
            
            <video
              className="w-full h-full max-h-[80vh] object-contain"
              controls
              autoPlay
              muted={false}
            >
              <source src={firstMedia} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            <div className="absolute bottom-4 left-4 right-4 text-white text-sm opacity-75">
              Click anywhere outside or press ESC to close
            </div>
          </div>
        </div>
      )}

      {/* Make Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md transform transition-all duration-300 scale-100 animate-slideUp shadow-2xl border border-gray-300">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Make an Offer</h2>
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 disabled:opacity-50 p-1 hover:bg-gray-100 rounded-lg"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Listing Info */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">{listing.title}</h3>
              <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                <p className="text-gray-600 text-sm font-medium">Listed Price:</p>
                <p className="text-lg font-bold text-red-600 bg-white px-3 py-1 rounded-lg shadow-sm">
                  {formatPrice(listing.price)}
                </p>
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
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:opacity-50 bg-white shadow-sm"
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
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none disabled:opacity-50 bg-white shadow-sm"
                  placeholder="Tell the seller why you're interested..."
                  disabled={isSubmitting || offerSuccess}
                />
              </div>

              {/* Payment Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-yellow-800 mb-1">
                  <FiCreditCard size={16} />
                  <span className="font-semibold text-sm">Payment Required</span>
                </div>
                <p className="text-xs text-yellow-700">
                  Your offer will be submitted and payment will be processed immediately. Funds are held securely until the seller accepts your offer.
                </p>
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
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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