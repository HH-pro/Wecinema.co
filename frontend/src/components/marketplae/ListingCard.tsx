import React from 'react';
import { Listing } from '../../types/marketplace';
import { FiEye, FiShoppingCart, FiPlay, FiImage, FiStar, FiUser } from 'react-icons/fi';

interface ListingCardProps {
  listing: Listing;
  onViewDetails: (listingId: string) => void;
  onMakeOffer: (listing: Listing) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onViewDetails, onMakeOffer }) => {
  // Check if media is video or image
  const isVideo = (url: string) => {
    return url.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i);
  };

  const isImage = (url: string) => {
    return url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
  };

  // Get first media URL
  const firstMedia = listing.mediaUrls && listing.mediaUrls.length > 0 ? listing.mediaUrls[0] : null;

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Get seller initials
  const getSellerInitials = (username: string) => {
    return username ? username.charAt(0).toUpperCase() : 'U';
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group">
      {/* Media Section with Professional Aspect Ratio */}
      <div className="relative h-56 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {firstMedia ? (
          <>
            {isVideo(firstMedia) ? (
              <div className="relative w-full h-full">
                <video
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  poster={listing.mediaUrls?.find(url => isImage(url)) || ''}
                  controls={false}
                  muted
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                >
                  <source src={firstMedia} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                  <div className="bg-white bg-opacity-90 rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <FiPlay className="text-gray-800" size={20} />
                  </div>
                </div>
                <div className="absolute top-3 left-3 bg-black bg-opacity-60 rounded-full px-3 py-1 flex items-center gap-1">
                  <FiPlay className="text-white" size={12} />
                  <span className="text-white text-xs font-medium">VIDEO</span>
                </div>
              </div>
            ) : isImage(firstMedia) ? (
              <img
                src={firstMedia}
                alt={listing.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <FiImage className="text-gray-300 mx-auto mb-2" size={32} />
                  <p className="text-gray-400 text-sm">No preview available</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <FiImage className="text-gray-300 mx-auto mb-2" size={32} />
              <p className="text-gray-400 text-sm">No media</p>
            </div>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-3 right-3">
          <span className="bg-yellow-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg capitalize">
            {listing.type.replace('_', ' ')}
          </span>
        </div>

        {/* Media Count Badge */}
        {listing.mediaUrls && listing.mediaUrls.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-white bg-opacity-95 text-gray-800 text-xs font-semibold px-2.5 py-1.5 rounded-full shadow-lg border border-gray-200">
            +{listing.mediaUrls.length - 1}
          </div>
        )}

        {/* Overlay Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Category */}
        <div className="mb-3">
          <span className="inline-block bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200">
            {listing.category}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-xl leading-tight mb-2 line-clamp-2 group-hover:text-yellow-600 transition-colors duration-200">
          {listing.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
          {listing.description}
        </p>

        {/* Seller Info */}
        {listing.sellerId && typeof listing.sellerId === 'object' && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                {getSellerInitials(listing.sellerId.username)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {listing.sellerId.username || 'Unknown Seller'}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <FiStar className="text-yellow-400 fill-current" size={12} />
                  <span className="text-xs font-semibold text-gray-700">
                    {listing.sellerId.sellerRating?.toFixed(1) || '0.0'}
                  </span>
                </div>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">Verified</span>
              </div>
            </div>
          </div>
        )}

        {/* Price and Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(listing.price)}
            </span>
            <span className="text-xs text-gray-500 font-medium">
              {listing.type === 'for_sale' ? 'One-time purchase' : 
               listing.type === 'licensing' ? 'License included' :
               listing.type === 'adaptation_rights' ? 'Rights included' : 
               'Custom commission'}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onViewDetails(listing._id)}
              className="inline-flex items-center justify-center w-12 h-12 bg-white text-gray-700 rounded-xl border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
              title="View Details"
            >
              <FiEye size={18} />
            </button>
            <button
              onClick={() => onMakeOffer(listing)}
              className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              title="Make Offer"
            >
              <FiShoppingCart size={18} />
            </button>
          </div>
        </div>

        {/* Tags */}
        {listing.tags && listing.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {listing.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors duration-200"
              >
                #{tag.toLowerCase()}
              </span>
            ))}
            {listing.tags.length > 3 && (
              <span className="inline-block bg-gray-50 text-gray-500 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200">
                +{listing.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingCard;