import React from 'react';
import { FiUser, FiCreditCard, FiPlay, FiVideo, FiImage } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { Listing } from '../../../types/marketplace';
import marketplaceApi from '../../../api/marketplaceApi';

// Constants
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
const ERROR_IMAGE = 'https://via.placeholder.com/300x200/cccccc/ffffff?text=Preview+Unavailable';

interface ListingCardProps {
  listing: Listing;
  onMakeOffer: (listing: Listing) => void;
  onVideoClick: (videoUrl: string, title: string) => void;
  imageErrors: Record<string, boolean>;
  onImageError: (listingId: string) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onMakeOffer,
  onVideoClick,
  imageErrors,
  onImageError
}) => {
  const navigate = useNavigate();

  // Check if URL is a video
  const isVideoUrl = (url: string): boolean => {
    if (!url) return false;
    
    // Check for video file extensions
    const videoExtensions = /\.(mp4|mov|avi|wmv|flv|mkv|webm|m4v|ogg|ogv|3gp|3g2)$/i;
    if (videoExtensions.test(url)) {
      return true;
    }
    
    // Check for video hosting platforms
    const videoDomains = [
      'youtube.com',
      'youtu.be',
      'vimeo.com',
      'dailymotion.com',
      'streamable.com',
      'cloudinary.com'
    ];
    
    return videoDomains.some(domain => url.includes(domain));
  };

  // Get first video URL from listing
  const getFirstVideoUrl = (listing: Listing): string => {
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) return '';
    
    // Find first video URL
    const videoUrl = listing.mediaUrls.find(url => isVideoUrl(url));
    
    return videoUrl || '';
  };

  // Generate YouTube thumbnail from URL
  const getYouTubeThumbnail = (url: string): string => {
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    return PLACEHOLDER_IMAGE;
  };

  // Generate Vimeo thumbnail from URL
  const getVimeoThumbnail = (url: string): string => {
    const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
    if (videoId) {
      // Using vumbnail service for Vimeo thumbnails
      return `https://vumbnail.com/${videoId}.jpg`;
    }
    return PLACEHOLDER_IMAGE;
  };

  // Get appropriate thumbnail URL
  const getThumbnailUrl = (): string => {
    const listingId = listing._id || 'unknown';
    
    // Check if this image has previously failed to load
    if (imageErrors[listingId]) {
      return ERROR_IMAGE;
    }
    
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) {
      return PLACEHOLDER_IMAGE;
    }
    
    // Try to find a video URL first (for video thumbnails)
    const videoUrl = getFirstVideoUrl(listing);
    if (videoUrl) {
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        return getYouTubeThumbnail(videoUrl);
      } else if (videoUrl.includes('vimeo.com')) {
        return getVimeoThumbnail(videoUrl);
      }
      // For direct video files, show video icon placeholder
      return PLACEHOLDER_IMAGE;
    }
    
    // Try to find an image
    const imageUrl = listing.mediaUrls.find(url => 
      url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
    );
    
    if (imageUrl) return imageUrl;
    
    // Default to the first media URL
    const firstUrl = listing.mediaUrls[0];
    if (firstUrl) {
      return firstUrl;
    }
    
    return PLACEHOLDER_IMAGE;
  };

  // Get media type for a listing
  const getMediaType = (): 'image' | 'video' | 'none' => {
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) {
      return 'none';
    }
    
    // Check for video
    const videoUrl = listing.mediaUrls.find(url => isVideoUrl(url));
    if (videoUrl) {
      return 'video';
    }
    
    // Check for image
    const imageUrl = listing.mediaUrls.find(url => 
      url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
    );
    
    if (imageUrl) {
      return 'image';
    }
    
    return 'none';
  };

  const handleViewDetails = () => {
    navigate(`/marketplace/listings/${listing._id}`);
  };

  const thumbnailUrl = getThumbnailUrl();
  const videoUrl = getFirstVideoUrl(listing);
  const mediaType = getMediaType();
  const isVideo = mediaType === 'video';

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-200 group">
      {/* Video/Image Preview */}
      <div 
        className="relative h-48 bg-gray-900 cursor-pointer overflow-hidden"
        onClick={() => {
          if (isVideo && videoUrl) {
            onVideoClick(videoUrl, listing.title);
          }
        }}
      >
        {/* Thumbnail Image */}
        <div className="relative w-full h-full">
          <img
            src={thumbnailUrl}
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => onImageError(listing._id)}
            loading="lazy"
          />
          
          {/* Loading skeleton */}
          <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
          
          {/* Play Button Overlay for Videos */}
          {isVideo && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40 transform group-hover:scale-110 transition-transform duration-300">
                <FiPlay className="text-white ml-1" size={32} />
              </div>
            </div>
          )}
          
          {/* Media Type Badge */}
          <div className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm ${isVideo ? 'bg-red-500/80' : 'bg-blue-500/80'}`}>
            {isVideo ? (
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
        <div className="absolute bottom-2 left-2">
          <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm bg-yellow-500/90">
            {listing.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 
            onClick={handleViewDetails}
            className="font-semibold text-gray-900 truncate text-sm hover:text-yellow-600 transition-colors cursor-pointer"
          >
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
          <div className="text-green-600 font-bold">
            {marketplaceApi.utils.formatCurrency(listing.price)}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onMakeOffer(listing)}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <FiCreditCard size={14} />
            Make Offer
          </button>
          {isVideo && videoUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVideoClick(videoUrl, listing.title);
              }}
              className="px-3 bg-gray-800 hover:bg-gray-900 text-white text-sm py-2 rounded-md transition-colors duration-200 flex items-center gap-2"
            >
              <FiPlay size={14} />
              Play
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListingCard;