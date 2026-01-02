// src/pages/marketplace/Browse.tsx
import React, { useState, useEffect } from 'react';
import ListingCard from '../../components/marketplace/ListingCard';
import MarketplaceLayout from '../../components/Layout';
import { Listing } from '../../types/marketplace';
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
  FiClock
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements, AddressElement } from '@stripe/react-stripe-js';
import emailjs from '@emailjs/browser';
import marketplaceApi, { ApiResponse } from '../../api/marketplaceApi';

// Initialize EmailJS with your credentials
emailjs.init("MIfBtNPcnoqBFU0LR");

// Stripe test key for development
const stripePromise = loadStripe("pk_test_51SKw7ZHYamYyPYbDUlqbeydcW1hVGrHOvCZ8mBwSU1gw77TIRyzng31iSqAvPIQzTYKG8UWfDew7kdKgBxsw7vtq00WTLU3YCZ");

const Browse: React.FC = () => {
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

  const [filters, setFilters] = useState({
    category: 'all',
    minPrice: '',
    maxPrice: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    status: 'active'
  });

  const [offerForm, setOfferForm] = useState({
    amount: '',
    message: '',
    requirements: '',
    expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 7 days from now
  });

  // Fetch listings and user data on component mount
  useEffect(() => {
    fetchListings();
    fetchCurrentUser();
  }, []);

  // Fetch listings when filters change
  useEffect(() => {
    if (!initialLoading) {
      fetchListings();
    }
  }, [filters]);

  const fetchCurrentUser = async () => {
    try {
      const user = marketplaceApi.utils.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        
        // Set billing details from user data
        setBillingDetails(prev => ({
          ...prev,
          name: user.username || 'Customer',
          email: user.email || '',
          phone: user.phone || ''
        }));
        
        console.log('✅ Current user loaded:', user);
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
        search: searchQuery
      };

      console.log('📡 Fetching listings with params:', params);
      
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

  // Handle search
  const handleSearch = () => {
    fetchListings();
  };

  // Handle view details
  const handleViewDetails = (listingId: string) => {
    navigate(`/marketplace/listings/${listingId}`);
  };

  // Handle make offer
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

  // Get seller email from listing data
  const getSellerEmail = (listing: Listing): string => {
    if (listing.sellerId && typeof listing.sellerId === 'object' && 'email' in listing.sellerId) {
      return (listing.sellerId as any).email;
    }
    if ((listing as any).sellerEmail) {
      return (listing as any).sellerEmail;
    }
    return '';
  };

  // Get seller name from listing data
  const getSellerName = (listing: Listing): string => {
    if (listing.sellerId && typeof listing.sellerId === 'object' && 'username' in listing.sellerId) {
      return (listing.sellerId as any).username;
    }
    return 'Seller';
  };

  // Send email notification to seller
  const sendSellerNotification = async (type: 'offer' | 'direct_purchase', data: any) => {
    try {
      const templateParams = {
        to_email: data.sellerEmail,
        to_name: data.sellerName,
        buyer_name: data.buyerName,
        listing_title: data.listingTitle,
        amount: data.amount,
        message: data.message || 'No message provided',
        expected_delivery: data.expectedDelivery || 'Not specified',
        requirements: data.requirements || 'No specific requirements',
        order_id: data.orderId,
        offer_id: data.offerId,
        type: type,
        date: new Date().toLocaleDateString(),
        dashboard_url: `${window.location.origin}/marketplace/seller/dashboard`
      };

      console.log('📧 Sending email with data:', templateParams);

      const serviceID = 'service_pykwrta';
      const templateID = type === 'offer' ? 'template_xtnsrmg' : 'template_h4gtoxd';

      const result = await emailjs.send(serviceID, templateID, templateParams);
      console.log(`✅ ${type === 'offer' ? 'Offer' : 'Purchase'} notification email sent successfully:`, result);
      
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
    }
  };

  // Handle offer submission
  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedListing) return;

    try {
      setPaymentStatus('processing');
      setError('');
      
      console.log('🔄 Creating offer for listing:', selectedListing._id);

      const response = await marketplaceApi.offers.createOffer(
        selectedListing._id,
        {
          offeredPrice: parseFloat(offerForm.amount),
          message: offerForm.message
        }
      );

      if (response.success && response.data?.offer) {
        console.log('✅ Offer created:', response.data.offer);
        
        // Store offer data for payment
        setOfferData({
          ...response.data,
          type: 'offer',
          amount: parseFloat(offerForm.amount),
          offer: response.data.offer
        });
        
        setShowOfferModal(false);
        
        // Show success message
        setSuccessMessage(`Offer created successfully! You can now proceed to payment from the "My Offers" section.`);
        
        // Clear form
        setOfferForm({
          amount: '',
          message: '',
          requirements: '',
          expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        
        setPaymentStatus('idle');
        
      } else {
        throw new Error(response.error || 'Failed to create offer');
      }
      
    } catch (error: any) {
      console.error('❌ Error creating offer:', error);
      setPaymentStatus('failed');
      
      const errorMessage = error.response?.data?.error || 
                          error.message || 
                          'Failed to submit offer';
      
      setError(errorMessage);
    }
  };

  // Handle direct payment
  const handleDirectPayment = async (listing: Listing) => {
    if (!listing._id) return;

    try {
      setPaymentStatus('processing');
      setError('');
      
      console.log('🔄 Creating order for listing:', listing._id);

      const response = await marketplaceApi.orders.createOrder?.(listing._id);
      
      if (response && response.success) {
        console.log('✅ Order created:', response.data);
        
        // Store order data for payment
        setOfferData({
          ...response.data,
          type: 'direct_purchase',
          amount: listing.price,
          listing: listing,
          order: response.data.order
        });
        
        setShowPaymentModal(true);
        setPaymentStatus('idle');
      } else {
        throw new Error('Failed to create order');
      }
      
    } catch (error: any) {
      console.error('❌ Error creating order:', error);
      setPaymentStatus('failed');
      setError('Failed to initiate payment. Please try again.');
    }
  };
  
  // Handle payment success
  const handlePaymentSuccess = async () => {
    try {
      const buyerName = currentUser?.username || 'A buyer';

      // Send email notification based on payment type
      if (offerData?.type === 'direct_purchase' && offerData?.listing) {
        const sellerEmail = getSellerEmail(offerData.listing);
        const sellerName = getSellerName(offerData.listing);
        
        if (sellerEmail) {
          await sendSellerNotification('direct_purchase', {
            sellerEmail: sellerEmail,
            sellerName: sellerName,
            buyerName: buyerName,
            listingTitle: offerData.listing.title,
            amount: offerData.amount,
            orderId: offerData.order?._id
          });
        }
      }

    } catch (error) {
      console.error('Failed to send notification email:', error);
    }

    setShowPaymentModal(false);
    setSelectedListing(null);
    setClientSecret('');
    setOfferData(null);
    setPaymentStatus('success');
    setSuccessMessage('Payment completed successfully! Your order has been placed.');
    
    // Refresh listings
    fetchListings();
    
    // Navigate to orders page after delay
    setTimeout(() => {
      navigate('/marketplace/my-orders', { 
        state: { 
          message: 'Payment completed successfully! Your order has been placed.',
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
      status: 'active'
    });
    setSearchQuery('');
    setError('');
    fetchListings();
  };

  // Filter listings based on search query
  const filteredListings = listings.filter(listing =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (listing.tags && listing.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Handle billing details change
  const handleBillingDetailsChange = (details: any) => {
    setBillingDetails(prev => ({
      ...prev,
      ...details
    }));
  };

  // Handle load more
  const handleLoadMore = () => {
    if (pagination.hasMore && !loading && !refreshing) {
      fetchListings(true);
    }
  };

  // Categories for filter dropdown
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

  if (initialLoading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FiFilm className="text-yellow-600 text-2xl" />
              </div>
            </div>
            <p className="mt-6 text-gray-600 text-lg font-medium">Loading amazing content...</p>
            <p className="mt-2 text-gray-500 text-sm">Discovering the best videos and scripts</p>
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
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Discover Creative Content</h1>
                <p className="text-xl text-yellow-100 mb-8 max-w-2xl">
                  Browse thousands of videos, scripts, and digital assets from talented creators worldwide.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                    <FiTrendingUp />
                    <span>Trending</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                    <FiStar />
                    <span>Premium</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                    <FiDollarSign />
                    <span>Affordable</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <button 
                  onClick={() => navigate('/marketplace/create')}
                  className="group bg-white text-yellow-700 hover:bg-gray-50 px-8 py-4 rounded-xl font-semibold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center gap-3"
                >
                  <FiPlus className="group-hover:rotate-90 transition-transform duration-300" size={24} />
                  <span>Sell Your Content</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error/Success Messages */}
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
                    placeholder="Search videos, scripts, titles, descriptions, tags..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
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

              {/* Filter Toggle and Actions */}
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
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category
                    </label>
                    <select 
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 text-sm"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
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
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max $"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 text-sm"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 text-sm"
                    >
                      <option value="createdAt">Newest First</option>
                      <option value="price">Price: Low to High</option>
                      <option value="-price">Price: High to Low</option>
                      <option value="views">Most Viewed</option>
                      <option value="sellerRating">Top Rated Sellers</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Order
                    </label>
                    <select 
                      value={filters.sortOrder}
                      onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 text-sm"
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
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
                      className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all duration-200"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => {
                        fetchListings();
                        setShowFilters(false);
                      }}
                      className="px-5 py-2.5 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 font-medium transition-all duration-200"
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
              <h2 className="text-2xl font-bold text-gray-900">
                Featured Listings
              </h2>
              <p className="text-gray-600 mt-1">
                Discover amazing content from talented creators
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
                  {searchQuery || Object.values(filters).some(Boolean)
                    ? 'Try adjusting your search or filters to find what you\'re looking for.'
                    : 'Be the first to create a listing!'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={clearFilters}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all duration-200"
                  >
                    Clear Filters
                  </button>
                  <button 
                    onClick={() => navigate('/marketplace/create')}
                    className="px-6 py-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 font-medium transition-all duration-200"
                  >
                    Create First Listing
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

      {/* Offer Modal - Keep your existing offer modal implementation */}
      {/* ... (keep your existing offer modal code) ... */}

      {/* Payment Modal - Keep your existing payment modal implementation */}
      {/* ... (keep your existing payment modal code) ... */}
    </MarketplaceLayout>
  );
};

// Payment Form Component - Keep your existing implementation
// ... (keep your existing PaymentForm component) ...

export default Browse;