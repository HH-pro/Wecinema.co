import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { getMyListings, getSellerOrders, getReceivedOffers } from '../../api';

interface Listing {
  _id: string;
  title: string;
  price: number;
  status: string;
  updatedAt: string;
  description?: string;
  mediaUrls?: string[];
}

interface ListingsResponse {
  listings: Listing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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

  // Stats calculation - now using the listings array directly
  const totalListings = listings.length;
  const activeListings = listings.filter(listing => listing.status === 'active').length;
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

      // API calls with proper response handling
      const [listingsResponse, ordersData, offersData] = await Promise.all([
        getMyListings(setLoading),
        getSellerOrders(setLoading),
        getReceivedOffers(setLoading)
      ]);

      // Handle the new response structure for listings
      const listingsData = (listingsResponse as ListingsResponse).listings || 
                          (Array.isArray(listingsResponse) ? listingsResponse : []);
      
      setListings(listingsData);
      setOrders(ordersData || []);
      setOffers(offersData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Update the getMyListings API call to handle the new response structure
  // You might also want to update your api.ts file:
  /*
  export const getMyListings = async (setLoading?: (loading: boolean) => void) => {
    try {
      setLoading?.(true);
      const response = await api.get('/marketplace/my-listings');
      return response.data; // This now returns { listings: [], pagination: {} }
    } catch (error) {
      console.error('Error fetching my listings:', error);
      throw error;
    } finally {
      setLoading?.(false);
    }
  };
  */

  const handleViewListingDetails = (listingId: string) => {
    window.location.href = `/listings/${listingId}`;
  };

  const handleViewOrderDetails = (orderId: string) => {
    window.location.href = `/orders/${orderId}`;
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'reject') => {
    try {
      setError('');
      // await acceptOffer(offerId, setLoading);
      // or await rejectOffer(offerId, setLoading);
      await fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error updating offer:', error);
      setError('Failed to update offer');
    }
  };

  // Utility functions (keep the same)
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

  // Stat Card Component (keep the same)
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

  // Listing Card Component (keep the same)
  const ListingCard = ({ listing }: { listing: Listing }) => (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white">
      {listing.mediaUrls && listing.mediaUrls.length > 0 ? (
        <div className="mb-3 h-40 bg-gray-100 rounded-lg overflow-hidden">
          <img 
            src={listing.mediaUrls[0]} 
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="mb-3 h-40 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-gray-400 text-sm">No Image</span>
        </div>
      )}
      
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 truncate flex-1 mr-2">
          {listing.title}
        </h4>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getListingStatusColor(listing.status)}`}>
          {listing.status}
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

  // Loading State (keep the same)
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

          {/* Rest of the component remains the same */}
          {/* ... (keep all the existing JSX as it is) ... */}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;