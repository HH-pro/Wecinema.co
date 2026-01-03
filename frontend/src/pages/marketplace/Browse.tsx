// src/pages/marketplace/Browse.tsx
import React, { useState, useEffect, useRef } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { Listing } from '../../types/marketplace';
import { 
  FiFilter, FiPlus, FiSearch, FiX, FiCreditCard, FiAlertCircle, 
  FiLoader, FiUser, FiPlay, FiClock, FiDollarSign, FiEye, FiVideo,
  FiTrendingUp, FiTrendingDown, FiCalendar, FiType, FiTag, FiDollarSign as FiDollar
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import marketplaceApi from '../../api/marketplaceApi';
import VideoPlayerModal from '../../components/marketplae/VideoPlayerModal';
import PaymentModal from '../../components/marketplae/PaymentModal';
import OfferModal from '../../components/marketplae/OfferModal';

// Constants for placeholder images
const VIDEO_PLACEHOLDER = 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
const ERROR_IMAGE = 'https://via.placeholder.com/300x200/F3F4F6/6B7280?text=Video+Preview';

// Content type categories
const CONTENT_TYPES = [
  { id: 'sale', label: 'For Sale', icon: '💰', color: 'bg-green-500', hoverColor: 'hover:bg-green-600' },
  { id: 'commission', label: 'Commission', icon: '🎨', color: 'bg-purple-500', hoverColor: 'hover:bg-purple-600' },
  { id: 'adaptation', label: 'Adaptation Rights', icon: '📜', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' },
  { id: 'license', label: 'License', icon: '📋', color: 'bg-amber-500', hoverColor: 'hover:bg-amber-600' }
];

// Sort options
const SORT_OPTIONS = [
  { id: 'latest', label: 'Latest', icon: FiCalendar, description: 'Newest first' },
  { id: 'popular', label: 'Popular', icon: FiTrendingUp, description: 'Most viewed' },
  { id: 'price_low', label: 'Price: Low to High', icon: FiTrendingDown, description: 'Lowest price first' },
  { id: 'price_high', label: 'Price: High to Low', icon: FiTrendingUp, description: 'Highest price first' }
];

const Browse: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
  const [showVideoPopup, setShowVideoPopup] = useState<boolean>(false);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [videoListing, setVideoListing] = useState<Listing | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  
  // New state for image loading errors
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    type: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'latest'
  });

  const [offerForm, setOfferForm] = useState({
    amount: '',
    message: '',
    requirements: '',
    expectedDelivery: ''
  });

  // Video player ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hoveredListing, setHoveredListing] = useState<string | null>(null);

  // Fetch listings and user data on component mount
  useEffect(() => {
    fetchListings();
    fetchCurrentUser();
  }, [filters]);

  const fetchCurrentUser = async () => {
    try {
      const user = marketplaceApi.utils.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError('');
      setImageErrors({});
      
      const params: any = {};
      
      if (filters.type) params.type = filters.type;
      if (filters.minPrice) params.minPrice = parseFloat(filters.minPrice);
      if (filters.maxPrice) params.maxPrice = parseFloat(filters.maxPrice);
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (searchQuery) params.search = searchQuery;
      
      console.log('📡 Fetching listings with params:', params);

      const response = await marketplaceApi.listings.getAllListings(params);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch listings');
      }

      const listingsData = response.data?.listings || [];
      
      console.log('✅ Listings fetched:', listingsData.length);
      
      // Apply local filtering for active category
      let filteredData = listingsData;
      
      if (activeCategory && activeCategory !== 'all') {
        filteredData = filteredData.filter((listing: Listing) => 
          listing.type?.toLowerCase() === activeCategory.toLowerCase()
        );
      }
      
      // Filter by status - only show active listings
      filteredData = filteredData.filter((listing: Listing) => 
        listing.status === 'active'
      );

      const sortedData = sortListings(filteredData, filters.sortBy);
      
      setListings(sortedData);
      
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      setError(error.message || 'Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sortListings = (data: Listing[], sortBy: string) => {
    const sortedData = [...data];
    
    switch (sortBy) {
      case 'latest':
        return sortedData.sort((a, b) => 
          new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        );
      case 'price_low':
        return sortedData.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price_high':
        return sortedData.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'popular':
        return sortedData.sort((a, b) => {
          const viewsA = a.views || 0;
          const viewsB = b.views || 0;
          return viewsB - viewsA;
        });
      default:
        return sortedData;
    }
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
      expectedDelivery: ''
    });
    setShowOfferModal(true);
    setError('');
  };

  const handleVideoClick = (videoUrl: string, title: string, listing: Listing) => {
    console.log('🎬 Opening video:', videoUrl);
    setSelectedVideo(videoUrl);
    setVideoTitle(title);
    setVideoListing(listing);
    setShowVideoPopup(true);
  };

  const handleCloseVideoPopup = () => {
    setShowVideoPopup(false);
    setSelectedVideo('');
    setVideoTitle('');
    setVideoListing(null);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Helper functions from ListingsTab
  const isVideoUrl = (url: string): boolean => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm'];
    const urlLower = url.toLowerCase();
    return videoExtensions.some(ext => urlLower.endsWith(ext));
  };

  const isImageUrl = (url: string): boolean => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.endsWith(ext));
  };

  const getFirstMediaUrl = (mediaUrls: string[]): { url: string; isVideo: boolean; isImage: boolean } => {
    if (!mediaUrls || mediaUrls.length === 0) {
      return { url: '', isVideo: false, isImage: false };
    }
    
    // Try to find an image first
    for (const url of mediaUrls) {
      if (isImageUrl(url)) {
        return { url, isVideo: false, isImage: true };
      }
    }
    
    // Then try to find a video
    for (const url of mediaUrls) {
      if (isVideoUrl(url)) {
        return { url, isVideo: true, isImage: false };
      }
    }
    
    // Return first URL as fallback
    return { 
      url: mediaUrls[0], 
      isVideo: isVideoUrl(mediaUrls[0]), 
      isImage: isImageUrl(mediaUrls[0]) 
    };
  };

  const getThumbnailUrl = (listing: Listing): string => {
    const listingId = listing._id || 'unknown';
    
    if (imageErrors[listingId]) {
      return ERROR_IMAGE;
    }
    
    if (listing.thumbnail && listing.thumbnail.trim() !== '') {
      return listing.thumbnail;
    }
    
    if (listing.mediaUrls && listing.mediaUrls.length > 0) {
      const { url, isImage } = getFirstMediaUrl(listing.mediaUrls);
      if (isImage) {
        return url;
      }
    }
    
    return VIDEO_PLACEHOLDER;
  };

  const handleImageError = (listingId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [listingId]: true
    }));
  };

  const getQualityBadge = (quality?: string) => {
    if (!quality) return { color: 'bg-yellow-400 text-gray-800', label: '' };
    
    switch (quality.toLowerCase()) {
      case '4k':
      case 'ultra hd':
        return { color: 'bg-yellow-500 text-white', label: '4K' };
      case 'hd':
      case '1080p':
        return { color: 'bg-blue-500 text-white', label: 'HD' };
      default:
        return { color: 'bg-yellow-400 text-gray-800', label: '' };
    }
  };

 const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
};


  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: diffDays > 365 ? 'numeric' : undefined
      });
    }
  };

  const handleOfferFormChange = (field: string, value: string) => {
    setOfferForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedListing) return;

    try {
      setPaymentStatus('processing');
      setError('');
      
      const response = await marketplaceApi.offers.makeOffer({
        listingId: selectedListing._id,
        amount: parseFloat(offerForm.amount),
        message: offerForm.message,
        requirements: offerForm.requirements,
        expectedDelivery: offerForm.expectedDelivery
      });

      if (!response.success || !response.data?.clientSecret) {
        throw new Error(response.error || 'No client secret received from server. Please try again.');
      }

      setClientSecret(response.data.clientSecret);
      
      setOfferData({
        ...response.data,
        type: 'offer',
        amount: parseFloat(offerForm.amount),
        offer: response.data.offer
      });
      
      setShowOfferModal(false);
      setShowPaymentModal(true);
      setPaymentStatus('idle');
      
    } catch (error: any) {
      console.error('❌ Error submitting offer with payment:', error);
      setPaymentStatus('failed');
      
      const errorMessage = error.message || 
                        error.error || 
                        'Failed to submit offer';
      
      setError(errorMessage);
    }
  };

  const handleDirectPayment = async (listing: Listing) => {
    if (!listing._id) return;

    try {
      setPaymentStatus('processing');
      setError('');
      
      const response = await marketplaceApi.offers.createDirectPayment(
        listing._id,
        ''
      );

      if (!response.success || !response.data?.clientSecret) {
        throw new Error(response.error || 'No client secret received from server. Please try again.');
      }

      setClientSecret(response.data.clientSecret);
      
      setOfferData({
        ...response.data,
        type: 'direct_purchase',
        amount: listing.price,
        listing: listing,
        order: response.data.order
      });
      
      setShowPaymentModal(true);
      setPaymentStatus('idle');
      
    } catch (error: any) {
      console.error('❌ Error creating direct payment:', error);
      setPaymentStatus('failed');
      
      const errorMessage = error.message || 
                        error.error || 
                        'Failed to initiate payment';
      
      setError(errorMessage);
    }
  };
  
  const handlePaymentSuccess = async () => {
    try {
      const user = marketplaceApi.utils.getCurrentUser();
      console.log('✅ Payment completed successfully for:', {
        buyerName: user?.username || 'A buyer',
        type: offerData?.type,
        amount: offerData?.amount
      });

    } catch (error) {
      console.error('Error in payment success handling:', error);
    }

    setShowPaymentModal(false);
    setSelectedListing(null);
    setClientSecret('');
    setOfferData(null);
    setPaymentStatus('success');
    
    navigate('/marketplace/my-orders', { 
      state: { 
        message: 'Payment completed successfully! Your order has been placed.',
        type: 'success'
      } 
    });
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
      type: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'latest'
    });
    setSearchQuery('');
    setActiveCategory('');
    setError('');
  };

  // Handle search with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (!loading) {
        fetchListings();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 animate-pulse bg-yellow-400 opacity-20 rounded-full blur-xl"></div>
              <div className="relative animate-spin rounded-full h-24 w-24 border-4 border-transparent border-t-yellow-500 border-r-amber-500 mx-auto"></div>
            </div>
            <p className="mt-8 text-gray-900 text-xl font-bold tracking-wider">LOADING VIDEO CONTENT</p>
            <p className="mt-2 text-gray-600 text-sm">Discovering premium videos and creative assets</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
        {/* Animated Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 backdrop-blur-xl border-l-4 border-red-500 rounded-r-lg shadow-lg p-6 animate-slideIn">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-400 to-orange-400 flex items-center justify-center animate-pulse">
                    <FiAlertCircle className="text-white" size={24} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 text-lg font-bold">⚠️ {error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-600 hover:text-red-800 p-2 hover:bg-red-100 rounded-lg transition-all"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Header Section - Professional Design */}
          <div className="mb-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Video Marketplace
                </h1>
                <p className="text-gray-600 text-lg max-w-2xl">
                  Discover premium video content. Buy, sell, license, and commission high-quality videos from talented creators.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {marketplaceApi.utils.checkAuth() && (
                  <>
                    <button 
                      onClick={() => navigate('/marketplace/create')}
                      className="group relative inline-flex items-center justify-center px-6 py-3 bg-yellow-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 overflow-hidden hover:bg-yellow-600 border border-yellow-500"
                    >
                      <FiPlus className="relative mr-2" size={18} />
                      <span className="relative">Upload Video</span>
                    </button>
                    <button 
                      onClick={() => navigate('/marketplace/my-orders')}
                      className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-200"
                    >
                      <FiCreditCard className="mr-2" size={18} />
                      My Orders
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-200"
                >
                  <FiFilter className="mr-2" size={18} />
                  {showFilters ? 'Hide Filters' : 'Filters'}
                </button>
              </div>
            </div>

            {/* Search Bar - Professional Design */}
            <div className="mt-8 max-w-3xl">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400 group-focus-within:text-yellow-500 transition-colors" size={20} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos by title, description, tags, or creator..."
                  className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 shadow-sm hover:shadow transition-all duration-200 text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards - Professional Design */}
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{listings.length}</div>
                  <div className="text-gray-600 text-sm font-medium">Total Listings</div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-yellow-100 to-amber-100 flex items-center justify-center">
                  <FiVideo className="text-yellow-600" size={20} />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {listings.filter(l => getFirstMediaUrl(l.mediaUrls || []).isVideo).length}
                  </div>
                  <div className="text-gray-600 text-sm font-medium">Video Content</div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
                  <FiPlay className="text-blue-600" size={20} />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {new Set(listings.map(l => l.sellerId?._id)).size}
                  </div>
                  <div className="text-gray-600 text-sm font-medium">Active Creators</div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 flex items-center justify-center">
                  <FiUser className="text-green-600" size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Filters Section - Professional Design */}
          {showFilters && (
            <div className="mb-8 bg-white rounded-2xl shadow-xl border border-gray-200 p-6 animate-fadeIn">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center">
                    <FiFilter className="text-white" size={18} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Advanced Filters</h3>
                    <p className="text-gray-600 text-sm">Refine your search with precise filters</p>
                  </div>
                </div>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-all duration-200"
                >
                  Clear all filters
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Content Type Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <FiType className="text-yellow-500" size={16} />
                    Content Type
                  </label>
                  <select 
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-sm transition-all duration-200 bg-white hover:border-gray-300"
                  >
                    <option value="">All Content Types</option>
                    <option value="sale">💰 For Sale</option>
                    <option value="commission">🎨 Commission</option>
                    <option value="adaptation">📜 Adaptation Rights</option>
                    <option value="license">📋 License</option>
                  </select>
                </div>

                {/* Sort Options */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <FiTag className="text-yellow-500" size={16} />
                    Sort By
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SORT_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setFilters(prev => ({ ...prev, sortBy: option.id }))}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all duration-200 ${
                            filters.sortBy === option.id
                              ? 'border-yellow-400 bg-yellow-50 text-gray-900'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <Icon size={14} className={filters.sortBy === option.id ? 'text-yellow-500' : 'text-gray-500'} />
                          <span className="text-xs font-medium">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <FiDollar className="text-yellow-500" size={16} />
                    Price Range (₹)
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">Min</div>
                        <input
                          type="number"
                          placeholder="0"
                          value={filters.minPrice}
                          onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                          className="w-full pl-12 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-sm transition-all duration-200"
                          min="0"
                        />
                      </div>
                      <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">Max</div>
                        <input
                          type="number"
                          placeholder="10000"
                          value={filters.maxPrice}
                          onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                          className="w-full pl-12 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-sm transition-all duration-200"
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      Leave blank for no price limit
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={fetchListings}
                  className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-yellow-500"
                >
                  Apply Filters & Refresh Results
                </button>
              </div>
            </div>
          )}

          {/* Results Header - Professional */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <p className="text-gray-800 text-sm font-medium">
                  {activeCategory ? (
                    <>
                      Showing <span className="text-gray-900 font-bold">{listings.length}</span> {CONTENT_TYPES.find(t => t.id === activeCategory)?.label.toLowerCase()} listings
                    </>
                  ) : (
                    <>
                      Found <span className="text-gray-900 font-bold">{listings.length}</span> listings
                      {searchQuery && (
                        <span> for "<span className="text-gray-900 font-semibold">{searchQuery}</span>"</span>
                      )}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(searchQuery || activeCategory) && (
                  <button
                    onClick={() => {
                      if (searchQuery) setSearchQuery('');
                      if (activeCategory) setActiveCategory('');
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-all duration-200 flex items-center gap-1"
                  >
                    <FiX size={12} />
                    Clear {searchQuery && activeCategory ? 'all' : searchQuery ? 'search' : 'filter'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Sorted by:</span>
              <span className="text-sm text-gray-800 font-semibold">
                {SORT_OPTIONS.find(s => s.id === filters.sortBy)?.label}
              </span>
            </div>
          </div>

          {/* Listings Grid - Professional Design */}
          {listings.length === 0 ? (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-full flex items-center justify-center border border-yellow-200 shadow-inner">
                  <FiVideo size={32} className="text-yellow-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {activeCategory 
                    ? `No ${CONTENT_TYPES.find(t => t.id === activeCategory)?.label.toLowerCase()} listings found` 
                    : searchQuery || Object.values(filters).some(Boolean) 
                    ? 'No listings found' 
                    : 'Welcome to Video Marketplace!'
                  }
                </h3>
                <p className="text-gray-600 text-base mb-8">
                  {activeCategory
                    ? `There are currently no ${CONTENT_TYPES.find(t => t.id === activeCategory)?.label.toLowerCase()} listings. Be the first to create one!`
                    : searchQuery || Object.values(filters).some(Boolean)
                    ? 'Try adjusting your search or filters to find what you\'re looking for.'
                    : 'Be the first to upload a video and start selling!'
                  }
                </p>
                {marketplaceApi.utils.checkAuth() && (
                  <button 
                    onClick={() => navigate('/marketplace/create')}
                    className="inline-flex items-center justify-center px-6 py-3.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 border border-yellow-500"
                  >
                    <FiPlus className="mr-2" size={18} />
                    Upload Your First Video
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map(listing => {
                const { url: mediaUrl, isVideo, isImage } = getFirstMediaUrl(listing.mediaUrls || []);
                const thumbnailUrl = getThumbnailUrl(listing);
                const qualityBadge = getQualityBadge(listing.quality);
                const contentType = CONTENT_TYPES.find(t => t.id === listing.type);
                
                return (
                  <div 
                    key={listing._id} 
                    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group"
                    onMouseEnter={() => setHoveredListing(listing._id)}
                    onMouseLeave={() => setHoveredListing(null)}
                  >
                    {/* Media Thumbnail */}
                    <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                      {mediaUrl ? (
                        isVideo ? (
                          // Video thumbnail with play button
                          <div 
                            className="relative w-full h-full cursor-pointer"
                            onClick={() => handleVideoClick(mediaUrl, listing.title, listing)}
                          >
                            <video
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              preload="metadata"
                              poster={listing.mediaUrls?.find(url => isImageUrl(url)) || ''}
                            >
                              <source src={mediaUrl} type="video/mp4" />
                            </video>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-300">
                              <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300">
                                <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                            <div className="absolute top-3 left-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                                Video
                              </span>
                            </div>
                          </div>
                        ) : isImage ? (
                          // Image thumbnail
                          <div className="relative w-full h-full">
                            <img
                              src={thumbnailUrl}
                              alt={listing.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              onError={() => handleImageError(listing._id)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                        ) : (
                          // Generic media
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300">
                            <div className="text-center transform group-hover:scale-110 transition-transform duration-300">
                              <svg className="w-12 h-12 text-blue-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <p className="text-sm text-blue-600 mt-2">Media File</p>
                            </div>
                          </div>
                        )
                      ) : (
                        // No media
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-300">
                          <div className="text-center transform group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm text-gray-500 mt-2">No Media</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Quality Badge */}
                      {qualityBadge.label && (
                        <div className={`absolute top-3 right-3 z-10 px-2 py-1 rounded ${qualityBadge.color} text-xs font-bold shadow-sm`}>
                          {qualityBadge.label}
                        </div>
                      )}
                      
                      {/* Content Type Badge */}
                      <div className="absolute top-3 left-3 z-10">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          contentType?.color || 'bg-gray-600'
                        } text-white border border-white/30 shadow-sm`}>
                          <span className="mr-1">{contentType?.icon || '📁'}</span>
                          <span className="font-semibold">
                            {contentType?.label || listing.type || 'Sale'}
                          </span>
                        </span>
                      </div>
                      
                      {/* Price Tag */}
                      <div className="absolute bottom-3 left-3">
                        <div className="bg-black text-white px-3 py-1.5 rounded-lg shadow-lg">
                          <p className="text-lg font-bold">{formatCurrency(listing.price)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Listing Info */}
                    <div className="p-5">
                      <div className="mb-4">
                        <h3 
                          className="font-semibold text-gray-900 mb-2 truncate group-hover:text-blue-600 transition-colors cursor-pointer"
                          title={listing.title}
                          onClick={() => handleViewDetails(listing._id)}
                        >
                          {listing.title}
                        </h3>
                        
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3" title={listing.description}>
                          {listing.description}
                        </p>
                        
                  
                      </div>
                      
                      {/* Tags */}
                      {listing.tags && listing.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {listing.tags.slice(0, 3).map((tag, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300 transition-colors cursor-default"
                              title={tag}
                            >
                              #{tag}
                            </span>
                          ))}
                          {listing.tags.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600 border border-gray-300">
                              +{listing.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Action Button - Only Buy Now */}
                      <div className="pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleMakeOffer(listing)}
                          className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center hover:shadow-lg transform hover:-translate-y-0.5 border border-yellow-500"
                        >
                          <FiDollarSign className="w-4 h-4 mr-2" />
                          Buy Now - {formatCurrency(listing.price)}
                        </button>
                      </div>
                      
                      {/* Seller Info */}
                      <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                            {listing.sellerId?.avatar ? (
                              <img 
                                src={listing.sellerId.avatar} 
                                alt={listing.sellerId.username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32/F3F4F6/9CA3AF?text=U';
                                }}
                              />
                            ) : (
                              <FiUser size={14} className="text-gray-600" />
                            )}
                          </div>
                          <span className="text-xs text-gray-700 truncate max-w-[100px] font-medium">
                            {listing.sellerId?.username || 'Seller'}
                          </span>
                        </div>
                        
                        {listing.duration && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <FiClock size={10} />
                            {listing.duration}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More - Professional */}
          {listings.length > 0 && listings.length >= 12 && (
            <div className="mt-8 text-center">
              <button 
                onClick={fetchListings}
                className="inline-flex items-center justify-center px-6 py-3.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl border border-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span>Load More Videos</span>
                <FiPlus className="ml-2" size={18} />
              </button>
            </div>
          )}

          {/* Call to Action Footer - Professional */}
          <div className="mt-12 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Start Your Video Journey Today
              </h2>
              <p className="text-gray-600 mb-6">
                Join thousands of creators and buyers in our thriving video marketplace. 
                Whether you're looking to sell your work or find the perfect video, we've got you covered.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={() => navigate('/marketplace/create')}
                  className="px-8 py-3.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl border border-yellow-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Start Selling Videos
                </button>
                <button 
                  onClick={() => setShowFilters(true)}
                  className="px-8 py-3.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-200"
                >
                  Explore Marketplace
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Popup Modal */}
      <VideoPlayerModal
        show={showVideoPopup}
        videoUrl={selectedVideo}
        videoTitle={videoTitle}
        videoThumbnail={videoListing ? getThumbnailUrl(videoListing) : ''}
        onClose={handleCloseVideoPopup}
      />

      {/* Offer Modal */}
      <OfferModal
        show={showOfferModal}
        selectedListing={selectedListing}
        offerForm={offerForm}
        onClose={() => setShowOfferModal(false)}
        onSubmit={handleSubmitOffer}
        onOfferFormChange={handleOfferFormChange}
        paymentStatus={paymentStatus}
        error={error}
        getThumbnailUrl={getThumbnailUrl}
      />

      {/* Payment Modal */}
      <PaymentModal
        show={showPaymentModal}
        clientSecret={clientSecret}
        offerData={offerData}
        onClose={handlePaymentClose}
        onSuccess={handlePaymentSuccess}
        paymentStatus={paymentStatus}
        setPaymentStatus={setPaymentStatus}
        currentUser={currentUser}
        getThumbnailUrl={getThumbnailUrl}
      />
    </MarketplaceLayout>
  );
};

export default Browse;