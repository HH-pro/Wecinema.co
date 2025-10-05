import React, { useState } from 'react';
import { Listing } from '../../types/marketplace';
import { FiEye, FiShoppingCart, FiPlay, FiImage, FiStar, FiHeart, FiShare2, FiClock, FiDownload } from 'react-icons/fi';

interface ListingCardProps {
  listing: Listing;
  onViewDetails: (listingId: string) => void;
  onMakeOffer: (listing: Listing) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onViewDetails, onMakeOffer }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

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
      minimumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price);
  };

  // Get seller initials
  const getSellerInitials = (username: string) => {
    return username ? username.charAt(0).toUpperCase() : 'U';
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

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div className="group relative w-80 bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-3 border border-white/50 overflow-hidden">
      {/* Animated Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Media Container with Floating Elements */}
      <div className="relative h-52 overflow-hidden rounded-t-3xl">
        {firstMedia ? (
          <>
            {isVideo(firstMedia) ? (
              <div className="relative w-full h-full">
                <video
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
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
                </video>
                
                {/* Video Play Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                  <div className="bg-white/95 rounded-full p-4 transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-2xl">
                    <FiPlay className="text-gray-800" size={24} />
                  </div>
                </div>
                
                {/* Video Badge */}
                <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold backdrop-blur-sm">
                  <FiPlay size={12} />
                  VIDEO
                </div>
              </div>
            ) : isImage(firstMedia) ? (
              <div className="relative w-full h-full">
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse rounded-t-3xl"></div>
                )}
                <img
                  src={firstMedia}
                  alt={listing.title}
                  className={`w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={handleImageLoad}
                />
                
                {/* Image Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <div className="text-center">
                  <FiImage className="text-gray-400 mx-auto mb-2" size={32} />
                  <p className="text-gray-500 text-sm font-medium">No preview</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="text-center">
              <FiImage className="text-gray-400 mx-auto mb-2" size={32} />
              <p className="text-gray-500 text-sm font-medium">No media</p>
            </div>
          </div>
        )}

        {/* Floating Action Buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
          <button 
            onClick={() => setIsLiked(!isLiked)}
            className={`p-2 rounded-full backdrop-blur-sm border transition-all duration-300 ${
              isLiked 
                ? 'bg-red-500/90 border-red-500 text-white' 
                : 'bg-white/90 border-white/50 text-gray-700 hover:bg-white'
            }`}
          >
            <FiHeart className={isLiked ? 'fill-current' : ''} size={16} />
          </button>
          <button className="p-2 rounded-full bg-white/90 backdrop-blur-sm border border-white/50 text-gray-700 hover:bg-white transition-all duration-300">
            <FiShare2 size={16} />
          </button>
        </div>

        {/* Price Tag with 3D Effect */}
        <div className={`absolute bottom-4 left-4 bg-gradient-to-r ${getTypeColor(listing.type)} text-white px-4 py-2.5 rounded-2xl shadow-2xl font-bold text-lg transform -rotate-2 group-hover:rotate-0 transition-transform duration-300`}>
          {formatPrice(listing.price)}
        </div>

        {/* Media Count */}
        {listing.mediaUrls && listing.mediaUrls.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm text-gray-800 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg border border-white/50">
            +{listing.mediaUrls.length - 1} more
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="relative p-6 bg-white/80 backdrop-blur-sm">
        {/* Category and Rating */}
        <div className="flex items-center justify-between mb-4">
          <span className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-200/50">
            {listing.category}
          </span>
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full border border-gray-200/50">
            <FiStar className="text-yellow-400 fill-current" size={14} />
            <span className="text-sm font-bold text-gray-700">4.8</span>
            <span className="text-xs text-gray-500">(24)</span>
          </div>
        </div>

        {/* Title with Gradient Hover */}
        <h3 className="font-bold text-gray-800 text-xl mb-3 line-clamp-2 leading-tight group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all duration-300">
          {listing.title}
        </h3>
        
        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
          {listing.description}
        </p>

        {/* Seller Info with Status */}
        {listing.sellerId && typeof listing.sellerId === 'object' && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-2xl border border-gray-200/50 backdrop-blur-sm">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                {getSellerInitials(listing.sellerId.username)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-lg"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {listing.sellerId.username || 'Verified Seller'}
                </p>
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                  Pro
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <FiStar className="text-yellow-400 fill-current" size={12} />
                  <span className="text-xs font-semibold text-gray-700">
                    {listing.sellerId.sellerRating?.toFixed(1) || '5.0'}
                  </span>
                </div>
                <span className="text-gray-300 text-xs">•</span>
                <div className="flex items-center gap-1 text-gray-500">
                  <FiClock size={10} />
                  <span className="text-xs">2h ago</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onViewDetails(listing._id)}
            className="flex-1 bg-white text-gray-700 py-3 rounded-xl font-semibold transition-all duration-300 hover:bg-gray-50 hover:shadow-lg border border-gray-300/50 flex items-center justify-center gap-2 group/btn"
          >
            <FiEye className="group-hover/btn:scale-110 transition-transform duration-200" size={16} />
            Details
          </button>
          <button
            onClick={() => onMakeOffer(listing)}
            className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 group/btn shadow-lg"
          >
            <FiShoppingCart className="group-hover/btn:scale-110 transition-transform duration-200" size={16} />
            Buy Now
          </button>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200/50">
          <div className="flex items-center gap-1 text-gray-500">
            <FiEye size={14} />
            <span className="text-xs font-medium">1.2k views</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <FiDownload size={14} />
            <span className="text-xs font-medium">48 downloads</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <FiHeart size={14} />
            <span className="text-xs font-medium">86 likes</span>
          </div>
        </div>

        {/* Tags */}
        {listing.tags && listing.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {listing.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="inline-block bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300/50 hover:from-gray-200 hover:to-gray-300 transition-all duration-200 cursor-pointer hover:shadow-sm"
              >
                #{tag.toLowerCase()}
              </span>
            ))}
            {listing.tags.length > 3 && (
              <span className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300/50">
                +{listing.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Shine Effect on Hover */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
    </div>
  );
};

export default ListingCard;