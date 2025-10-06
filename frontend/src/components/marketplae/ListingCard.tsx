import React, { useState } from 'react';
import { Listing } from '../../types/marketplace';
import { FiPlay, FiImage, FiTag } from 'react-icons/fi';
import MakeOfferModal from '../../components/marketplae/OfferModal';

interface ListingCardProps {
  listing: Listing;
  onViewDetails: (listingId: string) => void;
  onMakeOffer: (listingId: string, offerData: { amount: number; message: string }) => Promise<void>;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onViewDetails, onMakeOffer }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);

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
    setShowOfferModal(true);
  };

  const handleOfferSubmit = async (offerData: { amount: number; message: string }) => {
    await onMakeOffer(listing._id, offerData);
  };

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
                    className={`w-full h-full object-cover ${
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
              {listing.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => onViewDetails(listing._id)}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors duration-200 border border-gray-300"
            >
              View Details
            </button>
            <button
              onClick={handleMakeOfferClick}
              disabled={listing.status !== 'active'}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2.5 rounded-lg font-semibold text-sm hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FiTag size={16} />
              Make Offer
            </button>
          </div>

          {/* Offer Indicator */}
          {listing.status !== 'active' && (
            <div className="mt-3 text-center">
              <span className="text-xs text-red-600 font-medium">
                {listing.status === 'sold' ? 'Sold' : 'Not Available'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Make Offer Modal */}
      <MakeOfferModal
        listing={listing}
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        onSubmit={handleOfferSubmit}
      />
    </>
  );
};

export default ListingCard;