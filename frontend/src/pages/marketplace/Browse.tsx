// src/pages/marketplace/Browse.tsx
import React, { useState, useEffect, useRef } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { Listing } from '../../types/marketplace';
import { 
  FiFilter, FiPlus, FiSearch, FiX, FiCreditCard, FiAlertCircle, 
  FiLoader, FiUser, FiPlay, FiClock, FiDollarSign, FiEye, FiVideo,
  FiTrendingUp, FiTrendingDown, FiCalendar
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
  { id: 'sale', label: 'For Sale', icon: '💰', color: 'bg-green-500', textColor: 'text-green-700' },
  { id: 'commission', label: 'Commission', icon: '🎨', color: 'bg-purple-500', textColor: 'text-purple-700' },
  { id: 'adaptation', label: 'Adaptation Rights', icon: '📜', color: 'bg-blue-500', textColor: 'text-blue-700' },
  { id: 'license', label: 'License', icon: '📋', color: 'bg-amber-500', textColor: 'text-amber-700' }
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
    if (!quality) return { color: 'bg-yellow-100 text-yellow-800', label: '' };
    
    switch (quality.toLowerCase()) {
      case '4k':
      case 'ultra hd':
        return { color: 'bg-yellow-500 text-white', label: '4K' };
      case 'hd':
      case '1080p':
        return { color: 'bg-blue-500 text-white', label: 'HD' };
      default:
        return { color: 'bg-yellow-100 text-yellow-800', label: '' };
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
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
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
            </div>
            <p className="mt-8 text-gray-900 text-lg font-semibold">Loading content...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
              <div className="flex items-center gap-3">
                <FiAlertCircle className="text-red-500" size={20} />
                <div className="flex-1">
                  <p className="text-gray-900 text-sm">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  Video Marketplace
                </h1>
                <p className="text-gray-600 max-w-2xl">
                  Discover premium video content. Buy, sell, license, and commission high-quality videos.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {marketplaceApi.utils.checkAuth() && (
                  <>
                    <button 
                      onClick={() => navigate('/marketplace/create')}
                      className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FiPlus className="mr-2" size={16} />
                      Upload Video
                    </button>
                    <button 
                      onClick={() => navigate('/marketplace/my-orders')}
                      className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    >
                      <FiCreditCard className="mr-2" size={16} />
                      My Orders
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  <FiFilter className="mr-2" size={16} />
                  {showFilters ? 'Hide Filters' : 'Filters'}
                </button>
              </div>
            </div>

            {/* Content Type Buttons - Simple Design */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                Browse Content Types
              </h3>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setActiveCategory(activeCategory === type.id ? '' : type.id);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      activeCategory === type.id
                        ? `${type.color} text-white border-transparent`
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <span className="text-base">{type.icon}</span>
                    <span className="font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-6 max-w-2xl">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" size={18} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos by title, description, tags..."
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{listings.length}</div>
                  <div className="text-gray-600 text-sm">Total Listings</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FiVideo className="text-blue-600" size={18} />
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {listings.filter(l => getFirstMediaUrl(l.mediaUrls || []).isVideo).length}
                  </div>
                  <div className="text-gray-600 text-sm">Video Content</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <FiPlay className="text-green-600" size={18} />
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {new Set(listings.map(l => l.sellerId?._id)).size}
                  </div>
                  <div className="text-gray-600 text-sm">Active Creators</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FiUser className="text-purple-600" size={18} />
                </div>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <div className="mb-6 bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FiFilter className="text-gray-600" size={18} />
                  <div>
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                  </div>
                </div>
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear all
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Content Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Type
                  </label>
                  <select 
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="sale">💰 For Sale</option>
                    <option value="commission">🎨 Commission</option>
                    <option value="adaptation">📜 Adaptation Rights</option>
                    <option value="license">📋 License</option>
                  </select>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select 
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="latest">Latest First</option>
                    <option value="popular">Popular First</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                  </select>
                </div>

                {/* Price Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range (₹)
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        min="0"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={fetchListings}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          {/* Results Header */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              {activeCategory ? (
                <>
                  Showing <span className="font-semibold text-gray-900">{listings.length}</span> {CONTENT_TYPES.find(t => t.id === activeCategory)?.label.toLowerCase()} listings
                </>
              ) : (
                <>
                  Found <span className="font-semibold text-gray-900">{listings.length}</span> listings
                  {searchQuery && (
                    <span> for "<span className="font-semibold text-gray-900">{searchQuery}</span>"</span>
                  )}
                </>
              )}
            </div>
            {(searchQuery || activeCategory) && (
              <button
                onClick={() => {
                  if (searchQuery) setSearchQuery('');
                  if (activeCategory) setActiveCategory('');
                }}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <FiX size={14} />
                Clear {searchQuery && activeCategory ? 'all' : searchQuery ? 'search' : 'filter'}
              </button>
            )}
          </div>

          {/* Listings Grid */}
          {listings.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <FiVideo className="text-gray-400" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {activeCategory 
                    ? `No ${CONTENT_TYPES.find(t => t.id === activeCategory)?.label.toLowerCase()} listings found` 
                    : 'No listings found'
                  }
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  {activeCategory
                    ? `There are currently no ${CONTENT_TYPES.find(t => t.id === activeCategory)?.label.toLowerCase()} listings.`
                    : 'Try adjusting your search or filters.'
                  }
                </p>
                {marketplaceApi.utils.checkAuth() && (
                  <button 
                    onClick={() => navigate('/marketplace/create')}
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiPlus className="mr-2" size={16} />
                    Upload Video
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map(listing => {
                const { url: mediaUrl, isVideo, isImage } = getFirstMediaUrl(listing.mediaUrls || []);
                const thumbnailUrl = getThumbnailUrl(listing);
                const qualityBadge = getQualityBadge(listing.quality);
                const contentType = CONTENT_TYPES.find(t => t.id === listing.type);
                
                return (
                  <div 
                    key={listing._id} 
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
                    onMouseEnter={() => setHoveredListing(listing._id)}
                    onMouseLeave={() => setHoveredListing(null)}
                  >
                    {/* Media Thumbnail */}
                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                      {mediaUrl ? (
                        isVideo ? (
                          // Video thumbnail with play button
                          <div 
                            className="relative w-full h-full cursor-pointer"
                            onClick={() => handleVideoClick(mediaUrl, listing.title, listing)}
                          >
                            <video
                              className="w-full h-full object-cover"
                              preload="metadata"
                              poster={listing.mediaUrls?.find(url => isImageUrl(url)) || ''}
                            >
                              <source src={mediaUrl} type="video/mp4" />
                            </video>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center transition-all duration-300">
                              <div className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        ) : isImage ? (
                          // Image thumbnail
                          <div className="relative w-full h-full">
                            <img
                              src={thumbnailUrl}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={() => handleImageError(listing._id)}
                            />
                          </div>
                        ) : (
                          // Generic media
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <div className="text-center">
                              <svg className="w-10 h-10 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          </div>
                        )
                      ) : (
                        // No media
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <div className="text-center">
                            <svg className="w-10 h-10 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                      )}
                      
                      {/* Content Type Badge */}
                      <div className="absolute top-2 left-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${contentType?.color || 'bg-gray-600'} text-white`}>
                          <span className="mr-1">{contentType?.icon || '📁'}</span>
                          <span>{contentType?.label || listing.type || 'Sale'}</span>
                        </span>
                      </div>
                      
                      {/* Price Tag */}
                      <div className="absolute bottom-2 left-2">
                        <div className="bg-green-600 text-white px-2 py-1 rounded">
                          <p className="text-sm font-bold">{formatCurrency(listing.price)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Listing Info */}
                    <div className="p-4">
                      <div className="mb-3">
                        <h3 
                          className="font-semibold text-gray-900 mb-2 line-clamp-1 cursor-pointer hover:text-blue-600"
                          title={listing.title}
                          onClick={() => handleViewDetails(listing._id)}
                        >
                          {listing.title}
                        </h3>
                        
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3" title={listing.description}>
                          {listing.description}
                        </p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs text-gray-500">
                            {formatDate(listing.createdAt || '')}
                          </div>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      {listing.tags && listing.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {listing.tags.slice(0, 2).map((tag, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 border border-gray-300"
                              title={tag}
                            >
                              #{tag}
                            </span>
                          ))}
                          {listing.tags.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-200 text-gray-600 border border-gray-300">
                              +{listing.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Action Button */}
                      <div className="pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleMakeOffer(listing)}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center"
                        >
                          <FiDollarSign className="w-4 h-4 mr-2" />
                          Buy Now - {formatCurrency(listing.price)}
                        </button>
                      </div>
                      
                      {/* Seller Info */}
                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                            {listing.sellerId?.avatar ? (
                              <img 
                                src={listing.sellerId.avatar} 
                                alt={listing.sellerId.username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/28/F3F4F6/9CA3AF?text=U';
                                }}
                              />
                            ) : (
                              <FiUser size={12} className="text-gray-600" />
                            )}
                          </div>
                          <span className="text-xs text-gray-700 truncate max-w-[80px]">
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

          {/* Load More */}
          {listings.length > 0 && listings.length >= 12 && (
            <div className="mt-6 text-center">
              <button 
                onClick={fetchListings}
                className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg bg-white hover:bg-gray-50 transition-colors"
              >
                Load More Videos
              </button>
            </div>
          )}
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