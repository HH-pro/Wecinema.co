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
  console.log('🃏 ListingCard rendering:', listing._id, listing.title);

  // Safely get data
  const title = listing.title || 'Untitled';
  const description = listing.description || 'No description';
  const price = listing.price || 0;
  const formattedPrice = listing.formattedPrice || `$${price.toFixed(2)}`;
  const category = listing.category || 'Uncategorized';
  const mediaUrls = Array.isArray(listing.mediaUrls) ? listing.mediaUrls : [];
  const thumbnail = listing.thumbnail || mediaUrls[0] || 'https://via.placeholder.com/300x200';
  const sellerName = listing.sellerId?.username || 'Unknown Seller';
  const status = listing.status || 'active';
  
  // Format date
  const createdAt = listing.createdAtFormatted || 
    (listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : 'N/A');

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-200">
      {/* Image */}
      <div 
        className="relative h-48 bg-gray-100 cursor-pointer overflow-hidden"
        onClick={() => onViewDetails(listing._id)}
      >
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200';
          }}
        />
        <div className="absolute top-3 right-3 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          {status.toUpperCase()}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title and Price */}
        <div className="flex justify-between items-start mb-3">
          <h3 
            className="text-lg font-bold text-gray-900 cursor-pointer hover:text-yellow-600 line-clamp-2"
            onClick={() => onViewDetails(listing._id)}
          >
            {title}
          </h3>
          <div className="flex-shrink-0 ml-2">
            <div className="text-xl font-bold text-green-600">{formattedPrice}</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {description}
        </p>

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <FiTag className="mr-2" size={14} />
            <span>{category}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <FiUser className="mr-2" size={14} />
            <span>{sellerName}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <FiCalendar className="mr-2" size={14} />
            <span>{createdAt}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onViewDetails(listing._id)}
            className="w-full py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <FiEye size={16} />
            View Details
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onMakeOffer(listing)}
              className="py-2.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <FiDollarSign size={16} />
              Make Offer
            </button>
            <button
              onClick={() => onDirectPayment(listing)}
              className="py-2.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <FiDollarSign size={16} />
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;