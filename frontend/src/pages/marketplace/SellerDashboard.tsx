import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import OrderSummary from '../../components/marketplae/OrderSummary';
import { getMyListings } from '../../api';

interface DashboardStats {
  totalListings: number;
  activeListings: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  pendingOffers: number;
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
    mediaUrls: string[];
    price: number;
  };
}

interface Offer {
  _id: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'countered';
  createdAt: string;
  buyerId: {
    username: string;
    avatar?: string;
  };
  listingId: {
    _id: string;
    title: string;
    mediaUrls: string[];
    price: number;
    status: string;
  };
  message?: string;
  expiresAt?: string;
}

interface Listing {
  _id: string;
  title: string;
  price: number;
  status: string;
  mediaUrls: string[];
  sellerId: string;
  createdAt: string;
  description?: string;
  category?: string;
  tags?: string[];
}

type TabType = 'overview' | 'offers' | 'listings';

const SellerDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    activeListings: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    pendingOffers: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper function to extract array from API response
  const extractArrayFromResponse = (data: any, possibleKeys: string[]): any[] => {
    if (!data) return [];
    
    // If data is already an array, return it
    if (Array.isArray(data)) {
      return data;
    }
    
    // Check for common response structure keys
    for (const key of possibleKeys) {
      if (data[key] && Array.isArray(data[key])) {
        return data[key];
      }
    }
    
    // If no array found, try to find any array in the object
    if (typeof data === 'object') {
      for (const key in data) {
        if (Array.isArray(data[key])) {
          return data[key];
        }
      }
    }
    
    return [];
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      console.log('🔄 Starting dashboard data fetch...');
      
      // Fetch listings with detailed error handling
      let listingsArray: Listing[] = [];
      try {
        console.log('📝 Fetching listings...');
        const listingsResponse = await getMyListings(setLoading);
        console.log('📝 Listings API raw response:', listingsResponse);
        
        // Try multiple possible response structures
        listingsArray = extractArrayFromResponse(listingsResponse, [
          'listings', 'data', 'items', 'results', 'docs', 'products'
        ]);
        
        console.log('📝 Extracted listings:', listingsArray);
        
        if (listingsArray.length === 0) {
          console.warn('⚠️ No listings found in response. Response structure:', listingsResponse);
        }
        
      } catch (listingsError) {
        console.error('❌ Listings fetch error:', listingsError);
        // Continue with other APIs even if listings fail
      }

      setListings(listingsArray);

      // Fetch orders with detailed error handling
      let ordersArray: Order[] = [];
      try {
        console.log('📦 Fetching orders...');
        const ordersResponse = await fetch('/marketplace/orders/seller-orders', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        console.log('📦 Orders response status:', ordersResponse.status);
        
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          console.log('📦 Orders API raw response:', ordersData);
          
          ordersArray = extractArrayFromResponse(ordersData, [
            'orders', 'data', 'items', 'results', 'docs'
          ]);
          
          console.log('📦 Extracted orders:', ordersArray);
        } else {
          console.warn('⚠️ Orders API returned non-OK status:', ordersResponse.status);
        }
      } catch (orderError) {
        console.log('📦 Orders API not available:', orderError);
      }

      // Fetch offers with detailed error handling
      let offersArray: Offer[] = [];
      try {
        console.log('💼 Fetching offers...');
        const offersResponse = await fetch('/marketplace/offers/seller-offers', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        console.log('💼 Offers response status:', offersResponse.status);
        
        if (offersResponse.ok) {
          const offersData = await offersResponse.json();
          console.log('💼 Offers API raw response:', offersData);
          
          offersArray = extractArrayFromResponse(offersData, [
            'offers', 'data', 'items', 'results', 'docs'
          ]);
          
          console.log('💼 Extracted offers:', offersArray);
        } else {
          console.warn('⚠️ Offers API returned non-OK status:', offersResponse.status);
        }
      } catch (offerError) {
        console.log('💼 Offers API not available:', offerError);
      }

      setRecentOrders(ordersArray.slice(0, 5));
      setOffers(offersArray);

      // Calculate statistics with available data
      calculateStats(ordersArray, listingsArray, offersArray);

      console.log('✅ Dashboard data fetch completed');
      console.log('📊 Final counts - Listings:', listingsArray.length, 'Orders:', ordersArray.length, 'Offers:', offersArray.length);

    } catch (error) {
      console.error('💥 Main dashboard fetch error:', error);
      setError('Failed to load some dashboard data. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (orders: Order[], listings: Listing[], offers: Offer[]) => {
    const totalListings = listings.length;
    const activeListings = listings.filter(listing => 
      listing.status === 'active' || listing.status === 'published' || listing.status === 'live'
    ).length;
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => 
      ['pending', 'pending_payment', 'paid', 'in_progress', 'processing'].includes(order.status)
    ).length;
    const totalRevenue = orders
      .filter(order => ['completed', 'delivered', 'fulfilled'].includes(order.status))
      .reduce((sum, order) => sum + (order.amount || 0), 0);
    const pendingOffers = offers.filter(offer => offer.status === 'pending').length;

    setStats({
      totalListings,
      activeListings,
      totalOrders,
      pendingOrders,
      totalRevenue,
      pendingOffers
    });
  };

  const handleViewOrderDetails = (orderId: string) => {
    window.location.href = `/orders/${orderId}`;
  };

  const handleViewListingDetails = (listingId: string) => {
    window.location.href = `/listings/${listingId}`;
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'reject' | 'counter') => {
    try {
      setError('');
      const response = await fetch(`/api/marketplace/offers/${offerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        setSuccess(`Offer ${action}ed successfully!`);
        await fetchDashboardData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update offer');
      }
    } catch (error) {
      console.error('Error updating offer:', error);
      setError(error instanceof Error ? error.message : 'Failed to update offer');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted': 
      case 'active':
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': 
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'countered': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getListingStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': 
      case 'published':
      case 'live':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': 
      case 'paused':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'sold': 
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
      case 'fulfilled':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'rejected':
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
      case 'processing':
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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

  const calculateDiscount = (originalPrice: number, offerAmount: number) => {
    if (!originalPrice || !offerAmount) return '0';
    return ((1 - offerAmount / originalPrice) * 100).toFixed(1);
  };

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
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer hover:border-yellow-300' : ''}`}
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

  const QuickActionButton = ({ 
    title, 
    onClick, 
    icon, 
    variant = 'primary' 
  }: { 
    title: string; 
    onClick: () => void; 
    icon: React.ReactNode; 
    variant?: 'primary' | 'secondary'; 
  }) => (
    <button
      onClick={onClick}
      className={`w-full font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center ${
        variant === 'primary' 
          ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
          : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
      }`}
    >
      {icon}
      <span className="ml-2">{title}</span>
    </button>
  );

  const ListingCard = ({ listing }: { listing: Listing }) => (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white">
      {/* Listing Image */}
      {listing.mediaUrls && listing.mediaUrls.length > 0 ? (
        <div className="mb-3 h-40 bg-gray-100 rounded-lg overflow-hidden">
          <img 
            src={listing.mediaUrls[0]} 
            alt={listing.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image';
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
          {formatCurrency(listing.price)}
        </span>
        <span className="text-gray-500">
          {formatDate(listing.createdAt)}
        </span>
      </div>

      {listing.category && (
        <div className="mb-2">
          <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
            {listing.category}
          </span>
        </div>
      )}

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

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
            <p className="text-sm text-gray-500">Fetching your data</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Debug Panel - Remove in production */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-blue-900">Debug Information</h3>
              <button 
                onClick={() => {
                  console.log('Current state:', { listings, recentOrders, offers, stats });
                  fetchDashboardData();
                }}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
              >
                Refresh & Log
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
              <div className="text-blue-700">
                <strong>Listings:</strong> {listings.length}
              </div>
              <div className="text-blue-700">
                <strong>Orders:</strong> {recentOrders.length}
              </div>
              <div className="text-blue-700">
                <strong>Offers:</strong> {offers.length}
              </div>
              <div className="text-blue-700">
                <strong>Active Tab:</strong> {activeTab}
              </div>
            </div>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your listings, offers, and track your sales performance</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-800">{success}</p>
              </div>
            </div>
          )}

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
                {stats.pendingOffers > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {stats.pendingOffers}
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
                  {stats.totalListings}
                </span>
              </button>
            </nav>
          </div>

          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(stats.totalRevenue)}
                  icon={<span className="text-green-600 text-lg font-semibold">$</span>}
                  color="green"
                />
                <StatCard
                  title="Total Listings"
                  value={stats.totalListings}
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
                  value={stats.activeListings}
                  icon={
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  }
                  color="green"
                />
                <StatCard
                  title="Total Orders"
                  value={stats.totalOrders}
                  icon={
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  }
                  color="purple"
                />
                <StatCard
                  title="Pending Orders"
                  value={stats.pendingOrders}
                  icon={
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  color="yellow"
                />
                <StatCard
                  title="Pending Offers"
                  value={stats.pendingOffers}
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
                      {recentOrders.length === 0 ? (
                        <div className="text-center py-8">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          <p className="mt-4 text-gray-500">No orders yet</p>
                          <p className="text-sm text-gray-400">When you receive orders, they'll appear here.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {recentOrders.map(order => (
                            <OrderSummary
                              key={order._id}
                              order={order}
                              onViewDetails={handleViewOrderDetails}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions & Tips */}
                <div className="space-y-6">
                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      <QuickActionButton
                        title="View All Orders"
                        onClick={() => window.location.href = '/orders'}
                        icon={
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        }
                        variant="secondary"
                      />
                      <QuickActionButton
                        title="View Listings"
                        onClick={() => setActiveTab('listings')}
                        icon={
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        }
                        variant="secondary"
                      />
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
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Ship orders promptly</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Consider offers from serious buyers</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

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
                    <button
                      onClick={() => setActiveTab('listings')}
                      className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                    >
                      View Your Listings
                    </button>
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
                                {offer.listingId.title}
                              </h3>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(offer.status)}`}>
                                {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600">Buyer</p>
                                <p className="font-medium text-gray-900">{offer.buyerId.username}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Original Price</p>
                                <p className="font-medium text-gray-900">{formatCurrency(offer.listingId.price)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Offer Amount</p>
                                <p className="font-medium text-green-600">{formatCurrency(offer.amount)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Discount</p>
                                <p className="font-medium text-orange-600">
                                  {calculateDiscount(offer.listingId.price, offer.amount)}% off
                                </p>
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

                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <span>Received {formatDate(offer.createdAt)}</span>
                              {offer.expiresAt && (
                                <span className="text-orange-600">
                                  Expires {formatDate(offer.expiresAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {offer.status === 'pending' && (
                          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-4 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => handleOfferAction(offer._id, 'accept')}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Accept Offer
                            </button>
                            <button
                              onClick={() => handleOfferAction(offer._id, 'reject')}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
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

          {activeTab === 'listings' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">My Listings</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    View your product listings ({listings.length} items)
                  </p>
                </div>
                <div className="flex space-x-3">
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
              </div>
              <div className="p-6">
                {listings.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No listings found</h3>
                    <p className="mt-2 text-gray-500">
                      We couldn't find any listings in the API response.
                    </p>
                    <div className="mt-4 space-x-3">
                      <button
                        onClick={fetchDashboardData}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                      >
                        Retry Fetch
                      </button>
                      <button
                        onClick={() => console.log('API Response check needed')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                      >
                        Check Console
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map((listing, index) => (
                      <ListingCard key={listing._id || `listing-${index}`} listing={listing} />
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