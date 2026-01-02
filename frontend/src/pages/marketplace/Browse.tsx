import React, { useState, useEffect, useRef, useCallback } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { Listing } from '../../types/marketplace';
import { 
  FiFilter, FiPlus, FiSearch, FiX, FiCreditCard, FiAlertCircle, 
  FiLoader, FiUser, FiMail, FiPlay, FiImage, FiVideo, FiEye, FiHeart,
  FiChevronLeft, FiChevronRight, FiSliders, FiRefreshCw, FiTrendingUp
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import marketplaceApi from '../../api/marketplaceApi';
import VideoPlayerModal from '../../components/marketplae/VideoPlayerModal';
import PaymentModal from '../../components/marketplae/paymentModal';
import OfferModal from '../../components/marketplae/OfferModal';

// Constants for placeholder images - Higher quality Unsplash images
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
const VIDEO_PLACEHOLDER = 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
const USER_PLACEHOLDER = 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
const ERROR_IMAGE = 'https://via.placeholder.com/400x300/1f2937/ffffff?text=Preview+Unavailable';

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
  const [videoThumbnail, setVideoThumbnail] = useState<string>('');
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
  
  // New state for image loading errors
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [itemsPerPage] = useState<number>(12);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    type: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest',
    rating: ''
  });

  const [offerForm, setOfferForm] = useState({
    amount: '',
    message: '',
    requirements: '',
    expectedDelivery: ''
  });

  // Video player ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch listings and user data on component mount
  useEffect(() => {
    fetchListings();
    fetchCurrentUser();
    
    // Focus search input on mount
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [filters, currentPage]);

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
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError('');
      setImageErrors({}); // Reset image errors on new fetch
      
      // Use marketplaceApi to fetch listings
      const response = await marketplaceApi.listings.getAllListings({
        type: filters.type || undefined,
        category: filters.category || undefined,
        minPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
        sortBy: filters.sortBy,
        page: currentPage,
        limit: itemsPerPage
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch listings');
      }

      const listingsData = response.data?.listings || [];
      const total = response.data?.total || 0;
      
      // Calculate total pages
      setTotalPages(Math.ceil(total / itemsPerPage));
      
      // Apply local filtering
      const filteredData = listingsData.filter((listing: Listing) => {
        // Search filtering
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          const matchesSearch = 
            listing.title.toLowerCase().includes(searchLower) ||
            listing.description.toLowerCase().includes(searchLower) ||
            (listing.tags && listing.tags.some(tag => tag.toLowerCase().includes(searchLower)));
          if (!matchesSearch) return false;
        }
        
        // Filter by status - only show active listings
        if (listing.status !== 'active') return false;
        
        // Rating filter
        if (filters.rating) {
          const minRating = parseFloat(filters.rating);
          const sellerRating = listing.sellerId?.sellerRating || 0;
          if (sellerRating < minRating) return false;
        }
        
        return true;
      });

      // Apply sorting
      const sortedData = sortListings(filteredData, filters.sortBy);
      
      // Pre-generate video thumbnails
      const thumbnails: Record<string, string> = {};
      sortedData.forEach(listing => {
        const videoUrl = getFirstVideoUrl(listing);
        if (videoUrl) {
          thumbnails[listing._id] = generateVideoThumbnail(videoUrl);
        }
      });
      setVideoThumbnails(thumbnails);
      
      setListings(sortedData);
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      setError(error.message || 'Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Local sorting function
  const sortListings = (data: Listing[], sortBy: string) => {
    const sortedData = [...data];
    
    switch (sortBy) {
      case 'newest':
        return sortedData.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'oldest':
        return sortedData.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case 'price_low':
        return sortedData.sort((a, b) => a.price - b.price);
      case 'price_high':
        return sortedData.sort((a, b) => b.price - a.price);
      case 'rating':
        return sortedData.sort((a, b) => {
          const ratingA = a.sellerId?.sellerRating || 0;
          const ratingB = b.sellerId?.sellerRating || 0;
          return ratingB - ratingA;
        });
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

  // Handle video click - open popup
  const handleVideoClick = (videoUrl: string, title: string, listingId?: string) => {
    setSelectedVideo(videoUrl);
    setVideoTitle(title);
    
    // Set thumbnail for the video
    if (listingId && videoThumbnails[listingId]) {
      setVideoThumbnail(videoThumbnails[listingId]);
    } else {
      setVideoThumbnail(generateVideoThumbnail(videoUrl));
    }
    
    setShowVideoPopup(true);
  };

  // Close video popup
  const handleCloseVideoPopup = () => {
    setShowVideoPopup(false);
    setSelectedVideo('');
    setVideoTitle('');
    setVideoThumbnail('');
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Handle offer form change
  const handleOfferFormChange = (field: string, value: string) => {
    setOfferForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle offer submission
  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedListing) return;

    try {
      setPaymentStatus('processing');
      setError('');
      
      console.log('🔄 Submitting offer with payment...');

      // Use marketplaceApi to make offer
      const response = await marketplaceApi.offers.makeOffer({
        listingId: selectedListing._id,
        amount: parseFloat(offerForm.amount),
        message: offerForm.message,
        requirements: offerForm.requirements,
        expectedDelivery: offerForm.expectedDelivery
      });

      console.log('✅ Offer with payment response:', response);

      if (!response.success || !response.data?.clientSecret) {
        throw new Error(response.error || 'No client secret received from server. Please try again.');
      }

      setClientSecret(response.data.clientSecret);
      
      // Set offer data
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
      
      // Show specific guidance for common errors
      if (errorMessage.includes('already have a pending offer')) {
        setError(`${errorMessage}. You can view your existing offers in the "My Offers" section.`);
      } else if (errorMessage.includes('minimum')) {
        setError(`${errorMessage}. Please increase your offer amount.`);
      }
    }
  };

  // Handle direct payment
  const handleDirectPayment = async (listing: Listing) => {
    if (!listing._id) return;

    try {
      setPaymentStatus('processing');
      setError('');
      
      console.log('🔄 Creating direct payment for listing:', listing._id);

      // Use marketplaceApi to create direct payment
      const response = await marketplaceApi.offers.createDirectPayment(
        listing._id,
        '' // requirements (optional)
      );

      console.log('✅ Direct payment response:', response);

      if (!response.success || !response.data?.clientSecret) {
        throw new Error(response.error || 'No client secret received from server. Please try again.');
      }

      setClientSecret(response.data.clientSecret);
      
      // Set offer data
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
  
  // Handle payment success
  const handlePaymentSuccess = async () => {
    try {
      // Get the current user info
      const user = marketplaceApi.utils.getCurrentUser();
      const buyerName = user?.username || 'A buyer';

      // Log success - Email notifications are now handled by the backend
      console.log('✅ Payment completed successfully for:', {
        buyerName,
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
    
    // Refresh listings
    fetchListings();
    
    // Redirect to orders page with success message
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
      category: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'newest',
      rating: ''
    });
    setSearchQuery('');
    setError('');
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchListings();
  };

  // Handle search with debounce
  const handleSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
      setCurrentPage(1);
    }, 300),
    []
  );

  // Get first video URL from listing
  const getFirstVideoUrl = (listing: Listing): string => {
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) return '';
    
    // Find first video URL
    const videoUrl = listing.mediaUrls.find(url => 
      isVideoUrl(url)
    );
    
    return videoUrl || '';
  };

  // Generate video thumbnail from video URL
  const generateVideoThumbnail = (videoUrl: string): string => {
    // If it's a YouTube URL, generate thumbnail
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    
    // For Vimeo URLs
    if (videoUrl.includes('vimeo.com')) {
      const videoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        return `https://vumbnail.com/${videoId}_large.jpg`;
      }
    }
    
    // For Dailymotion
    if (videoUrl.includes('dailymotion.com') || videoUrl.includes('dai.ly')) {
      const videoId = videoUrl.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([^_]+)/)?.[1];
      if (videoId) {
        return `https://www.dailymotion.com/thumbnail/video/${videoId}`;
      }
    }
    
    // For direct video files, use video placeholder
    return VIDEO_PLACEHOLDER;
  };

  // Get thumbnail URL with better error handling
  const getThumbnailUrl = useCallback((listing: Listing): string => {
    const listingId = listing._id || 'unknown';
    
    // Check if this image has previously failed to load
    if (imageErrors[listingId]) {
      return ERROR_IMAGE;
    }
    
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) {
      return PLACEHOLDER_IMAGE;
    }
    
    // Try to find an image first
    const imageUrl = listing.mediaUrls.find(url => 
      url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
    );
    
    if (imageUrl) return imageUrl;
    
    // Check if we have a pre-generated video thumbnail
    if (videoThumbnails[listingId]) {
      return videoThumbnails[listingId];
    }
    
    // Check if there's a video URL
    const videoUrl = getFirstVideoUrl(listing);
    if (videoUrl) {
      const thumbnail = generateVideoThumbnail(videoUrl);
      return thumbnail;
    }
    
    // Default to the first media URL
    const firstUrl = listing.mediaUrls[0];
    if (firstUrl) {
      return firstUrl;
    }
    
    return PLACEHOLDER_IMAGE;
  }, [imageErrors, videoThumbnails]);

  // Handle image loading error
  const handleImageError = (listingId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [listingId]: true
    }));
  };

  // Check if media is a video
  const isVideoUrl = (url: string): boolean => {
    if (!url) return false;
    
    // Check for video file extensions
    const videoExtensions = /\.(mp4|mov|avi|wmv|flv|mkv|webm|m4v|ogg|ogv|3gp|3g2)$/i;
    if (videoExtensions.test(url)) {
      return true;
    }
    
    // Check for video hosting platforms
    const videoDomains = [
      'youtube.com',
      'youtu.be',
      'vimeo.com',
      'dailymotion.com',
      'twitch.tv',
      'streamable.com',
      'cloudinary.com',
      'vidyard.com',
      'wistia.com'
    ];
    
    return videoDomains.some(domain => url.includes(domain));
  };

  // Get media type for a listing
  const getMediaType = (listing: Listing): 'image' | 'video' | 'none' => {
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) {
      return 'none';
    }
    
    // Check for video
    const videoUrl = listing.mediaUrls.find(url => isVideoUrl(url));
    if (videoUrl) {
      return 'video';
    }
    
    // Check for image
    const imageUrl = listing.mediaUrls.find(url => 
      url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
    );
    
    if (imageUrl) {
      return 'image';
    }
    
    return 'none';
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && !isRefreshing) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-yellow-500 mx-auto mb-6"></div>
            <p className="text-gray-600 text-lg font-medium">Loading amazing content...</p>
            <p className="text-gray-500 text-sm mt-2">Discovering the best videos for you</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <FiAlertCircle className="text-red-500" size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-8 bg-yellow-500 rounded-full"></div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Video Marketplace</h1>
                </div>
                <p className="text-gray-600 text-lg">
                  Discover amazing video content, scripts, and creative assets from talented creators
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {marketplaceApi.utils.checkAuth() && (
                  <>
                    <button 
                      onClick={() => navigate('/marketplace/create')}
                      className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <FiPlus className="mr-2" size={20} />
                      <span>Create Listing</span>
                    </button>
                    <button 
                      onClick={() => navigate('/marketplace/my-orders')}
                      className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 shadow-sm hover:shadow"
                    >
                      <FiCreditCard className="mr-2" size={20} />
                      <span>My Offers</span>
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center justify-center px-5 py-3 border text-base font-medium rounded-xl transition-all duration-200 ${
                    showFilters 
                      ? 'border-yellow-500 text-yellow-600 bg-yellow-50 shadow-sm' 
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm hover:shadow'
                  }`}
                >
                  <FiSliders className="mr-2" size={20} />
                  <span>Filters</span>
                </button>
                
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiRefreshCw className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} size={20} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-8 max-w-2xl">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400 group-hover:text-gray-500 transition-colors" size={22} />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  defaultValue={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search videos, scripts, or creative assets..."
                  className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 text-base shadow-sm hover:shadow group-hover:border-gray-300"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      if (searchInputRef.current) searchInputRef.current.value = '';
                    }}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    <FiX className="text-gray-400 hover:text-gray-600 transition-colors" size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 animate-slideDown">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Filters & Sorting</h3>
                  <p className="text-gray-600 text-sm mt-1">Refine your search results</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-lg transition-colors"
                  >
                    <FiX className="mr-1" size={16} />
                    Clear all
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <FiSliders className="inline mr-2" size={16} />
                    Listing Type
                  </label>
                  <select 
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-sm bg-gray-50"
                  >
                    <option value="">All Types</option>
                    <option value="for_sale">For Sale</option>
                    <option value="licensing">Licensing</option>
                    <option value="adaptation_rights">Adaptation Rights</option>
                    <option value="commission">Commission</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Category
                  </label>
                  <input
                    type="text"
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Video, Script, Music, Animation..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-sm bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Price Range
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="$ Min"
                      value={filters.minPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-sm bg-gray-50"
                    />
                    <input
                      type="number"
                      placeholder="$ Max"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-sm bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <FiTrendingUp className="inline mr-2" size={16} />
                    Sort By
                  </label>
                  <select 
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-sm bg-gray-50"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="popular">Most Popular</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Min Rating
                  </label>
                  <select 
                    value={filters.rating}
                    onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-sm bg-gray-50"
                  >
                    <option value="">Any Rating</option>
                    <option value="4.5">★★★★☆ & up</option>
                    <option value="4">★★★★☆ & up</option>
                    <option value="3">★★★☆☆ & up</option>
                    <option value="2">★★☆☆☆ & up</option>
                    <option value="1">★☆☆☆☆ & up</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Stats and Info Bar */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-100 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {searchQuery ? 'Search Results' : 'Featured Content'}
                  </h3>
                  <p className="text-gray-600">
                    Showing <span className="font-bold text-yellow-600">{listings.length}</span> listings
                    {searchQuery && (
                      <span> for "<span className="font-semibold">{searchQuery}</span>"</span>
                    )}
                  </p>
                </div>
                
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      if (searchInputRef.current) searchInputRef.current.value = '';
                    }}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 rounded-lg transition-colors self-start sm:self-auto"
                  >
                    <FiX className="mr-1" size={16} />
                    Clear search
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Listings Grid */}
          {listings.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="max-w-lg mx-auto">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <FiSearch size={48} className="text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {searchQuery || Object.values(filters).some(Boolean) 
                    ? 'No matching listings found' 
                    : 'No listings yet'
                  }
                </h3>
                <p className="text-gray-600 text-lg mb-8">
                  {searchQuery || Object.values(filters).some(Boolean)
                    ? 'Try adjusting your search or filters to find what you\'re looking for.'
                    : 'Be the first to create a listing and start trading in the marketplace!'
                  }
                </p>
                {marketplaceApi.utils.checkAuth() && (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                      onClick={() => navigate('/marketplace/create')}
                      className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <FiPlus className="mr-2" size={20} />
                      Create First Listing
                    </button>
                    <button 
                      onClick={clearFilters}
                      className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 shadow-sm hover:shadow"
                    >
                      <FiFilter className="mr-2" size={20} />
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {listings.map(listing => {
                  const thumbnailUrl = getThumbnailUrl(listing);
                  const videoUrl = getFirstVideoUrl(listing);
                  const isVideo = isVideoUrl(videoUrl);
                  const mediaType = getMediaType(listing);
                  const isHovered = hoveredCard === listing._id;
                  
                  return (
                    <div 
                      key={listing._id} 
                      className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-200 transform hover:-translate-y-1"
                      onMouseEnter={() => setHoveredCard(listing._id)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      {/* Video/Image Preview */}
                      <div 
                        className="relative h-56 bg-gradient-to-br from-gray-900 to-black cursor-pointer overflow-hidden"
                        onClick={() => {
                          if (isVideo && videoUrl) {
                            handleVideoClick(videoUrl, listing.title, listing._id);
                          } else {
                            handleViewDetails(listing._id);
                          }
                        }}
                      >
                        {/* Thumbnail Image */}
                        <div className="relative w-full h-full">
                          <img
                            src={thumbnailUrl}
                            alt={listing.title}
                            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                            onError={() => handleImageError(listing._id)}
                            loading="lazy"
                            style={{
                              opacity: isHovered ? 0.95 : 1
                            }}
                          />
                          
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-60"></div>
                          
                          {/* Play Button Overlay for Videos */}
                          {mediaType === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className={`w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center border-4 border-white/20 backdrop-blur-sm transform transition-all duration-300 ${
                                isHovered ? 'scale-125' : 'scale-100'
                              }`}>
                                <FiPlay className="text-white ml-1" size={28} />
                              </div>
                            </div>
                          )}
                          
                          {/* Media Type Badge */}
                          <div className={`absolute top-3 right-3 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md shadow-lg ${
                            mediaType === 'video' 
                              ? 'bg-gradient-to-r from-red-500/90 to-pink-500/90' 
                              : 'bg-gradient-to-r from-blue-500/90 to-cyan-500/90'
                          }`}>
                            {mediaType === 'video' ? (
                              <>
                                <FiVideo size={12} />
                                <span className="font-semibold">VIDEO</span>
                              </>
                            ) : mediaType === 'image' ? (
                              <>
                                <FiImage size={12} />
                                <span className="font-semibold">IMAGE</span>
                              </>
                            ) : (
                              <>
                                <FiImage size={12} />
                                <span className="font-semibold">MEDIA</span>
                              </>
                            )}
                          </div>
                          
                          {/* Views Badge */}
                          {listing.views && listing.views > 0 && (
                            <div className="absolute top-3 left-3 text-white text-xs px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm flex items-center gap-1">
                              <FiEye size={10} />
                              <span>{listing.views.toLocaleString()} views</span>
                            </div>
                          )}
                          
                          {/* Category Badge */}
                          <div className="absolute bottom-3 left-3">
                            <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm font-semibold shadow-lg">
                              {listing.category}
                            </span>
                          </div>
                          
                          {/* Price Overlay */}
                          <div className="absolute bottom-3 right-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg font-bold shadow-lg">
                            {marketplaceApi.utils.formatCurrency(listing.price)}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        {/* Title and Duration */}
                        <div className="flex justify-between items-start mb-3">
                          <h3 
                            className="font-bold text-gray-900 text-lg truncate cursor-pointer hover:text-yellow-600 transition-colors"
                            onClick={() => handleViewDetails(listing._id)}
                          >
                            {listing.title}
                          </h3>
                          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md whitespace-nowrap">
                            {listing.duration || 'N/A'}
                          </div>
                        </div>
                        
                        {/* Description */}
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                          {listing.description}
                        </p>
                        
                        {/* Seller Info */}
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm">
                              {listing.sellerId?.avatar ? (
                                <img 
                                  src={listing.sellerId.avatar} 
                                  alt={listing.sellerId.username}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = USER_PLACEHOLDER;
                                  }}
                                />
                              ) : (
                                <FiUser size={14} className="text-gray-600" />
                              )}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                {listing.sellerId?.username || 'Seller'}
                              </span>
                              {listing.sellerId?.sellerRating && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className="flex text-yellow-400">
                                    {'★'.repeat(Math.floor(listing.sellerId.sellerRating))}
                                    {'☆'.repeat(5 - Math.floor(listing.sellerId.sellerRating))}
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    ({listing.sellerId.sellerRating.toFixed(1)})
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Type Badge */}
                          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                            {listing.type?.replace('_', ' ').toUpperCase() || 'FOR SALE'}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleMakeOffer(listing)}
                            className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-sm py-2.5 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                          >
                            <FiCreditCard size={16} />
                            Make Offer
                          </button>
                          {mediaType === 'video' && videoUrl && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVideoClick(videoUrl, listing.title, listing._id);
                              }}
                              className="px-4 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white text-sm py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            >
                              <FiPlay size={16} />
                              Preview
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiChevronLeft size={20} />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-xl font-medium transition-all ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      <VideoPlayerModal
        show={showVideoPopup}
        videoUrl={selectedVideo}
        videoTitle={videoTitle}
        videoThumbnail={videoThumbnail}
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
        billingDetails={billingDetails}
        onBillingDetailsChange={handleBillingDetailsChange}
        currentUser={currentUser}
        getThumbnailUrl={getThumbnailUrl}
      />
    </MarketplaceLayout>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default Browse;