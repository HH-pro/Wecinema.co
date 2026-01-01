// src/components/marketplae/seller/ListingsTab.tsx
import React, { useState } from 'react';

interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  category: string;
  tags: string[];
  mediaUrls: string[];
  status: 'active' | 'inactive' | 'draft' | 'sold';
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
  const [hoveredListing, setHoveredListing] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<string | null>(null);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: diffDays > 365 ? 'numeric' : undefined
      });
    }
  };

  const getStatusColor = (status: string): { bg: string; text: string; border: string; icon: string } => {
    switch (status?.toLowerCase()) {
      case 'active':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          icon: '🟢'
        };
      case 'inactive':
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          icon: '⚫'
        };
      case 'sold':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          icon: '💰'
        };
      case 'draft':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          icon: '📝'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          icon: '❓'
        };
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
    return { url: mediaUrls[0], isVideo: isVideoUrl(mediaUrls[0]), isImage: isImageUrl(mediaUrls[0]) };
  };

  const getStatusTooltip = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'active': return 'This listing is visible to buyers';
      case 'inactive': return 'This listing is hidden from buyers';
      case 'sold': return 'This item has been sold';
      case 'draft': return 'This listing is not published yet';
      default: return 'Unknown status';
    }
  };

  const getToggleButtonText = (status: string): { text: string; color: string; hoverColor: string; icon: string } => {
    switch (status?.toLowerCase()) {
      case 'active':
        return {
          text: 'Deactivate',
          color: 'bg-red-600 hover:bg-red-700',
          hoverColor: 'hover:bg-red-700',
          icon: '⏸️'
        };
      case 'inactive':
        return {
          text: 'Activate',
          color: 'bg-green-600 hover:bg-green-700',
          hoverColor: 'hover:bg-green-700',
          icon: '▶️'
        };
      case 'draft':
        return {
          text: 'Publish',
          color: 'bg-blue-600 hover:bg-blue-700',
          hoverColor: 'hover:bg-blue-700',
          icon: '📤'
        };
      default:
        return {
          text: 'Toggle',
          color: 'bg-gray-600 hover:bg-gray-700',
          hoverColor: 'hover:bg-gray-700',
          icon: '🔄'
        };
    }
  };

  const handleToggleClick = (listing: Listing) => {
    if (confirmToggle === listing._id) {
      onToggleStatus(listing);
      setConfirmToggle(null);
    } else {
      setConfirmToggle(listing._id);
      // Auto-cancel confirmation after 5 seconds
      setTimeout(() => {
        setConfirmToggle(null);
      }, 5000);
    }
  };

  const handleConfirmToggle = (listing: Listing) => {
    onToggleStatus(listing);
    setConfirmToggle(null);
  };

  const handleCancelToggle = () => {
    setConfirmToggle(null);
  };

  const listings = listingsData?.listings || [];
  const pagination = listingsData?.pagination;

  // Calculate stats
  const activeCount = listings.filter(l => l.status === 'active').length;
  const inactiveCount = listings.filter(l => l.status === 'inactive').length;
  const draftCount = listings.filter(l => l.status === 'draft').length;
  const soldCount = listings.filter(l => l.status === 'sold').length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">My Listings</h2>
            <p className="text-sm text-gray-600 mt-1">Manage all your listings in one place</p>
            
            {/* Status Stats */}
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="flex items-center">
                <span className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  <span className="mr-1">🟢</span> {activeCount} Active
                </span>
              </div>
              <div className="flex items-center">
                <span className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                  <span className="mr-1">⚫</span> {inactiveCount} Inactive
                </span>
              </div>
              {/* <div className="flex items-center">
                <span className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                  <span className="mr-1">📝</span> {draftCount} Draft
                </span>
              </div> */}
              {/* <div className="flex items-center">
                <span className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  <span className="mr-1">💰</span> {soldCount} Sold
                </span>
              </div> */}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-400 transition-colors"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                {/* <option value="sold">Sold</option> */}
                {/* <option value="draft">Draft</option> */}
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
              className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white font-medium rounded-lg hover:from-yellow-700 hover:to-yellow-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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
              className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-400"
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
              className="mt-4 inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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
                const isProcessing = actionLoading === listing._id;
                const isToggleProcessing = isProcessing;
                const toggleButton = getToggleButtonText(listing.status);
                const statusColor = getStatusColor(listing.status);
                
                return (
                  <div 
                    key={listing._id} 
                    className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group bg-white"
                    onMouseEnter={() => setHoveredListing(listing._id)}
                    onMouseLeave={() => setHoveredListing(null)}
                  >
                    {/* Media Thumbnail */}
                    <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                      {mediaUrl ? (
                        isVideo ? (
                          // Video thumbnail with play button
                          <div 
                            className="relative w-full h-full cursor-pointer"
                            onClick={() => onPlayVideo(mediaUrl, listing.title)}
                          >
                            <video
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              preload="metadata"
                              poster={listing.mediaUrls.find(url => isImageUrl(url)) || ''}
                            >
                              <source src={mediaUrl} type="video/mp4" />
                            </video>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-300">
                              <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300">
                                <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                            <div className="absolute top-3 left-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                                Video
                              </span>
                            </div>
                          </div>
                        ) : isImage ? (
                          // Image thumbnail
                          <div className="relative w-full h-full">
                            <img
                              src={mediaUrl}
                              alt={listing.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                        ) : (
                          // Generic media
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300">
                            <div className="text-center transform group-hover:scale-110 transition-transform duration-300">
                              <svg className="w-12 h-12 text-blue-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <p className="text-sm text-blue-600 mt-2">Media File</p>
                            </div>
                          </div>
                        )
                      ) : (
                        // No media
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-300">
                          <div className="text-center transform group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm text-gray-500 mt-2">No Media</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Status Badge with Tooltip */}
                      <div className="absolute top-3 right-3 group/status">
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${statusColor.bg} ${statusColor.text} ${statusColor.border} group-hover/status:shadow-md transition-shadow`}>
                          <span className="mr-1.5">{statusColor.icon}</span>
                          <span className="capitalize">{listing.status}</span>
                        </div>
                        <div className="absolute top-full right-0 mt-2 w-48 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all duration-200 z-10">
                          {getStatusTooltip(listing.status)}
                          <div className="absolute -top-1 right-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                        </div>
                      </div>
                      
                      {/* Price Tag */}
                      <div className="absolute bottom-3 left-3">
                        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1.5 rounded-lg shadow-md">
                          {/* <p className="text-lg font-bold">{formatCurrency(listing.price)}</p> */}
                        </div>
                      </div>
                    </div>
                    
                    {/* Listing Info */}
                    <div className="p-5">
                      <div className="mb-4">
                        <h3 
                          className="font-semibold text-gray-900 mb-2 truncate group-hover:text-blue-600 transition-colors cursor-pointer"
                          title={listing.title}
                          onClick={() => {/* Navigate to listing details */}}
                        >
                          {listing.title}
                        </h3>
                        
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3" title={listing.description}>
                          {listing.description}
                        </p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${listing.category === 'service' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {listing.category}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {listing.views || 0} views
                            </span>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            {formatDate(listing.updatedAt)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      {listing.tags && listing.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {listing.tags.slice(0, 4).map((tag, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-colors cursor-default"
                              title={tag}
                            >
                              #{tag}
                            </span>
                          ))}
                          {listing.tags.length > 4 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-200 text-gray-600 border border-gray-300">
                              +{listing.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="pt-4 border-t border-gray-100">
                        {confirmToggle === listing._id ? (
                          // Confirmation Dialog
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                            <p className="text-sm text-yellow-800 mb-2">
                              Are you sure you want to {listing.status === 'active' ? 'deactivate' : 'activate'} this listing?
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConfirmToggle(listing)}
                                disabled={isToggleProcessing}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-50"
                              >
                                {isToggleProcessing ? (
                                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  'Yes'
                                )}
                              </button>
                              <button
                                onClick={handleCancelToggle}
                                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Normal Action Buttons
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => onEditListing(listing)}
                              disabled={isProcessing}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            
                            <button
                              onClick={() => handleToggleClick(listing)}
                              disabled={isProcessing || listing.status === 'sold'}
                              className={`flex-1 ${toggleButton.color} text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md ${listing.status === 'sold' ? 'cursor-not-allowed' : ''}`}
                              title={listing.status === 'sold' ? 'Sold listings cannot be toggled' : ''}
                            >
                              {isToggleProcessing ? (
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <>
                                  <span className="mr-2">{toggleButton.icon}</span>
                                  {toggleButton.text}
                                </>
                              )}
                            </button>
                            
                            <button
                              onClick={() => onDeleteListing(listing)}
                              disabled={isProcessing}
                              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-semibold">{(currentPage - 1) * (pagination.limit || 10) + 1}</span> to{' '}
                  <span className="font-semibold">
                    {Math.min(currentPage * (pagination.limit || 10), pagination.total)}
                  </span> of{' '}
                  <span className="font-semibold">{pagination.total}</span> listings
                </div>
                
                <div className="flex justify-center items-center space-x-2">
                  <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading || actionLoading !== null}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => onPageChange(pageNum)}
                          disabled={loading || actionLoading !== null}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {pagination.pages > 5 && (
                      <span className="px-3 py-2 text-gray-500">...</span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === pagination.pages || loading || actionLoading !== null}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Next
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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