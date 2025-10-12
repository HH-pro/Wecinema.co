import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { decodeToken } from '../../utilities/helperfFunction';

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

  // API Base URL
  const API_BASE_URL = 'http://localhost:3000';

  console.log('🔍 Component rendered with propUserId:', propUserId);

  // Token se current user ID nikalne ka function
  const getCurrentUserIdFromToken = () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      console.log('🔍 Token found:', !!token);
      if (token) {
        const tokenData = decodeToken(token);
        console.log('🔍 Decoded token data:', tokenData);
        
        // Different possible fields where userId might be stored in token
        const userId = tokenData?.userId || tokenData?.id || tokenData?.user?.id || tokenData?.user?._id;
        console.log('🔍 Extracted userId:', userId);
        return userId;
      }
      return null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Determine which userId to use
  const getTargetUserId = () => {
    // If propUserId is provided, use that (viewing other user's profile)
    // Otherwise use current user's ID from token (viewing own profile)
    const targetUserId = propUserId || currentUserId;
    console.log('🎯 Target UserId:', targetUserId);
    return targetUserId;
  };

  // Check if current user is viewing their own profile
  const checkIfCurrentUser = (targetUserId) => {
    console.log('🔍 Checking if current user - Current:', currentUserId, 'Target:', targetUserId);
    return currentUserId === targetUserId;
  };

  // Listings fetch karne ka function
  const fetchListings = async (page = 1, status = '') => {
    const targetUserId = getTargetUserId();
    
    if (!targetUserId) {
      console.log('❌ No target userId available');
      setError('User ID not available. Please login again.');
      setLoading(false);
      return;
    }

    try {
      console.log('🚀 Starting fetchListings...');
      console.log('🔍 Target UserId:', targetUserId);
      console.log('🔍 URL:', `${API_BASE_URL}/marketplace/listings/user/${targetUserId}/listings`);
      console.log('🔍 Params:', { page, limit: pagination.limit, status });
      
      setLoading(true);
      setError('');
      
      // Token header mein add karen
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      console.log('🔍 Headers:', headers);

      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/user/${targetUserId}/listings`,
        {
          params: { 
            page, 
            limit: pagination.limit, 
            status: status || undefined 
          },
          headers,
          timeout: 10000
        }
      );

      console.log('✅ API Response received:', response.data);
      
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
        
        // Check if current user is viewing their own profile
        const isOwnProfile = checkIfCurrentUser(targetUserId);
        setIsCurrentUser(isOwnProfile);
        
        console.log('✅ Listings set:', response.data.listings?.length || 0, 'items');
        console.log('✅ User info set:', response.data.user);
        console.log('✅ Pagination set:', response.data.pagination);
        console.log('✅ Is Current User:', isOwnProfile);
      } else {
        console.log('❌ API success false:', response.data);
        setError(response.data.error || 'API returned success: false');
      }
    } catch (err) {
      console.error('❌ Error in fetchListings:', err);
      console.error('❌ Error response:', err.response);
      
      let errorMessage = 'Failed to load listings';
      
      if (err.response) {
        errorMessage = err.response.data?.error || `Server error: ${err.response.status}`;
        console.log('❌ Server error details:', err.response.data);
      } else if (err.request) {
        errorMessage = 'No response from server. Check if backend is running.';
        console.log('❌ No response received');
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      console.log('🏁 fetchListings completed, setting loading to false');
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
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.delete(
        `${API_BASE_URL}/marketplace/listings/${listingId}`,
        { headers }
      );

      // Refresh listings after deletion
      fetchListings(pagination.page, selectedStatus);
      alert('Listing deleted successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete listing');
      console.error('Error deleting listing:', err);
    }
  };

  // Edit listing function (only for current user)
  const handleEditListing = (listingId) => {
    window.location.href = `/edit-listing/${listingId}`;
  };

  // Component load hote hi current userId set karen aur data fetch karein
  useEffect(() => {
    console.log('🔄 useEffect triggered');
    
    // Get current user ID from token
    const userIdFromToken = getCurrentUserIdFromToken();
    console.log('🔄 UserId from token:', userIdFromToken);
    
    setCurrentUserId(userIdFromToken);

    if (userIdFromToken || propUserId) {
      console.log('🔄 Calling fetchListings...');
      fetchListings();
    } else {
      console.log('❌ No userId available');
      setLoading(false);
      setError('Please login to view listings');
    }
  }, [propUserId]); // propUserId change hone par re-fetch

  // Pagination handle karein
  const handlePageChange = (newPage) => {
    fetchListings(newPage, selectedStatus);
  };

  // Status filter handle karein
  const handleStatusFilter = (status) => {
    fetchListings(1, status);
  };

  // Refresh data
  const handleRefresh = () => {
    fetchListings(pagination.page, selectedStatus);
  };

  // Temporary debug button
  const debugInfo = () => {
    console.log('=== DEBUG INFO ===');
    console.log('propUserId:', propUserId);
    console.log('currentUserId:', currentUserId);
    console.log('targetUserId:', getTargetUserId());
    console.log('loading:', loading);
    console.log('error:', error);
    console.log('listings count:', listings.length);
    console.log('userInfo:', userInfo);
    console.log('pagination:', pagination);
    console.log('isCurrentUser:', isCurrentUser);
    
    // Token info
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    console.log('token exists:', !!token);
    if (token) {
      try {
        const tokenData = decodeToken(token);
        console.log('full token data:', tokenData);
      } catch (e) {
        console.log('token decode error:', e);
      }
    }
    console.log('=== END DEBUG ===');
  };

  if (loading) {
    console.log('🔄 Rendering loading state...');
    return (
      <div className="flex justify-center items-center py-12 flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-lg mt-3">Loading listings...</span>
        <div className="mt-4 flex gap-2">
          <button 
            onClick={debugInfo}
            className="bg-gray-500 text-white px-4 py-2 rounded text-sm"
          >
            Debug Info
          </button>
          <button 
            onClick={handleRefresh}
            className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('❌ Rendering error state:', error);
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mx-4 my-8">
        <div className="flex items-center">
          <span className="text-xl mr-3">⚠️</span>
          <div>
            <strong className="font-bold">Error: </strong> 
            {error}
          </div>
        </div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button 
            onClick={handleRefresh} 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
          <button 
            onClick={debugInfo}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Debug Info
          </button>
          {!currentUserId && (
            <button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </div>
    );
  }

  console.log('✅ Rendering main content with', listings.length, 'listings');
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Debug Button */}
      <button 
        onClick={debugInfo}
        className="fixed top-4 right-4 bg-gray-800 text-white px-3 py-1 rounded text-sm z-50"
      >
        Debug
      </button>

      {/* User Info Section */}
      {userInfo && (
        <div className="mb-6 p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {userInfo.username}'s Listings
                {isCurrentUser && (
                  <span className="ml-3 text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    Your Profile
                  </span>
                )}
              </h1>
              <p className="text-gray-600 text-lg">
                Total {pagination.total} listings found
              </p>
              <p className="text-gray-500 text-sm mt-1">
                User ID: {getTargetUserId()}
              </p>
            </div>
            
            <div className="flex gap-3">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center"
              >
                🔄 Refresh
              </button>
              
              {/* Add New Listing Button (only for current user) */}
              {isCurrentUser && (
                <button
                  onClick={() => window.location.href = '/create-listing'}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center"
                >
                  <span className="mr-2">+</span> Add New Listing
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold mb-3 text-gray-700">Filter by Status:</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleStatusFilter('')}
            className={`px-4 py-2 rounded transition-colors ${
              selectedStatus === '' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            All Listings
          </button>
          <button
            onClick={() => handleStatusFilter('active')}
            className={`px-4 py-2 rounded transition-colors ${
              selectedStatus === 'active' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => handleStatusFilter('sold')}
            className={`px-4 py-2 rounded transition-colors ${
              selectedStatus === 'sold' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Sold
          </button>
          <button
            onClick={() => handleStatusFilter('draft')}
            className={`px-4 py-2 rounded transition-colors ${
              selectedStatus === 'draft' 
                ? 'bg-gray-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Draft
          </button>
        </div>
      </div>

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
      {listings.length === 0 && (
        <div className="text-center py-16 bg-white rounded-lg shadow border border-gray-200">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-2xl font-semibold text-gray-700 mb-3">
            No listings found
          </h3>
          <p className="text-gray-500 text-lg mb-6">
            {selectedStatus ? `No ${selectedStatus} listings available` : 'No listings available yet'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRefresh}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Refresh
            </button>
            {isCurrentUser && (
              <button
                onClick={() => window.location.href = '/create-listing'}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Create Your First Listing
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            ← Previous
          </button>
          
          <div className="flex gap-1">
            {[...Array(pagination.pages)].map((_, index) => (
              <button
                key={index + 1}
                onClick={() => handlePageChange(index + 1)}
                className={`px-4 py-2 rounded transition-colors ${
                  pagination.page === index + 1
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            Next →
          </button>
        </div>
      )}

      {/* Pagination Info */}
      {pagination.total > 0 && (
        <div className="text-center mt-4 text-gray-600">
          Page {pagination.page} of {pagination.pages} • 
          Showing {listings.length} of {pagination.total} items
        </div>
      )}
    </div>
  );
};

// Individual Listing Card Component (same as before)
const ListingCard = ({ listing, isCurrentUser, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Action Buttons (only for current user) */}
      {isCurrentUser && showActions && (
        <div className="absolute top-2 left-2 flex gap-2 z-10">
          <button
            onClick={() => onEdit(listing._id)}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-colors"
            title="Edit Listing"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(listing._id)}
            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
            title="Delete Listing"
          >
            🗑️
          </button>
        </div>
      )}

      {/* Listing Image */}
      <div className="relative">
        {listing.mediaUrls && listing.mediaUrls.length > 0 ? (
          <img
            src={listing.mediaUrls[0]}
            alt={listing.title}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-lg">📷 No Image</span>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              listing.status === 'active'
                ? 'bg-green-500 text-white'
                : listing.status === 'sold'
                ? 'bg-orange-500 text-white'
                : listing.status === 'draft'
                ? 'bg-gray-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {listing.status?.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Title */}
        <h3 className="font-bold text-lg mb-2 line-clamp-2 h-14 overflow-hidden">
          {listing.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-3 line-clamp-2 h-10 overflow-hidden">
          {listing.description || 'No description available'}
        </p>

        {/* Price */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-xl font-bold text-green-600">
            ₹{listing.price?.toLocaleString() || '0'}
          </span>
          
          {/* Category */}
          {listing.category && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              {listing.category}
            </span>
          )}
        </div>

        {/* Tags */}
        {listing.tags && listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {listing.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
              >
                #{tag}
              </span>
            ))}
            {listing.tags.length > 3 && (
              <span className="text-gray-500 text-xs">+{listing.tags.length - 3} more</span>
            )}
          </div>
        )}

        {/* Seller Info */}
        {listing.sellerId && (
          <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
            {listing.sellerId.avatar ? (
              <img
                src={listing.sellerId.avatar}
                alt={listing.sellerId.username}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                👤
              </div>
            )}
            <span className="text-sm text-gray-600 font-medium">
              {listing.sellerId.username}
            </span>
          </div>
        )}

        {/* Created Date */}
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>
            Created: {new Date(listing.createdAt).toLocaleDateString()}
          </span>
          <span>
            Updated: {new Date(listing.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UserListings;