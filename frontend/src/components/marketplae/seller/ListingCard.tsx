import React from 'react';
import { FiCreditCard, FiPlay, FiUser, FiVideo, FiImage, FiDollarSign, FiClock } from 'react-icons/fi';
import { Listing } from '../../../types/marketplace';
import marketplaceApi from '../../../api/marketplaceApi';

interface ListingCardProps {
  listing: Listing;
  thumbnailUrl: string;
  videoUrl: string;
  mediaType: 'image' | 'video' | 'none';
  onImageError: () => void;
  onMakeOffer: () => void;
  onVideoClick: () => void;
  onDirectPayment: () => void;
  isVideoUrl: (url: string) => boolean;
}

const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  thumbnailUrl,
  videoUrl,
  mediaType,
  onImageError,
  onMakeOffer,
  onVideoClick,
  onDirectPayment,
  isVideoUrl
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-200 group">
      {/* Video/Image Preview */}
      <div 
        className="relative h-48 bg-gray-900 cursor-pointer overflow-hidden"
        onClick={() => {
          if (mediaType === 'video' && videoUrl) {
            onVideoClick();
          }
        }}
      >
        {/* Thumbnail Image with fallback */}
        <div className="relative w-full h-full">
          <img
            src={thumbnailUrl}
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={onImageError}
            loading="lazy"
          />
          
          {/* Loading skeleton */}
          <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
          
          {/* Play Button Overlay for Videos */}
          {mediaType === 'video' && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 transform group-hover:scale-110 transition-transform duration-300">
                <FiPlay className="text-white ml-1" size={28} />
              </div>
            </div>
          )}
          
          {/* Media Type Badge */}
          <div className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm ${mediaType === 'video' ? 'bg-red-500/80' : mediaType === 'image' ? 'bg-blue-500/80' : 'bg-gray-500/80'}`}>
            {mediaType === 'video' ? (
              <>
                <FiVideo size={10} />
                VIDEO
              </>
            ) : mediaType === 'image' ? (
              <>
                <FiImage size={10} />
                IMAGE
              </>
            ) : (
              <>
                <FiImage size={10} />
                MEDIA
              </>
            )}
          </div>
        </div>
        
        {/* Category Badge */}
        {listing.category && (
          <div className="absolute bottom-2 left-2">
            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm bg-yellow-500/90">
              {listing.category}
            </span>
          </div>
        )}

        {/* Duration Badge */}
        {listing.duration && (
          <div className="absolute bottom-2 right-2">
            <span className="bg-gray-800/80 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1">
              <FiClock size={10} />
              {listing.duration}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 truncate text-sm group-hover:text-yellow-600 transition-colors">
            {listing.title}
          </h3>
          <div className="text-xs text-gray-500">
            {listing.duration || 'N/A'}
          </div>
        </div>
        
        <p className="text-gray-600 text-xs mb-3 line-clamp-2">
          {listing.description}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {listing.sellerId?.avatar ? (
                <img 
                  src={listing.sellerId.avatar} 
                  alt={listing.sellerId.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/24/cccccc/ffffff?text=U';
                  }}
                />
              ) : (
                <FiUser size={12} className="text-gray-600" />
              )}
            </div>
            <span className="text-xs text-gray-700 truncate max-w-[80px]">
              {listing.sellerId?.username || 'Seller'}
            </span>
          </div>
          <div className="text-yellow-600 font-bold flex items-center gap-1">
            <FiDollarSign size={14} />
            {marketplaceApi.utils.formatCurrency(listing.price)}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onMakeOffer}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-2 group/btn"
          >
            <FiCreditCard size={14} className="group-hover/btn:scale-110 transition-transform" />
            Make Offer
          </button>
          
          {mediaType === 'video' && videoUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVideoClick();
              }}
              className="px-3 bg-gray-800 hover:bg-gray-900 text-white text-sm py-2 rounded-md transition-colors duration-200 flex items-center gap-2 group/play"
            >
              <FiPlay size={14} className="group-hover/play:scale-110 transition-transform" />
              Play
            </button>
          )}

          <button
            onClick={onDirectPayment}
            className="px-3 bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-md transition-colors duration-200 flex items-center gap-2 group/buy"
          >
            <FiCreditCard size={14} className="group-hover/buy:scale-110 transition-transform" />
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ListingCard);