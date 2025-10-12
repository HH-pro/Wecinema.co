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

// Improved Listing Card Component with Video Support
const ListingCard = ({ listing, isCurrentUser, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Check if media is video
  const isVideo = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // Get first media URL
  const firstMediaUrl = listing.mediaUrls && listing.mediaUrls.length > 0 ? listing.mediaUrls[0] : null;

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

      {/* Media Display - Image or Video */}
      <div className="relative">
        {firstMediaUrl ? (
          isVideo(firstMediaUrl) ? (
            // Video Player
            <div className="w-full h-48 bg-black flex items-center justify-center">
              <video 
                className="w-full h-full object-cover"
                controls
                muted
                preload="metadata"
              >
                <source src={firstMediaUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
                <span className="text-white text-xs">🎥</span>
              </div>
            </div>
          ) : (
            // Image with error handling
            <div className="w-full h-48 bg-gray-100 overflow-hidden">
              <img
                src={firstMediaUrl}
                alt={listing.title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
              {imageError && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-lg">📷 Image not available</span>
                </div>
              )}
            </div>
          )
        ) : (
          // No media fallback
          <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-lg">📷 No Media</span>
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

        {/* Media Count Badge */}
        {listing.mediaUrls && listing.mediaUrls.length > 1 && (
          <div className="absolute top-2 left-2">
            <span className="bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
              📸 {listing.mediaUrls.length}
            </span>
          </div>
        )}
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
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs">
              👤
            </div>
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
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [error, setError] = useState<string>('');

  // Stats calculation
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const totalRevenue = orders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + order.amount, 0);
  const pendingOffers = offers.filter(offer => offer.status === 'pending').length;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [ordersResponse, offersResponse] = await Promise.all([
        getSellerOrders(setLoading),
        getReceivedOffers(setLoading)
      ]);

      const ordersData = Array.isArray(ordersResponse) 
        ? ordersResponse 
        : (ordersResponse?.data || []);
      
      const offersData = Array.isArray(offersResponse) 
        ? offersResponse 
        : (offersResponse?.data || []);

      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setOffers(Array.isArray(offersData) ? offersData : []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      setOrders([]);
      setOffers([]);
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
      await fetchDashboardData();
    } catch (error) {
      console.error('Error updating offer:', error);
      setError('Failed to update offer');
    }
  };

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Stat Card Component
  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color = 'gray',
    onClick 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ReactNode; 
    color?: string;
    onClick?: () => void;
  }) => (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer hover:border-yellow-300' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  // Loading State
  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
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
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-yellow-600 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('offers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'offers'
                    ? 'border-yellow-600 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Offers
                {pendingOffers > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {pendingOffers}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('listings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'listings'
                    ? 'border-yellow-600 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Listings
              </button>
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(totalRevenue)}
                  icon={<span className="text-green-600 text-lg font-semibold">$</span>}
                  color="green"
                />
                <StatCard
                  title="Total Orders"
                  value={totalOrders}
                  icon={
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  }
                  color="purple"
                />
                <StatCard
                  title="Pending Orders"
                  value={pendingOrders}
                  icon={
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  color="yellow"
                />
                <StatCard
                  title="Pending Offers"
                  value={pendingOffers}
                  icon={
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  color="blue"
                  onClick={() => setActiveTab('offers')}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Orders */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                      <button 
                        onClick={() => window.location.href = '/orders'}
                        className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                      >
                        View All
                      </button>
                    </div>
                    <div className="p-6">
                      {orders.length === 0 ? (
                        <div className="text-center py-8">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          <p className="mt-4 text-gray-500">No orders yet</p>
                          <p className="text-sm text-gray-400">When you receive orders, they'll appear here.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.slice(0, 5).map(order => (
                            <div key={order._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">
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
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
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

                {/* Quick Actions */}
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      <button
                        onClick={() => window.location.href = '/create-listing'}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
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
                  <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
                    <h3 className="text-sm font-semibold text-yellow-900 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tips for Success
                    </h3>
                    <ul className="text-sm text-yellow-700 space-y-2">
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
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Offers Tab */}
          {activeTab === 'offers' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Received Offers</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage and respond to offers from buyers</p>
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
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
                    <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No offers yet</h3>
                    <p className="mt-2 text-gray-500">When buyers make offers on your listings, they'll appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {offers.map(offer => (
                      <div key={offer._id} className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <h3 
                                className="text-lg font-medium text-gray-900 hover:text-yellow-600 cursor-pointer"
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
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                            >
                              Accept Offer
                            </button>
                            <button
                              onClick={() => handleOfferAction(offer._id, 'reject')}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
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

          {/* Listings Tab - Ab sirf UserListings component show hoga */}
          {activeTab === 'listings' && (
            <UserListings />
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;