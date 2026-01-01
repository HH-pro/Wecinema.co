import React, { useState } from 'react';

interface Seller {
  _id: string;
  username: string;
  avatar?: string;
}

interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  status: string;
  tags: string[];
  mediaUrls: string[];
  thumbnailUrl?: string;
  sellerId: Seller;
  createdAt: string;
  updatedAt: string;
}

interface ListingCardProps {
  listing: Listing;
  isCurrentUser: boolean;
  onEdit: (listingId: string) => void;
  onDelete: (listingId: string) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, isCurrentUser, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const isVideo = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.m3u8'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const firstMediaUrl = listing.mediaUrls && listing.mediaUrls.length > 0 ? listing.mediaUrls[0] : null;

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 relative group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {isCurrentUser && (
        <div className={`absolute top-3 left-3 flex gap-2 z-10 transition-all duration-300 ${
          showActions ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(listing._id);
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2.5 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110"
            title="Edit Listing"
          >
            <span className="text-sm">✏️</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(listing._id);
            }}
            className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110"
            title="Delete Listing"
          >
            <span className="text-sm">🗑️</span>
          </button>
        </div>
      )}

      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {firstMediaUrl ? (
          isVideo(firstMediaUrl) ? (
            <div className="w-full h-full bg-black flex items-center justify-center relative">
              <video 
                className="w-full h-full object-cover"
                controls
                muted
                preload="metadata"
                poster={listing.thumbnailUrl}
              >
                <source src={firstMediaUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="absolute bottom-3 right-3 bg-black bg-opacity-70 rounded-full p-2 backdrop-blur-sm">
                <span className="text-white text-xs">🎥</span>
              </div>
            </div>
          ) : (
            <>
              {imageLoading && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}
              <img
                src={firstMediaUrl}
                alt={listing.title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              {imageError && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-gray-400 text-4xl mb-2 block">📷</span>
                    <span className="text-gray-500 text-sm">Image not available</span>
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center">
              <span className="text-gray-400 text-4xl mb-2 block">🏠</span>
              <span className="text-gray-500 text-sm">No media</span>
            </div>
          </div>
        )}
        
        <div className="absolute top-3 right-3">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${
              listing.status === 'active'
                ? 'bg-green-500 text-white border-green-600'
                : listing.status === 'sold'
                ? 'bg-orange-500 text-white border-orange-600'
                : listing.status === 'draft'
                ? 'bg-gray-500 text-white border-gray-600'
                : listing.status === 'inactive'
                ? 'bg-red-500 text-white border-red-600'
                : 'bg-purple-500 text-white border-purple-600'
            }`}
          >
            {listing.status?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>

        {listing.mediaUrls && listing.mediaUrls.length > 1 && (
          <div className="absolute top-3 left-3">
            <span className="bg-black bg-opacity-70 text-white px-2.5 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border border-white border-opacity-20">
              📸 {listing.mediaUrls.length}
            </span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <div className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg backdrop-blur-sm border border-white border-opacity-20">
            <span className="text-lg font-bold">{listing.price?.toLocaleString() || '0'}</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg mb-2 line-clamp-2 h-14 overflow-hidden text-gray-800 group-hover:text-blue-600 transition-colors">
          {listing.title || 'Untitled Listing'}
        </h3>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2 h-10 overflow-hidden leading-relaxed">
          {listing.description || 'No description available'}
        </p>

        <div className="flex justify-between items-center mb-3">
          {listing.category && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1.5 rounded-full font-medium border border-blue-200">
              {listing.category}
            </span>
          )}
          
          {listing.condition && (
            <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1.5 rounded-full font-medium border border-gray-300">
              {listing.condition}
            </span>
          )}
        </div>

        {listing.tags && listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {listing.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded border border-gray-300"
              >
                #{tag}
              </span>
            ))}
            {listing.tags.length > 3 && (
              <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded border border-gray-300">
                +{listing.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {listing.sellerId && (
          <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 flex-1">
              {listing.sellerId.avatar ? (
                <img
                  src={listing.sellerId.avatar}
                  alt={listing.sellerId.username}
                  className="w-6 h-6 rounded-full object-cover border border-gray-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const nextSibling = target.nextElementSibling as HTMLElement;
                    if (nextSibling) nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs border border-gray-400 ${
                listing.sellerId.avatar ? 'hidden' : 'flex'
              }`}>
                👤
              </div>
              <span className="text-sm text-gray-700 font-medium truncate">
                {listing.sellerId.username || 'Unknown Seller'}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-3 text-xs text-gray-500 border-t border-gray-100 pt-3">
          <div className="text-center flex-1">
            <div className="font-medium">Created</div>
            <div>{new Date(listing.createdAt).toLocaleDateString()}</div>
          </div>
          <div className="w-px h-6 bg-gray-200"></div>
          <div className="text-center flex-1">
            <div className="font-medium">Updated</div>
            <div>{new Date(listing.updatedAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;