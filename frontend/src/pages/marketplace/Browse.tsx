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
      
      // Debug: Check video detection for all listings
      console.log('🎬 Video detection results:');
      sortedData.forEach((listing, index) => {
        const videoUrl = getFirstVideoUrl(listing);
        const mediaType = getMediaType(listing);
        console.log(`${index + 1}. ${listing.title}`);
        console.log('   Media URLs:', listing.mediaUrls);
        console.log('   Video URL found:', videoUrl);
        console.log('   Media Type:', mediaType);
        console.log('   Is Video?', mediaType === 'video');
      });
      
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
    console.log('📁 Listing media URLs:', listing.mediaUrls);
    
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
  // IMPROVED VIDEO DETECTION LOGIC WITH CLOUDINARY SUPPORT
  // ============================================

  // Check if media is a video - IMPROVED CLOUDINARY SUPPORT
  const isVideoUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    
    const urlLower = url.toLowerCase();
    
    // Common video file extensions
    const videoExtensions = /\.(mp4|mov|avi|wmv|flv|mkv|webm|m4v|ogg|ogv|3gp|3g2|mpeg|mpg|m2v|m4p|m4v|svi|3gpp|3gpp2|mxf|roq|nsv|flv|f4v|f4p|f4a|f4b)$/i;
    
    if (videoExtensions.test(url)) {
      return true;
    }
    
    // Video hosting platforms with Cloudinary support
    const videoDomains = [
      'youtube.com',
      'youtu.be',
      'vimeo.com',
      'dailymotion.com',
      'twitch.tv',
      'streamable.com',
      'cloudinary.com/video',
      'cloudinary.com/upload/video',
      'cloudinary.com/upload/v',
      'res.cloudinary.com/video'
    ];
    
    // Check if URL contains any video domain
    for (const domain of videoDomains) {
      if (urlLower.includes(domain)) {
        return true;
      }
    }
    
    // Special Cloudinary video detection
    if (urlLower.includes('cloudinary.com')) {
      // Check if it's a Cloudinary video upload
      if (urlLower.includes('/video/') || 
          urlLower.includes('/upload/video/') ||
          urlLower.includes('/upload/v') ||
          urlLower.match(/\.(mp4|mov|avi|webm)$/)) {
        return true;
      }
    }
    
    return false;
  };

  // Get first video URL from listing
  const getFirstVideoUrl = (listing: Listing): string => {
    if (!listing.mediaUrls || !Array.isArray(listing.mediaUrls) || listing.mediaUrls.length === 0) {
      return '';
    }
    
    // Find first video URL
    for (const url of listing.mediaUrls) {
      if (isVideoUrl(url)) {
        console.log('✅ Found video URL:', url);
        return url;
      }
    }
    
    return '';
  };

  // Generate video thumbnail from video URL - IMPROVED FOR CLOUDINARY
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
    
    // For Cloudinary videos - generate thumbnail
    if (videoUrl.includes('cloudinary.com')) {
      // Extract Cloudinary public ID
      const cloudinaryMatch = videoUrl.match(/cloudinary\.com\/[^\/]+\/(video|upload)\/(.*?)\/([^\.]+)\./);
      
      if (cloudinaryMatch) {
        const publicId = cloudinaryMatch[3];
        
        // Generate thumbnail URL for Cloudinary video
        // Replace video/upload with image/upload and add thumbnail parameters
        const thumbnailUrl = videoUrl
          .replace('/video/upload/', '/image/upload/')
          .replace('/upload/video/', '/upload/')
          .replace(/(\/upload\/.*?\/)([^\/]+)$/, '$1w_600,h_400,c_fill,q_auto,f_auto/$2.jpg');
        
        return thumbnailUrl;
      }
      
      // Alternative method for Cloudinary thumbnails
      if (videoUrl.includes('/upload/')) {
        const baseUrl = videoUrl.split('/upload/')[0];
        const path = videoUrl.split('/upload/')[1];
        
        if (path) {
          // Remove any file extension and add thumbnail parameters
          const pathWithoutExt = path.replace(/\.(mp4|mov|avi|webm)$/i, '');
          const thumbnail = `${baseUrl}/image/upload/w_600,h_400,c_fill,q_auto,f_auto/${pathWithoutExt}.jpg`;
          return thumbnail;
        }
      }
    }
    
    // For direct video files, use video placeholder
    return VIDEO_PLACEHOLDER;
  };

  // Get thumbnail URL with better error handling - OPTIMIZED FOR CLOUDINARY
  const getThumbnailUrl = (listing: Listing): string => {
    const listingId = listing._id || 'unknown';
    
    // Check if this image has previously failed to load
    if (imageErrors[listingId]) {
      return ERROR_IMAGE;
    }
    
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) {
      return PLACEHOLDER_IMAGE;
    }
    
    // Check for Cloudinary media first (for better detection)
    const cloudinaryMedia = listing.mediaUrls.find(url => 
      url.includes('cloudinary.com')
    );
    
    if (cloudinaryMedia) {
      // Check if it's a video
      const isVideo = isVideoUrl(cloudinaryMedia);
      
      if (isVideo) {
        // Generate thumbnail for Cloudinary video
        return generateVideoThumbnail(cloudinaryMedia);
      } else {
        // It's already a Cloudinary image, return as is
        return cloudinaryMedia;
      }
    }
    
    // Try to find a regular image
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

  // Get media type for a listing - IMPROVED FOR CLOUDINARY
  const getMediaType = (listing: Listing): 'image' | 'video' | 'none' => {
    if (!listing.mediaUrls || !Array.isArray(listing.mediaUrls) || listing.mediaUrls.length === 0) {
      return 'none';
    }
    
    // Check for video first
    for (const url of listing.mediaUrls) {
      if (isVideoUrl(url)) {
        return 'video';
      }
    }
    
    // Check for image
    for (const url of listing.mediaUrls) {
      if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
        return 'image';
      }
    }
    
    // Check for Cloudinary URLs that might be images
    for (const url of listing.mediaUrls) {
      if (url.includes('cloudinary.com') && !isVideoUrl(url)) {
        return 'image';
      }
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

          {/* Listings Grid - 3 PER ROW */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {filteredListings.map(listing => {
                const thumbnailUrl = getThumbnailUrl(listing);
                const videoUrl = getFirstVideoUrl(listing);
                const mediaType = getMediaType(listing);
                const isVideo = mediaType === 'video';
                
                return (
                  <div key={listing._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-200 group">
                    {/* Video/Image Preview */}
                    <div 
                      className="relative h-48 bg-gray-900 cursor-pointer overflow-hidden"
                      onClick={() => {
                        if (isVideo && videoUrl) {
                          handleVideoClick(videoUrl, listing.title, listing);
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
                        {isVideo && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 transform group-hover:scale-110 transition-transform duration-300">
                              <FiPlay className="text-white ml-1" size={28} />
                            </div>
                            <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
                              Click to play
                            </div>
                          </div>
                        )}
                        
                        {/* Media Type Badge */}
                        <div className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm ${isVideo ? 'bg-red-500/80' : mediaType === 'image' ? 'bg-blue-500/80' : 'bg-gray-500/80'}`}>
                          {isVideo ? (
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
                      
                      {/* Cloudinary Badge if Cloudinary URL */}
                      {thumbnailUrl.includes('cloudinary.com') && (
                        <div className="absolute top-2 left-2 bg-green-600/80 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                          CLOUDINARY
                        </div>
                      )}
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