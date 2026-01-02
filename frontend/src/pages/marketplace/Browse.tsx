import React, { useState, useEffect, useRef } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { Listing } from '../../types/marketplace';
import { 
  FiFilter, FiPlus, FiSearch, FiX, FiCreditCard, FiAlertCircle, 
  FiLoader, FiUser, FiMail, FiPlay, FiImage, FiVideo, FiEye, FiHeart 
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import marketplaceApi from '../../api/marketplaceApi';
import VideoPlayerModal from '../../components/marketplae/VideoPlayerModal';
import PaymentModal from '../../components/marketplae/PaymentModal';
import OfferModal from '../../components/marketplae/OfferModal';

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
  const [videoListing, setVideoListing] = useState<Listing | null>(null);
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
  const handleVideoClick = (videoUrl: string, title: string, listing: Listing) => {
    console.log('🎬 Opening video:', videoUrl);
    
    setSelectedVideo(videoUrl);
    setVideoTitle(title);
    setVideoListing(listing);
    setShowVideoPopup(true);
  };

  // Close video popup
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

  // ============================================
  // FIXED VIDEO DETECTION AND THUMBNAIL LOGIC
  // ============================================

  // Check if media is a video
  const isVideoUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    
    // Check for video file extensions
    const videoExtensions = /\.(mp4|mov|avi|wmv|flv|mkv|webm|m4v|ogg|ogv|3gp|3g2)$/i;
    
    if (videoExtensions.test(url)) {
      return true;
    }
    
    // Check for Cloudinary video URLs
    if (url.includes('cloudinary.com') && url.includes('/video/')) {
      return true;
    }
    
    return false;
  };

  // Get first video URL from listing
  const getFirstVideoUrl = (listing: Listing): string => {
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) return '';
    
    // Find first video URL
    const videoUrl = listing.mediaUrls.find(url => isVideoUrl(url));
    
    return videoUrl || '';
  };

  // Generate video thumbnail from video URL - SIMPLE AND RELIABLE
  const generateVideoThumbnail = (videoUrl: string): string => {
    if (!videoUrl) return VIDEO_PLACEHOLDER;
    
    // If it's a Cloudinary video URL, generate thumbnail
    if (videoUrl.includes('cloudinary.com') && videoUrl.includes('/video/')) {
      // Convert Cloudinary video URL to thumbnail URL
      // Example: https://res.cloudinary.com/folajimidev/video/upload/v1767372201/b9pi1iyrjkb4moodzwx2.mp4
      // To: https://res.cloudinary.com/folajimidev/image/upload/w_600,h_400,c_fill,q_auto,f_auto/v1767372201/b9pi1iyrjkb4moodzwx2.jpg
      
      try {
        // Replace /video/upload/ with /image/upload/ and add thumbnail parameters
        let thumbnailUrl = videoUrl.replace('/video/upload/', '/image/upload/w_600,h_400,c_fill,q_auto,f_auto/');
        
        // Replace .mp4 with .jpg
        thumbnailUrl = thumbnailUrl.replace(/\.(mp4|mov|avi|webm)$/i, '.jpg');
        
        console.log('📸 Generated Cloudinary thumbnail:', thumbnailUrl);
        return thumbnailUrl;
      } catch (error) {
        console.error('Error generating thumbnail:', error);
        return VIDEO_PLACEHOLDER;
      }
    }
    
    // For YouTube URLs
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
    
    return VIDEO_PLACEHOLDER;
  };

  // Get thumbnail URL - FIXED VERSION
  const getThumbnailUrl = (listing: Listing): string => {
    const listingId = listing._id || 'unknown';
    
    // Check if this image has previously failed to load
    if (imageErrors[listingId]) {
      return ERROR_IMAGE;
    }
    
    // 1. First check if listing has a thumbnail from API
    if (listing.thumbnail && listing.thumbnail !== '') {
      // Check if thumbnail is a video URL
      if (isVideoUrl(listing.thumbnail)) {
        return generateVideoThumbnail(listing.thumbnail);
      }
      return listing.thumbnail;
    }
    
    // 2. If no thumbnail, check mediaUrls
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) {
      return PLACEHOLDER_IMAGE;
    }
    
    // 3. Check for images in mediaUrls
    const imageUrl = listing.mediaUrls.find(url => 
      url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) && !isVideoUrl(url)
    );
    
    if (imageUrl) {
      return imageUrl;
    }
    
    // 4. Check for video URLs and generate thumbnails
    const videoUrl = getFirstVideoUrl(listing);
    if (videoUrl) {
      return generateVideoThumbnail(videoUrl);
    }
    
    // 5. Use first URL (might be a video, but better than nothing)
    const firstUrl = listing.mediaUrls[0];
    if (firstUrl) {
      // If it's a video URL, generate thumbnail
      if (isVideoUrl(firstUrl)) {
        return generateVideoThumbnail(firstUrl);
      }
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
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping bg-yellow-400 opacity-20 rounded-full"></div>
              <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-yellow-600 border-t-transparent mx-auto"></div>
            </div>
            <p className="mt-6 text-gray-700 text-lg font-medium">Loading amazing content...</p>
            <p className="mt-2 text-gray-500 text-sm">Discovering the best videos and creative assets</p>
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
            <div className="mb-6 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-r-lg shadow-lg p-4 animate-slideIn">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <FiAlertCircle className="text-red-600" size={20} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700 p-1 transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-yellow-600 bg-clip-text text-transparent">
                  Video Marketplace
                </h1>
                <p className="text-gray-600 text-lg max-w-2xl">
                  Discover premium video content, scripts, and creative assets from talented creators worldwide
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {marketplaceApi.utils.checkAuth() && (
                  <>
                    <button 
                      onClick={() => navigate('/marketplace/create')}
                      className="group relative inline-flex items-center justify-center px-5 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-700 to-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      <FiPlus className="relative mr-2" size={18} />
                      <span className="relative">Create Listing</span>
                    </button>
                    <button 
                      onClick={() => navigate('/marketplace/my-orders')}
                      className="inline-flex items-center justify-center px-5 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-200"
                    >
                      <FiCreditCard className="mr-2" size={18} />
                      My Offers
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center justify-center px-5 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-200"
                >
                  <FiFilter className="mr-2" size={18} />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-8 max-w-3xl mx-auto">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400 group-focus-within:text-yellow-600 transition-colors" size={20} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos, scripts, music, animation, or creative assets..."
                  className="block w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-2xl bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 shadow-sm hover:shadow transition-all duration-200 text-base"
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

          {/* Filters Section */}
          {showFilters && (
            <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center">
                    <FiFilter className="text-yellow-600" size={18} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Advanced Filters</h3>
                    <p className="text-gray-600 text-sm">Refine your search to find exactly what you need</p>
                  </div>
                </div>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-yellow-600 hover:text-yellow-700 bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 rounded-lg transition-all duration-200"
                >
                  Clear all filters
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Listing Type
                  </label>
                  <select 
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm transition-all duration-200 bg-white hover:border-gray-400"
                  >
                    <option value="">All Types</option>
                    <option value="for_sale">For Sale</option>
                    <option value="licensing">Licensing</option>
                    <option value="adaptation_rights">Adaptation Rights</option>
                    <option value="commission">Commission</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Category
                  </label>
                  <input
                    type="text"
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Video, Script, Music, Animation..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm transition-all duration-200 bg-white hover:border-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Min Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={filters.minPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm transition-all duration-200 bg-white hover:border-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Sort By
                  </label>
                  <select 
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm transition-all duration-200 bg-white hover:border-gray-400"
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
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl">
                <p className="text-gray-800 text-sm font-semibold">
                  Showing <span className="text-yellow-700">{filteredListings.length}</span> listings
                  {searchQuery && (
                    <span> for "<span className="text-yellow-700">{searchQuery}</span>"</span>
                  )}
                </p>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm text-yellow-600 hover:text-yellow-700 font-medium flex items-center gap-1 transition-colors"
                >
                  <FiX size={14} />
                  Clear search
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiEye size={14} />
              <span>Discover amazing content from creative professionals</span>
            </div>
          </div>

          {/* Listings Grid */}
          {filteredListings.length === 0 ? (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-full flex items-center justify-center shadow-inner">
                  <FiSearch size={32} className="text-yellow-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {searchQuery || Object.values(filters).some(Boolean) 
                    ? 'No listings found' 
                    : 'Welcome to the Marketplace!'
                  }
                </h3>
                <p className="text-gray-600 text-base mb-8">
                  {searchQuery || Object.values(filters).some(Boolean)
                    ? 'Try adjusting your search or filters to find what you\'re looking for.'
                    : 'Be the first to create a listing and start trading amazing content!'
                  }
                </p>
                {marketplaceApi.utils.checkAuth() && (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button 
                      onClick={() => navigate('/marketplace/create')}
                      className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <FiPlus className="mr-2" size={18} />
                      Create Your First Listing
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map(listing => {
                const thumbnailUrl = getThumbnailUrl(listing);
                const videoUrl = getFirstVideoUrl(listing);
                const mediaType = getMediaType(listing);
                const isVideo = mediaType === 'video';
                
                return (
                  <div key={listing._id} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 overflow-hidden hover:-translate-y-1">
                    {/* Video/Image Preview */}
                    <div className="relative h-56 bg-gradient-to-br from-gray-900 to-black overflow-hidden">
                      {/* Thumbnail Image */}
                      <div className="relative w-full h-full">
                        <img
                          src={thumbnailUrl}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={() => handleImageError(listing._id)}
                          loading="lazy"
                        />
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                        
                        {/* Play Button Overlay for Videos */}
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative group/play">
                              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-full blur-xl group-hover/play:blur-2xl transition-all duration-300"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVideoClick(videoUrl, listing.title, listing);
                                }}
                                className="relative w-16 h-16 rounded-full bg-gradient-to-r from-yellow-600 to-yellow-500 flex items-center justify-center border-4 border-white/30 shadow-2xl transform group-hover/play:scale-110 transition-all duration-300"
                              >
                                <FiPlay className="text-white ml-1" size={24} />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Media Type Badge */}
                        <div className={`absolute top-4 right-4 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-md ${isVideo ? 'bg-gradient-to-r from-red-500/90 to-red-600/90' : mediaType === 'image' ? 'bg-gradient-to-r from-blue-500/90 to-blue-600/90' : 'bg-gradient-to-r from-gray-600/90 to-gray-700/90'}`}>
                          {isVideo ? (
                            <div className="flex items-center gap-1.5">
                              <FiVideo size={12} />
                              VIDEO CONTENT
                            </div>
                          ) : mediaType === 'image' ? (
                            <div className="flex items-center gap-1.5">
                              <FiImage size={12} />
                              IMAGE
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <FiImage size={12} />
                              MEDIA
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Category Badge */}
                      <div className="absolute bottom-4 left-4">
                        <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
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
                        {isVideo && videoUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('▶️ Play button clicked for:', listing.title);
                              handleVideoClick(videoUrl, listing.title, listing);
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
        billingDetails={billingDetails}
        onBillingDetailsChange={handleBillingDetailsChange}
        currentUser={currentUser}
        getThumbnailUrl={getThumbnailUrl}
      />
    </MarketplaceLayout>
  );
};

export default Browse;