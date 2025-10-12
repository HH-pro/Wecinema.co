import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserListings = ({ userId }) => {
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

  // API Base URL - aapki backend URL yahan dalen
  const API_BASE_URL = 'http://localhost:5000/api'; // Change to your backend URL

  // Listings fetch karne ka function
  const fetchListings = async (page = 1, status = '') => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get(
        `${API_BASE_URL}/user/${userId}/listings`,
        {
          params: { 
            page, 
            limit: pagination.limit, 
            status: status || undefined 
          }
        }
      );

      if (response.data.success) {
        setListings(response.data.listings);
        setUserInfo(response.data.user);
        setPagination(response.data.pagination);
        setSelectedStatus(status);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load listings');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Component load hote hi data fetch karein
  useEffect(() => {
    if (userId) {
      fetchListings();
    }
  }, [userId]);

  // Pagination handle karein
  const handlePageChange = (newPage) => {
    fetchListings(newPage, selectedStatus);
  };

  // Status filter handle karein
  const handleStatusFilter = (status) => {
    fetchListings(1, status);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading listings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Error: </strong> {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* User Info Section */}
      {userInfo && (
        <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {userInfo.username}'s Listings
          </h1>
          <p className="text-gray-600 text-lg">
            Total {pagination.total} listings found
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">Filter by Status:</h3>
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
          <ListingCard key={listing._id} listing={listing} />
        ))}
      </div>

      {/* Empty State */}
      {listings.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No listings found
          </h3>
          <p className="text-gray-500">
            {selectedStatus ? `No ${selectedStatus} listings available` : 'No listings available'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {/* Pagination Info */}
      {pagination.total > 0 && (
        <div className="text-center mt-4 text-gray-600">
          Showing page {pagination.page} of {pagination.pages} • 
          Total {pagination.total} items
        </div>
      )}
    </div>
  );
};

// Individual Listing Card Component
const ListingCard = ({ listing }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200">
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
                : 'bg-gray-500 text-white'
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