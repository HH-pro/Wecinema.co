import React, { useState, useEffect, useRef } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { Listing } from '../../types/marketplace';
import { 
  FiFilter, FiPlus, FiSearch, FiX, FiCreditCard, FiCheck, FiAlertCircle, 
  FiLoader, FiUser, FiPlay, FiPause, FiVolume2, 
  FiVolumeX, FiMaximize, FiEye, FiHeart, FiImage, FiVideo,
  FiClock, FiDollarSign, FiStar, FiShoppingCart, FiTag
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements, AddressElement } from '@stripe/react-stripe-js';
import marketplaceApi from '../../api/marketplaceApi';

// Get Stripe key from environment variable
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51SKw7ZHYamYyPYbDUlqbeydcW1hVGrHOvCZ8mBwSU1gw77TIRyzng31iSqAvPIQzTYKG8UWfDew7kdKgBxsw7vtq00WTLU3YCZ";

// Initialize Stripe
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// Constants for placeholder images
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
const VIDEO_PLACEHOLDER = 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
const ERROR_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';

// Professional color scheme
const COLORS = {
  primary: '#3B82F6',    // Blue
  secondary: '#10B981',  // Emerald
  accent: '#F59E0B',     // Amber
  dark: '#1F2937',       // Gray-800
  light: '#F9FAFB',      // Gray-50
  danger: '#EF4444',     // Red-500
  success: '#10B981',    // Green-500
};

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
  const [videoLoading, setVideoLoading] = useState<boolean>(false);
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
  
  // Track image loading errors
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    type: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest',
    duration: '',
    resolution: ''
  });

  const [offerForm, setOfferForm] = useState({
    amount: '',
    message: '',
    requirements: '',
    expectedDelivery: ''
  });

  // Video player ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Fetch listings and user data on component mount
  useEffect(() => {
    fetchListings();
    fetchCurrentUser();
  }, [filters]);

  // Close video popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showVideoPopup && videoContainerRef.current && 
          !videoContainerRef.current.contains(event.target as Node)) {
        handleCloseVideoPopup();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVideoPopup]);

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
        sortBy: filters.sortBy
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch listings');
      }

      const listingsData = response.data?.listings || [];
      
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
        
        // Additional filters
        if (filters.duration && listing.duration) {
          const duration = parseDuration(listing.duration);
          const filterDuration = filters.duration;
          
          if (filterDuration === 'short' && duration > 300) return false; // > 5 minutes
          if (filterDuration === 'medium' && (duration <= 300 || duration > 900)) return false; // 5-15 minutes
          if (filterDuration === 'long' && duration <= 900) return false; // > 15 minutes
        }
        
        return true;
      });

      // Apply sorting
      const sortedData = sortListings(filteredData, filters.sortBy);
      
      setListings(sortedData);
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      setError(error.message || 'Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to parse duration string to seconds
  const parseDuration = (duration: string): number => {
    if (!duration) return 0;
    
    const parts = duration.split(':').reverse();
    let seconds = 0;
    
    if (parts[0]) seconds += parseInt(parts[0]) || 0; // seconds
    if (parts[1]) seconds += (parseInt(parts[1]) || 0) * 60; // minutes
    if (parts[2]) seconds += (parseInt(parts[2]) || 0) * 3600; // hours
    
    return seconds;
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
  const handleVideoClick = (videoUrl: string, title: string) => {
    setSelectedVideo(videoUrl);
    setVideoTitle(title);
    setVideoLoading(true);
    setShowVideoPopup(true);
    
    // Preload video
    const video = new Audio();
    video.src = videoUrl;
    video.preload = 'auto';
    
    video.onloadeddata = () => {
      setVideoLoading(false);
    };
    
    video.onerror = () => {
      setVideoLoading(false);
      setError('Failed to load video. Please check the URL.');
    };
  };

  // Close video popup
  const handleCloseVideoPopup = () => {
    setShowVideoPopup(false);
    setSelectedVideo('');
    setVideoTitle('');
    setVideoLoading(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Handle video player controls
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  };

  const handleToggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
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
      duration: '',
      resolution: ''
    });
    setSearchQuery('');
    setError('');
  };

  // Filter listings based on search query
  const filteredListings = listings.filter(listing =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (listing.tags && listing.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Handle billing details change
  const handleBillingDetailsChange = (details: any) => {
    setBillingDetails(prev => ({
      ...prev,
      ...details
    }));
  };

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
    if (!videoUrl) return VIDEO_PLACEHOLDER;
    
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
        return `https://vumbnail.com/${videoId}.jpg`;
      }
    }
    
    // For direct video files, use video placeholder
    // Note: For direct video files, you would need server-side thumbnail generation
    return VIDEO_PLACEHOLDER;
  };

  // Get thumbnail URL with better error handling
  const getThumbnailUrl = (listing: Listing): string => {
    const listingId = listing._id || 'unknown';
    
    // Check if this image has previously failed to load
    if (imageErrors[listingId]) {
      return ERROR_IMAGE;
    }
    
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) {
      return PLACEHOLDER_IMAGE;
    }
    
    // First, check if there's a dedicated thumbnail
    const thumbnailUrl = listing.mediaUrls.find(url => 
      url.includes('thumbnail') || url.includes('thumb') || url.includes('cover')
    );
    
    if (thumbnailUrl) return thumbnailUrl;
    
    // Try to find an image
    const imageUrl = listing.mediaUrls.find(url => 
      url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
    );
    
    if (imageUrl) return imageUrl;
    
    // Check if there's a video URL and generate thumbnail
    const videoUrl = getFirstVideoUrl(listing);
    if (videoUrl) {
      return generateVideoThumbnail(videoUrl);
    }
    
    // Default to the first media URL
    const firstUrl = listing.mediaUrls[0];
    if (firstUrl) {
      return firstUrl;
    }
    
    return PLACEHOLDER_IMAGE;
  };

  // Handle image loading error
  const handleImageError = (listingId: string, e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    img.src = ERROR_IMAGE;
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

  // Format price
  const formatPrice = (price: number): string => {
    return marketplaceApi.utils.formatCurrency(price);
  };

  // Format duration
  const formatDuration = (duration: string): string => {
    if (!duration) return 'N/A';
    return duration;
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-6 text-gray-600 text-lg font-medium">Loading premium content...</p>
            <p className="mt-2 text-gray-400 text-sm">Discover amazing videos and creative assets</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Premium Video Marketplace
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                Discover and trade high-quality video content, scripts, and creative assets from top creators
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Banner */}
          {error && (
            <div className="mb-8 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 shadow-sm rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <FiAlertCircle className="text-red-600" size={20} />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800">Attention Required</h3>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Search and Controls */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Search Bar */}
              <div className="flex-1 max-w-2xl">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" size={20} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search videos, animations, scripts, or assets..."
                    className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl bg-white shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <FiX className="text-gray-400 hover:text-gray-600" size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {marketplaceApi.utils.checkAuth() && (
                  <>
                    <button 
                      onClick={() => navigate('/marketplace/create')}
                      className="inline-flex items-center justify-center px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <FiPlus className="mr-2" size={18} />
                      Create Listing
                    </button>
                    <button 
                      onClick={() => navigate('/marketplace/my-orders')}
                      className="inline-flex items-center justify-center px-5 py-3 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-xl shadow-sm hover:shadow transition-all duration-200"
                    >
                      <FiShoppingCart className="mr-2" size={18} />
                      My Orders
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center justify-center px-5 py-3 font-medium rounded-xl shadow-sm transition-all duration-200 ${
                    showFilters 
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-200' 
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <FiFilter className="mr-2" size={18} />
                  Filters {showFilters ? '(Hide)' : ''}
                </button>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Advanced Filters</h3>
                  <p className="text-gray-500 text-sm mt-1">Refine your search with precision</p>
                </div>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    <FiTag className="inline mr-2" size={14} />
                    Category
                  </label>
                  <select 
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value="">All Categories</option>
                    <option value="animation">Animation</option>
                    <option value="commercial">Commercial</option>
                    <option value="documentary">Documentary</option>
                    <option value="educational">Educational</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="music">Music Video</option>
                    <option value="short-film">Short Film</option>
                    <option value="stock">Stock Footage</option>
                    <option value="vlog">Vlog</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    <FiClock className="inline mr-2" size={14} />
                    Duration
                  </label>
                  <select 
                    value={filters.duration}
                    onChange={(e) => setFilters(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value="">Any Duration</option>
                    <option value="short">Short (&lt; 5 min)</option>
                    <option value="medium">Medium (5-15 min)</option>
                    <option value="long">Long (&gt; 15 min)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    <FiDollarSign className="inline mr-2" size={14} />
                    Price Range
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    <FiStar className="inline mr-2" size={14} />
                    Sort By
                  </label>
                  <select 
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="popular">Most Popular</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {searchQuery ? `Search Results for "${searchQuery}"` : 'Featured Content'}
                </h2>
                <p className="text-gray-600 mt-2">
                  Found <span className="font-bold text-blue-600">{filteredListings.length}</span> premium listings
                  {filters.category && (
                    <span> in <span className="font-semibold text-purple-600">{filters.category}</span></span>
                  )}
                </p>
              </div>
              
              {filteredListings.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    Showing 1-{Math.min(filteredListings.length, 12)} of {filteredListings.length}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Listings Grid */}
          {filteredListings.length === 0 ? (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <FiSearch size={32} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {searchQuery || Object.values(filters).some(Boolean) 
                    ? 'No content found' 
                    : 'No listings yet'
                  }
                </h3>
                <p className="text-gray-600 mb-8">
                  {searchQuery || Object.values(filters).some(Boolean)
                    ? 'Try different keywords or adjust your filters.'
                    : 'Be the first to share your creative work!'
                  }
                </p>
                {marketplaceApi.utils.checkAuth() && (
                  <button 
                    onClick={() => navigate('/marketplace/create')}
                    className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    <FiPlus className="mr-3" size={20} />
                    Upload Your First Video
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredListings.map(listing => {
                const thumbnailUrl = getThumbnailUrl(listing);
                const videoUrl = getFirstVideoUrl(listing);
                const isVideo = isVideoUrl(videoUrl);
                const mediaType = getMediaType(listing);
                const hasVideo = videoUrl && isVideo;
                
                return (
                  <div 
                    key={listing._id} 
                    className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200 relative"
                  >
                    {/* Premium Badge */}
                    {listing.price > 1000 && (
                      <div className="absolute top-3 left-3 z-10">
                        <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                          PREMIUM
                        </span>
                      </div>
                    )}

                    {/* Video/Image Preview */}
                    <div 
                      className="relative h-56 bg-gradient-to-br from-gray-900 to-black cursor-pointer overflow-hidden"
                      onClick={() => {
                        if (hasVideo) {
                          handleVideoClick(videoUrl, listing.title);
                        }
                      }}
                    >
                      {/* Thumbnail Image */}
                      <div className="relative w-full h-full">
                        <img
                          src={thumbnailUrl}
                          alt={listing.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => handleImageError(listing._id, e)}
                          loading="lazy"
                        />
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Play Button Overlay for Videos */}
                        {hasVideo && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30 transform scale-95 group-hover:scale-105 transition-transform duration-300">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                                <FiPlay className="text-white ml-1" size={24} />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Media Type Badge */}
                        <div className={`absolute top-3 right-3 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg backdrop-blur-sm flex items-center gap-1.5 ${
                          mediaType === 'video' ? 'bg-red-500/90' : 'bg-blue-500/90'
                        }`}>
                          {mediaType === 'video' ? (
                            <>
                              <FiVideo size={12} />
                              VIDEO
                            </>
                          ) : (
                            <>
                              <FiImage size={12} />
                              IMAGE
                            </>
                          )}
                        </div>
                        
                        {/* Duration Badge for Videos */}
                        {listing.duration && hasVideo && (
                          <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                            <FiClock className="inline mr-1" size={10} />
                            {formatDuration(listing.duration)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {/* Title and Category */}
                      <div className="mb-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                            {listing.title}
                          </h3>
                        </div>
                        
                        {/* Category Tag */}
                        <div className="mt-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {listing.category || 'Uncategorized'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-5 line-clamp-2 leading-relaxed">
                        {listing.description}
                      </p>
                      
                      {/* Seller and Rating */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm">
                              {listing.sellerId?.avatar ? (
                                <img 
                                  src={listing.sellerId.avatar} 
                                  alt={listing.sellerId.username}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${listing.sellerId.username}&background=3B82F6&color=fff`;
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">
                                    {listing.sellerId?.username?.charAt(0).toUpperCase() || 'S'}
                                  </span>
                                </div>
                              )}
                            </div>
                            {listing.sellerId?.verified && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                <FiCheck size={10} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {listing.sellerId?.username || 'Seller'}
                            </div>
                            <div className="flex items-center gap-1">
                              <FiStar size={12} className="text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-600">
                                {listing.sellerId?.sellerRating?.toFixed(1) || 'New'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Price */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            {formatPrice(listing.price)}
                          </div>
                          {listing.originalPrice && listing.originalPrice > listing.price && (
                            <div className="text-sm text-gray-500 line-through">
                              {formatPrice(listing.originalPrice)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleMakeOffer(listing)}
                          className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group/btn"
                        >
                          <FiCreditCard size={16} className="group-hover/btn:scale-110 transition-transform" />
                          Make Offer
                        </button>
                        
                        {hasVideo && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVideoClick(videoUrl, listing.title);
                            }}
                            className="px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <FiPlay size={16} />
                            <span className="hidden sm:inline">Preview</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {filteredListings.length > 0 && filteredListings.length >= 12 && (
            <div className="mt-12 text-center">
              <button 
                onClick={fetchListings}
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 font-medium rounded-xl bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Load More Content
                <FiPlus className="ml-2" size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Video Popup Modal - Professional */}
      {showVideoPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <div 
            ref={videoContainerRef}
            className="relative w-full max-w-6xl bg-black rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 to-transparent p-6 flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white truncate">{videoTitle}</h3>
                <p className="text-gray-300 text-sm truncate">{selectedVideo}</p>
              </div>
              <button
                onClick={handleCloseVideoPopup}
                className="ml-4 p-3 rounded-full hover:bg-white/10 text-white hover:text-gray-300 transition-colors flex-shrink-0"
              >
                <FiX size={24} />
              </button>
            </div>
            
            {/* Video Player */}
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              {videoLoading ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="mt-4 text-white text-lg font-medium">Loading video...</p>
                  <p className="text-gray-400 text-sm mt-1">Please wait</p>
                </div>
              ) : selectedVideo && isVideoUrl(selectedVideo) ? (
                <video
                  ref={videoRef}
                  src={selectedVideo}
                  controls
                  autoPlay
                  className="w-full h-full object-contain bg-black"
                  onLoadedData={() => setVideoLoading(false)}
                  onError={(e) => {
                    console.error('Video playback error:', e);
                    setVideoLoading(false);
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
                    <FiAlertCircle className="text-red-600" size={32} />
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-3">Unable to Play Video</h4>
                  <p className="text-gray-300 mb-4 max-w-md">
                    The video format is not supported or the URL is invalid.
                  </p>
                  <p className="text-sm text-gray-400 break-all max-w-xl">
                    {selectedVideo}
                  </p>
                </div>
              )}
            </div>
            
            {/* Custom Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={handlePlayPause}
                  className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Play/Pause"
                >
                  <FiPlay size={20} />
                </button>
                <button
                  onClick={handleToggleMute}
                  className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Mute/Unmute"
                >
                  <FiVolume2 size={20} />
                </button>
                <button
                  onClick={handleToggleFullscreen}
                  className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Fullscreen"
                >
                  <FiMaximize size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer Modal - Professional */}
      {showOfferModal && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Make an Offer</h3>
                  <p className="text-blue-100 mt-1">Submit your offer for this premium content</p>
                </div>
                <button
                  onClick={() => setShowOfferModal(false)}
                  className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Listing Preview */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-start gap-5">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-md flex-shrink-0">
                    <img
                      src={getThumbnailUrl(selectedListing)}
                      alt={selectedListing.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = ERROR_IMAGE;
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-lg">{selectedListing.title}</h4>
                    <p className="text-gray-600 text-sm mt-2 line-clamp-2">{selectedListing.description}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatPrice(selectedListing.price)}
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full">
                        {selectedListing.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Offer Form */}
              <form onSubmit={handleSubmitOffer} className="space-y-5">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Offer Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      required
                      min="0.50"
                      step="0.01"
                      value={offerForm.amount}
                      onChange={(e) => setOfferForm({ ...offerForm, amount: e.target.value })}
                      className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your offer amount"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Minimum offer: $0.50</p>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Message to Creator
                  </label>
                  <textarea
                    value={offerForm.message}
                    onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                    rows={3}
                    placeholder="Introduce yourself and explain your requirements..."
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Expected Delivery Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={offerForm.expectedDelivery}
                    onChange={(e) => setOfferForm({ ...offerForm, expectedDelivery: e.target.value })}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Security Note */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <FiCreditCard className="text-yellow-600" size={18} />
                    </div>
                    <div>
                      <h5 className="font-semibold text-yellow-800 mb-1">Secure Payment Protection</h5>
                      <p className="text-yellow-700 text-sm">
                        Your payment is securely held in escrow until the creator accepts your offer and delivers the content.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-5 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowOfferModal(false)}
                  className="flex-1 py-3.5 px-6 border-2 border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400 font-medium rounded-xl transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitOffer}
                  disabled={paymentStatus === 'processing'}
                  className="flex-1 py-3.5 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {paymentStatus === 'processing' ? (
                    <>
                      <FiLoader className="animate-spin" size={18} />
                      Processing...
                    </>
                  ) : (
                    `Submit Offer & Pay $${offerForm.amount || '0.00'}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && clientSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg">
            <Elements stripe={stripePromise} options={{ 
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#3B82F6',
                  borderRadius: '1rem',
                  fontFamily: 'Inter, system-ui, sans-serif',
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
      setError('Payment system not ready. Please refresh the page and try again.');
      return;
    }

    setIsSubmitting(true);
    setPaymentStatus('processing');
    setError('');

    try {
      console.log('🔄 Confirming payment...');

      // Get user info
      const userInfo = {
        name: currentUser?.username || billingDetails.name || 'Customer',
        email: currentUser?.email || billingDetails.email || '',
        phone: billingDetails.phone || ''
      };

      // Prepare billing details for confirmPayment
      const billingDetailsForStripe = {
        name: userInfo.name,
        email: userInfo.email || undefined,
        phone: userInfo.phone || undefined,
        address: {
          line1: billingDetails.address.line1 || 'N/A',
          line2: billingDetails.address.line2 || undefined,
          city: billingDetails.address.city || 'N/A',
          state: billingDetails.address.state || 'N/A',
          postal_code: billingDetails.address.postal_code || '00000',
          country: billingDetails.address.country || 'US'
        }
      };

      console.log('📋 Billing details for Stripe:', billingDetailsForStripe);

      // Direct confirmation without submit()
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/marketplace/payment/success`,
          payment_method_data: {
            billing_details: billingDetailsForStripe
          }
        },
        redirect: 'if_required'
      });

      if (stripeError) {
        console.error('❌ Stripe payment error:', stripeError);
        setError(stripeError.message || 'Payment failed. Please try again.');
        setPaymentStatus('failed');
        setIsSubmitting(false);
        return;
      }

      console.log('✅ Stripe payment successful:', {
        paymentIntentId: paymentIntent?.id,
        status: paymentIntent?.status
      });

      // Prepare confirmation data
      let confirmationPayload;
      let confirmationEndpoint;

      if (offerData?.type === 'direct_purchase') {
        // For direct purchase, use the orders API
        confirmationEndpoint = '/marketplace/orders/confirm-payment';
        confirmationPayload = {
          orderId: offerData.order?._id,
          paymentIntentId: paymentIntent?.id,
          billingDetails: billingDetailsForStripe
        };
      } else {
        // For offers, use the offers API
        confirmationEndpoint = '/marketplace/offers/confirm-offer-payment';
        confirmationPayload = {
          offerId: offerData?.offer?._id || offerData?.offerId,
          paymentIntentId: paymentIntent?.id,
          billingDetails: billingDetailsForStripe
        };
      }

      console.log('📤 Sending confirmation to server:', {
        endpoint: confirmationEndpoint,
        payload: confirmationPayload
      });

      // Use marketplaceApi for the confirmation
      let response;
      if (offerData?.type === 'direct_purchase') {
        // Note: You'll need to add a confirmDirectPayment method to your orders API
        // For now, we'll use the offers API confirmOfferPayment as a fallback
        response = await marketplaceApi.offers.confirmOfferPayment({
          offerId: offerData.offer?._id,
          paymentIntentId: paymentIntent?.id
        });
      } else {
        response = await marketplaceApi.offers.confirmOfferPayment({
          offerId: offerData?.offer?._id || offerData?.offerId,
          paymentIntentId: paymentIntent?.id
        });
      }

      if (!response.success) {
        throw new Error(response.error || 'Payment confirmation failed');
      }

      console.log('✅ Server confirmation successful:', response.data);
      setPaymentStatus('success');
      
      // Wait a moment before redirecting to show success state
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err: any) {
      console.error('❌ Payment processing error:', err);
      
      let errorMessage = 'Payment failed. Please try again.';
      
      if (err.error) {
        errorMessage = err.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
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
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">
              {offerData?.type === 'direct_purchase' ? 'Complete Purchase' : 'Complete Offer Payment'}
            </h3>
            <p className="text-blue-100 mt-1">Secure payment processing</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={paymentStatus === 'processing'}
          >
            <FiX size={20} />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* Payment Summary */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
                <FiCreditCard className="text-white" size={20} />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">
                  {offerData?.type === 'direct_purchase' ? 'Purchase Amount' : 'Offer Amount'}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {marketplaceApi.utils.formatCurrency(offerData?.amount)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Element */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FiCreditCard size={16} />
                Payment Details
              </label>
              <div className="min-h-[220px]">
                <PaymentElement 
                  options={{
                    layout: 'tabs',
                    wallets: {
                      applePay: 'auto',
                      googlePay: 'auto'
                    },
                    fields: {
                      billingDetails: {
                        name: 'auto',
                        email: 'auto',
                        phone: 'auto',
                        address: {
                          country: 'auto',
                          postalCode: 'auto'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FiAlertCircle className="text-red-600" size={18} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-800 mb-1">Payment Error</h4>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {paymentStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <FiCheck className="text-green-600" size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-green-800">Payment Successful!</h4>
                  <p className="text-sm text-green-700 mt-1">Redirecting to your orders...</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={paymentStatus === 'processing' || paymentStatus === 'success' || isSubmitting}
              className="flex-1 py-3.5 px-6 border-2 border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400 font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <FiX size={16} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={!stripe || paymentStatus === 'processing' || paymentStatus === 'success' || isSubmitting}
              className="flex-1 py-3.5 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {paymentStatus === 'processing' || isSubmitting ? (
                <>
                  <FiLoader className="animate-spin" size={18} />
                  Processing...
                </>
              ) : paymentStatus === 'success' ? (
                <>
                  <FiCheck size={18} />
                  Success!
                </>
              ) : (
                `Pay ${marketplaceApi.utils.formatCurrency(offerData?.amount)}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Browse;