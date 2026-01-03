// src/components/marketplae/seller/ListingsTab.tsx
import React, { useState } from 'react';
import { Listing } from '../../../api/marketplaceApi';

// Remove the duplicate Listing interface and use the imported one
// Keep only props interface
interface ListingsTabProps {
  listings: Listing[]; // Changed from listingsData to listings array
  loading: boolean;
  statusFilter: string;
  currentPage: number;
  totalPages?: number;
  onStatusFilterChange: (status: string) => void;
  onPageChange: (page: number) => void;
  onEditListing: (listing: Listing) => void;
  onDeleteListing: (listing: Listing) => void;
  onToggleStatus: (listing: Listing) => void;
  onPlayVideo: (videoUrl: string, title: string) => void;
  onRefresh: () => void;
  actionLoading: string | null;
  onCreateListing: () => void;
  onViewListing?: (id: string) => void;
}

const ListingsTab: React.FC<ListingsTabProps> = ({
  listings = [],
  loading,
  statusFilter,
  currentPage,
  totalPages = 1,
  onStatusFilterChange,
  onPageChange,
  onEditListing,
  onDeleteListing,
  onToggleStatus,
  onPlayVideo,
  onRefresh,
  actionLoading,
  onCreateListing,
  onViewListing
}) => {
  const [hoveredListing, setHoveredListing] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const formatCurrency = (amount: number): string => {
    // If amount is less than 100, assume it's dollars
    if (amount < 100) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }
    
    // Otherwise, assume it's cents and convert to dollars
    const amountInDollars = amount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInDollars);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Recently';
    
    try {
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
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: diffDays > 365 ? 'numeric' : undefined
        });
      }
    } catch (error) {
      return 'Recently';
    }
  };

  const getStatusColor = (status: string): { bg: string; text: string; border: string; icon: string } => {
    const statusLower = status?.toLowerCase() || 'active';
    switch (statusLower) {
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
      case 'pending':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-200',
          icon: '⏳'
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

  const getStatusText = (status: string): string => {
    const statusLower = status?.toLowerCase() || 'active';
    switch (statusLower) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'sold': return 'Sold';
      case 'draft': return 'Draft';
      case 'pending': return 'Pending';
      default: return status || 'Active';
    }
  };

  const getStatusTooltip = (status: string): string => {
    const statusLower = status?.toLowerCase() || 'active';
    switch (statusLower) {
      case 'active': return 'This listing is visible to buyers';
      case 'inactive': return 'This listing is hidden from buyers';
      case 'sold': return 'This item has been sold';
      case 'draft': return 'This listing is not published yet';
      case 'pending': return 'This listing is awaiting approval';
      default: return 'Unknown status';
    }
  };

  const getToggleButtonText = (status: string): { text: string; color: string; hoverColor: string; icon: string } => {
    const statusLower = status?.toLowerCase() || 'active';
    switch (statusLower) {
      case 'active':
        return {
          text: 'Deactivate',
          color: 'bg-red-600 hover:bg-red-700',
          hoverColor: 'hover:bg-red-700',
          icon: '⏸️'
        };
      case 'inactive':
      case 'draft':
        return {
          text: 'Activate',
          color: 'bg-green-600 hover:bg-green-700',
          hoverColor: 'hover:bg-green-700',
          icon: '▶️'
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

  const handleDeleteClick = (listing: Listing) => {
    if (confirmDelete === listing._id) {
      onDeleteListing(listing);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(listing._id);
      // Auto-cancel confirmation after 5 seconds
      setTimeout(() => {
        setConfirmDelete(null);
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

  const handleConfirmDelete = (listing: Listing) => {
    onDeleteListing(listing);
    setConfirmDelete(null);
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  // Calculate stats
  const activeCount = listings.filter(l => l.status?.toLowerCase() === 'active').length;
  const inactiveCount = listings.filter(l => l.status?.toLowerCase() === 'inactive').length;
  const draftCount = listings.filter(l => l.status?.toLowerCase() === 'draft').length;
  const soldCount = listings.filter(l => l.status?.toLowerCase() === 'sold').length;
  const pendingCount = listings.filter(l => l.status?.toLowerCase() === 'pending').length;

  const totalListings = listings.length;

  // Get first media URL
  const getFirstMediaUrl = (listing: Listing): { url: string; isVideo: boolean; isImage: boolean } => {
    const mediaUrls = listing.mediaUrls || [];
    if (mediaUrls.length === 0) {
      return { url: '', isVideo: false, isImage: false };
    }
    
    const firstUrl = mediaUrls[0];
    const isVideo = firstUrl?.match(/\.(mp4|mov|avi|wmv|flv|mkv|webm)$/i) !== null;
    const isImage = firstUrl?.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i) !== null;
    
    return { url: firstUrl, isVideo, isImage };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">My Listings</h2>
            <p className="text-sm text-gray-600 mt-1">Manage all your listings in one place</p>
            
            {/* Status Stats */}
            <div className="flex flex-wrap gap-2 mt-3">
              {totalListings > 0 && (
                <div className="flex items-center">
                  <span className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    📦 {totalListings} Total
                  </span>
                </div>
              )}
              {activeCount > 0 && (
                <div className="flex items-center">
                  <span className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    🟢 {activeCount} Active
                  </span>
                </div>
              )}
              {inactiveCount > 0 && (
                <div className="flex items-center">
                  <span className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                    ⚫ {inactiveCount} Inactive
                  </span>
                </div>
              )}
              {draftCount > 0 && (
                <div className="flex items-center">
                  <span className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                    📝 {draftCount} Draft
                  </span>
                </div>
              )}
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
                <option value="">All Listings</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
              className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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
      
      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your listings...</p>
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 text-gray-300">🏠</div>
            <h3 className="text-lg font-medium text-gray-900">No listings found</h3>
            <p className="mt-2 text-gray-500 mb-6">
              {statusFilter 
                ? `You don't have any ${statusFilter} listings.`
                : "You haven't created any listings yet."}
            </p>
            <button
              onClick={onCreateListing}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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
              {listings.map((listing) => {
                const { url: mediaUrl, isVideo, isImage } = getFirstMediaUrl(listing);
                const isProcessing = actionLoading === listing._id;
                const isToggleProcessing = isProcessing;
                const toggleButton = getToggleButtonText(listing.status);
                const statusColor = getStatusColor(listing.status);
                const listingStatus = getStatusText(listing.status);
                
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
                            <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                                <p className="text-sm font-medium text-purple-700">Video Content</p>
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
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3 group/status">
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${statusColor.bg} ${statusColor.text} ${statusColor.border} group-hover/status:shadow-md transition-shadow`}>
                          <span className="mr-1.5">{statusColor.icon}</span>
                          <span className="capitalize">{listingStatus}</span>
                        </div>
                      </div>
                      
                      {/* Price Tag */}
                      <div className="absolute bottom-3 left-3">
                        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1.5 rounded-lg shadow-md">
                          <p className="text-lg font-bold">{formatCurrency(listing.price)}</p>
                        </div>
                      </div>
                      
                      {/* View Button */}
                      {onViewListing && (
                        <div className="absolute bottom-3 right-3">
                          <button
                            onClick={() => onViewListing(listing._id)}
                            className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            View
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Listing Info */}
                    <div className="p-5">
                      <div className="mb-4">
                        <h3 
                          className="font-semibold text-gray-900 mb-2 truncate group-hover:text-blue-600 transition-colors cursor-pointer"
                          title={listing.title}
                          onClick={() => onViewListing && onViewListing(listing._id)}
                        >
                          {listing.title || 'Untitled Listing'}
                        </h3>
                        
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3" title={listing.description}>
                          {listing.description || 'No description provided'}
                        </p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${listing.category ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                              {listing.category || 'Uncategorized'}
                            </span>
                            {listing.views !== undefined && (
                              <span className="text-xs text-gray-500 flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {listing.views} views
                              </span>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            {formatDate(listing.updatedAt || listing.createdAt)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      {listing.tags && listing.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {listing.tags.slice(0, 3).map((tag, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-colors cursor-default"
                              title={tag}
                            >
                              #{tag}
                            </span>
                          ))}
                          {listing.tags.length > 3 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-200 text-gray-600 border border-gray-300">
                              +{listing.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="pt-4 border-t border-gray-100">
                        {confirmToggle === listing._id ? (
                          // Toggle Confirmation Dialog
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
                        ) : confirmDelete === listing._id ? (
                          // Delete Confirmation Dialog
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                            <p className="text-sm text-red-800 mb-2">
                              Are you sure you want to delete this listing? This action cannot be undone.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConfirmDelete(listing)}
                                disabled={isProcessing}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-50"
                              >
                                {isProcessing ? (
                                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  'Delete'
                                )}
                              </button>
                              <button
                                onClick={handleCancelDelete}
                                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Normal Action Buttons
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => onEditListing(listing)}
                              disabled={isProcessing}
                              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            
                            <button
                              onClick={() => handleToggleClick(listing)}
                              disabled={isProcessing || listing.status === 'sold'}
                              className={`${toggleButton.color} text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md`}
                              title={listing.status === 'sold' ? 'Sold listings cannot be toggled' : ''}
                            >
                              {isToggleProcessing ? (
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <>
                                  <span className="mr-1">{toggleButton.icon}</span>
                                  {toggleButton.text}
                                </>
                              )}
                            </button>
                            
                            <button
                              onClick={() => handleDeleteClick(listing)}
                              disabled={isProcessing}
                              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div className="text-sm text-gray-700">
                  Page <span className="font-semibold">{currentPage}</span> of{' '}
                  <span className="font-semibold">{totalPages}</span>
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
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                    {totalPages > 5 && (
                      <span className="px-3 py-2 text-gray-500">...</span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading || actionLoading !== null}
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