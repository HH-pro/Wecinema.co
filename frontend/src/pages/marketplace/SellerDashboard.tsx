import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { getSellerOrders, getReceivedOffers } from '../../api';
import axios from 'axios';
import { decodeToken } from '../../utilities/helperfFunction';

// UserListings Component
const UserListings = ({ userId: propUserId }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [userInfo, setUserInfo] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const API_BASE_URL = 'http://localhost:3000';

  // Enhanced token decoding function
  const getCurrentUserIdFromToken = () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      console.log('🔐 Token found:', !!token);
      
      if (!token) {
        console.log('❌ No token found in storage');
        return null;
      }

      // Try multiple decoding methods
      let tokenData;
      
      // Method 1: Use provided decodeToken function
      try {
        tokenData = decodeToken(token);
        console.log('✅ decodeToken result:', tokenData);
      } catch (decodeError) {
        console.warn('⚠️ decodeToken failed, trying manual decode:', decodeError);
        
        // Method 2: Manual JWT decoding
        try {
          const payload = token.split('.')[1];
          if (payload) {
            // Add padding if needed for base64 decode
            const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
            tokenData = JSON.parse(atob(paddedPayload));
            console.log('✅ Manual decode result:', tokenData);
          }
        } catch (manualError) {
          console.error('❌ Manual decoding failed:', manualError);
          
          // Method 3: Try to extract from localStorage directly
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              console.log('✅ User data from localStorage:', userData);
              return userData.id || userData._id || userData.userId;
            } catch (e) {
              console.error('❌ Failed to parse stored user:', e);
            }
          }
          return null;
        }
      }

      // Extract user ID from various possible locations in token
      const userId = tokenData?.userId || tokenData?.id || tokenData?.user?.id || 
                    tokenData?.user?._id || tokenData?.user_id || tokenData?.sub ||
                    tokenData?.user?.userId || tokenData?.user?._id;
      
      console.log('👤 Extracted user ID:', userId);
      
      if (!userId) {
        console.warn('⚠️ No user ID found in token data:', tokenData);
      }
      
      return userId;
    } catch (error) {
      console.error('❌ Error in getCurrentUserIdFromToken:', error);
      return null;
    }
  };

  // Determine which userId to use
  const getTargetUserId = () => {
    const targetId = propUserId || currentUserId;
    console.log('🎯 Target user ID:', targetId);
    return targetId;
  };

  // Check if current user is viewing their own profile
  const checkIfCurrentUser = (targetUserId) => {
    const isCurrent = currentUserId === targetUserId;
    console.log('🔍 Is current user:', isCurrent);
    return isCurrent;
  };

  // Enhanced listings fetch function with better error handling
  const fetchListings = async (page = 1, status = '') => {
    const targetUserId = getTargetUserId();
    
    console.log('📡 Fetching listings for user:', targetUserId);
    console.log('👤 Current user ID:', currentUserId);
    
    if (!targetUserId) {
      const errorMsg = 'Please login to view listings';
      console.log('❌', errorMsg);
      setError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      console.log('🔑 Token available for API call:', !!token);
      
      const headers = token ? { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : {};

      console.log('🌐 Making API call to:', `${API_BASE_URL}/marketplace/listings/user/${targetUserId}/listings`);
      
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/user/${targetUserId}/listings`,
        {
          params: { 
            page, 
            limit: pagination.limit, 
            status: status || undefined 
          },
          headers,
          timeout: 15000,
          withCredentials: true
        }
      );
      
      console.log('✅ API Response success:', response.data.success);
      console.log('📊 Listings count:', response.data.listings?.length);
      
      if (response.data.success) {
        setListings(response.data.listings || []);
        setUserInfo(response.data.user);
        setPagination(response.data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        });
        setSelectedStatus(status);
        
        const isOwnProfile = checkIfCurrentUser(targetUserId);
        setIsCurrentUser(isOwnProfile);
        
        console.log('🎉 Listings fetched successfully');
      } else {
        const errorMsg = response.data.error || 'Failed to load listings';
        console.error('❌ API returned error:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('💥 API call failed:', err);
      
      let errorMessage = 'Failed to load listings';
      
      if (err.response) {
        console.error('🚨 Server response error:', err.response.status, err.response.data);
        errorMessage = err.response.data?.error || `Server error: ${err.response.status}`;
        
        // Handle specific error cases
        if (err.response.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
          // Clear invalid token
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          localStorage.removeItem('currentUserId');
        } else if (err.response.status === 403) {
          errorMessage = 'You do not have permission to view these listings.';
        } else if (err.response.status === 404) {
          errorMessage = 'User listings not found.';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (err.request) {
        console.error('🌐 Network error:', err.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Delete listing function (only for current user)
  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers = token ? { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : {};

      await axios.delete(
        `${API_BASE_URL}/marketplace/listings/${listingId}`,
        { headers }
      );

      fetchListings(pagination.page, selectedStatus);
      alert('Listing deleted successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete listing');
    }
  };

  // Edit listing function (only for current user)
  const handleEditListing = (listingId) => {
    window.location.href = `/edit-listing/${listingId}`;
  };

  // Enhanced useEffect with comprehensive initialization
  useEffect(() => {
    console.log('🚀 UserListings component mounted');
    console.log('📦 Prop userId:', propUserId);
    
    const initializeUser = async () => {
      const userIdFromToken = getCurrentUserIdFromToken();
      console.log('👤 User ID from token:', userIdFromToken);
      
      setCurrentUserId(userIdFromToken);

      if (userIdFromToken || propUserId) {
        console.log('✅ User ID available, fetching listings...');
        await fetchListings();
      } else {
        console.log('❌ No user ID available');
        setLoading(false);
        setError('Please login to view listings');
      }
    };

    initializeUser();
  }, [propUserId]);

  // Pagination handler
  const handlePageChange = (newPage) => {
    console.log('📄 Changing page to:', newPage);
    fetchListings(newPage, selectedStatus);
  };

  // Status filter handler
  const handleStatusFilter = (status) => {
    console.log('🔧 Filtering by status:', status);
    fetchListings(1, status);
  };

  // Debug info component (remove in production)
  const DebugInfo = () => (
    <div className="bg-gray-100 p-4 rounded-lg mb-4 text-xs border border-gray-300">
      <h4 className="font-bold mb-2 text-gray-700">Debug Information:</h4>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="font-semibold">Current User ID:</span> 
          <span className={currentUserId ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
            {currentUserId || 'Not available'}
          </span>
        </div>
        <div>
          <span className="font-semibold">Target User ID:</span> 
          <span className="text-blue-600 ml-2">{getTargetUserId() || 'Not available'}</span>
        </div>
        <div>
          <span className="font-semibold">Is Current User:</span> 
          <span className={isCurrentUser ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
            {isCurrentUser ? 'Yes' : 'No'}
          </span>
        </div>
        <div>
          <span className="font-semibold">Listings Count:</span> 
          <span className="text-purple-600 ml-2">{listings.length}</span>
        </div>
        <div>
          <span className="font-semibold">Loading:</span> 
          <span className={loading ? "text-yellow-600 ml-2" : "text-green-600 ml-2"}>
            {loading ? 'Yes' : 'No'}
          </span>
        </div>
        <div>
          <span className="font-semibold">Selected Status:</span> 
          <span className="text-blue-600 ml-2">{selectedStatus || 'All'}</span>
        </div>
      </div>
    </div>
  );

  // Loading state with better UX
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 flex-col">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
        <span className="text-lg text-gray-600">Loading listings...</span>
        <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your data</p>
      </div>
    );
  }

  // Error state with retry option
  if (error && listings.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 bg-white rounded-lg shadow border border-gray-200 px-6">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-2xl font-semibold text-gray-700 mb-3">
          Unable to Load Listings
        </h3>
        <p className="text-gray-500 text-lg mb-6 leading-relaxed">
          {error}
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          {!currentUserId ? (
            <button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-md"
            >
              Login to Continue
            </button>
          ) : (
            <button 
              onClick={() => fetchListings()}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-md"
            >
              Try Again
            </button>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-md"
          >
            Refresh Page
          </button>
        </div>
        
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && <DebugInfo />}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && <DebugInfo />}

      {/* User Info Section */}
      {userInfo && (
        <div className="mb-8 p-6 bg-white rounded-xl shadow-md border border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-gray-800">
                  {userInfo.username}'s Listings
                </h1>
                {isCurrentUser && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium border border-blue-200">
                    Your Profile
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-lg">
                Total {pagination.total} listings found • {pagination.pages} pages
              </p>
            </div>
            
            <div className="flex gap-3 flex-wrap">
              {/* Add New Listing Button (only for current user) */}
              {isCurrentUser && (
                <button
                  onClick={() => window.location.href = '/create-listing'}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center shadow-md hover:shadow-lg"
                >
                  <span className="mr-2 text-lg">+</span> Add New Listing
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="mb-8 p-5 bg-gray-50 rounded-xl border border-gray-200">
        <h3 className="font-semibold mb-4 text-gray-700 text-lg">Filter by Status:</h3>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: '', label: 'All Listings', color: 'blue' },
            { key: 'active', label: 'Active', color: 'green' },
            { key: 'sold', label: 'Sold', color: 'orange' },
            { key: 'draft', label: 'Draft', color: 'gray' },
            { key: 'inactive', label: 'Inactive', color: 'red' }
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => handleStatusFilter(key)}
              className={`px-5 py-2.5 rounded-lg transition-all duration-200 font-medium border ${
                selectedStatus === key 
                  ? `bg-${color}-500 text-white border-${color}-500 shadow-md` 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Error message when listings exist but there's an error */}
      {error && listings.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center">
            <span className="text-yellow-600 mr-3 text-xl">⚠️</span>
            <div>
              <p className="text-yellow-800 font-medium">Notice</p>
              <p className="text-yellow-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {listings.map((listing) => (
          <ListingCard 
            key={listing._id} 
            listing={listing} 
            isCurrentUser={isCurrentUser}
            onEdit={handleEditListing}
            onDelete={handleDeleteListing}
          />
        ))}
      </div>

      {/* Empty State */}
      {listings.length === 0 && !error && (
        <div className="text-center py-20 bg-white rounded-xl shadow border border-gray-200 max-w-2xl mx-auto">
          <div className="text-7xl mb-6">🏠</div>
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">
            No listings found
          </h3>
          <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto leading-relaxed">
            {selectedStatus 
              ? `No ${selectedStatus} listings available at the moment.` 
              : 'No listings available yet. Start by creating your first listing!'
            }
          </p>
          {isCurrentUser && (
            <button
              onClick={() => window.location.href = '/create-listing'}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg text-lg"
            >
              Create Your First Listing
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex flex-col items-center gap-6 mt-12">
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-5 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center font-medium border border-gray-300"
            >
              ← Previous
            </button>
            
            <div className="flex gap-1 mx-4">
              {[...Array(Math.min(5, pagination.pages))].map((_, index) => {
                const pageNum = pagination.page <= 3 
                  ? index + 1 
                  : pagination.page >= pagination.pages - 2 
                    ? pagination.pages - 4 + index 
                    : pagination.page - 2 + index;
                
                if (pageNum < 1 || pageNum > pagination.pages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium border ${
                      pagination.page === pageNum
                        ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="px-5 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center font-medium border border-gray-300"
            >
              Next →
            </button>
          </div>
          
          {/* Pagination Info */}
          <div className="text-center text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            Page {pagination.page} of {pagination.pages} • 
            Showing {listings.length} of {pagination.total} items
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Listing Card Component with Video Support
const ListingCard = ({ listing, isCurrentUser, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Check if media is video
  const isVideo = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.m3u8'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // Get first media URL
  const firstMediaUrl = listing.mediaUrls && listing.mediaUrls.length > 0 ? listing.mediaUrls[0] : null;

  // Handle image load
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
      {/* Action Buttons (only for current user) */}
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

      {/* Media Display - Image or Video */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {firstMediaUrl ? (
          isVideo(firstMediaUrl) ? (
            // Video Player
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
            // Image with error handling
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
          // No media fallback
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center">
              <span className="text-gray-400 text-4xl mb-2 block">🏠</span>
              <span className="text-gray-500 text-sm">No media</span>
            </div>
          </div>
        )}
        
        {/* Status Badge */}
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

        {/* Media Count Badge */}
        {listing.mediaUrls && listing.mediaUrls.length > 1 && (
          <div className="absolute top-3 left-3">
            <span className="bg-black bg-opacity-70 text-white px-2.5 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border border-white border-opacity-20">
              📸 {listing.mediaUrls.length}
            </span>
          </div>
        )}

        {/* Price Overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg backdrop-blur-sm border border-white border-opacity-20">
            <span className="text-lg font-bold">₹{listing.price?.toLocaleString() || '0'}</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-bold text-lg mb-2 line-clamp-2 h-14 overflow-hidden text-gray-800 group-hover:text-blue-600 transition-colors">
          {listing.title || 'Untitled Listing'}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-3 line-clamp-2 h-10 overflow-hidden leading-relaxed">
          {listing.description || 'No description available'}
        </p>

        {/* Category and Condition */}
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

        {/* Tags */}
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

        {/* Seller Info */}
        {listing.sellerId && (
          <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 flex-1">
              {listing.sellerId.avatar ? (
                <img
                  src={listing.sellerId.avatar}
                  alt={listing.sellerId.username}
                  className="w-6 h-6 rounded-full object-cover border border-gray-300"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
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

        {/* Dates */}
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

// Original SellerDashboard Interfaces
interface Order {
  _id: string;
  amount: number;
  status: string;
  createdAt: string;
  buyerId: {
    username: string;
    avatar?: string;
  };
  listingId?: {
    title: string;
    price: number;
  };
}

interface Offer {
  _id: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  buyerId: {
    username: string;
    avatar?: string;
  };
  listingId: {
    _id: string;
    title: string;
    price: number;
  };
  message?: string;
}

type TabType = 'overview' | 'offers' | 'listings';

const SellerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [listingsData, setListingsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [error, setError] = useState<string>('');

  // Stats calculation - ab listings data bhi include hai
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const totalRevenue = orders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + order.amount, 0);
  const pendingOffers = offers.filter(offer => offer.status === 'pending').length;
  
  // Listings stats
  const totalListings = listingsData?.listings?.length || 0;
  const activeListings = listingsData?.listings?.filter((listing: any) => listing.status === 'active').length || 0;
  const soldListings = listingsData?.listings?.filter((listing: any) => listing.status === 'sold').length || 0;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get current user ID for listings
      const getCurrentUserIdFromToken = () => {
        try {
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          if (token) {
            const tokenData = decodeToken(token);
            return tokenData?.userId || tokenData?.id || tokenData?.user?.id || tokenData?.user?._id;
          }
          return null;
        } catch (error) {
          console.error('Error getting user ID:', error);
          return null;
        }
      };

      const currentUserId = getCurrentUserIdFromToken();
      console.log('🔄 Fetching dashboard data for user:', currentUserId);

      // Fetch all data in parallel
      const [ordersResponse, offersResponse] = await Promise.all([
        getSellerOrders(setLoading).catch(err => {
          console.error('Error fetching orders:', err);
          return [];
        }),
        getReceivedOffers(setLoading).catch(err => {
          console.error('Error fetching offers:', err);
          return [];
        })
      ]);

      // Fetch listings data if user is logged in
      let listingsResponse = null;
      if (currentUserId) {
        try {
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          
          listingsResponse = await axios.get(
            `http://localhost:3000/marketplace/listings/user/${currentUserId}/listings`,
            {
              params: { page: 1, limit: 1000 },
              headers,
              timeout: 10000
            }
          );
          console.log('✅ Listings fetched successfully');
        } catch (err) {
          console.log('⚠️ Listings fetch failed, continuing without listings data');
        }
      }

      const ordersData = Array.isArray(ordersResponse) 
        ? ordersResponse 
        : (ordersResponse?.data || []);
      
      const offersData = Array.isArray(offersResponse) 
        ? offersResponse 
        : (offersResponse?.data || []);

      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setOffers(Array.isArray(offersData) ? offersData : []);
      
      // Set listings data for stats
      if (listingsResponse?.data?.success) {
        setListingsData(listingsResponse.data);
      }

      console.log('✅ Dashboard data loaded successfully');
      console.log('📊 Orders:', ordersData.length);
      console.log('📊 Offers:', offersData.length);
      console.log('📊 Listings:', listingsResponse?.data?.listings?.length || 0);

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewListingDetails = (listingId: string) => {
    window.location.href = `/listings/${listingId}`;
  };

  const handleViewOrderDetails = (orderId: string) => {
    window.location.href = `/orders/${orderId}`;
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'reject') => {
    try {
      setError('');
      // Implement offer action logic here
      console.log(`🎯 ${action} offer:`, offerId);
      await fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error updating offer:', error);
      setError('Failed to update offer');
    }
  };

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'accepted': 
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sold':
      case 'shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected':
      case 'cancelled':
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Stat Card Component
  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color = 'blue',
    trend,
    onClick 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ReactNode; 
    color?: string;
    trend?: string;
    onClick?: () => void;
  }) => (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-blue-300 transform hover:-translate-y-1' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`text-xs font-medium mt-1 ${
              trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 bg-${color}-50 rounded-xl flex items-center justify-center border border-${color}-200`}>
          {icon}
        </div>
      </div>
    </div>
  );

  // Loading State
  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 font-medium">Loading dashboard...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we load your data</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your listings, offers, and track your sales performance</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-8 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'offers', label: 'Offers', icon: '💼', badge: pendingOffers },
                { id: 'listings', label: 'My Listings', icon: '🏠', badge: totalListings }
              ].map(({ id, label, icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as TabType)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-all duration-200 ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{icon}</span>
                  {label}
                  {badge > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(totalRevenue)}
                  icon="💰"
                  color="green"
                />
                <StatCard
                  title="Total Listings"
                  value={totalListings}
                  icon="🏠"
                  color="blue"
                  onClick={() => setActiveTab('listings')}
                />
                <StatCard
                  title="Active Listings"
                  value={activeListings}
                  icon="✅"
                  color="green"
                />
                <StatCard
                  title="Sold Listings"
                  value={soldListings}
                  icon="🛒"
                  color="orange"
                />
                <StatCard
                  title="Total Orders"
                  value={totalOrders}
                  icon="📦"
                  color="purple"
                />
                <StatCard
                  title="Pending Offers"
                  value={pendingOffers}
                  icon="💼"
                  color="yellow"
                  onClick={() => setActiveTab('offers')}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Orders */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                      <button 
                        onClick={() => window.location.href = '/orders'}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                      >
                        View All
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-6">
                      {orders.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-4">📦</div>
                          <p className="text-gray-500 font-medium">No orders yet</p>
                          <p className="text-sm text-gray-400 mt-1">When you receive orders, they'll appear here.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.slice(0, 5).map(order => (
                            <div key={order._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center border border-blue-200">
                                  <span className="text-sm font-medium text-blue-600">
                                    {order.buyerId?.username?.charAt(0).toUpperCase() || 'U'}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {order.listingId?.title || 'Unknown Listing'}
                                  </p>
                                  <p className="text-sm text-gray-500">{order.buyerId?.username || 'Unknown Buyer'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">{formatCurrency(order.amount || 0)}</p>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                  {order.status || 'unknown'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions & Tips */}
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      <button
                        onClick={() => window.location.href = '/create-listing'}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center shadow-md hover:shadow-lg"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Listing
                      </button>
                      <button
                        onClick={() => window.location.href = '/orders'}
                        className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        View All Orders
                      </button>
                    </div>
                  </div>

                  {/* Success Tips */}
                  <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tips for Success
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-2">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Upload high-quality photos of your items</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Write clear and detailed descriptions</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Respond quickly to buyer inquiries</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Price your items competitively</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Offers Tab */}
          {activeTab === 'offers' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Received Offers</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage and respond to offers from buyers</p>
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              <div className="p-6">
                {offers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">💼</div>
                    <h3 className="text-lg font-medium text-gray-900">No offers yet</h3>
                    <p className="mt-2 text-gray-500">When buyers make offers on your listings, they'll appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {offers.map(offer => (
                      <div key={offer._id} className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <h3 
                                className="text-lg font-medium text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
                                onClick={() => handleViewListingDetails(offer.listingId._id)}
                              >
                                {offer.listingId?.title || 'Unknown Listing'}
                              </h3>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(offer.status)}`}>
                                {offer.status ? offer.status.charAt(0).toUpperCase() + offer.status.slice(1) : 'Unknown'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600">Buyer</p>
                                <p className="font-medium text-gray-900">{offer.buyerId?.username || 'Unknown Buyer'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Original Price</p>
                                <p className="font-medium text-gray-900">{formatCurrency(offer.listingId?.price || 0)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Offer Amount</p>
                                <p className="font-medium text-green-600">{formatCurrency(offer.amount || 0)}</p>
                              </div>
                            </div>

                            {offer.message && (
                              <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-1">Buyer's Message</p>
                                <p className="text-gray-900 bg-gray-50 rounded-lg p-3 text-sm border border-gray-200">
                                  {offer.message}
                                </p>
                              </div>
                            )}

                            <div className="text-sm text-gray-500">
                              Received {formatDate(offer.createdAt)}
                            </div>
                          </div>
                        </div>

                        {offer.status === 'pending' && (
                          <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => handleOfferAction(offer._id, 'accept')}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                            >
                              Accept Offer
                            </button>
                            <button
                              onClick={() => handleOfferAction(offer._id, 'reject')}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                            >
                              Decline Offer
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Listings Tab */}
          {activeTab === 'listings' && (
            <UserListings />
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;