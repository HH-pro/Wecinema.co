// src/pages/marketplace/Browse.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements, AddressElement } from '@stripe/react-stripe-js';
import {
  FiFilter,
  FiPlus,
  FiSearch,
  FiX,
  FiCreditCard,
  FiCheck,
  FiMail,
  FiAlertCircle,
  FiLoader,
  FiUser,
  FiCalendar,
  FiRefreshCw,
  FiTrendingUp,
  FiDollarSign,
  FiStar,
  FiClock,
  FiPackage
} from 'react-icons/fi';

// Components
import ListingCard from '../../components/marketplace/ListingCard';
import MarketplaceLayout from '../../components/Layout';

// Types
import { Listing } from '../../types/marketplace';

// API
import marketplaceApi from '../../api/marketplaceApi';

// Load Stripe from environment variable
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || "pk_test_51SKw7ZHYamYyPYbDUlqbeydcW1hVGrHOvCZ8mBwSU1gw77TIRyzng31iSqAvPIQzTYKG8UWfDew7kdKgBxsw7vtq00WTLU3YCZ");

const Browse: React.FC = () => {
  // State Management
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showOfferModal, setShowOfferModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [offerData, setOfferData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
    hasMore: true
  });

  // Billing details
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });

  const navigate = useNavigate();

  // Filters
  const [filters, setFilters] = useState({
    category: 'all',
    minPrice: '',
    maxPrice: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    status: 'active',
    type: ''
  });

  // Offer form
  const [offerForm, setOfferForm] = useState({
    amount: '',
    message: '',
    requirements: '',
    expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Categories for dropdown
  const categories = [
    'all',
    'Video',
    'Script',
    'Music',
    'Animation',
    'Documentary',
    'Commercial',
    'Film',
    'Short Film',
    'Series',
    'Other'
  ];

  // Types for dropdown
  const listingTypes = [
    'all',
    'for_sale',
    'licensing',
    'adaptation_rights',
    'commission'
  ];

  // ==============================
  // EFFECTS
  // ==============================

  useEffect(() => {
    fetchListings();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      fetchListings();
    }
  }, [filters]);

  // ==============================
  // API FUNCTIONS
  // ==============================

  const fetchCurrentUser = async () => {
    try {
      const user = marketplaceApi.utils.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setBillingDetails(prev => ({
          ...prev,
          name: user.username || 'Customer',
          email: user.email || '',
          phone: user.phone || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchListings = async (loadMore: boolean = false) => {
    try {
      if (loadMore) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const currentPage = loadMore ? pagination.page + 1 : 1;
      const params = {
        ...filters,
        page: currentPage,
        limit: pagination.limit,
        search: searchQuery || undefined
      };

      console.log('Fetching listings with params:', params);
      
      const response = await marketplaceApi.listings.getAllListings(params);
      
      if (response.success) {
        const newListings = response.data?.listings || [];
        const total = response.data?.pagination?.total || 0;
        const pages = response.data?.pagination?.pages || 1;
        
        if (loadMore) {
          setListings(prev => [...prev, ...newListings]);
          setPagination(prev => ({
            ...prev,
            page: currentPage,
            total,
            pages,
            hasMore: currentPage < pages
          }));
        } else {
          setListings(newListings);
          setPagination({
            page: 1,
            limit: pagination.limit,
            total,
            pages,
            hasMore: 1 < pages
          });
        }
        
        if (newListings.length === 0 && !loadMore) {
          setSuccessMessage('No listings found. Try adjusting your filters or be the first to create a listing!');
        }
      } else {
        setError(response.error || 'Failed to fetch listings');
      }
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      setError('Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  // ==============================
  // EVENT HANDLERS
  // ==============================

  const handleSearch = () => {
    fetchListings();
  };

  const handleViewDetails = (listingId: string) => {
    navigate(`/marketplace/listings/${listingId}`);
  };

  const handleMakeOffer = (listing: Listing) => {
    setSelectedListing(listing);
    setOfferForm({
      amount: listing.price.toString(),
      message: '',
      requirements: '',
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setShowOfferModal(true);
    setError('');
  };

  const handleDirectPayment = async (listing: Listing) => {
    if (!listing._id) return;

    try {
      setPaymentStatus('processing');
      setError('');

      const response = await marketplaceApi.orders.createOrder?.(listing._id, {
        amount: listing.price,
        paymentMethod: 'stripe'
      });

      if (response && response.success && response.data?.clientSecret) {
        setClientSecret(response.data.clientSecret);
        setOfferData({
          ...response.data,
          type: 'direct_purchase',
          amount: listing.price,
          listing: listing
        });
        setShowPaymentModal(true);
        setPaymentStatus('idle');
      } else {
        throw new Error(response?.error || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      setPaymentStatus('failed');
      setError(error.message || 'Failed to initiate payment');
    }
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedListing) return;

    try {
      setPaymentStatus('processing');
      setError('');

      const response = await marketplaceApi.offers.createOffer(
        selectedListing._id,
        {
          offeredPrice: parseFloat(offerForm.amount),
          message: offerForm.message,
          requirements: offerForm.requirements,
          expectedDelivery: offerForm.expectedDelivery
        }
      );

      if (response.success && response.data?.clientSecret) {
        setClientSecret(response.data.clientSecret);
        setOfferData({
          ...response.data,
          type: 'offer',
          amount: parseFloat(offerForm.amount)
        });
        setShowOfferModal(false);
        setShowPaymentModal(true);
        setPaymentStatus('idle');
      } else {
        throw new Error(response.error || 'Failed to create offer');
      }
    } catch (error: any) {
      console.error('Error creating offer:', error);
      setPaymentStatus('failed');
      setError(error.message || 'Failed to submit offer');
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    setSelectedListing(null);
    setClientSecret('');
    setOfferData(null);
    setPaymentStatus('success');
    setSuccessMessage('Payment completed successfully! Your order has been placed.');
    
    // Refresh listings
    fetchListings();
    
    // Navigate to orders page
    setTimeout(() => {
      navigate('/marketplace/my-orders', {
        state: {
          message: 'Payment completed successfully!',
          type: 'success'
        }
      });
    }, 2000);
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setSelectedListing(null);
    setClientSecret('');
    setOfferData(null);
    setPaymentStatus('idle');
    setError('');
  };

  const clearFilters = () => {
    setFilters({
      category: 'all',
      minPrice: '',
      maxPrice: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      status: 'active',
      type: ''
    });
    setSearchQuery('');
    setError('');
    fetchListings();
  };

  const handleLoadMore = () => {
    if (pagination.hasMore && !loading && !refreshing) {
      fetchListings(true);
    }
  };

  const handleBillingDetailsChange = (details: any) => {
    setBillingDetails(prev => ({
      ...prev,
      ...details
    }));
  };

  // ==============================
  // HELPER FUNCTIONS
  // ==============================

  const getSellerEmail = (listing: Listing): string => {
    if (listing.sellerId && typeof listing.sellerId === 'object' && 'email' in listing.sellerId) {
      return (listing.sellerId as any).email;
    }
    return '';
  };

  const getSellerName = (listing: Listing): string => {
    if (listing.sellerId && typeof listing.sellerId === 'object' && 'username' in listing.sellerId) {
      return (listing.sellerId as any).username;
    }
    return 'Seller';
  };

  // Filter listings locally for search
  const filteredListings = listings.filter(listing =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (listing.tags && listing.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // ==============================
  // RENDER FUNCTIONS
  // ==============================

  if (initialLoading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FiPackage className="text-yellow-600 text-2xl" />
              </div>
            </div>
            <p className="mt-6 text-gray-600 text-lg font-medium">Loading marketplace...</p>
            <p className="mt-2 text-gray-500 text-sm">Discovering amazing content</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 text-white py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Marketplace</h1>
                <p className="text-xl text-yellow-100 mb-8 max-w-2xl">
                  Buy, sell, and trade video content, scripts, and digital assets
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                    <FiTrendingUp />
                    <span>Trending Now</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                    <FiStar />
                    <span>Premium Quality</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                    <FiDollarSign />
                    <span>Secure Payments</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={() => navigate('/marketplace/create')}
                  className="group bg-white text-yellow-700 hover:bg-gray-50 px-8 py-4 rounded-xl font-semibold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center gap-3"
                >
                  <FiPlus className="group-hover:rotate-90 transition-transform duration-300" size={24} />
                  <span>Create Listing</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Messages */}
          {error && (
            <div className="mb-6 animate-fade-in">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <div className="flex items-center gap-3">
                  <FiAlertCircle className="text-red-500 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-red-800 font-medium">{error}</p>
                  </div>
                  <button
                    onClick={() => setError('')}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 animate-fade-in">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                <div className="flex items-center gap-3">
                  <FiCheck className="text-green-500 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-green-800 font-medium">{successMessage}</p>
                  </div>
                  <button
                    onClick={() => setSuccessMessage('')}
                    className="text-green-500 hover:text-green-700 p-1"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter Bar */}
          <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" size={20} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search titles, descriptions, tags, categories..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        handleSearch();
                      }}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <FiX className="text-gray-400 hover:text-gray-600" size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-200 ${
                    showFilters
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FiFilter size={18} />
                  <span className="hidden sm:inline">Filters</span>
                </button>

                <button
                  onClick={() => fetchListings()}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-all duration-200 disabled:opacity-50"
                >
                  <FiRefreshCw className={loading ? 'animate-spin' : ''} size={18} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200 animate-slide-down">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Listing Type
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      <option value="for_sale">For Sale</option>
                      <option value="licensing">Licensing</option>
                      <option value="adaptation_rights">Adaptation Rights</option>
                      <option value="commission">Commission</option>
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Price Range
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder="Min $"
                        value={filters.minPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Max $"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sort By
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="createdAt">Newest First</option>
                      <option value="price">Price: Low to High</option>
                      <option value="-price">Price: High to Low</option>
                      <option value="views">Most Viewed</option>
                    </select>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {listings.length} of {pagination.total} listings
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={clearFilters}
                      className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => {
                        fetchListings();
                        setShowFilters(false);
                      }}
                      className="px-5 py-2.5 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 font-medium"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Featured Listings</h2>
              <p className="text-gray-600 mt-1">
                {filteredListings.length} listings found
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <FiClock size={16} />
              <span>Updated just now</span>
            </div>
          </div>

          {/* Listings Grid */}
          {loading && !refreshing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md p-4 animate-pulse">
                  <div className="aspect-video bg-gray-200 rounded-xl mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-yellow-100 to-yellow-50 rounded-full flex items-center justify-center">
                  <FiSearch size={32} className="text-yellow-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  No listings found
                </h3>
                <p className="text-gray-600 mb-8">
                  {searchQuery || Object.values(filters).some(val => val && val !== 'all')
                    ? 'Try adjusting your search or filters'
                    : 'Be the first to create a listing!'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={clearFilters}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => navigate('/marketplace/create')}
                    className="px-6 py-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 font-medium"
                  >
                    Create Listing
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredListings.map(listing => (
                  <ListingCard
                    key={listing._id}
                    listing={listing}
                    onViewDetails={handleViewDetails}
                    onMakeOffer={handleMakeOffer}
                    onDirectPayment={handleDirectPayment}
                  />
                ))}
              </div>

              {/* Load More */}
              {pagination.hasMore && (
                <div className="mt-12 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={refreshing || loading}
                    className="inline-flex items-center justify-center px-8 py-4 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {refreshing ? (
                      <>
                        <FiLoader className="animate-spin mr-2" size={18} />
                        Loading...
                      </>
                    ) : (
                      'Load More Listings'
                    )}
                  </button>
                  <p className="mt-3 text-sm text-gray-500">
                    Showing {listings.length} of {pagination.total} listings
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Make an Offer</h3>
                <p className="text-sm text-gray-600">Submit your offer for this listing</p>
              </div>
              <button
                onClick={() => setShowOfferModal(false)}
                className="p-1 rounded-md hover:bg-gray-100"
              >
                <FiX size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-blue-300">
                    {selectedListing.mediaUrls?.[0] ? (
                      <img
                        src={selectedListing.mediaUrls[0]}
                        alt={selectedListing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <FiPackage className="text-gray-400" size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{selectedListing.title}</h4>
                    <p className="text-green-600 text-lg font-bold">${selectedListing.price}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <FiUser size={12} className="text-gray-500" />
                      <span className="text-xs text-gray-600">{getSellerName(selectedListing)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitOffer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Offer Amount ($)
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={offerForm.amount}
                    onChange={(e) => setOfferForm({ ...offerForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Enter your offer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message to Seller
                  </label>
                  <textarea
                    value={offerForm.message}
                    onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    rows={3}
                    placeholder="Tell the seller about your requirements..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Delivery
                  </label>
                  <input
                    type="date"
                    required
                    value={offerForm.expectedDelivery}
                    onChange={(e) => setOfferForm({ ...offerForm, expectedDelivery: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <FiAlertCircle className="text-red-500" size={16} />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-200">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowOfferModal(false)}
                      className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={paymentStatus === 'processing'}
                      className="flex-1 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                    >
                      {paymentStatus === 'processing' ? (
                        <>
                          <FiLoader className="animate-spin" size={16} />
                          Processing...
                        </>
                      ) : (
                        `Submit Offer - $${offerForm.amount}`
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && clientSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {offerData?.type === 'direct_purchase' ? 'Complete Purchase' : 'Complete Offer Payment'}
                  </h3>
                  <p className="text-sm text-gray-500">Secure payment via Stripe</p>
                </div>
                <button
                  onClick={handlePaymentClose}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  disabled={paymentStatus === 'processing'}
                >
                  <FiX size={20} className="text-gray-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                        <FiCreditCard className="text-white" size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">
                          {offerData?.type === 'direct_purchase' ? 'Purchase Amount' : 'Offer Amount'}
                        </div>
                        <div className="text-2xl font-bold text-gray-900">${offerData?.amount}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <Elements stripe={stripePromise} options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#ca8a04',
                        borderRadius: '0.5rem'
                      }
                    }
                  }}>
                    <PaymentForm
                      offerData={offerData}
                      onSuccess={handlePaymentSuccess}
                      onClose={handlePaymentClose}
                      paymentStatus={paymentStatus}
                      setPaymentStatus={setPaymentStatus}
                      billingDetails={billingDetails}
                      onBillingDetailsChange={handleBillingDetailsChange}
                      currentUser={currentUser}
                    />
                  </Elements>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </MarketplaceLayout>
  );
};

// Payment Form Component
const PaymentForm = ({
  offerData,
  onSuccess,
  onClose,
  paymentStatus,
  setPaymentStatus,
  billingDetails,
  onBillingDetailsChange,
  currentUser
}: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBillingForm, setShowBillingForm] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError('Payment system not ready. Please refresh the page.');
      return;
    }

    setIsSubmitting(true);
    setPaymentStatus('processing');
    setError('');

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/marketplace/payment/success`,
          payment_method_data: {
            billing_details: {
              name: currentUser?.username || billingDetails.name || 'Customer',
              email: currentUser?.email || billingDetails.email || '',
              phone: billingDetails.phone || undefined,
              address: {
                line1: billingDetails.address.line1 || 'N/A',
                city: billingDetails.address.city || 'N/A',
                state: billingDetails.address.state || 'N/A',
                postal_code: billingDetails.address.postal_code || '00000',
                country: billingDetails.address.country || 'US'
              }
            }
          }
        },
        redirect: 'if_required'
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        setPaymentStatus('success');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        throw new Error('Payment not completed');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setPaymentStatus('failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddressChange = (event: any) => {
    if (event.complete) {
      const address = event.value.address;
      onBillingDetailsChange({
        address: {
          line1: address.line1 || '',
          line2: address.line2 || '',
          city: address.city || '',
          state: address.state || '',
          postal_code: address.postal_code || '',
          country: address.country || 'US'
        }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-800">Billing Information</h4>
          <button
            type="button"
            onClick={() => setShowBillingForm(!showBillingForm)}
            className="text-xs text-yellow-600 hover:text-yellow-500"
          >
            {showBillingForm ? 'Hide' : 'Edit'}
          </button>
        </div>

        {showBillingForm ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={billingDetails.name || currentUser?.username || ''}
                onChange={(e) => onBillingDetailsChange({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={billingDetails.email || currentUser?.email || ''}
                onChange={(e) => onBillingDetailsChange({ email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={billingDetails.phone || ''}
                onChange={(e) => onBillingDetailsChange({ phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Billing Address</label>
              <div className="border border-gray-300 rounded-md">
                <AddressElement
                  options={{
                    mode: 'billing',
                    allowedCountries: ['US', 'CA', 'GB', 'AU', 'IN'],
                    fields: { phone: 'always' },
                    validation: { phone: { required: 'never' } }
                  }}
                  onChange={handleAddressChange}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2 mb-2">
              <FiUser size={14} />
              <span>{billingDetails.name || currentUser?.username || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiMail size={14} />
              <span>{billingDetails.email || currentUser?.email || 'Not provided'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-800">Payment Details</label>
          </div>
          <div className="min-h-[200px]">
            <PaymentElement options={{ layout: 'tabs' }} />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="text-red-500 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {paymentStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <FiCheck className="text-green-600" size={16} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-green-800">Payment Successful!</h4>
              <p className="text-sm text-green-700">Redirecting...</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          disabled={paymentStatus === 'processing' || paymentStatus === 'success'}
          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <FiX className="inline mr-2" size={16} />
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || paymentStatus === 'processing' || paymentStatus === 'success' || isSubmitting}
          className="flex-1 py-3 px-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          {paymentStatus === 'processing' || isSubmitting ? (
            <>
              <FiLoader className="animate-spin" size={16} />
              Processing...
            </>
          ) : paymentStatus === 'success' ? (
            <>
              <FiCheck size={16} />
              Success!
            </>
          ) : (
            `Pay $${offerData?.amount}`
          )}
        </button>
      </div>
    </form>
  );
};

export default Browse;