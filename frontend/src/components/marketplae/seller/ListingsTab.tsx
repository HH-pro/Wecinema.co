// src/components/marketplae/seller/ListingsTab.tsx
import React from 'react';

interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  category: string;
  tags: string[];
  mediaUrls: string[];
  status: string;
  views?: number;
  sellerId: {
    _id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ListingsData {
  listings: Listing[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ListingsTabProps {
  listingsData: ListingsData | null;
  loading: boolean;
  statusFilter: string;
  currentPage: number;
  onStatusFilterChange: (status: string) => void;
  onPageChange: (page: number) => void;
  onEditListing: (listing: Listing) => void;
  onDeleteListing: (listing: Listing) => void;
  onToggleStatus: (listing: Listing) => void;
  onPlayVideo: (videoUrl: string, title: string) => void;
  onRefresh: () => void;
  actionLoading: string | null;
  onCreateListing: () => void;
}

const ListingsTab: React.FC<ListingsTabProps> = ({
  listingsData,
  loading,
  statusFilter,
  currentPage,
  onStatusFilterChange,
  onPageChange,
  onEditListing,
  onDeleteListing,
  onToggleStatus,
  onPlayVideo,
  onRefresh,
  actionLoading,
  onCreateListing
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Recently';
      }
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      }
      
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      return 'Recently';
    }
  };

  const getStatusColor = (status: string): string => {
    if (!status) return 'bg-gray-50 text-gray-700 border-gray-200';
    
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-50 text-green-700 border-green-200';
      case 'inactive': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'sold': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'draft': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string): JSX.Element => {
    if (!status) {
      return (
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    
    switch (status.toLowerCase()) {
      case 'active':
        return (
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'inactive':
        return (
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'sold':
        return (
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'draft':
        return (
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      default:
        return (
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const isVideoUrl = (url: string): boolean => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm'];
    const urlLower = url.toLowerCase();
    return videoExtensions.some(ext => urlLower.endsWith(ext));
  };

  const isImageUrl = (url: string): boolean => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.endsWith(ext));
  };

  const getFirstMediaUrl = (mediaUrls: string[]): { url: string; isVideo: boolean; isImage: boolean } => {
    if (!mediaUrls || mediaUrls.length === 0) {
      return { url: '', isVideo: false, isImage: false };
    }
    
    // Try to find an image first
    for (const url of mediaUrls) {
      if (isImageUrl(url)) {
        return { url, isVideo: false, isImage: true };
      }
    }
    
    // Then try to find a video
    for (const url of mediaUrls) {
      if (isVideoUrl(url)) {
        return { url, isVideo: true, isImage: false };
      }
    }
    
    // Return first URL as fallback
    return { 
      url: mediaUrls[0], 
      isVideo: isVideoUrl(mediaUrls[0]), 
      isImage: isImageUrl(mediaUrls[0]) 
    };
  };

  const getListingTypeLabel = (type: string | undefined): string => {
    if (!type) return 'Unspecified';
    
    const typeMap: Record<string, string> = {
      'for-sale': 'For Sale',
      'licensing': 'Licensing',
      'adoption-rights': 'Adoption Rights',
      'commission': 'Commission',
      'product': 'Product',
      'service': 'Service',
      'rental': 'Rental',
      'event': 'Event',
      'job': 'Job',
      'other': 'Other'
    };
    
    return typeMap[type] || 
           type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getCategoryLabel = (category: string | undefined): string => {
    if (!category) return 'Uncategorized';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getStatusText = (status: string | undefined): string => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const listings = listingsData?.listings || [];
  const pagination = listingsData?.pagination;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">My Listings</h2>
            <p className="text-sm text-gray-600 mt-1">Manage and edit your listings</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                disabled={loading || actionLoading !== null}
                className="appearance-none bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="sold">Sold</option>
                <option value="draft">Draft</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {/* Create Listing Button */}
            <button
              onClick={onCreateListing}
              disabled={loading || actionLoading !== null}
              className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Listing
            </button>
            
            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={loading || actionLoading !== null}
              className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {listings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 text-gray-300">🏠</div>
            <h3 className="text-lg font-medium text-gray-900">No listings found</h3>
            <p className="mt-2 text-gray-500">
              {statusFilter 
                ? `You don't have any ${statusFilter} listings.`
                : "You haven't created any listings yet."}
            </p>
            <button
              onClick={onCreateListing}
              className="mt-4 inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Listing
            </button>
          </div>
        ) : (
          <>
            {/* Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {listings.map(listing => {
                const { url: mediaUrl, isVideo, isImage } = getFirstMediaUrl(listing.mediaUrls);
                const isProcessing = actionLoading === `toggling-${listing._id}` || 
                                   actionLoading === `updating-${listing._id}` || 
                                   actionLoading === `deleting-${listing._id}`;
                
                return (
                  <div key={listing._id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 group bg-white">
                    {/* Media Thumbnail */}
                    <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                      {mediaUrl ? (
                        isVideo ? (
                          // Video thumbnail with play button
                          <div 
                            className="relative w-full h-full cursor-pointer"
                            onClick={() => onPlayVideo(mediaUrl, listing.title)}
                          >
                            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                              <svg className="w-12 h-12 text-white opacity-70" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                            <div className="absolute top-3 left-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                                Video
                              </span>
                            </div>
                            <div className="absolute inset-0 bg-black bg-opacity-10 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        ) : isImage ? (
                          // Image thumbnail
                          <img
                            src={mediaUrl}
                            alt={listing.title || 'Listing image'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image';
                            }}
                          />
                        ) : (
                          // Generic media
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                            <div className="text-center">
                              <svg className="w-12 h-12 text-blue-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <p className="text-sm text-blue-600 mt-2">Media File</p>
                            </div>
                          </div>
                        )
                      ) : (
                        // No media
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                          <div className="text-center">
                            <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm text-gray-400 mt-2">No Media</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(listing.status)}`}>
                          {getStatusIcon(listing.status)}
                          {getStatusText(listing.status)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Listing Info */}
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-base mb-1 truncate" title={listing.title || 'Untitled Listing'}>
                            {listing.title || 'Untitled Listing'}
                          </h3>
                          <p className="text-xs text-gray-500 mb-1 truncate">
                            {getListingTypeLabel(listing.type)} • {getCategoryLabel(listing.category)}
                          </p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-lg font-bold text-green-600 whitespace-nowrap">
                            {formatCurrency(listing.price || 0)}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2 min-h-[2.5rem]" title={listing.description || 'No description'}>
                        {listing.description || 'No description provided'}
                      </p>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="text-xs text-gray-500">{listing.views || 0} views</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Updated</p>
                          <p className="text-xs font-medium text-gray-700">{formatDate(listing.updatedAt)}</p>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      {listing.tags && listing.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {listing.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                              {tag}
                            </span>
                          ))}
                          {listing.tags.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600 border border-gray-300">
                              +{listing.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => onEditListing(listing)}
                          disabled={isProcessing}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Info
                        </button>
                        
                        <button
                          onClick={() => onToggleStatus(listing)}
                          disabled={isProcessing}
                          className={`flex-1 text-sm font-medium py-2.5 px-3 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                            listing.status === 'active'
                              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
                              : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                          }`}
                        >
                          {listing.status === 'active' ? (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Deactivate
                            </>
                          ) : (listing.status === 'inactive' || !listing.status) ? (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Activate
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Mark Unsold
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => onDeleteListing(listing)}
                          disabled={isProcessing}
                          className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                      
                      {/* Media Info */}
                      <div className="flex justify-between items-center text-xs text-gray-500 mt-3">
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {listing.mediaUrls?.length || 0} media
                        </span>
                        <span className="text-xs text-gray-400 truncate ml-2" title={listing._id}>
                          ID: {listing._id ? listing._id.substring(listing._id.length - 6) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{(currentPage - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-semibold">
                    {Math.min(currentPage * pagination.limit, pagination.total)}
                  </span> of{' '}
                  <span className="font-semibold">{pagination.total}</span> listings
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading || actionLoading !== null}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      let pageNum;
                      if (pagination.pages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => onPageChange(pageNum)}
                          disabled={loading || actionLoading !== null}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    {pagination.pages > 5 && currentPage < pagination.pages - 2 && (
                      <>
                        <span className="text-gray-400">...</span>
                        <button
                          onClick={() => onPageChange(pagination.pages)}
                          disabled={loading || actionLoading !== null}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {pagination.pages}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === pagination.pages || loading || actionLoading !== null}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ListingsTab;