import React from 'react';
import { Listing } from '../../types/marketplace';
import { FiEye, FiShoppingCart, FiPlay, FiImage } from 'react-icons/fi';

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
      {/* Media Section */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {firstMedia ? (
          <>
            {isVideo(firstMedia) ? (
              <div className="relative w-full h-full">
                <video
                  className="w-full h-full object-cover"
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
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
                  <FiPlay className="text-white" size={16} />
                </div>
              </div>
            ) : isImage(firstMedia) ? (
              <img
                src={firstMedia}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                <FiImage className="text-gray-400" size={48} />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
            <FiImage className="text-gray-400" size={48} />
            <span className="sr-only">No media available</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            {listing.type.replace('_', ' ')}
          </span>
          {listing.tags && listing.tags.slice(0, 2).map((tag, index) => (
            <span 
              key={index}
              className="bg-white bg-opacity-90 text-gray-700 text-xs px-2 py-1 rounded-full font-medium"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Media Count Badge */}
        {listing.mediaUrls && listing.mediaUrls.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
            +{listing.mediaUrls.length - 1}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Title and Category */}
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 text-lg line-clamp-2 mb-1">
            {listing.title}
          </h3>
          <p className="text-gray-500 text-sm capitalize">
            {listing.category}
          </p>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {listing.description}
        </p>

        {/* Seller Info */}
        {listing.sellerId && typeof listing.sellerId === 'object' && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {listing.sellerId.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {listing.sellerId.username || 'Unknown Seller'}
              </p>
              <div className="flex items-center gap-1">
                <div className="flex text-yellow-400">
                  {'★'.repeat(Math.floor(listing.sellerId.sellerRating || 0))}
                  {'☆'.repeat(5 - Math.floor(listing.sellerId.sellerRating || 0))}
                </div>
                <span className="text-xs text-gray-500">
                  ({listing.sellerId.sellerRating || 0})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Price and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-gray-900">
              ${listing.price}
            </span>
            <span className="text-xs text-gray-500">
              {listing.type === 'for_sale' ? 'One-time purchase' : 
               listing.type === 'licensing' ? 'Licensing fee' :
               listing.type === 'adaptation_rights' ? 'Rights fee' : 'Commission'}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onViewDetails(listing._id)}
              className="inline-flex items-center justify-center p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors duration-200"
              title="View Details"
            >
              <FiEye size={16} />
            </button>
            <button
              onClick={() => onMakeOffer(listing)}
              className="inline-flex items-center justify-center p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors duration-200"
              title="Make Offer"
            >
              <FiShoppingCart size={16} />
            </button>
          </div>
        </div>

        {/* Tags */}
        {listing.tags && listing.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {listing.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md"
              >
                #{tag}
              </span>
            ))}
            {listing.tags.length > 3 && (
              <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-md">
                +{listing.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingCard;