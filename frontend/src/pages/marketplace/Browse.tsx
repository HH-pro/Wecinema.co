import React, { useState, useEffect, useRef } from 'react';
import ListingCard from '../../components/marketplae/ListingCard';
import MarketplaceLayout from '../../components/Layout';
import { Listing } from '../../types/marketplace';
import { 
  FiFilter, FiPlus, FiSearch, FiX, FiCreditCard, FiCheck, FiAlertCircle, 
  FiLoader, FiUser, FiCalendar, FiMail, FiPlay, FiPause, FiVolume2, 
  FiVolumeX, FiMaximize, FiEye, FiHeart, FiImage, FiVideo 
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
const ERROR_IMAGE = 'https://via.placeholder.com/300x200/cccccc/ffffff?text=Preview+Unavailable';

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
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    type: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest'
  });

  const [offerForm, setOfferForm] = useState({
    amount: '',
    message: '',
    requirements: '',
    expectedDelivery: ''
  });

  // Video player ref
  const videoRef = useRef<HTMLVideoElement>(null);

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
    setShowVideoPopup(true);
  };

  // Close video popup
  const handleCloseVideoPopup = () => {
    setShowVideoPopup(false);
    setSelectedVideo('');
    setVideoTitle('');
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
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
      sortBy: 'newest'
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
    
    // Try to find an image first
    const imageUrl = listing.mediaUrls.find(url => 
      url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
    );
    
    if (imageUrl) return imageUrl;
    
    // Check if there's a video URL
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

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading listings...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FiAlertCircle className="text-red-500 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Video Marketplace</h1>
                <p className="mt-2 text-gray-600">
                  Discover amazing video content, scripts, and creative assets
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {marketplaceApi.utils.checkAuth() && (
                  <>
                    <button 
                      onClick={() => navigate('/marketplace/create')}
                      className="inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-transparent text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                    >
                      <FiPlus className="mr-2" size={18} />
                      <span className="hidden sm:inline">Create Listing</span>
                      <span className="sm:hidden">Create</span>
                    </button>
                    <button 
                      onClick={() => navigate('/marketplace/my-orders')}
                      className="inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                    >
                      <FiCreditCard className="mr-2" size={18} />
                      <span className="hidden sm:inline">My Offers</span>
                      <span className="sm:hidden">Offers</span>
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                >
                  <FiFilter className="mr-2" size={18} />
                  <span className="hidden sm:inline">Filters</span>
                  <span className="sm:hidden">Filter</span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-6 max-w-2xl">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" size={20} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos, scripts, or creative assets..."
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200 text-sm sm:text-base"
                />
              </div>
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-yellow-600 hover:text-yellow-500 font-medium"
                >
                  Clear all
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Listing Type
                  </label>
                  <select 
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200 text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="for_sale">For Sale</option>
                    <option value="licensing">Licensing</option>
                    <option value="adaptation_rights">Adaptation Rights</option>
                    <option value="commission">Commission</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Video, Script, Music, Animation..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Price
                  </label>
                  <input
                    type="number"
                    placeholder="$0"
                    value={filters.minPrice}
                    onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select 
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200 text-sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-gray-600 text-sm sm:text-base">
              Showing <span className="font-semibold">{filteredListings.length}</span> listings
              {searchQuery && (
                <span> for "<span className="font-semibold">{searchQuery}</span>"</span>
              )}
            </p>
            
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm text-yellow-600 hover:text-yellow-500 font-medium self-start sm:self-auto"
              >
                Clear search
              </button>
            )}
          </div>

          {/* Listings Grid */}
          {filteredListings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <FiSearch size={24} className="text-gray-400 sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery || Object.values(filters).some(Boolean) 
                    ? 'No listings found' 
                    : 'No listings yet'
                  }
                </h3>
                <p className="text-gray-600 text-sm sm:text-base mb-6">
                  {searchQuery || Object.values(filters).some(Boolean)
                    ? 'Try adjusting your search or filters to find what you\'re looking for.'
                    : 'Be the first to create a listing and start trading!'
                  }
                </p>
                {marketplaceApi.utils.checkAuth() && (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button 
                      onClick={() => navigate('/marketplace/create')}
                      className="inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                    >
                      <FiPlus className="mr-2" size={18} />
                      Create First Listing
                    </button>
                  </div>
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
                
                return (
                  <div key={listing._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-200 group">
                    {/* Video/Image Preview */}
                    <div 
                      className="relative h-48 bg-gray-900 cursor-pointer overflow-hidden"
                      onClick={() => {
                        if (isVideo && videoUrl) {
                          handleVideoClick(videoUrl, listing.title);
                        }
                      }}
                    >
                      {/* Thumbnail Image with fallback */}
                      <div className="relative w-full h-full">
                        <img
                          src={thumbnailUrl}
                          alt={listing.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={() => handleImageError(listing._id)}
                          loading="lazy"
                        />
                        
                        {/* Loading skeleton */}
                        <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
                        
                        {/* Play Button Overlay for Videos */}
                        {mediaType === 'video' && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 transform group-hover:scale-110 transition-transform duration-300">
                              <FiPlay className="text-white ml-1" size={28} />
                            </div>
                          </div>
                        )}
                        
                        {/* Media Type Badge */}
                        <div className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm ${mediaType === 'video' ? 'bg-red-500/80' : 'bg-blue-500/80'}`}>
                          {mediaType === 'video' ? (
                            <>
                              <FiVideo size={10} />
                              VIDEO
                            </>
                          ) : mediaType === 'image' ? (
                            <>
                              <FiImage size={10} />
                              IMAGE
                            </>
                          ) : (
                            <>
                              <FiImage size={10} />
                              MEDIA
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Category Badge */}
                      <div className="absolute bottom-2 left-2">
                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm bg-yellow-500/90">
                          {listing.category}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 truncate text-sm group-hover:text-yellow-600 transition-colors">
                          {listing.title}
                        </h3>
                        <div className="text-xs text-gray-500">
                          {listing.duration || 'N/A'}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                        {listing.description}
                      </p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {listing.sellerId?.avatar ? (
                              <img 
                                src={listing.sellerId.avatar} 
                                alt={listing.sellerId.username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/24/cccccc/ffffff?text=U';
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
                        <div className="text-green-600 font-bold">
                          {marketplaceApi.utils.formatCurrency(listing.price)}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMakeOffer(listing)}
                          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-2 group/btn"
                        >
                          <FiCreditCard size={14} className="group-hover/btn:scale-110 transition-transform" />
                          Make Offer
                        </button>
                        {mediaType === 'video' && videoUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVideoClick(videoUrl, listing.title);
                            }}
                            className="px-3 bg-gray-800 hover:bg-gray-900 text-white text-sm py-2 rounded-md transition-colors duration-200 flex items-center gap-2 group/play"
                          >
                            <FiPlay size={14} className="group-hover/play:scale-110 transition-transform" />
                            Play
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
            <div className="mt-8 sm:mt-12 text-center">
              <button 
                onClick={fetchListings}
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
              >
                Load more listings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Video Popup Modal */}
      {showVideoPopup && selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-black rounded-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-center">
              <div className="text-white truncate max-w-[80%]">
                <h3 className="text-lg font-semibold truncate">{videoTitle}</h3>
                <p className="text-sm text-gray-300 truncate">{selectedVideo}</p>
              </div>
              <button
                onClick={handleCloseVideoPopup}
                className="text-white hover:text-gray-300 p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <FiX size={24} />
              </button>
            </div>
            
            {/* Video Player */}
            <div className="relative w-full h-[70vh] bg-black flex items-center justify-center">
              {isVideoUrl(selectedVideo) ? (
                <video
                  ref={videoRef}
                  src={selectedVideo}
                  controls
                  autoPlay
                  className="w-full h-full object-contain bg-black"
                  onError={(e) => {
                    console.error('Video playback error:', e);
                    const videoElement = e.target as HTMLVideoElement;
                    videoElement.controls = false;
                    videoElement.innerHTML = `
                      <div class="flex flex-col items-center justify-center h-full text-white p-8 text-center">
                        <FiAlertCircle class="text-red-500 mb-4" size={48} />
                        <h4 class="text-xl font-semibold mb-2">Unable to Play Video</h4>
                        <p class="text-gray-300">The video format is not supported or the URL is invalid.</p>
                        <p class="text-sm text-gray-400 mt-2">URL: ${selectedVideo}</p>
                      </div>
                    `;
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center">
                  <FiAlertCircle className="text-red-500 mb-4" size={48} />
                  <h4 className="text-xl font-semibold mb-2">Invalid Video URL</h4>
                  <p className="text-gray-300">The provided URL is not a valid video source.</p>
                  <p className="text-sm text-gray-400 mt-2 break-all max-w-full">{selectedVideo}</p>
                </div>
              )}
            </div>
            
            {/* Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      if (videoRef.current.paused) {
                        videoRef.current.play();
                      } else {
                        videoRef.current.pause();
                      }
                    }
                  }}
                  className="text-white hover:text-yellow-400 p-3 rounded-full hover:bg-white/10 transition-colors"
                  title="Play/Pause"
                >
                  <FiPlay size={20} />
                </button>
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !videoRef.current.muted;
                    }
                  }}
                  className="text-white hover:text-yellow-400 p-3 rounded-full hover:bg-white/10 transition-colors"
                  title="Mute/Unmute"
                >
                  <FiVolume2 size={20} />
                </button>
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      if (document.fullscreenElement) {
                        document.exitFullscreen();
                      } else {
                        videoRef.current.requestFullscreen();
                      }
                    }
                  }}
                  className="text-white hover:text-yellow-400 p-3 rounded-full hover:bg-white/10 transition-colors"
                  title="Fullscreen"
                >
                  <FiMaximize size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md sm:max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden scale-95 sm:scale-100 transition-transform duration-200 ease-out">
            
            {/* Header */}
            <div className="sticky top-100 z-10 bg-gradient-to-r from-yellow-50 to-white border-b border-gray-200 p-3 sm:p-4 flex justify-between items-center">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Make an Offer</h3>
                <p className="text-xs text-gray-600">Submit your offer for this listing</p>
              </div>
              <button
                onClick={() => setShowOfferModal(false)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                <FiX size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 space-y-4">
              {/* Listing Preview */}
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm flex items-start gap-3">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-blue-300 flex-shrink-0 bg-gray-100">
                  {getThumbnailUrl(selectedListing) ? (
                    <img
                      src={getThumbnailUrl(selectedListing)}
                      alt={selectedListing.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = ERROR_IMAGE;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <FiImage className="text-gray-400" size={20} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{selectedListing.title}</h4>
                  <p className="text-gray-600 text-xs mt-1 line-clamp-2">{selectedListing.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-green-600 text-base sm:text-lg font-bold">
                      {marketplaceApi.utils.formatCurrency(selectedListing.price)}
                    </span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {selectedListing.category}
                    </span>
                  </div>
                  
                  {/* Seller Info */}
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <FiUser size={12} />
                    <span>Seller: {selectedListing.sellerId?.username || 'Seller'}</span>
                  </div>
                </div>
              </div>

              {/* Offer Form */}
              <form onSubmit={handleSubmitOffer} className="space-y-3">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">Offer Amount</label>
                  <input
                    type="number"
                    required
                    min="0.50"
                    step="0.01"
                    value={offerForm.amount}
                    onChange={(e) => setOfferForm({ ...offerForm, amount: e.target.value })}
                    className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-xs sm:text-sm"
                    placeholder="Enter your offer amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum offer: $0.50</p>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">Message to Seller</label>
                  <textarea
                    value={offerForm.message}
                    onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                    className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none outline-none text-xs sm:text-sm"
                    rows={3}
                    placeholder="Introduce yourself and explain your requirements..."
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">Expected Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={offerForm.expectedDelivery}
                    onChange={(e) => setOfferForm({ ...offerForm, expectedDelivery: e.target.value })}
                    className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-xs sm:text-sm"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Info Box */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-700 flex gap-2 items-start">
                  <FiCreditCard className="text-yellow-600 mt-0.5" size={14} />
                  <p>
                    Payment will be processed immediately and securely held in escrow until the seller accepts your offer.
                  </p>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-xs text-red-700 flex gap-2 items-start">
                    <FiAlertCircle className="text-red-600 mt-0.5" size={14} />
                    <p>{error}</p>
                  </div>
                )}
              </form>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowOfferModal(false)}
                className="flex-1 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOffer}
                disabled={paymentStatus === 'processing'}
                className="flex-1 py-2 rounded-md bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white transition-all text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
              >
                {paymentStatus === 'processing' ? (
                  <>
                    <FiLoader className="animate-spin" size={14} />
                    Processing...
                  </>
                ) : (
                  `Submit Offer & Pay $${offerForm.amount || '0.00'}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && clientSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md sm:max-w-lg mx-4">
            <div className="bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {offerData?.type === 'direct_purchase' ? 'Complete Purchase' : 'Complete Offer Payment'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {offerData?.type === 'direct_purchase' ? 'Complete your purchase securely' : 'Complete payment for your offer'}
                  </p>
                </div>
                <button 
                  onClick={handlePaymentClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={paymentStatus === 'processing'}
                >
                  <FiX size={20} className="text-gray-600" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 sm:p-6">
                  {/* Payment Summary */}
                  <div className="mb-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                          <FiCreditCard className="text-white" size={18} />
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
                    
                    {offerData?.listing && (
                      <div className="mt-3 pt-3 border-t border-yellow-300">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0 bg-gray-100">
                            {getThumbnailUrl(offerData.listing) ? (
                              <img
                                src={getThumbnailUrl(offerData.listing)}
                                alt={offerData.listing.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = ERROR_IMAGE;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <FiImage className="text-gray-400" size={16} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm truncate">
                              {offerData.listing.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {offerData.listing.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Form */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <Elements stripe={stripePromise} options={{ 
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#ca8a04',
                          borderRadius: '0.5rem',
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

                  {/* Security Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <FiCheck className="text-blue-600" size={14} />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-1">Secure Payment</h4>
                        <p className="text-xs text-blue-700">
                          Your payment is processed securely via Stripe. Your funds are held in escrow until the order is completed.
                        </p>
                      </div>
                    </div>
                  </div>
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <FiUser size={14} />
            Billing Information
          </h4>
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
            {/* Name Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={billingDetails.name || currentUser?.username || ''}
                onChange={(e) => onBillingDetailsChange({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={billingDetails.email || currentUser?.email || ''}
                onChange={(e) => onBillingDetailsChange({ email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Phone Input (Optional) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={billingDetails.phone || ''}
                onChange={(e) => onBillingDetailsChange({ phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Enter your phone number"
              />
            </div>

            {/* Address Element */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Billing Address
              </label>
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <AddressElement 
                  options={{
                    mode: 'billing',
                    allowedCountries: ['US', 'CA', 'GB', 'AU', 'IN'],
                    fields: {
                      phone: 'always'
                    },
                    validation: {
                      phone: {
                        required: 'never'
                      }
                    },
                    defaultValues: {
                      name: billingDetails.name || currentUser?.username || '',
                      phone: billingDetails.phone || '',
                      address: {
                        line1: billingDetails.address.line1 || '',
                        line2: billingDetails.address.line2 || '',
                        city: billingDetails.address.city || '',
                        state: billingDetails.address.state || '',
                        postal_code: billingDetails.address.postal_code || '',
                        country: billingDetails.address.country || 'US'
                      }
                    }
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

      {/* Payment Element */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
              <FiCreditCard size={14} />
              Payment Details
            </label>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4 bg-blue-500 rounded-sm"></div>
              <div className="w-6 h-4 bg-red-500 rounded-sm"></div>
              <div className="w-6 h-4 bg-yellow-500 rounded-sm"></div>
            </div>
          </div>
          <div className="min-h-[200px]">
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 mb-1">Payment Error</h4>
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
              <p className="text-sm text-green-700">Redirecting to your orders...</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          disabled={paymentStatus === 'processing' || paymentStatus === 'success' || isSubmitting}
          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <FiX size={16} />
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || paymentStatus === 'processing' || paymentStatus === 'success' || isSubmitting}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-sm hover:shadow disabled:shadow-none"
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
            `Pay ${marketplaceApi.utils.formatCurrency(offerData?.amount)}`
          )}
        </button>
      </div>
    </form>
  );
};

export default Browse;