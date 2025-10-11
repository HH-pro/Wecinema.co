import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { getSellerOrders, getReceivedOffers,getRequest } from '../../api';
import { decodeToken } from '../../utilities/helperfFunction'; // Your token decoder
import axios from 'axios'; // Direct axios import

interface Listing {
  _id: string;
  title: string;
  price: number;
  status: string;
  updatedAt: string;
  description?: string;
  mediaUrls?: string[];
}

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
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [error, setError] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  // Stats calculation
  const totalListings = listings.length;
  const activeListings = listings.filter(listing => listing.status === 'active').length;
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const totalRevenue = orders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + order.amount, 0);
  const pendingOffers = offers.filter(offer => offer.status === 'pending').length;

  useEffect(() => {
    // Get user ID from token
    const getUserIdFromToken = () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          const tokenData = decodeToken(token);
          if (tokenData && tokenData.userId) {
            setUserId(tokenData.userId);
            return tokenData.userId;
          }
        }
        throw new Error('User not authenticated');
      } catch (error) {
        console.error('❌ Error getting user ID from token:', error);
        setError('User authentication failed');
        return null;
      }
    };

    const userId = getUserIdFromToken();
    if (userId) {
      fetchDashboardData(userId);
    } else {
      setLoading(false);
    }
  }, []);

  // Direct API call for listings using axios
  const fetchMyListings = async (userId: string) => {
    try {
      console.log("🔄 Direct API call for listings for user:", userId);
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await getRequest(`/marketplace/listings/user/${userId}/listings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("📦 Direct listings response:", response.data);

      // Handle different response structures
      if (response.data && response.data.listings && Array.isArray(response.data.listings)) {
        return response.data.listings;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.success && Array.isArray(response.data.listings)) {
        return response.data.listings;
      }
      
      console.warn("❌ No listings data found in response");
      return [];
    } catch (error) {
      console.error('❌ Error in direct listings API call:', error);
      throw error;
    }
  };

  const fetchDashboardData = async (userId: string) => {
    try {
      setLoading(true);
      setError('');
      console.log("🔄 Fetching dashboard data for user:", userId);

      // Direct API call for listings, imported functions for others
      const [listingsResponse, ordersResponse, offersResponse] = await Promise.all([
        fetchMyListings(userId), // Direct API call with user ID
        getSellerOrders(setLoading), // Imported function
        getReceivedOffers(setLoading) // Imported function
      ]);

      // Extract data from API responses
      const extractData = (response: any, endpoint: string) => {
        console.log(`🔧 Processing ${endpoint}:`, response);
        
        // If response has listings array (from your backend)
        if (response && response.listings && Array.isArray(response.listings)) {
          console.log(`✅ Found listings array in ${endpoint}`);
          return response.listings;
        }
        // If response has data array
        else if (response && response.data && Array.isArray(response.data)) {
          console.log(`✅ Found data array in ${endpoint}`);
          return response.data;
        }
        // If response is already an array
        else if (Array.isArray(response)) {
          console.log(`✅ Response is already array in ${endpoint}`);
          return response;
        }
        // If response is an object with array inside
        else if (response && typeof response === 'object') {
          console.log(`🔍 Searching for array in ${endpoint} object:`, response);
          // Look for any array property
          const arrayKey = Object.keys(response).find(key => Array.isArray(response[key]));
          if (arrayKey) {
            console.log(`✅ Found array in key '${arrayKey}' for ${endpoint}`);
            return response[arrayKey];
          }
        }
        
        console.warn(`❌ No array found in ${endpoint}, returning empty array`);
        return [];
      };

      const listingsData = extractData(listingsResponse, 'listings');
      const ordersData = extractData(ordersResponse, 'orders');
      const offersData = extractData(offersResponse, 'offers');

      console.log("📦 Final data:", {
        listings: listingsData,
        orders: ordersData,
        offers: offersData
      });

      // Set the data
      setListings(listingsData);
      setOrders(ordersData);
      setOffers(offersData);

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      // Ensure arrays are set to empty on error
      setListings([]);
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
      // TODO: Add accept/reject offer functions in api.ts
      // await acceptOffer(offerId, setLoading);
      // or await rejectOffer(offerId, setLoading);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        const tokenData = decodeToken(token);
        if (tokenData && tokenData.userId) {
          await fetchDashboardData(tokenData.userId); // Refresh data
        }
      }
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

  const getListingStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  // Listing Card Component
  const ListingCard = ({ listing }: { listing: Listing }) => (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white">
      {listing.mediaUrls && listing.mediaUrls.length > 0 ? (
        <div className="mb-3 h-40 bg-gray-100 rounded-lg overflow-hidden">
          <img 
            src={listing.mediaUrls[0]} 
            alt={listing.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="mb-3 h-40 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-gray-400 text-sm">No Image</span>
        </div>
      )}
      
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 truncate flex-1 mr-2">
          {listing.title || 'Untitled Listing'}
        </h4>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getListingStatusColor(listing.status)}`}>
          {listing.status || 'unknown'}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
        {listing.description || 'No description available'}
      </p>
      
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="font-semibold text-green-600">
          {formatCurrency(listing.price || 0)}
        </span>
        <span className="text-gray-500">
          {formatDate(listing.updatedAt)}
        </span>
      </div>

      <div className="mt-3">
        <button
          onClick={() => handleViewListingDetails(listing._id)}
          className="w-full text-sm py-2 px-3 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );

  // Refresh function
  const handleRefresh = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      const tokenData = decodeToken(token);
      if (tokenData && tokenData.userId) {
        fetchDashboardData(tokenData.userId);
      }
    }
  };

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
                    : 'border-transparent text-gray-500 hover:text-white-700 hover:border-gray-300'
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
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'listings'
                    ? 'border-yellow-600 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Listings
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {totalListings}
                </span>
              </button>
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
                  icon={<span className="text-green-600 text-lg font-semibold">$</span>}
                  color="green"
                />
                <StatCard
                  title="Total Listings"
                  value={totalListings}
                  icon={
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  }
                  color="yellow"
                  onClick={() => setActiveTab('listings')}
                />
                <StatCard
                  title="Active Listings"
                  value={activeListings}
                  icon={
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  }
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
                  onClick={handleRefresh}
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

          {/* Listings Tab */}
          {activeTab === 'listings' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">My Listings</h2>
                  <p className="text-sm text-gray-600 mt-1">View and manage your product listings</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleRefresh}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                  <button
                    onClick={() => window.location.href = '/create-listing'}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Listing
                  </button>
                </div>
              </div>
              <div className="p-6">
                {listings.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No listings yet</h3>
                    <p className="mt-2 text-gray-500">Get started by creating your first listing.</p>
                    <button
                      onClick={() => window.location.href = '/create-listing'}
                      className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                    >
                      Create Your First Listing
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map(listing => (
                      <ListingCard key={listing._id} listing={listing} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;