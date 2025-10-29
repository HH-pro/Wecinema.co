import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUserIdFromToken } from '../../utilities/helperfFunction';
import ListingCard from './ListingCard';

interface User {
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
  sellerId: User;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface UserListingsProps {
  userId?: string;
}

const API_BASE_URL = 'http://localhost:3000';

const UserListings: React.FC<UserListingsProps> = ({ userId: propUserId }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const getTargetUserId = (): string | null => {
    return propUserId || currentUserId;
  };

  const checkIfCurrentUser = (targetUserId: string | null): boolean => {
    return currentUserId === targetUserId;
  };

  const fetchListings = async (page = 1, status = '') => {
    const targetUserId = getTargetUserId();
    
    if (!targetUserId) {
      setError('Please login to view listings');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers = token ? { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : {};

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
        setIsCurrentUser(checkIfCurrentUser(targetUserId));
      } else {
        setError(response.data.error || 'Failed to load listings');
      }
    } catch (err: any) {
      let errorMessage = 'Failed to load listings';
      
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        } else if (err.response.status === 403) {
          errorMessage = 'You do not have permission to view these listings.';
        } else if (err.response.status === 404) {
          errorMessage = 'User listings not found.';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = err.response.data?.error || `Server error: ${err.response.status}`;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
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
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete listing');
    }
  };

  const handleEditListing = (listingId: string) => {
    window.location.href = `/edit-listing/${listingId}`;
  };

  useEffect(() => {
    const initializeUser = async () => {
      const userIdFromToken = getCurrentUserIdFromToken();
      setCurrentUserId(userIdFromToken);

      if (userIdFromToken || propUserId) {
        await fetchListings();
      } else {
        setLoading(false);
        setError('Please login to view listings');
      }
    };

    initializeUser();
  }, [propUserId]);

  const handlePageChange = (newPage: number) => {
    fetchListings(newPage, selectedStatus);
  };

  const handleStatusFilter = (status: string) => {
    fetchListings(1, status);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 flex-col">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
        <span className="text-lg text-gray-600">Loading listings...</span>
      </div>
    );
  }

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
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
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
      )}

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
          
          <div className="text-center text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            Page {pagination.page} of {pagination.pages} • 
            Showing {listings.length} of {pagination.total} items
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListings;