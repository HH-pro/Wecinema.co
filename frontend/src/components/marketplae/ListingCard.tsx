// src/components/marketplace/ListingCard.tsx
import React from 'react';
import { Listing } from '../../types/marketplace';
import { FiEye, FiDollarSign, FiTag, FiCalendar, FiUser } from 'react-icons/fi';

interface ListingCardProps {
  listing: Listing;
  onViewDetails: (listingId: string) => void;
  onMakeOffer: (listing: Listing) => void;
  onDirectPayment: (listing: Listing) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onViewDetails,
  onMakeOffer,
  onDirectPayment
}) => {
  // Safely extract data with fallbacks
  const title = listing.title || 'Untitled Listing';
  const description = listing.description || 'No description available';
  const price = listing.price || 0;
  const formattedPrice = listing.formattedPrice || `$${price.toFixed(2)}`;
  const category = listing.category || 'Uncategorized';
  const mediaUrls = Array.isArray(listing.mediaUrls) ? listing.mediaUrls : [];
  const thumbnail = listing.thumbnail || mediaUrls[0] || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80';
  const sellerName = listing.sellerId?.username || 
                    listing.seller?.username || 
                    'Unknown Seller';
  const status = listing.status || 'active';
  const createdAt = listing.createdAtFormatted || 
                   (listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : 'N/A');
  const tags = Array.isArray(listing.tags) ? listing.tags : [];

  // Status color
  const getStatusColor = () => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-200 h-full flex flex-col">
      {/* Image Section */}
      <div 
        className="relative h-48 bg-gray-100 cursor-pointer overflow-hidden"
        onClick={() => onViewDetails(listing._id)}
      >
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80';
          }}
        />
        <div className={`absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full ${getStatusColor()}`}>
          {status.toUpperCase()}
        </div>
        <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {listing.type ? listing.type.replace('_', ' ').toUpperCase() : 'FOR SALE'}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Title and Price */}
        <div className="flex justify-between items-start mb-3">
          <h3 
            className="text-lg font-bold text-gray-900 cursor-pointer hover:text-yellow-600 line-clamp-2 flex-1 mr-2"
            onClick={() => onViewDetails(listing._id)}
            title={title}
          >
            {title}
          </h3>
          <div className="flex-shrink-0">
            <div className="text-xl font-bold text-green-600">{formattedPrice}</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1" title={description}>
          {description}
        </p>

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <FiTag className="mr-2 flex-shrink-0" size={14} />
            <span className="truncate" title={category}>{category}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <FiUser className="mr-2 flex-shrink-0" size={14} />
            <span className="truncate" title={sellerName}>{sellerName}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <FiCalendar className="mr-2 flex-shrink-0" size={14} />
            <span>{createdAt}</span>
          </div>
        </div>

        {/* Tags (if any) */}
        {tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-gray-400 text-xs">+{tags.length - 3} more</span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onViewDetails(listing._id)}
              className="w-full py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <FiEye size={16} />
              View Details
            </button>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onMakeOffer(listing)}
                className="py-2.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <FiDollarSign size={16} />
                Make Offer
              </button>
              <button
                onClick={() => onDirectPayment(listing)}
                className="py-2.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <FiDollarSign size={16} />
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;