// src/components/marketplace/seller/ListingsTab.tsx - UPDATED STYLING
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
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-50 text-green-700 ring-1 ring-green-600/20';
      case 'inactive': return 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20';
      case 'sold': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20';
      case 'draft': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20';
      default: return 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'active': return '🟢';
      case 'inactive': return '⚫';
      case 'sold': return '💰';
      case 'draft': return '📝';
      default: return '📄';
    }
  };

  const getStatusText = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getToggleButtonText = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'active': return 'Deactivate';
      case 'inactive': return 'Activate';
      case 'draft': return 'Publish';
      default: return 'Toggle';
    }
  };

  const getToggleButtonColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200';
      case 'inactive': return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200';
      case 'draft': return 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200';
    }
  };

  const isVideoUrl = (url: string): boolean => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm'];
    const urlLower = url.toLowerCase();
    return videoExtensions.some(ext => urlLower.endsWith(ext));
  };

  const getFirstMediaUrl = (mediaUrls: string[]): string => {
    if (!mediaUrls || mediaUrls.length === 0) return '';
    return mediaUrls[0];
  };

  const listings = listingsData?.listings || [];
  const pagination = listingsData?.pagination;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">My Listings</h2>
            <p className="text-sm text-gray-500 mt-1.5">Manage and monitor all your property listings</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer pr-10 min-w-[140px]"
              >
                <option value="">📊 All Status</option>
                <option value="active">🟢 Active</option>
                <option value="inactive">⚫ Inactive</option>
                <option value="draft">📝 Draft</option>
                <option value="sold">💰 Sold</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {/* Create Listing Button */}
            <button
              onClick={onCreateListing}
              className="inline-flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Listing
            </button>
            
            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={loading || actionLoading !== null}
              className="inline-flex items-center gap-2.5 px-5 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-8">
        {listings.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-6">
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No listings found</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-8">
              {statusFilter 
                ? `You don't have any ${statusFilter} listings.`
                : "Start your journey by creating your first listing."}
            </p>
            <button
              onClick={onCreateListing}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Listing
            </button>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Listings</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{pagination?.total || listings.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-700">Active</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {listings.filter(l => l.status === 'active').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🟢</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-700">Drafts</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {listings.filter(l => l.status === 'draft').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📝</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-violet-700">Total Views</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {listings.reduce((sum, listing) => sum + (listing.views || 0), 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">👁️</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {listings.map(listing => {
                const mediaUrl = getFirstMediaUrl(listing.mediaUrls);
                const isVideo = isVideoUrl(mediaUrl);
                const isProcessing = actionLoading?.includes(listing._id);
                const toggleText = getToggleButtonText(listing.status);
                const statusText = getStatusText(listing.status);
                const statusIcon = getStatusIcon(listing.status);
                
                return (
                  <div key={listing._id} className="group border border-gray-200 rounded-2xl overflow-hidden hover:border-blue-300 hover:shadow-xl transition-all duration-300">
                    {/* Media Thumbnail */}
                    <div className="h-52 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                      {mediaUrl ? (
                        isVideo ? (
                          <div 
                            className="relative w-full h-full cursor-pointer"
                            onClick={() => onPlayVideo(mediaUrl, listing.title)}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 group-hover:scale-105 transition-transform duration-300"></div>
                            <div className="w-full h-full bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
                              <div className="text-center relative">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                                <p className="text-sm font-medium text-purple-700 mt-3">Click to play video</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-full h-full overflow-hidden">
                            <img
                              src={mediaUrl}
                              alt={listing.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mb-3 mx-auto">
                              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-500">No Image Available</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-4 right-4">
                        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(listing.status)}`}>
                          {statusIcon} {statusText}
                        </span>
                      </div>
                      
                      {/* Type Badge */}
                      <div className="absolute top-4 left-4">
                        <span className="inline-flex items-center px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-gray-700">
                          {listing.type}
                        </span>
                      </div>
                    </div>
                    
                    {/* Listing Info */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-bold text-lg text-gray-900 truncate flex-1" title={listing.title}>
                          {listing.title}
                        </h3>
                        <div className="text-right ml-4">
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(listing.price)}</p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]" title={listing.description}>
                        {listing.description}
                      </p>
                      
                      {/* Category and Views */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="inline-flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span className="text-sm font-medium text-gray-700">{listing.category}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-700">{listing.views || 0}</p>
                          <p className="text-xs text-gray-500">Views</p>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      {listing.tags && listing.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-5">
                          {listing.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-5 border-t border-gray-100">
                        {/* Edit Button */}
                        <button
                          onClick={() => onEditListing(listing)}
                          disabled={isProcessing}
                          className="flex-1 group/edit inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 font-semibold text-sm py-3 px-4 rounded-xl border border-blue-200 transition-all duration-200 hover:shadow-sm disabled:opacity-50"
                        >
                          <svg className="w-4.5 h-4.5 group-hover/edit:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        
                        {/* Toggle Status Button */}
                        <button
                          onClick={() => onToggleStatus(listing)}
                          disabled={isProcessing}
                          className={`flex-1 group/toggle inline-flex items-center justify-center gap-2 font-semibold text-sm py-3 px-4 rounded-xl border transition-all duration-200 hover:shadow-sm disabled:opacity-50 ${getToggleButtonColor(listing.status)}`}
                        >
                          <svg className="w-4.5 h-4.5 group-hover/toggle:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          {toggleText}
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => onDeleteListing(listing)}
                          disabled={isProcessing}
                          className="flex-1 group/delete inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-700 font-semibold text-sm py-3 px-4 rounded-xl border border-red-200 transition-all duration-200 hover:shadow-sm disabled:opacity-50"
                        >
                          <svg className="w-4.5 h-4.5 group-hover/delete:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                      
                      {/* Last Updated */}
                      <div className="text-xs text-gray-500 mt-4 flex items-center">
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Updated {formatDate(listing.updatedAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center items-center space-x-4">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading || actionLoading !== null}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                
                <div className="flex items-center gap-2">
                  {[...Array(pagination.pages)].map((_, index) => {
                    const pageNum = index + 1;
                    const isCurrent = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        disabled={loading || actionLoading !== null}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 ${
                          isCurrent 
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === pagination.pages || loading || actionLoading !== null}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ListingsTab;